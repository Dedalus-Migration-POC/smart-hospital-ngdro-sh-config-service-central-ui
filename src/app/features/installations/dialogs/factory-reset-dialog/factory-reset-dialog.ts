import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
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

import { TranslatePipe } from '@ngx-translate/core';

export interface FactoryResetDialogData {
  installationName: string;
}

export interface FactoryResetDialogResult {
  resetPassword: string;
}

@Component({
  selector: 'app-factory-reset-dialog',
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
    MatCheckboxModule,
    TranslatePipe,
  ],
  templateUrl: './factory-reset-dialog.html',
})
export class FactoryResetDialog {
  readonly data = inject<FactoryResetDialogData>(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);
  private readonly ref = inject<MatDialogRef<FactoryResetDialog, FactoryResetDialogResult | undefined>>(MatDialogRef);

  readonly form = this.fb.nonNullable.group({
    confirmed: [false, Validators.requiredTrue],
    resetPassword: ['', Validators.required],
  });

  readonly showPassword = signal(false);

  toggleVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.ref.close({ resetPassword: this.form.getRawValue().resetPassword });
  }
}
