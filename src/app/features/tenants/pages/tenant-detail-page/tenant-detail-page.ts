import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
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
import { Router } from '@angular/router';

import { toUserMessage } from '../../../../core/http/api-error';
import {
  ConfirmDialog,
  ConfirmDialogData,
} from '../../../../shared/dialogs/confirm-dialog/confirm-dialog';
import { ConfigChannelSection } from '../../components/config-channel-section/config-channel-section';
import { CHANNELS, ChannelId, Tenant } from '../../models';
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
    ConfigChannelSection,
  ],
  templateUrl: './tenant-detail-page.html',
  styleUrl: './tenant-detail-page.scss',
})
export class TenantDetailPage {
  readonly id = input.required<string>();

  private readonly fb = inject(FormBuilder);
  private readonly tenants = inject(TenantService);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(MatSnackBar);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly tenant = signal<Tenant | null>(null);

  readonly channels = CHANNELS;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
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
    this.tenants.get(id).subscribe({
      next: (tenant) => {
        this.tenant.set(tenant);
        this.form.reset({ name: tenant.name, active: tenant.active });
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.tenant.set(null);
        this.loading.set(false);
        this.errorMessage.set(toUserMessage(err, 'Impossibile caricare il tenant.'));
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
        this.snackbar.open('Modifiche salvate.', 'OK', { duration: 3000 });
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.snackbar.open(
          toUserMessage(err, 'Impossibile salvare le modifiche.'),
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
      title: `Eliminare il tenant "${t.name}"?`,
      message:
        'Il tenant verrà disattivato (soft delete). Le configurazioni restano in archivio. Continuare?',
      confirmLabel: 'Elimina',
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
        this.snackbar.open(`Tenant "${t.name}" disattivato.`, 'OK', { duration: 4000 });
        void this.router.navigate(['/installations', t.installationId]);
      },
      error: (err: unknown) => {
        this.deleting.set(false);
        this.snackbar.open(
          toUserMessage(err, 'Impossibile eliminare il tenant.'),
          'OK',
          { duration: 6000 },
        );
      },
    });
  }

  channelLabel(ch: ChannelId): string {
    const labels: Record<ChannelId, string> = { mobile: 'Mobile', web: 'Web', totem: 'Totem' };
    return labels[ch];
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
