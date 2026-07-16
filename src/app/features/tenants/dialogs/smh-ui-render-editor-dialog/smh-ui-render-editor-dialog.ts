import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';

import { TranslatePipe } from '@ngx-translate/core';

import { SvgUploadField } from '../../../../shared/components/svg-upload-field/svg-upload-field';

export interface ServiceItem {
  id: string;
  title: string;
  subtitle: string;
  svg_icon: string;
  show_lock: boolean;
  link?: string;
  disabled?: boolean;
}

export interface WidgetItem {
  id: string;
}

export interface HeaderItem {
  title: string;
  subtitle: string;
  svg_icon: string;
  show_card: boolean;
}

export interface SmhUiRenderJson {
  login?: { svg_icon?: string };
  splash?: { svg_main_icon?: string };
  home?: {
    app_bar?: { title?: string; svg_icon?: string };
    search_bar?: { hint_label?: string };
    header?: HeaderItem[];
    body?: Record<string, ServiceItem[]>;
    widgets?: WidgetItem[];
    widget?: WidgetItem[];
  };
  navigation_bar?: { services?: ServiceItem[] };
}

export interface SmhUiRenderEditorDialogData {
  value: SmhUiRenderJson;
  availableServiceIds?: string[];
}

@Component({
  selector: 'app-smh-ui-render-editor-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatTabsModule,
    MatTooltipModule,
    MatCheckboxModule,
    MatAutocompleteModule,
    DragDropModule,
    TranslatePipe,
    SvgUploadField,
  ],
  templateUrl: './smh-ui-render-editor-dialog.html',
  styleUrl: './smh-ui-render-editor-dialog.scss',
})
export class SmhUiRenderEditorDialog {
  private readonly fb = inject(FormBuilder);
  readonly dialogRef = inject<MatDialogRef<SmhUiRenderEditorDialog, SmhUiRenderJson>>(MatDialogRef);
  readonly data = inject<SmhUiRenderEditorDialogData>(MAT_DIALOG_DATA);

  // Campi sconosciuti (non gestiti dalla UI) associati a ogni FormGroup di lista
  // (header/body items/widgets/navigation services): permette di non perderli al salvataggio.
  private readonly extraByGroup = new WeakMap<FormGroup, Record<string, unknown>>();

  readonly form = this.buildForm(this.data.value);
  readonly availableServiceIds: string[] = this.data.availableServiceIds ?? [];

  // Ordine originale delle chiavi nel JSON caricato: preservato al salvataggio
  // per non spostare sezioni (es. "widgets") che il DB conserva come TEXT ordinato.
  private readonly originalTopKeys = Object.keys(this.data.value ?? {});
  private readonly originalHomeKeys = Object.keys(this.data.value?.home ?? {});
  // Alcuni JSON storici usano la chiave singolare "widget" invece di "widgets":
  // al salvataggio va preservato il nome originale per non alterare lo schema.
  private readonly widgetsKeyName: 'widget' | 'widgets' =
    this.data.value?.home && 'widget' in this.data.value.home ? 'widget' : 'widgets';

  // Campi sconosciuti (non gestiti dalla UI) sui singoli oggetti: vengono
  // ripristinati al salvataggio così l'editor grafico non li elimina.
  private readonly loginExtra = this.extractExtra(this.data.value?.login, ['svg_icon']);
  private readonly splashExtra = this.extractExtra(this.data.value?.splash, ['svg_main_icon']);
  private readonly appBarExtra = this.extractExtra(this.data.value?.home?.app_bar, ['title', 'svg_icon']);
  private readonly searchBarExtra = this.extractExtra(this.data.value?.home?.search_bar, ['hint_label']);
  private readonly homeExtra = this.extractExtra(this.data.value?.home, [
    'app_bar', 'search_bar', 'header', 'body', 'widgets', 'widget',
  ]);
  private readonly navigationBarExtra = this.extractExtra(this.data.value?.navigation_bar, ['services']);
  private readonly topExtra = this.extractExtra(
    this.data.value as Record<string, unknown> | undefined,
    ['login', 'splash', 'home', 'navigation_bar'],
  );

  // Restituisce le proprietà di `obj` non presenti in `knownKeys`.
  private extractExtra(obj: object | undefined | null, knownKeys: string[]): Record<string, unknown> {
    const extra: Record<string, unknown> = {};
    if (!obj) return extra;
    for (const [key, value] of Object.entries(obj)) {
      if (!knownKeys.includes(key)) extra[key] = value;
    }
    return extra;
  }

  private allUsedIds(): Set<string> {
    const ids = new Set<string>();
    for (let ci = 0; ci < this.bodyArray.length; ci++) {
      const items = this.getCategoryItemsArray(ci);
      for (let ii = 0; ii < items.length; ii++) {
        const id = ((items.at(ii) as FormGroup).get('id')?.value ?? '') as string;
        if (id) ids.add(id);
      }
    }
    for (let i = 0; i < this.navServicesArray.length; i++) {
      const id = ((this.navServicesArray.at(i) as FormGroup).get('id')?.value ?? '') as string;
      if (id) ids.add(id);
    }
    return ids;
  }

  // IDs disponibili per un campo specifico: esclude gli altri già usati
  getAvailableIds(currentId: string): string[] {
    const used = this.allUsedIds();
    return this.availableServiceIds.filter((id) => !used.has(id) || id === currentId);
  }

  get loginGroup(): FormGroup { return this.form.get('login') as FormGroup; }
  get splashGroup(): FormGroup { return this.form.get('splash') as FormGroup; }
  get homeGroup(): FormGroup { return this.form.get('home') as FormGroup; }
  get appBarGroup(): FormGroup { return this.homeGroup.get('app_bar') as FormGroup; }
  get searchBarGroup(): FormGroup { return this.homeGroup.get('search_bar') as FormGroup; }
  get headerArray(): FormArray { return this.homeGroup.get('header') as FormArray; }
  get bodyArray(): FormArray { return this.homeGroup.get('body') as FormArray; }
  get widgetsArray(): FormArray { return this.homeGroup.get('widgets') as FormArray; }
  get navServicesArray(): FormArray { return (this.form.get('navigation_bar') as FormGroup).get('services') as FormArray; }

  getCategoryItemsArray(catIndex: number): FormArray {
    return (this.bodyArray.at(catIndex) as FormGroup).get('items') as FormArray;
  }

  asFormGroup(ctrl: unknown): FormGroup { return ctrl as FormGroup; }

  private buildForm(v: SmhUiRenderJson): FormGroup {
    const body: FormGroup[] = Object.entries(v.home?.body ?? {}).map(
      ([name, items]) => this.makeCategoryGroup(name, items),
    );
    return this.fb.nonNullable.group({
      login: this.fb.nonNullable.group({
        svg_icon: [v.login?.svg_icon ?? ''],
      }),
      splash: this.fb.nonNullable.group({
        svg_main_icon: [v.splash?.svg_main_icon ?? ''],
      }),
      home: this.fb.nonNullable.group({
        app_bar: this.fb.nonNullable.group({
          title: [v.home?.app_bar?.title ?? ''],
          svg_icon: [v.home?.app_bar?.svg_icon ?? ''],
        }),
        search_bar: this.fb.nonNullable.group({
          hint_label: [v.home?.search_bar?.hint_label ?? ''],
        }),
        header: this.fb.array((v.home?.header ?? []).map((h) => this.makeHeaderGroup(h))),
        body: this.fb.array(body),
        widgets: this.fb.array((v.home?.widgets ?? v.home?.widget ?? []).map((w) => this.makeWidgetGroup(w))),
      }),
      navigation_bar: this.fb.nonNullable.group({
        services: this.fb.array((v.navigation_bar?.services ?? []).map((s) => this.makeServiceGroup(s))),
      }),
    });
  }

  private makeServiceGroup(item?: Partial<ServiceItem>): FormGroup {
    const group = this.fb.nonNullable.group({
      id: [item?.id ?? ''],
      title: [item?.title ?? '', Validators.required],
      subtitle: [item?.subtitle ?? ''],
      svg_icon: [item?.svg_icon ?? ''],
      show_lock: [item?.show_lock ?? false],
      link: [item?.link ?? ''],
    });
    this.extraByGroup.set(
      group,
      this.extractExtra(item, ['id', 'title', 'subtitle', 'svg_icon', 'show_lock', 'link']),
    );
    return group;
  }

  private makeHeaderGroup(item?: Partial<HeaderItem>): FormGroup {
    const group = this.fb.nonNullable.group({
      title: [item?.title ?? '', Validators.required],
      subtitle: [item?.subtitle ?? ''],
      svg_icon: [item?.svg_icon ?? ''],
      show_card: [item?.show_card ?? true],
    });
    this.extraByGroup.set(group, this.extractExtra(item, ['title', 'subtitle', 'svg_icon', 'show_card']));
    return group;
  }

  private makeWidgetGroup(item?: Partial<WidgetItem>): FormGroup {
    const group = this.fb.nonNullable.group({
      id: [item?.id ?? '', Validators.required],
    });
    this.extraByGroup.set(group, this.extractExtra(item, ['id']));
    return group;
  }

  private makeCategoryGroup(name: string, items: Partial<ServiceItem>[] = []): FormGroup {
    return this.fb.nonNullable.group({
      categoryName: [name, Validators.required],
      items: this.fb.array(items.map((i) => this.makeServiceGroup(i))),
    });
  }

  addHeader(): void {
    this.headerArray.push(this.makeHeaderGroup());
  }

  removeHeader(i: number): void {
    this.headerArray.removeAt(i);
  }

  dropHeader(event: CdkDragDrop<FormGroup[]>): void {
    this.moveInArray(this.headerArray, event.previousIndex, event.currentIndex);
  }

  addCategory(): void {
    this.bodyArray.push(this.makeCategoryGroup(''));
  }

  removeCategory(i: number): void {
    this.bodyArray.removeAt(i);
  }

  dropCategory(event: CdkDragDrop<FormGroup[]>): void {
    this.moveInArray(this.bodyArray, event.previousIndex, event.currentIndex);
  }

  addItem(catIndex: number): void {
    this.getCategoryItemsArray(catIndex).push(this.makeServiceGroup());
  }

  removeItem(catIndex: number, itemIndex: number): void {
    this.getCategoryItemsArray(catIndex).removeAt(itemIndex);
  }

  dropItem(catIndex: number, event: CdkDragDrop<FormGroup[]>): void {
    this.moveInArray(this.getCategoryItemsArray(catIndex), event.previousIndex, event.currentIndex);
  }

  addWidget(): void {
    this.widgetsArray.push(this.makeWidgetGroup());
  }

  removeWidget(i: number): void {
    this.widgetsArray.removeAt(i);
  }

  addNavService(): void {
    this.navServicesArray.push(this.makeServiceGroup());
  }

  removeNavService(i: number): void {
    this.navServicesArray.removeAt(i);
  }

  dropNavService(event: CdkDragDrop<FormGroup[]>): void {
    this.moveInArray(this.navServicesArray, event.previousIndex, event.currentIndex);
  }

  confirm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const header = this.readGroupArray<HeaderItem>(this.headerArray);
    const widgets = this.readGroupArray<WidgetItem>(this.widgetsArray);
    const navServices = this.readGroupArray<ServiceItem>(this.navServicesArray);

    const body: Record<string, ServiceItem[]> = {};
    for (const catCtrl of this.bodyArray.controls) {
      const cat = catCtrl as FormGroup;
      const categoryName = cat.get('categoryName')?.value as string;
      body[categoryName] = this.readGroupArray<ServiceItem>(cat.get('items') as FormArray);
    }

    const homeValues: Record<string, unknown> = {
      ...this.homeExtra,
      app_bar: { ...this.appBarExtra, ...this.appBarGroup.getRawValue() },
      search_bar: { ...this.searchBarExtra, ...this.searchBarGroup.getRawValue() },
      header,
      body,
      ...(widgets.length > 0 ? { [this.widgetsKeyName]: widgets } : {}),
    };
    const home = this.reorderKeys(homeValues, this.originalHomeKeys) as SmhUiRenderJson['home'];

    const topValues: Record<string, unknown> = {
      ...this.topExtra,
      login: { ...this.loginExtra, ...this.loginGroup.getRawValue() },
      splash: { ...this.splashExtra, ...this.splashGroup.getRawValue() },
      home,
      navigation_bar: { ...this.navigationBarExtra, services: navServices },
    };
    const result = this.reorderKeys(topValues, this.originalTopKeys) as SmhUiRenderJson;

    this.dialogRef.close(result);
  }

  // Legge i valori di un FormArray unendo, per ciascun elemento, i campi gestiti
  // dalla UI con gli eventuali campi sconosciuti catturati al caricamento.
  private readGroupArray<T>(arr: FormArray): T[] {
    return arr.controls.map((ctrl) => {
      const group = ctrl as FormGroup;
      return { ...this.extraByGroup.get(group), ...group.getRawValue() } as T;
    });
  }

  // Riordina le chiavi di `values` secondo `originalOrder` (chiavi presenti nel JSON
  // caricato inizialmente), lasciando in coda eventuali chiavi nuove non presenti prima.
  private reorderKeys(
    values: Record<string, unknown>,
    originalOrder: string[],
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const key of originalOrder) {
      if (key in values) {
        result[key] = values[key];
      }
    }
    for (const key of Object.keys(values)) {
      if (!(key in result)) {
        result[key] = values[key];
      }
    }
    return result;
  }

  private moveInArray(arr: FormArray, from: number, to: number): void {
    const ctrl = arr.at(from);
    arr.removeAt(from, { emitEvent: false });
    arr.insert(to, ctrl, { emitEvent: false });
    arr.updateValueAndValidity();
  }
}
