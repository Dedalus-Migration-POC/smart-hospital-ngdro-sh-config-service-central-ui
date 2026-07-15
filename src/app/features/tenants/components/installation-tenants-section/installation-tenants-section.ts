import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth';
import { toUserMessage } from '../../../../core/http/api-error';
import {
  ConfirmDialog,
  ConfirmDialogData,
} from '../../../../shared/dialogs/confirm-dialog/confirm-dialog';
import {
  TenantCloneDialog,
  TenantCloneDialogData,
  TenantCloneDialogResult,
} from '../../dialogs/tenant-clone-dialog/tenant-clone-dialog';
import {
  TenantCreateDialog,
  TenantCreateDialogData,
} from '../../dialogs/tenant-create-dialog/tenant-create-dialog';
import { PendingConfigPush, Tenant } from '../../models';
import { TenantService } from '../../services/tenants';

@Component({
  selector: 'app-installation-tenants-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSlideToggleModule,
    MatTooltipModule,
    TranslatePipe,
  ],
  templateUrl: './installation-tenants-section.html',
  styleUrl: './installation-tenants-section.scss',
})
export class InstallationTenantsSection {
  readonly installationId = input.required<string>();
  readonly installationName = input.required<string>();

  private readonly tenants = inject(TenantService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  readonly isAdmin = computed(() => this.auth.currentUser()?.role === 'ADMIN');

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly showInactive = signal(false);
  readonly rows = signal<Tenant[]>([]);

  readonly displayedColumns = ['name', 'slug', 'active', 'createdAt', 'actions'] as const;

  readonly cloningTenantId = signal<string | null>(null);

  constructor() {
    effect(() => {
      const id = this.installationId();
      this.load(id, this.showInactive());
    });
  }

  reload(): void {
    this.load(this.installationId(), this.showInactive());
  }

  toggleInactive(value: boolean): void {
    this.showInactive.set(value);
    this.load(this.installationId(), value);
  }

  private load(installationId: string, showInactive: boolean): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.tenants.listByInstallation(installationId, !showInactive).subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(toUserMessage(err, this.translate.instant('product.loadError')));
      },
    });
  }

  openCreate(): void {
    const data: TenantCreateDialogData = {
      installationId: this.installationId(),
      installationName: this.installationName(),
    };
    const ref = this.dialog.open<TenantCreateDialog, TenantCreateDialogData, Tenant | undefined>(
      TenantCreateDialog,
      { data, autoFocus: 'first-tabbable' },
    );
    ref.afterClosed().subscribe((tenant) => {
      if (!tenant) return;
      this.snackbar.open(this.translate.instant('product.createSuccess', { name: tenant.name }), 'OK', { duration: 3000 });
      this.reload();
    });
  }

  openTenant(tenant: Tenant): void {
    void this.router.navigate(['/prodotti', tenant.id]);
  }

  openClone(tenant: Tenant): void {
    const data: TenantCloneDialogData = { sourceTenant: tenant };
    const ref = this.dialog.open<TenantCloneDialog, TenantCloneDialogData, TenantCloneDialogResult>(
      TenantCloneDialog,
      { data, autoFocus: 'first-tabbable' },
    );
    ref.afterClosed().subscribe(async (result) => {
      if (!result) return;
      this.cloningTenantId.set(result.tenant.id);
      try {
        if (result.pendingConfigPush.length > 0) {
          await this.handleBrowserCloneConfigPush(result.pendingConfigPush, result.configsSynced, result.configsTotal);
        } else {
          const messageKey = result.overwritten ? 'product.cloneOverwriteSuccess' : 'product.cloneSuccess';
          this.snackbar.open(
            this.translate.instant(messageKey, {
              name: result.tenant.name,
              synced: result.configsSynced,
              total: result.configsTotal,
            }),
            'OK',
            { duration: 4000 },
          );
        }
      } finally {
        this.cloningTenantId.set(null);
        this.reload();
      }
    });
  }

  /** Fallback browser: alcune config clonate non hanno raggiunto l'on-prem dal server. */
  private async handleBrowserCloneConfigPush(
    pending: PendingConfigPush[],
    alreadySynced: number,
    total: number,
  ): Promise<void> {
    const baseUrl = pending[0].pushPackage.baseUrl;

    this.snackbar.open(this.translate.instant('config.browserPushChecking'), 'OK', { duration: 4000 });

    const reachable = await fetch(`${baseUrl}/actuator/health`, {
      mode: 'no-cors',
      signal: AbortSignal.timeout(5000),
    }).then(() => true).catch(() => false);

    if (!reachable) {
      this.snackbar.open(this.translate.instant('config.browserPushUnreachable'), 'OK', { duration: 8000 });
      return;
    }

    const confirmed = await new Promise<boolean>((resolve) => {
      const data: ConfirmDialogData = {
        title: this.translate.instant('product.browserCloneConfirmTitle'),
        message: this.translate.instant('product.browserCloneConfirmMessage', {
          pending: pending.length,
          synced: alreadySynced,
          total,
        }),
        confirmLabel: this.translate.instant('config.browserPushConfirmButton'),
        destructive: false,
      };
      const ref = this.dialog.open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, { data });
      ref.afterClosed().subscribe((r) => resolve(r === true));
    });

    if (!confirmed) return;

    this.snackbar.open(this.translate.instant('config.browserPushInProgress'), undefined, { duration: 0 });

    let browserSynced = 0;
    for (const item of pending) {
      const pkg = item.pushPackage;
      let remoteVersion: number | null = null;
      let pushError: string | null = null;
      let pushOk = false;

      try {
        const res = await fetch(pkg.targetUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'X-API-Key': pkg.apiKey },
          body: JSON.stringify({ payload: pkg.encryptedPayload }),
          signal: AbortSignal.timeout(15000),
        });
        if (res.ok) {
          const respBody = await res.json() as { version?: number };
          remoteVersion = respBody.version ?? null;
          pushOk = true;
          browserSynced++;
        } else {
          pushError = `On-prem ha risposto ${res.status}`;
        }
      } catch (e) {
        pushError = e instanceof Error ? e.message : 'Errore rete';
      }

      await firstValueFrom(
        this.tenants.pushConfirm(item.tenantId, item.channelId, item.entity, pushOk, remoteVersion, pushError),
      ).catch(() => { /* ignora errori push-confirm singoli */ });
    }

    const totalSynced = alreadySynced + browserSynced;
    this.snackbar.open(
      this.translate.instant('product.cloneSuccess', { name: '', synced: totalSynced, total }),
      'OK',
      { duration: 4000 },
    );
  }
}
