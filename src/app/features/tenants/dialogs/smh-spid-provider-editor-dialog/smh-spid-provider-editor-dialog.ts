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
import { extractExtra, reorderKeys } from '../../../../shared/utils/json-extra';

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

  // Campi sconosciuti (non gestiti dalla UI) preservati al salvataggio, con l'ordine
  // originale delle chiavi (sia a livello top che per ciascun provider).
  // Deve essere inizializzato prima di providersArray, che usa itemMetaByGroup in makeProviderGroup().
  private readonly topExtra = extractExtra(this.data.value, ['providers']);
  private readonly topOrder = Object.keys(this.data.value ?? {});
  private readonly itemMetaByGroup = new WeakMap<FormGroup, { extra: Record<string, unknown>; order: string[] }>();

  readonly providersArray: FormArray = this.fb.array(
    (this.data.value.providers ?? []).map((p) => this.makeProviderGroup(p)),
  );

  private makeProviderGroup(p?: Partial<SpidProvider>): FormGroup {
    const group = this.fb.nonNullable.group({
      id:      [p?.id      ?? '', Validators.required],
      name:    [p?.name    ?? '', Validators.required],
      svgCode: [p?.svgCode ?? ''],
    });
    this.itemMetaByGroup.set(group, {
      extra: extractExtra(p, ['id', 'name', 'svgCode']),
      order: Object.keys(p ?? {}),
    });
    return group;
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
    const providers: SpidProvider[] = this.providersArray.controls.map((ctrl) => {
      const group = ctrl as FormGroup;
      const meta = this.itemMetaByGroup.get(group);
      const merged = { ...(meta?.extra ?? {}), ...group.getRawValue() };
      return reorderKeys(merged, meta?.order ?? []) as unknown as SpidProvider;
    });
    const result = { ...this.topExtra, providers };
    this.dialogRef.close(reorderKeys(result, this.topOrder) as unknown as SmhSpidProviderJson);
  }
}
