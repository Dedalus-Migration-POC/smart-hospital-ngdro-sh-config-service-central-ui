import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatStepperModule } from '@angular/material/stepper';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { toUserMessage } from '../../../../core/http/api-error';
import { Installation, ProvisionPackage, ResyncAllPendingPush, ResyncAllResult } from '../../models';
import { InstallationService } from '../../services/installations';

export interface FactoryResetRecoveryDialogData {
  installation: Installation;
  backupSummary: {
    tenants: number;
    configs: number;
    apiKeys: number;
    timestamp: string;
  };
}

type StepState = 'idle' | 'loading' | 'success' | 'error';

@Component({
  selector: 'app-factory-reset-recovery-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatStepperModule,
    MatExpansionModule,
    MatDividerModule,
    TranslatePipe,
  ],
  templateUrl: './factory-reset-recovery-dialog.html',
  styleUrl: './factory-reset-recovery-dialog.scss',
})
export class FactoryResetRecoveryDialog {
  readonly data = inject<FactoryResetRecoveryDialogData>(MAT_DIALOG_DATA);
  private readonly installations = inject(InstallationService);
  private readonly translate = inject(TranslateService);
  private readonly ref = inject<MatDialogRef<FactoryResetRecoveryDialog>>(MatDialogRef);

  readonly step0Done = signal(false);
  readonly step1State = signal<StepState>('idle');
  readonly step1Error = signal<string | null>(null);

  readonly step2State = signal<StepState>('idle');
  readonly step2Result = signal<ResyncAllResult | null>(null);
  readonly step2Error = signal<string | null>(null);

  proceedToProvisioning(): void {
    this.step0Done.set(true);
  }

  async runProvisioning(): Promise<void> {
    if (this.step1State() === 'loading') return;
    this.step1State.set('loading');
    this.step1Error.set(null);
    try {
      const inst = await firstValueFrom(this.installations.reprovision(this.data.installation.id));

      // Fallback browser: central non ha raggiunto l'on-prem → il browser prova direttamente
      const pkgs = [inst.adminKeyProvisionPackage, inst.readKeyProvisionPackage].filter(Boolean) as ProvisionPackage[];
      if (pkgs.length > 0) {
        await this.browserProvision(pkgs);
      }

      this.step1State.set('success');
    } catch (err: unknown) {
      this.step1State.set('error');
      this.step1Error.set(toUserMessage(err, this.translate.instant('installation.reprovisionError')));
    }
  }

  async runResync(): Promise<void> {
    if (this.step2State() === 'loading') return;
    this.step2State.set('loading');
    this.step2Error.set(null);
    try {
      const res = await firstValueFrom(this.installations.resyncAll(this.data.installation.id));

      let browserFailed = 0;
      const browserErrors: string[] = [];

      // Fallback browser per le config che il centrale non è riuscito a pushare
      if (res.pendingBrowserPush.length > 0) {
        const results = await this.browserPushConfigs(res.pendingBrowserPush);
        browserFailed = results.failed;
        browserErrors.push(...results.errors);
      }

      const totalFailed = (res.totalCount - res.syncedCount - res.pendingBrowserPush.length) + browserFailed;
      const result: ResyncAllResult = {
        total: res.totalCount,
        synced: res.syncedCount + (res.pendingBrowserPush.length - browserFailed),
        failed: totalFailed,
        errors: browserErrors,
      };
      this.step2Result.set(result);
      this.step2State.set('success');
    } catch (err: unknown) {
      this.step2State.set('error');
      this.step2Error.set(toUserMessage(err, this.translate.instant('installation.resyncAllError')));
    }
  }

  close(): void {
    this.ref.close();
  }

  /**
   * Esegue il provisioning direttamente dal browser verso l'on-prem.
   * Usato quando il central non riesce a raggiungere l'on-prem (behind VPN).
   */
  private async browserProvision(packages: ProvisionPackage[]): Promise<void> {
    for (const pkg of packages) {
      const res = await fetch(pkg.targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': pkg.adminApiKey },
        body: pkg.body,
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        throw new Error(`Browser provisioning fallito: on-prem ha risposto ${res.status}`);
      }
    }
  }

  /**
   * Esegue il push delle config direttamente dal browser verso l'on-prem.
   * Chiamato quando resync-all ritorna pendingBrowserPush non vuoto.
   */
  private async browserPushConfigs(
    pending: ResyncAllPendingPush[],
  ): Promise<{ failed: number; errors: string[] }> {
    let failed = 0;
    const errors: string[] = [];

    for (const item of pending) {
      if (!item.pushPackage) continue;
      const pkg = item.pushPackage;
      try {
        const res = await fetch(pkg.targetUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'X-API-Key': pkg.apiKey },
          body: JSON.stringify({ payload: pkg.encryptedPayload }),
          signal: AbortSignal.timeout(15000),
        });
        if (res.ok) {
          const data = await res.json() as { version?: number };
          await firstValueFrom(
            this.installations.resyncAllPushConfirm(
              this.data.installation.id,
              item.tenantId,
              item.channelId,
              item.entity,
              true,
              (data.version ?? null),
              null,
            ),
          );
        } else {
          failed++;
          errors.push(`${item.tenantSlug}:${item.channelId} — on-prem ha risposto ${res.status}`);
          await firstValueFrom(
            this.installations.resyncAllPushConfirm(
              this.data.installation.id,
              item.tenantId,
              item.channelId,
              item.entity,
              false,
              null,
              `On-prem ha risposto ${res.status}`,
            ),
          );
        }
      } catch (e) {
        failed++;
        const msg = e instanceof Error ? e.message : 'Errore rete';
        errors.push(`${item.tenantSlug}:${item.channelId} — ${msg}`);
      }
    }
    return { failed, errors };
  }
}
