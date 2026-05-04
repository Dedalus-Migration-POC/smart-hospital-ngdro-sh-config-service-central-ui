import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { toUserMessage } from '../../../../core/http/api-error';
import { UserService } from '../../services/users';

export interface ChangePasswordDialogData {
  userId: string;
  username: string;
  /** true quando l'admin sta cambiando la propria password. */
  isSelf: boolean;
}

@Component({
  selector: 'app-change-password-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './change-password-dialog.html',
})
export class ChangePasswordDialog {
  readonly data = inject<ChangePasswordDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<ChangePasswordDialog, boolean>);
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);

  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly showCurrent = signal(false);
  readonly showNew = signal(false);

  readonly form = this.fb.nonNullable.group({
    currentPassword: [''],
    newPassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
  });

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) return;
    if (this.data.isSelf && !this.form.controls.currentPassword.value) {
      this.errorMessage.set('La password attuale è obbligatoria.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);
    const v = this.form.getRawValue();

    const req = this.data.isSelf
      ? { currentPassword: v.currentPassword, newPassword: v.newPassword }
      : { newPassword: v.newPassword };

    this.userService.changePassword(this.data.userId, req).subscribe({
      next: () => {
        this.saving.set(false);
        this.ref.close(true);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.errorMessage.set(toUserMessage(err, 'Impossibile cambiare la password.'));
      },
    });
  }

  cancel(): void {
    this.ref.close(false);
  }
}
