import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { TranslatePipe } from '@ngx-translate/core';

import { extractExtra, reorderKeys } from '../../../../shared/utils/json-extra';

/** Valore di routeName che attiva il rendering SDUI lato mobile (vedi manuale SDUI). */
export const SDUI_ROUTE_NAME = 'SduiRoute';

export interface ServiceItem {
  id: string;
  routeName?: string;
  link?: string;
  hidden: boolean;
  disabled: boolean;
  sduiEntity?: string;
  sduiAuthProvider?: string;
}

export interface SmhServiceConfigJson {
  services: ServiceItem[];
}

export interface SmhServiceConfigEditorDialogData {
  value: SmhServiceConfigJson | ServiceItem[] | unknown;
  /** Entity mobile già rilevate come funzioni SDUI (kind: "screen"|"flow"), da proporre in sduiEntity. */
  availableSduiEntities?: string[];
}

@Component({
  selector: 'app-smh-service-config-editor-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
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

  /** Entity mobile rilevate come funzioni SDUI (kind: "screen"|"flow"), proposte per sduiEntity. */
  readonly availableSduiEntities = this.data.availableSduiEntities ?? [];
  /** Provider di autenticazione dell'entry point (vedi manuale SDUI §1 — SduiAuthProviderRegistry). */
  readonly authProviders = ['app', 'fse_sso', 'none'];

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

  /** Suggerimenti per l'autocomplete di sduiEntity: elenco intero, filtrato in modo case-insensitive sul valore digitato. */
  getAvailableSduiEntities(current: string | null): string[] {
    const q = (current ?? '').toLowerCase();
    if (!q) return this.availableSduiEntities;
    return this.availableSduiEntities.filter((e) => e.toLowerCase().includes(q));
  }

  private makeGroup(item?: Partial<ServiceItem>): FormGroup {
    const group = this.fb.nonNullable.group({
      id:               [item?.id               ?? '', Validators.required],
      routeName:        [item?.routeName         ?? ''],
      link:             [item?.link              ?? ''],
      hidden:           [item?.hidden            ?? false],
      disabled:         [item?.disabled          ?? false],
      sduiEntity:       [item?.sduiEntity        ?? ''],
      sduiAuthProvider: [item?.sduiAuthProvider  ?? ''],
    });
    this.itemMetaByGroup.set(group, {
      extra: extractExtra(item, ['id', 'routeName', 'link', 'hidden', 'disabled', 'sduiEntity', 'sduiAuthProvider']),
      order: Object.keys(item ?? {}),
    });
    return group;
  }

  asFormGroup(ctrl: unknown): FormGroup { return ctrl as FormGroup; }

  /** I campi sduiEntity/sduiAuthProvider hanno senso solo quando routeName è esattamente "SduiRoute". */
  isSduiRoute(ctrl: unknown): boolean {
    return this.asFormGroup(ctrl).controls['routeName'].value?.trim() === SDUI_ROUTE_NAME;
  }

  readonly sduiRouteName = SDUI_ROUTE_NAME;

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
      if (s.routeName?.trim() === SDUI_ROUTE_NAME) {
        if (s.sduiEntity?.trim()) known.sduiEntity = s.sduiEntity.trim();
        if (s.sduiAuthProvider?.trim()) known.sduiAuthProvider = s.sduiAuthProvider.trim();
      }
      const merged = { ...(meta?.extra ?? {}), ...known };
      return reorderKeys(merged, meta?.order ?? []) as unknown as ServiceItem;
    });
    const result = this.isTopLevelArray ? services : { ...this.topExtra, services };
    this.dialogRef.close(
      this.isTopLevelArray ? services : reorderKeys(result as Record<string, unknown>, this.topOrder) as unknown as SmhServiceConfigJson,
    );
  }
}
