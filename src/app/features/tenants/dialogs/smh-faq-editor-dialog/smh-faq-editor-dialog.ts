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

import { extractExtra, reorderKeys } from '../../../../shared/utils/json-extra';

export interface FaqItem {
  id: string;
  name: string;
  description: string;
}

export type SmhFaqJson = FaqItem[];

export interface SmhFaqEditorDialogData {
  value: SmhFaqJson;
}

@Component({
  selector: 'app-smh-faq-editor-dialog',
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
  ],
  templateUrl: './smh-faq-editor-dialog.html',
  styleUrl: './smh-faq-editor-dialog.scss',
})
export class SmhFaqEditorDialog {
  private readonly fb = inject(FormBuilder);
  readonly dialogRef = inject<MatDialogRef<SmhFaqEditorDialog, SmhFaqJson>>(MatDialogRef);
  readonly data = inject<SmhFaqEditorDialogData>(MAT_DIALOG_DATA);

  // Campi sconosciuti (non gestiti dalla UI) associati a ogni voce, più l'ordine
  // originale delle chiavi: preservati entrambi al salvataggio.
  // Deve essere inizializzato prima di faqArray, che lo usa in makeFaqGroup().
  private readonly itemMetaByGroup = new WeakMap<FormGroup, { extra: Record<string, unknown>; order: string[] }>();

  readonly faqArray: FormArray = this.fb.array(
    (this.data.value ?? []).map((item) => this.makeFaqGroup(item)),
  );

  private makeFaqGroup(item?: Partial<FaqItem>): FormGroup {
    const group = this.fb.nonNullable.group({
      id:          [item?.id          ?? '', Validators.required],
      name:        [item?.name        ?? '', Validators.required],
      description: [item?.description ?? ''],
    });
    this.itemMetaByGroup.set(group, {
      extra: extractExtra(item, ['id', 'name', 'description']),
      order: Object.keys(item ?? {}),
    });
    return group;
  }

  asFormGroup(ctrl: unknown): FormGroup { return ctrl as FormGroup; }

  add(): void {
    this.faqArray.push(this.makeFaqGroup());
  }

  remove(i: number): void {
    this.faqArray.removeAt(i);
  }

  drop(event: CdkDragDrop<FormGroup[]>): void {
    const ctrl = this.faqArray.at(event.previousIndex);
    this.faqArray.removeAt(event.previousIndex, { emitEvent: false });
    this.faqArray.insert(event.currentIndex, ctrl, { emitEvent: false });
    this.faqArray.updateValueAndValidity();
  }

  confirm(): void {
    if (this.faqArray.invalid) {
      this.faqArray.markAllAsTouched();
      return;
    }
    const result: SmhFaqJson = this.faqArray.controls.map((ctrl) => {
      const group = ctrl as FormGroup;
      const meta = this.itemMetaByGroup.get(group);
      const merged = { ...(meta?.extra ?? {}), ...group.getRawValue() };
      return reorderKeys(merged, meta?.order ?? []) as unknown as FaqItem;
    });
    this.dialogRef.close(result);
  }
}
