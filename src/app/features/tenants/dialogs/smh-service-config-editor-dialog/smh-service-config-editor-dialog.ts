import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { TranslatePipe } from '@ngx-translate/core';

import { extractExtra, reorderKeys } from '../../../../shared/utils/json-extra';

export interface ServiceItem {
  id: string;
  routeName?: string;
  link?: string;
  hidden: boolean;
  disabled: boolean;
}

export interface SmhServiceConfigJson {
  services: ServiceItem[];
}

export interface SmhServiceConfigEditorDialogData {
  value: SmhServiceConfigJson | ServiceItem[] | unknown;
}

@Component({
  selector: 'app-smh-service-config-editor-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSlideToggleModule,
    MatTooltipModule,
    DragDropModule,
    TranslatePipe,
  ],
  templateUrl: './smh-service-config-editor-dialog.html',
  styleUrl: './smh-service-config-editor-dialog.scss',
})
export class SmhServiceConfigEditorDialog {
  private readonly fb = inject(FormBuilder);
  readonly dialogRef = inject<MatDialogRef<SmhServiceConfigEditorDialog, SmhServiceConfigJson | ServiceItem[]>>(MatDialogRef);
  readonly data = inject<SmhServiceConfigEditorDialogData>(MAT_DIALOG_DATA);

  // Campi sconosciuti (non gestiti dalla UI) sui singoli servizi, più l'ordine
  // originale delle chiavi: preservati entrambi al salvataggio.
  // Deve essere inizializzato prima di servicesArray, che lo usa in makeGroup().
  private readonly itemMetaByGroup = new WeakMap<FormGroup, { extra: Record<string, unknown>; order: string[] }>();

  readonly servicesArray: FormArray = this.fb.array(this.parseServices().map((s) => this.makeGroup(s)));

  // Chiavi extra al livello superiore, quando il JSON originale è un oggetto `{ services: [...], ... }`.
  private readonly topExtra: Record<string, unknown> =
    this.data.value && typeof this.data.value === 'object' && !Array.isArray(this.data.value)
      ? extractExtra(this.data.value as object, ['services'])
      : {};
  private readonly topOrder: string[] =
    this.data.value && typeof this.data.value === 'object' && !Array.isArray(this.data.value)
      ? Object.keys(this.data.value as object)
      : [];
  // Se il JSON originale è un array puro, il risultato deve restare un array puro.
  private readonly isTopLevelArray = Array.isArray(this.data.value);

  private parseServices(): ServiceItem[] {
    const v = this.data.value;
    if (Array.isArray(v)) return v as ServiceItem[];
    if (v && typeof v === 'object' && 'services' in (v as object)) {
      return ((v as SmhServiceConfigJson).services ?? []);
    }
    return [];
  }

  private makeGroup(item?: Partial<ServiceItem>): FormGroup {
    const group = this.fb.nonNullable.group({
      id:        [item?.id        ?? '', Validators.required],
      routeName: [item?.routeName ?? ''],
      link:      [item?.link      ?? ''],
      hidden:    [item?.hidden    ?? false],
      disabled:  [item?.disabled  ?? false],
    });
    this.itemMetaByGroup.set(group, {
      extra: extractExtra(item, ['id', 'routeName', 'link', 'hidden', 'disabled']),
      order: Object.keys(item ?? {}),
    });
    return group;
  }

  asFormGroup(ctrl: unknown): FormGroup { return ctrl as FormGroup; }

  add(): void {
    this.servicesArray.push(this.makeGroup());
  }

  remove(i: number): void {
    this.servicesArray.removeAt(i);
  }

  drop(event: CdkDragDrop<FormGroup[]>): void {
    const ctrl = this.servicesArray.at(event.previousIndex);
    this.servicesArray.removeAt(event.previousIndex, { emitEvent: false });
    this.servicesArray.insert(event.currentIndex, ctrl, { emitEvent: false });
    this.servicesArray.updateValueAndValidity();
  }

  confirm(): void {
    if (this.servicesArray.invalid) {
      this.servicesArray.markAllAsTouched();
      return;
    }
    const services: ServiceItem[] = this.servicesArray.controls.map((ctrl) => {
      const group = ctrl as FormGroup;
      const meta = this.itemMetaByGroup.get(group);
      const s = group.getRawValue() as ServiceItem;
      const known: ServiceItem = { id: s.id, hidden: s.hidden, disabled: s.disabled };
      if (s.routeName?.trim()) known.routeName = s.routeName.trim();
      if (s.link?.trim()) known.link = s.link.trim();
      const merged = { ...(meta?.extra ?? {}), ...known };
      return reorderKeys(merged, meta?.order ?? []) as unknown as ServiceItem;
    });
    const result = this.isTopLevelArray ? services : { ...this.topExtra, services };
    this.dialogRef.close(
      this.isTopLevelArray ? services : reorderKeys(result as Record<string, unknown>, this.topOrder) as unknown as SmhServiceConfigJson,
    );
  }
}
