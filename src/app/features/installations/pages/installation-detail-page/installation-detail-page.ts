import { DatePipe, KeyValuePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth';
import { toUserMessage } from '../../../../core/http/api-error';
import { BrowserProvisionService } from '../../../../core/provision/browser-provision';
import {
  ConfirmDialog,
  ConfirmDialogData,
} from '../../../../shared/dialogs/confirm-dialog/confirm-dialog';
import {
  RotateApiKeyDialog,
  RotateApiKeyDialogData,
} from '../../dialogs/rotate-api-key-dialog/rotate-api-key-dialog';
import {
  RotatePayloadMasterKeyDialog,
  RotatePayloadMasterKeyDialogData,
} from '../../dialogs/rotate-payload-master-key-dialog/rotate-payload-master-key-dialog';
import {
  ShowAdminApiKeyDialog,
  ShowAdminApiKeyDialogData,
} from '../../dialogs/show-admin-api-key-dialog/show-admin-api-key-dialog';
import {
  ShowReadApiKeyDialog,
  ShowReadApiKeyDialogData,
} from '../../dialogs/show-read-api-key-dialog/show-read-api-key-dialog';
import {
  ShowPayloadMasterKeyDialog,
  ShowPayloadMasterKeyDialogData,
} from '../../dialogs/show-payload-master-key-dialog/show-payload-master-key-dialog';
import { InstallationTenantsSection } from '../../../tenants/components/installation-tenants-section/installation-tenants-section';
import {
  IntegrationSnippetDialog,
  IntegrationSnippetDialogData,
} from '../../dialogs/integration-snippet-dialog/integration-snippet-dialog';
import {
  FactoryResetDialog,
  FactoryResetDialogData,
  FactoryResetDialogResult,
} from '../../dialogs/factory-reset-dialog/factory-reset-dialog';
import {
  FactoryResetRecoveryDialog,
  FactoryResetRecoveryDialogData,
} from '../../dialogs/factory-reset-recovery-dialog/factory-reset-recovery-dialog';
import { Installation, InstallationStats, INSTALLATION_BASE_URL_PATTERN, ProvisionPackage, ReadPackage, ResyncAllPendingPush } from '../../models';
import { InstallationService } from '../../services/installations';
import { TenantService } from '../../../tenants/services/tenants';

@Component({
  selector: 'app-installation-detail-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    KeyValuePipe,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatTooltipModule,
    InstallationTenantsSection,
    TranslatePipe,
  ],
  templateUrl: './installation-detail-page.html',
  styleUrl: './installation-detail-page.scss',
})
export class InstallationDetailPage {
  readonly id = input.required<string>();

  private readonly fb = inject(FormBuilder);
  private readonly installations = inject(InstallationService);
  private readonly tenantService = inject(TenantService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly browserProvision = inject(BrowserProvisionService);

  readonly isAdmin = computed(() => this.auth.currentUser()?.role === 'ADMIN');

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly reprovisioning = signal(false);
  readonly resyncingAll = signal(false);
  readonly factoryResetting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly installation = signal<Installation | null>(null);

  readonly statsLoading = signal(false);
  readonly statsError = signal<string | null>(null);
  readonly stats = signal<InstallationStats | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    baseUrl: [
      '',
      [Validators.required, Validators.maxLength(500), Validators.pattern(INSTALLATION_BASE_URL_PATTERN)],
    ],
    active: [true],
  });

  constructor() {
    effect(() => {
      const id = this.id();
      this.load(id);
    });
  }

  private load(id: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.installations.get(id).subscribe({
      next: (inst) => {
        this.installation.set(inst);
        this.form.reset({ name: inst.name, baseUrl: inst.baseUrl, active: inst.active });
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.installation.set(null);
        this.loading.set(false);
        this.errorMessage.set(toUserMessage(err, this.translate.instant('installation.loadDetailError')));
      },
    });
  }

  goToCustomer(): void {
    const inst = this.installation();
    if (inst) {
      void this.router.navigate(['/customers', inst.customerId]);
    } else {
      void this.router.navigate(['/customers']);
    }
  }

  save(): void {
    const inst = this.installation();
    if (!inst || this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const v = this.form.getRawValue();
    this.installations
      .update(inst.id, { name: v.name, baseUrl: v.baseUrl, active: v.active })
      .subscribe({
        next: (updated) => {
          this.installation.set(updated);
          this.form.reset({
            name: updated.name,
            baseUrl: updated.baseUrl,
            active: updated.active,
          });
          this.saving.set(false);
          this.snackbar.open(this.translate.instant('installation.saveSuccess'), 'OK', { duration: 3000 });
        },
        error: (err: unknown) => {
          this.saving.set(false);
          this.snackbar.open(
            toUserMessage(err, this.translate.instant('installation.saveError')),
            'OK',
            { duration: 6000 },
          );
        },
      });
  }

  rotateApiKey(): void {
    const inst = this.installation();
    if (!inst) return;
    const data: RotateApiKeyDialogData = {
      installationId: inst.id,
      installationName: inst.name,
    };
    const ref = this.dialog.open<RotateApiKeyDialog, RotateApiKeyDialogData, Installation | undefined>(
      RotateApiKeyDialog,
      { data, autoFocus: 'first-tabbable' },
    );
    ref.afterClosed().subscribe((updated) => {
      if (updated) {
        this.installation.set(updated);
        this.snackbar.open(this.translate.instant('installation.rotateApiKeySuccess'), 'OK', { duration: 3000 });
      }
    });
  }

  revealApiKeyToLog(): void {
    const inst = this.installation();
    if (!inst) return;
    const confirmData: ConfirmDialogData = {
      title: this.translate.instant('installation.revealApiKeyTitle'),
      message: this.translate.instant('installation.revealApiKeyMessage', { name: inst.name }),
      confirmLabel: this.translate.instant('installation.revealApiKeyConfirm'),
      destructive: true,
    };
    this.dialog
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, { data: confirmData })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.installations.revealApiKeyToLog(inst.id).subscribe({
          next: () => this.snackbar.open(
            this.translate.instant('installation.revealApiKeySuccess'),
            'OK',
            { duration: 5000 },
          ),
          error: (err: unknown) => this.snackbar.open(
            toUserMessage(err, this.translate.instant('installation.revealApiKeyError')),
            'OK',
            { duration: 6000 },
          ),
        });
      });
  }

  rotatePayloadMasterKey(): void {
    const inst = this.installation();
    if (!inst) return;
    const data: RotatePayloadMasterKeyDialogData = {
      installationId: inst.id,
      installationName: inst.name,
    };
    const ref = this.dialog.open<RotatePayloadMasterKeyDialog, RotatePayloadMasterKeyDialogData, boolean>(
      RotatePayloadMasterKeyDialog,
      { data, autoFocus: 'first-tabbable' },
    );
    ref.afterClosed().subscribe((rotated) => {
      if (rotated) {
        this.snackbar.open(this.translate.instant('installation.rotateMasterKeySuccess'), 'OK', { duration: 3000 });
        this.load(inst.id);
      }
    });
  }

  showPayloadMasterKey(): void {
    const inst = this.installation();
    if (!inst) return;
    const data: ShowPayloadMasterKeyDialogData = {
      installationId: inst.id,
      installationName: inst.name,
    };
    this.dialog.open<ShowPayloadMasterKeyDialog, ShowPayloadMasterKeyDialogData, void>(
      ShowPayloadMasterKeyDialog,
      { data },
    );
  }

  showAdminApiKey(): void {
    const inst = this.installation();
    if (!inst) return;
    const data: ShowAdminApiKeyDialogData = {
      installationId: inst.id,
      installationName: inst.name,
    };
    this.dialog.open<ShowAdminApiKeyDialog, ShowAdminApiKeyDialogData, void>(
      ShowAdminApiKeyDialog,
      { data },
    );
  }

  showReadApiKey(): void {
    const inst = this.installation();
    if (!inst) return;
    const data: ShowReadApiKeyDialogData = {
      installationId: inst.id,
      installationName: inst.name,
    };
    this.dialog.open<ShowReadApiKeyDialog, ShowReadApiKeyDialogData, void>(
      ShowReadApiKeyDialog,
      { data },
    );
  }

  rotateReadApiKey(): void {
    const inst = this.installation();
    if (!inst) return;
    this.installations.rotateReadApiKey(inst.id).subscribe({
      next: async (result) => {
        this.load(inst.id);
        if (result.provisionPackage) {
          await this.handleBrowserProvision(result.provisionPackage);
        } else {
          this.snackbar.open(
            this.translate.instant('installation.rotateReadKeySuccess'),
            'OK',
            { duration: 3000 },
          );
        }
      },
      error: (err: unknown) => this.snackbar.open(
        toUserMessage(err, this.translate.instant('installation.rotateReadKeyError')),
        'OK',
        { duration: 6000 },
      ),
    });
  }

  provisionReadApiKey(): void {
    const inst = this.installation();
    if (!inst) return;
    this.installations.provisionReadApiKey(inst.id).subscribe({
      next: async (result) => {
        if (result.provisionPackage) {
          await this.handleBrowserProvision(result.provisionPackage);
        } else {
          this.snackbar.open(
            this.translate.instant('installation.readKeyProvisionSuccess'),
            'OK',
            { duration: 3000 },
          );
        }
      },
      error: (err: unknown) => this.snackbar.open(
        toUserMessage(err, this.translate.instant('installation.provisionReadKeyError')),
        'OK',
        { duration: 6000 },
      ),
    });
  }

  async reprovision(): Promise<void> {
    const inst = this.installation();
    if (!inst || this.reprovisioning()) return;
    this.reprovisioning.set(true);
    try {
      const result = await firstValueFrom(this.installations.reprovision(inst.id));
      if (result.adminKeyProvisionPackage) {
        await this.handleBrowserProvision(result.adminKeyProvisionPackage);
      }
      if (result.readKeyProvisionPackage) {
        await this.handleBrowserProvision(result.readKeyProvisionPackage);
      }
      if (!result.adminKeyProvisionPackage && !result.readKeyProvisionPackage) {
        this.snackbar.open(
          this.translate.instant('installation.reprovisionSuccess'),
          'OK',
          { duration: 3000 },
        );
      }
    } catch (err: unknown) {
      this.snackbar.open(
        toUserMessage(err, this.translate.instant('installation.reprovisionError')),
        'OK',
        { duration: 6000 },
      );
    } finally {
      this.reprovisioning.set(false);
    }
  }

  private async handleBrowserProvision(pkg: ProvisionPackage): Promise<void> {
    return this.browserProvision.provision(pkg);
  }

  async resyncAll(): Promise<void> {
    const inst = this.installation();
    if (!inst || this.resyncingAll()) return;
    this.resyncingAll.set(true);
    try {
      const result = await firstValueFrom(this.installations.resyncAll(inst.id));

      if (result.pendingBrowserPush.length > 0) {
        await this.handleBrowserResync(result.pendingBrowserPush, result.syncedCount, result.totalCount);
      } else {
        this.snackbar.open(
          this.translate.instant('installation.resyncAllSuccess', { count: result.syncedCount }),
          'OK',
          { duration: 4000 },
        );
      }
      this.load(inst.id);
    } catch (err: unknown) {
      this.snackbar.open(
        toUserMessage(err, this.translate.instant('installation.resyncAllError')),
        'OK',
        { duration: 6000 },
      );
    } finally {
      this.resyncingAll.set(false);
    }
  }

  private async handleBrowserResync(
    pending: ResyncAllPendingPush[],
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
        title: this.translate.instant('installation.browserResyncConfirmTitle'),
        message: this.translate.instant('installation.browserResyncConfirmMessage', {
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
    // Un tenant può comparire più volte (una per entity): provisioniamo una sola
    // volta per tenant, non prima di ogni singolo push.
    const provisionedTenantIds = new Set<string>();

    for (const item of pending) {
      const pkg = item.pushPackage;
      let remoteVersion: number | null = null;
      let pushError: string | null = null;
      let pushOk = false;

      if (pkg.tenantProvisionPackage && !provisionedTenantIds.has(item.tenantId)) {
        const tpkg = pkg.tenantProvisionPackage;
        try {
          const tRes = await fetch(tpkg.targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-Key': tpkg.adminApiKey },
            body: tpkg.body,
            signal: AbortSignal.timeout(15000),
          });
          if (tRes.ok) {
            provisionedTenantIds.add(item.tenantId);
          } else {
            pushError = `${this.translate.instant('config.browserPushTenantProvisionError')} (${tRes.status})`;
          }
        } catch (e) {
          pushError = this.translate.instant('config.browserPushTenantProvisionError');
        }
        if (pushError) {
          await firstValueFrom(
            this.tenantService.pushConfirm(item.tenantId, item.channelId, item.entity, false, null, pushError)
          ).catch(() => { /* ignora errori push-confirm singoli */ });
          continue;
        }
      } else if (pkg.tenantProvisionPackage) {
        provisionedTenantIds.add(item.tenantId);
      }

      try {
        const res = await fetch(pkg.targetUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'X-API-Key': pkg.apiKey },
          body: JSON.stringify({ payload: pkg.encryptedPayload }),
          signal: AbortSignal.timeout(15000),
        });
        if (res.ok) {
          const data = await res.json() as { version?: number };
          remoteVersion = data.version ?? null;
          pushOk = true;
          browserSynced++;
        } else {
          pushError = `On-prem ha risposto ${res.status}`;
        }
      } catch (e) {
        pushError = e instanceof Error ? e.message : 'Errore rete';
      }

      await firstValueFrom(
        this.tenantService.pushConfirm(item.tenantId, item.channelId, item.entity, pushOk, remoteVersion, pushError)
      ).catch(() => { /* ignora errori push-confirm singoli */ });
    }
  }

  /**
   * Fallback browser per factory reset: il central non raggiunge l'on-prem.
   * Il browser fa la chiamata direttamente aggiungendo X-Reset-Password.
   */
  private async browserFactoryReset(
    inst: Installation,
    pkg: ProvisionPackage,
    resetPassword: string,
  ): Promise<void> {
    const baseUrl = pkg.targetUrl.replace(/\/v1\/admin\/factory-reset$/, '');

    this.snackbar.open(this.translate.instant('config.browserPushChecking'), 'OK', { duration: 4000 });

    const reachable = await fetch(`${baseUrl}/actuator/health`, {
      mode: 'no-cors',
      signal: AbortSignal.timeout(5000),
    }).then(() => true).catch(() => false);

    if (!reachable) {
      this.snackbar.open(this.translate.instant('installation.factoryResetUnreachable'), 'OK', { duration: 8000 });
      return;
    }

    this.snackbar.open(this.translate.instant('config.browserPushInProgress'), undefined, { duration: 0 });

    try {
      const res = await fetch(pkg.targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': pkg.adminApiKey,
          'X-Reset-Password': resetPassword,
        },
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) {
        this.snackbar.open(
          this.translate.instant('installation.factoryResetError') + ` (${res.status})`,
          'OK',
          { duration: 6000 },
        );
        return;
      }

      const body = await res.json() as { backupData?: string; message?: string };

      if (body.backupData) {
        const json = atob(body.backupData);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        a.href = url;
        a.download = `backup-${inst.id}-${ts}.json`;
        a.click();
        URL.revokeObjectURL(url);

        let backupSummary = { tenants: 0, configs: 0, apiKeys: 0, timestamp: new Date().toISOString() };
        try {
          const backup = JSON.parse(json) as { tenants?: unknown[]; configs?: unknown[]; apiKeys?: unknown[]; timestamp?: string };
          backupSummary = {
            tenants: backup.tenants?.length ?? 0,
            configs: backup.configs?.length ?? 0,
            apiKeys: backup.apiKeys?.length ?? 0,
            timestamp: backup.timestamp ?? new Date().toISOString(),
          };
        } catch { /* usa i valori di default */ }

        this.dialog.open<FactoryResetRecoveryDialog, FactoryResetRecoveryDialogData>(
          FactoryResetRecoveryDialog,
          { data: { installation: inst, backupSummary }, disableClose: true, width: '560px', maxWidth: '95vw' },
        );
      } else {
        this.snackbar.open(this.translate.instant('installation.factoryResetSuccessNoBackup'), 'OK', { duration: 3000 });
      }
    } catch (e) {
      this.snackbar.open(
        e instanceof Error ? e.message : this.translate.instant('installation.factoryResetError'),
        'OK',
        { duration: 6000 },
      );
    }
  }

  async factoryReset(): Promise<void> {
    const inst = this.installation();
    if (!inst || this.factoryResetting()) return;

    const data: FactoryResetDialogData = { installationName: inst.name };
    const result = await new Promise<FactoryResetDialogResult | undefined>((resolve) => {
      this.dialog
        .open<FactoryResetDialog, FactoryResetDialogData, FactoryResetDialogResult | undefined>(
          FactoryResetDialog,
          { data, autoFocus: 'first-tabbable' },
        )
        .afterClosed()
        .subscribe(resolve);
    });

    if (!result) return;

    this.factoryResetting.set(true);
    try {
      const res = await firstValueFrom(
        this.installations.factoryReset(inst.id, result.resetPassword),
      );

      if (res.backupData) {
        const json = atob(res.backupData);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        a.href = url;
        a.download = `backup-${inst.id}-${ts}.json`;
        a.click();
        URL.revokeObjectURL(url);

        let backupSummary = { tenants: 0, configs: 0, apiKeys: 0, timestamp: new Date().toISOString() };
        try {
          const backup = JSON.parse(json) as { tenants?: unknown[]; configs?: unknown[]; apiKeys?: unknown[]; timestamp?: string };
          backupSummary = {
            tenants: backup.tenants?.length ?? 0,
            configs: backup.configs?.length ?? 0,
            apiKeys: backup.apiKeys?.length ?? 0,
            timestamp: backup.timestamp ?? new Date().toISOString(),
          };
        } catch { /* usa i valori di default */ }

        const recoveryData: FactoryResetRecoveryDialogData = {
          installation: inst,
          backupSummary,
        };
        this.dialog.open<FactoryResetRecoveryDialog, FactoryResetRecoveryDialogData>(
          FactoryResetRecoveryDialog,
          { data: recoveryData, disableClose: true, width: '560px', maxWidth: '95vw' },
        );
      } else if (res.provisionPackage) {
        // Central non raggiunge l'on-prem → il browser tenta direttamente
        await this.browserFactoryReset(inst, res.provisionPackage, result.resetPassword);
      } else {
        this.snackbar.open(
          this.translate.instant('installation.factoryResetSuccessNoBackup'),
          'OK',
          { duration: 3000 },
        );
      }

      this.load(inst.id);
    } catch (err: unknown) {
      this.snackbar.open(
        toUserMessage(err, this.translate.instant('installation.factoryResetError')),
        'OK',
        { duration: 6000 },
      );
    } finally {
      this.factoryResetting.set(false);
    }
  }

  confirmDelete(): void {
    const inst = this.installation();
    if (!inst) return;
    const data: ConfirmDialogData = {
      title: this.translate.instant('installation.deleteConfirmTitle', { name: inst.name }),
      message: this.translate.instant('installation.deleteConfirmMessage'),
      confirmLabel: this.translate.instant('installation.deleteConfirmButton'),
      destructive: true,
    };
    const ref = this.dialog.open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
      data,
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) this.delete(inst);
    });
  }

  loadStats(): void {
    const inst = this.installation();
    if (!inst || this.statsLoading()) return;
    this.statsLoading.set(true);
    this.statsError.set(null);
    this.installations.getStats(inst.id).subscribe({
      next: (s) => {
        this.stats.set(s);
        this.statsLoading.set(false);
      },
      error: () => {
        // Central non ha raggiunto l'on-prem → il browser ci prova direttamente
        this.installations.getReadPackage(inst.id).subscribe({
          next: (pkg) => void this.browserLoadStats(inst.id, pkg),
          error: (credErr: unknown) => {
            this.statsLoading.set(false);
            this.statsError.set(toUserMessage(credErr, this.translate.instant('installation.statsError')));
          },
        });
      },
    });
  }

  private async browserLoadStats(installationId: string, pkg: ReadPackage): Promise<void> {
    if (!pkg.adminApiKey) {
      this.statsLoading.set(false);
      this.statsError.set(this.translate.instant('installation.statsErrorNoKey'));
      return;
    }

    const reachable = await fetch(`${pkg.onPremBaseUrl}/actuator/health`, {
      mode: 'no-cors',
      signal: AbortSignal.timeout(5000),
    }).then(() => true).catch(() => false);

    if (!reachable) {
      this.statsLoading.set(false);
      this.statsError.set(this.translate.instant('installation.statsErrorUnreachable'));
      return;
    }

    try {
      const res = await fetch(`${pkg.onPremBaseUrl}/v1/admin/stats`, {
        headers: { 'X-API-Key': pkg.adminApiKey },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        throw new Error(`On-prem ha risposto ${res.status}`);
      }
      const statsData = await res.json() as InstallationStats;
      this.stats.set(statsData);
      this.statsLoading.set(false);
      void firstValueFrom(this.installations.getReadPackage(installationId)).catch(() => undefined);
    } catch (e) {
      this.statsLoading.set(false);
      this.statsError.set(e instanceof Error ? e.message : this.translate.instant('installation.statsError'));
    }
  }

  openSnippet(): void {
    const inst = this.installation();
    if (!inst) return;
    const data: IntegrationSnippetDialogData = { installation: inst };
    this.dialog.open(IntegrationSnippetDialog, { data, width: '900px', maxWidth: '95vw', maxHeight: '90vh' });
  }

  private delete(inst: Installation): void {
    this.deleting.set(true);
    this.installations.delete(inst.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.snackbar.open(this.translate.instant('installation.deleteSuccess', { name: inst.name }), 'OK', { duration: 4000 });
        void this.router.navigate(['/customers', inst.customerId]);
      },
      error: (err: unknown) => {
        this.deleting.set(false);
        this.snackbar.open(
          toUserMessage(err, this.translate.instant('installation.deleteError')),
          'OK',
          { duration: 6000 },
        );
      },
    });
  }
}
