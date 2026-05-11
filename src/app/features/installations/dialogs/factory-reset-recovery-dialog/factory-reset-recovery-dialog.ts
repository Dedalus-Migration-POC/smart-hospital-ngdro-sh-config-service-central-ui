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
import { Installation, ResyncAllResult } from '../../models';
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
      await firstValueFrom(this.installations.reprovision(this.data.installation.id));
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
      const failed = res.totalCount - res.syncedCount;
      const errors = res.pendingBrowserPush.map(
        (p) => `${p.tenantSlug}:${p.channelId} — richiede push browser`,
      );
      const result: ResyncAllResult = {
        total: res.totalCount,
        synced: res.syncedCount,
        failed,
        errors,
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
}
