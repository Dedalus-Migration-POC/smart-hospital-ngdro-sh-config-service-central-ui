import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { TranslatePipe } from '@ngx-translate/core';

export interface SmhTutorialJson {
  cdnBaseUrl: string;
  youtubePlaylistUrl: string;
}

export interface SmhTutorialEditorDialogData {
  value: SmhTutorialJson;
}

@Component({
  selector: 'app-smh-tutorial-editor-dialog',
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
  templateUrl: './smh-tutorial-editor-dialog.html',
  styleUrl: './smh-tutorial-editor-dialog.scss',
})
export class SmhTutorialEditorDialog {
  private readonly fb = inject(FormBuilder);
  readonly dialogRef = inject<MatDialogRef<SmhTutorialEditorDialog, SmhTutorialJson>>(MatDialogRef);
  readonly data = inject<SmhTutorialEditorDialogData>(MAT_DIALOG_DATA);

  readonly form: FormGroup = this.fb.nonNullable.group({
    cdnBaseUrl:         [this.data.value?.cdnBaseUrl         ?? '', Validators.required],
    youtubePlaylistUrl: [this.data.value?.youtubePlaylistUrl ?? ''],
  });

  confirm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialogRef.close(this.form.getRawValue() as SmhTutorialJson);
  }
}
