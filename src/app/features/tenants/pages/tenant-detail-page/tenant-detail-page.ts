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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AuthService } from '../../../../core/auth/auth';
import { toUserMessage } from '../../../../core/http/api-error';
import {
  ConfirmDialog,
  ConfirmDialogData,
} from '../../../../shared/dialogs/confirm-dialog/confirm-dialog';
import { ConfigChannelSection } from '../../components/config-channel-section/config-channel-section';
import {
  ConfigApiDocDialog,
  ConfigApiDocDialogData,
} from '../../dialogs/config-api-doc-dialog/config-api-doc-dialog';
import {
  ConfigEndpointsDialog,
  ConfigEndpointsDialogData,
} from '../../dialogs/config-endpoints-dialog/config-endpoints-dialog';
import { CHANNELS, ChannelId, PushNotificationConfig, Tenant } from '../../models';
import { TenantService } from '../../services/tenants';

@Component({
  selector: 'app-tenant-detail-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatTooltipModule,
    ConfigChannelSection,
    TranslatePipe,
  ],
  templateUrl: './tenant-detail-page.html',
  styleUrl: './tenant-detail-page.scss',
})
export class TenantDetailPage {
  readonly id = input.required<string>();

  private readonly fb = inject(FormBuilder);
  private readonly tenants = inject(TenantService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  readonly canManageTenants = computed(() => {
    const role = this.auth.currentUser()?.role;
    return role === 'ADMIN' || role === 'DELIVERY';
  });
  readonly isAdmin = computed(() => this.auth.currentUser()?.role === 'ADMIN');

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly tenant = signal<Tenant | null>(null);

  readonly pushConfig = signal<PushNotificationConfig | null>(null);
  readonly pushConfigLoading = signal(false);
  readonly pushConfigSaving = signal(false);

  readonly channels = CHANNELS;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    active: [true],
  });

  readonly pushForm = this.fb.nonNullable.group({
    notificatorUrl: ['', [Validators.required, Validators.maxLength(512)]],
    notificatorTenant: ['', [Validators.required, Validators.maxLength(255)]],
    apiKey: ['', [Validators.required, Validators.maxLength(512)]],
    secret: ['', [Validators.required, Validators.maxLength(512)]],
  });

  constructor() {
    effect(() => {
      const id = this.id();
      this.load(id);
      this.loadPushConfig(id);
    });
  }

  private load(id: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.tenants.get(id).subscribe({
      next: (tenant) => {
        this.tenant.set(tenant);
        this.form.reset({ name: tenant.name, active: tenant.active });
        if (!this.canManageTenants()) this.form.disable();
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.tenant.set(null);
        this.loading.set(false);
        this.errorMessage.set(toUserMessage(err, this.translate.instant('product.loadDetailError')));
      },
    });
  }

  private loadPushConfig(id: string): void {
    this.pushConfigLoading.set(true);
    this.tenants.getPushConfig(id).subscribe({
      next: (cfg) => {
        this.pushConfig.set(cfg);
        this.pushForm.reset({
          notificatorUrl: cfg.notificatorUrl ?? '',
          notificatorTenant: cfg.notificatorTenant ?? '',
          apiKey: '',
          secret: '',
        });
        if (!this.isAdmin()) this.pushForm.disable();
        this.pushConfigLoading.set(false);
      },
      error: () => {
        this.pushConfig.set(null);
        this.pushConfigLoading.set(false);
      },
    });
  }

  goToInstallation(): void {
    const t = this.tenant();
    if (t) {
      void this.router.navigate(['/installations', t.installationId]);
    } else {
      void this.router.navigate(['/customers']);
    }
  }

  save(): void {
    const t = this.tenant();
    if (!t || this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const v = this.form.getRawValue();
    this.tenants.update(t.id, { name: v.name, active: v.active }).subscribe({
      next: (updated) => {
        this.tenant.set(updated);
        this.form.reset({ name: updated.name, active: updated.active });
        this.saving.set(false);
        this.snackbar.open(this.translate.instant('common.saveSuccess'), 'OK', { duration: 3000 });
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.snackbar.open(
          toUserMessage(err, this.translate.instant('common.saveError')),
          'OK',
          { duration: 6000 },
        );
      },
    });
  }

  savePushConfig(): void {
    const t = this.tenant();
    if (!t || this.pushForm.invalid || this.pushConfigSaving()) {
      this.pushForm.markAllAsTouched();
      return;
    }
    this.pushConfigSaving.set(true);
    const v = this.pushForm.getRawValue();
    this.tenants.savePushConfig(t.id, {
      notificatorUrl: v.notificatorUrl,
      notificatorTenant: v.notificatorTenant,
      apiKey: v.apiKey,
      secret: v.secret,
    }).subscribe({
      next: (cfg) => {
        this.pushConfig.set(cfg);
        this.pushForm.reset({
          notificatorUrl: cfg.notificatorUrl,
          notificatorTenant: cfg.notificatorTenant,
          apiKey: '',
          secret: '',
        });
        this.pushConfigSaving.set(false);
        this.snackbar.open(this.translate.instant('push.configSaved'), 'OK', { duration: 3000 });
      },
      error: (err: unknown) => {
        this.pushConfigSaving.set(false);
        this.snackbar.open(
          toUserMessage(err, this.translate.instant('push.configSaveError')),
          'OK',
          { duration: 6000 },
        );
      },
    });
  }

  confirmDelete(): void {
    const t = this.tenant();
    if (!t) return;
    const data: ConfirmDialogData = {
      title: this.translate.instant('product.deleteConfirmTitle', { name: t.name }),
      message: this.translate.instant('product.deleteConfirmMessage'),
      confirmLabel: this.translate.instant('product.deleteConfirmButton'),
      destructive: true,
    };
    const ref = this.dialog.open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
      data,
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) this.delete(t);
    });
  }

  private delete(t: Tenant): void {
    this.deleting.set(true);
    this.tenants.delete(t.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.snackbar.open(this.translate.instant('product.deleteSuccess', { name: t.name }), 'OK', { duration: 4000 });
        void this.router.navigate(['/installations', t.installationId]);
      },
      error: (err: unknown) => {
        this.deleting.set(false);
        this.snackbar.open(
          toUserMessage(err, this.translate.instant('product.deleteError')),
          'OK',
          { duration: 6000 },
        );
      },
    });
  }

  openEndpoints(t: Tenant, ch: ChannelId): void {
    const data: ConfigEndpointsDialogData = {
      tenantId: t.id,
      tenantSlug: t.slug,
      installationId: t.installationId,
      channelId: ch,
      channelLabel: this.channelLabel(ch),
    };
    this.dialog.open<ConfigEndpointsDialog, ConfigEndpointsDialogData>(ConfigEndpointsDialog, { data });
  }

  openApiDoc(t: Tenant, ch: ChannelId): void {
    const data: ConfigApiDocDialogData = {
      tenantSlug: t.slug,
      channelId: ch,
      channelLabel: this.channelLabel(ch),
      baseUrl: '',
    };
    this.dialog.open<ConfigApiDocDialog, ConfigApiDocDialogData>(ConfigApiDocDialog, { data });
  }

  channelLabel(ch: ChannelId): string {
    const keys: Record<ChannelId, string> = {
      mobile: 'product.channelMobile',
      web: 'product.channelWeb',
      totem: 'product.channelTotem',
    };
    return this.translate.instant(keys[ch]);
  }

  channelIcon(ch: ChannelId): string {
    const icons: Record<ChannelId, string> = {
      mobile: 'smartphone',
      web: 'language',
      totem: 'monitor',
    };
    return icons[ch];
  }
}
