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

import { AuthService } from '../../../../core/auth/auth';
import { toUserMessage } from '../../../../core/http/api-error';
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
  ShowPayloadMasterKeyDialog,
  ShowPayloadMasterKeyDialogData,
} from '../../dialogs/show-payload-master-key-dialog/show-payload-master-key-dialog';
import { InstallationTenantsSection } from '../../../tenants/components/installation-tenants-section/installation-tenants-section';
import { Installation, InstallationStats, INSTALLATION_BASE_URL_PATTERN } from '../../models';
import { InstallationService } from '../../services/installations';

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
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  readonly isAdmin = computed(() => this.auth.currentUser()?.role === 'ADMIN');

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal(false);
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
      error: (err: unknown) => {
        this.statsLoading.set(false);
        this.statsError.set(toUserMessage(err, this.translate.instant('installation.statsError')));
      },
    });
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
