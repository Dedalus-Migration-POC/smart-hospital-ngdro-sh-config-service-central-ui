import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { toUserMessage } from '../../../../core/http/api-error';
import { Installation } from '../../models';
import { InstallationService } from '../../services/installations';

export interface RotateApiKeyDialogData {
  installationId: string;
  installationName: string;
}

@Component({
  selector: 'app-rotate-api-key-dialog',
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
  templateUrl: './rotate-api-key-dialog.html',
  styleUrl: './rotate-api-key-dialog.scss',
})
export class RotateApiKeyDialog {
  readonly data = inject<RotateApiKeyDialogData>(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);
  private readonly installations = inject(InstallationService);
  private readonly translate = inject(TranslateService);
  private readonly ref = inject<MatDialogRef<RotateApiKeyDialog, Installation | undefined>>(MatDialogRef);

  readonly form = this.fb.nonNullable.group({
    apiKey: ['', [Validators.required]],
  });

  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly showKey = signal(false);

  toggleVisibility(): void {
    this.showKey.update((v) => !v);
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.errorMessage.set(null);
    this.installations
      .rotateApiKey(this.data.installationId, this.form.getRawValue())
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.ref.close(updated);
        },
        error: (err: unknown) => {
          this.saving.set(false);
          this.errorMessage.set(toUserMessage(err, this.translate.instant('installation.rotateApiKeyError')));
        },
      });
  }
}
