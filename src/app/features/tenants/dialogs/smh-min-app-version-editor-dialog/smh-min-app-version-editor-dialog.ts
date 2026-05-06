import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { TranslatePipe } from '@ngx-translate/core';

export interface SmhMinAppVersionJson {
  ios: string;
  android: string;
}

export interface SmhMinAppVersionEditorDialogData {
  value: SmhMinAppVersionJson;
}

@Component({
  selector: 'app-smh-min-app-version-editor-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    TranslatePipe,
  ],
  templateUrl: './smh-min-app-version-editor-dialog.html',
  styleUrl: './smh-min-app-version-editor-dialog.scss',
})
export class SmhMinAppVersionEditorDialog {
  private readonly fb = inject(FormBuilder);
  readonly dialogRef = inject<MatDialogRef<SmhMinAppVersionEditorDialog, SmhMinAppVersionJson>>(MatDialogRef);
  readonly data = inject<SmhMinAppVersionEditorDialogData>(MAT_DIALOG_DATA);

  readonly form: FormGroup = this.fb.nonNullable.group({
    ios:     [this.data.value?.ios     ?? '1.0', Validators.required],
    android: [this.data.value?.android ?? '1.0', Validators.required],
  });

  confirm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialogRef.close(this.form.getRawValue() as SmhMinAppVersionJson);
  }
}
