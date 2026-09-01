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

export interface NewsItem {
  title: string;
  url: string;
}

export type SmhNewsJson = NewsItem[];

export interface SmhNewsEditorDialogData {
  value: SmhNewsJson;
}

@Component({
  selector: 'app-smh-news-editor-dialog',
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
  templateUrl: './smh-news-editor-dialog.html',
  styleUrl: './smh-news-editor-dialog.scss',
})
export class SmhNewsEditorDialog {
  private readonly fb = inject(FormBuilder);
  readonly dialogRef = inject<MatDialogRef<SmhNewsEditorDialog, SmhNewsJson>>(MatDialogRef);
  readonly data = inject<SmhNewsEditorDialogData>(MAT_DIALOG_DATA);

  // Campi sconosciuti (non gestiti dalla UI) associati a ogni voce, più l'ordine
  // originale delle chiavi: preservati entrambi al salvataggio.
  // Deve essere inizializzato prima di newsArray, che lo usa in makeGroup().
  private readonly itemMetaByGroup = new WeakMap<FormGroup, { extra: Record<string, unknown>; order: string[] }>();

  readonly newsArray: FormArray = this.fb.array(
    (this.data.value ?? []).map((item) => this.makeGroup(item)),
  );

  private makeGroup(item?: Partial<NewsItem>): FormGroup {
    const group = this.fb.nonNullable.group({
      title: [item?.title ?? '', Validators.required],
      url:   [item?.url   ?? '', Validators.required],
    });
    this.itemMetaByGroup.set(group, {
      extra: extractExtra(item, ['title', 'url']),
      order: Object.keys(item ?? {}),
    });
    return group;
  }

  asFormGroup(ctrl: unknown): FormGroup { return ctrl as FormGroup; }

  add(): void {
    this.newsArray.push(this.makeGroup());
  }

  remove(i: number): void {
    this.newsArray.removeAt(i);
  }

  drop(event: CdkDragDrop<FormGroup[]>): void {
    const ctrl = this.newsArray.at(event.previousIndex);
    this.newsArray.removeAt(event.previousIndex, { emitEvent: false });
    this.newsArray.insert(event.currentIndex, ctrl, { emitEvent: false });
    this.newsArray.updateValueAndValidity();
  }

  confirm(): void {
    if (this.newsArray.invalid) {
      this.newsArray.markAllAsTouched();
      return;
    }
    const result: SmhNewsJson = this.newsArray.controls.map((ctrl) => {
      const group = ctrl as FormGroup;
      const meta = this.itemMetaByGroup.get(group);
      const merged = { ...(meta?.extra ?? {}), ...group.getRawValue() };
      return reorderKeys(merged, meta?.order ?? []) as unknown as NewsItem;
    });
    this.dialogRef.close(result);
  }
}
