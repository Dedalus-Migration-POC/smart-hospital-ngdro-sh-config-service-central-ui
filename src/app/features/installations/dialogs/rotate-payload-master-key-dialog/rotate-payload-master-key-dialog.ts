import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { toUserMessage } from '../../../../core/http/api-error';
import { InstallationService } from '../../services/installations';

export interface RotatePayloadMasterKeyDialogData {
  installationId: string;
  installationName: string;
}

@Component({
  selector: 'app-rotate-payload-master-key-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe,
  ],
  templateUrl: './rotate-payload-master-key-dialog.html',
  styleUrl: './rotate-payload-master-key-dialog.scss',
})
export class RotatePayloadMasterKeyDialog {
  readonly data = inject<RotatePayloadMasterKeyDialogData>(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);
  private readonly installations = inject(InstallationService);
  private readonly snackbar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  /** Risultato: true se è avvenuta una rotazione (il chiamante ricarica l'installation). */
  private readonly ref = inject<MatDialogRef<RotatePayloadMasterKeyDialog, boolean>>(MatDialogRef);

  readonly form = this.fb.nonNullable.group({
    payloadMasterKey: [''],
  });

  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  /** Quando valorizzata, il dialog passa allo stato "risultato" mostrando la chiave generata. */
  readonly resultKey = signal<string | null>(null);

  submit(): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.errorMessage.set(null);
    const trimmed = this.form.controls.payloadMasterKey.value.trim();
    const body = trimmed ? { payloadMasterKey: trimmed } : {};
    this.installations.rotatePayloadMasterKey(this.data.installationId, body).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.resultKey.set(res.payloadMasterKey);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.errorMessage.set(
          toUserMessage(err, this.translate.instant('installation.rotateMasterKeyError')),
        );
      },
    });
  }

  async copyKey(): Promise<void> {
    const key = this.resultKey();
    if (!key) return;
    try {
      await navigator.clipboard.writeText(key);
      this.snackbar.open(this.translate.instant('common.copySuccess'), 'OK', { duration: 2500 });
    } catch {
      this.snackbar.open(this.translate.instant('common.copyError'), 'OK', { duration: 4000 });
    }
  }

  close(): void {
    this.ref.close(this.resultKey() !== null);
  }
}
