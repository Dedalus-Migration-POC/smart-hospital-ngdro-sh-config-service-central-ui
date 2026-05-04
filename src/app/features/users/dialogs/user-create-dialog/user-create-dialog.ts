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
import { MatSelectModule } from '@angular/material/select';

import { toUserMessage } from '../../../../core/http/api-error';
import { AVAILABLE_ROLES, User, USERNAME_PATTERN } from '../../models';
import { UserService } from '../../services/users';

export type UserCreateDialogData = Record<string, never>;

@Component({
  selector: 'app-user-create-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './user-create-dialog.html',
})
export class UserCreateDialog {
  readonly data = inject<UserCreateDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<UserCreateDialog, User>);
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);

  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly showPassword = signal(false);
  readonly availableRoles = AVAILABLE_ROLES;

  readonly form = this.fb.nonNullable.group({
    username: [
      '',
      [Validators.required, Validators.maxLength(100), Validators.pattern(USERNAME_PATTERN)],
    ],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
    role: ['ADMIN', [Validators.required]],
  });

  togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) return;

    this.saving.set(true);
    this.errorMessage.set(null);
    const v = this.form.getRawValue();

    this.userService.create({ username: v.username, password: v.password, role: v.role }).subscribe({
      next: (user) => {
        this.saving.set(false);
        this.ref.close(user);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.errorMessage.set(toUserMessage(err, 'Impossibile creare l\'utente.'));
      },
    });
  }

  cancel(): void {
    this.ref.close();
  }
}
