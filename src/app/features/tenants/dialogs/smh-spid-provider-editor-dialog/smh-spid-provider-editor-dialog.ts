import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';

import { TranslatePipe } from '@ngx-translate/core';

import { SvgUploadField } from '../../../../shared/components/svg-upload-field/svg-upload-field';

export interface SpidProvider {
  id: string;
  name: string;
  svgCode: string;
}

export interface SmhSpidProviderJson {
  providers: SpidProvider[];
}

export interface SmhSpidProviderEditorDialogData {
  value: SmhSpidProviderJson;
}

@Component({
  selector: 'app-smh-spid-provider-editor-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatTooltipModule,
    DragDropModule,
    TranslatePipe,
    SvgUploadField,
  ],
  templateUrl: './smh-spid-provider-editor-dialog.html',
  styleUrl: './smh-spid-provider-editor-dialog.scss',
})
export class SmhSpidProviderEditorDialog {
  private readonly fb = inject(FormBuilder);
  readonly dialogRef = inject<MatDialogRef<SmhSpidProviderEditorDialog, SmhSpidProviderJson>>(MatDialogRef);
  readonly data = inject<SmhSpidProviderEditorDialogData>(MAT_DIALOG_DATA);

  readonly providersArray: FormArray = this.fb.array(
    (this.data.value.providers ?? []).map((p) => this.makeProviderGroup(p)),
  );

  private makeProviderGroup(p?: Partial<SpidProvider>): FormGroup {
    return this.fb.nonNullable.group({
      id:      [p?.id      ?? '', Validators.required],
      name:    [p?.name    ?? '', Validators.required],
      svgCode: [p?.svgCode ?? ''],
    });
  }

  asFormGroup(ctrl: unknown): FormGroup { return ctrl as FormGroup; }

  add(): void {
    this.providersArray.push(this.makeProviderGroup());
  }

  remove(i: number): void {
    this.providersArray.removeAt(i);
  }

  drop(event: CdkDragDrop<FormGroup[]>): void {
    const ctrl = this.providersArray.at(event.previousIndex);
    this.providersArray.removeAt(event.previousIndex, { emitEvent: false });
    this.providersArray.insert(event.currentIndex, ctrl, { emitEvent: false });
    this.providersArray.updateValueAndValidity();
  }

  confirm(): void {
    if (this.providersArray.invalid) {
      this.providersArray.markAllAsTouched();
      return;
    }
    const providers = this.providersArray.getRawValue() as SpidProvider[];
    this.dialogRef.close({ providers });
  }
}
