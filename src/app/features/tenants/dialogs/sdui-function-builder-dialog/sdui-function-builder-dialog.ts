import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS, MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { catchError, of } from 'rxjs';

import { TenantService } from '../../services/tenants';
import {
  SDUI_ACTION_TYPES,
  SDUI_TEXT_CASES,
  SDUI_KEYBOARD_TYPES,
  SDUI_BADGE_COLORS,
  SDUI_FIELD_COMPONENTS,
  SDUI_KINDS,
  SDUI_MENU_ICONS,
  SDUI_SECTION_TYPES,
  SduiAction,
  SduiActionType,
  SduiCallSpec,
  SduiCaptureOptions,
  SduiShowTransitionScreen,
  SduiOnSuccessNavigateSdui,
  SduiDescriptor,
  SduiField,
  SduiFieldComponent,
  SduiFlattenField,
  SduiFlowStep,
  SduiFilterGroup,
  SduiFilterOptionsSource,
  SduiKind,
  SduiSection,
  SduiSectionType,
  SduiSequenceCall,
  SduiSuccessScreenAction,
  SduiRowActionSuccessScreen,
  SduiFlatField,
  SduiRadioCardTemplateItem,
  SduiDetailAction,
  SduiRowDetail,
  SduiRowDetailSection,
  SduiActionSheetItem,
  SduiBadgeEntry,
  SduiValidationKey,
  applyValidationKey,
  SduiCardElement,
  SduiCardElementType,
  SDUI_CARD_ELEMENT_TYPES,
  SDUI_CARD_ELEMENT_FIELD_BASED,
  SDUI_ACTION_SHEET_ITEM_KNOWN_KEYS,
  SDUI_MENU_ITEM_KNOWN_KEYS,
  SDUI_ROW_DETAIL_SECTION_KNOWN_KEYS,
  SDUI_SEQUENCE_CALL_KNOWN_KEYS,
  SDUI_FLOW_STEP_KNOWN_KEYS,
  createEmptyAction,
  createEmptyCaptureOptions,
  createEmptyCardElement,
  createEmptyOnSuccessNavigateSdui,
  createEmptyShowTransitionScreen,
  createEmptyDataSource,
  createEmptyDescriptor,
  createEmptyField,
  createEmptyFlattenNested,
  createEmptyWrapAsSingleGroup,
  createEmptyGroupByField,
  createEmptyMapFields,
  createEmptyFlowStep,
  createEmptyOnSubmit,
  createEmptyOptions,
  createEmptyRowDetail,
  createEmptyRowDetailSection,
  createEmptyActionSheetItem,
  createEmptyRowActionSuccessScreen,
  createEmptyToggleFieldSuccessSheet,
  createEmptySection,
  createEmptySequenceCall,
  descriptorToJson,
  parseFlattenFieldsMap,
  dataSourceFromJson,
} from './sdui-model';
import { SduiIssue, validateDescriptor } from './sdui-validator';
import { collectTranslationKeys, flattenTranslations, hasTranslation } from './sdui-translations';
import { SduiKeyAutocompleteDirective } from './sdui-key-autocomplete';
import { formatPathPreviewValue, PathPreviewResult, resolveSampleFieldKey, resolveSamplePath } from './sdui-path-preview';

/** Localizza un'azione (§6 manuale) all'interno del descriptor: usato dall'editor azione
 * generico, riusato per primaryAction, menu.items[].action e rowDetail.actionsSheet[].action. */
export type SduiActionRef =
  | { kind: 'primary' }
  | { kind: 'menuItem'; si: number; mi: number }
  | { kind: 'actionsSheet'; si: number; ai: number; rsi?: number }
  | { kind: 'documentDownload'; si: number; rsi: number }
  | { kind: 'rowDetailTap'; si: number }
  | { kind: 'field'; si: number; fi: number; prop: 'action' | 'onScan' }
  | { kind: 'flowField'; si: number; fi: number; prop: 'action' | 'onScan' };

export interface SduiFunctionBuilderDialogData {
  /** JSON esistente (se si sta editando una funzione già pubblicata) o null per una nuova. */
  value: Record<string, unknown> | null;
  /** Nome dell'entity mobile su cui verrà salvata la funzione (== screenId/flowId). */
  entityName: string;
  tenantId: string;
}

/** Archetipi visivi usati dal canvas smartphone mockup (Fase B) per raggruppare i 20
 * SduiFieldComponent in poche rappresentazioni generiche (riquadro input, checkbox, ecc.). */
type MockFieldKind = 'input' | 'checkbox' | 'toggle' | 'select' | 'text' | 'banner' | 'button' | 'image' | 'chip' | 'card' | 'container';

const WIZARD_STEPS = [
  { key: 'base', label: 'sduiWizard.stepNav.base', icon: 'tune', tip: 'sduiWizard.stepNav.baseTip' },
  { key: 'dataSource', label: 'sduiWizard.stepNav.dataSource', icon: 'cloud_download', tip: 'sduiWizard.stepNav.dataSourceTip' },
  { key: 'sections', label: 'sduiWizard.stepNav.sections', icon: 'dashboard_customize', tip: 'sduiWizard.stepNav.sectionsTip' },
  { key: 'submit', label: 'sduiWizard.stepNav.submit', icon: 'save', tip: 'sduiWizard.stepNav.submitTip' },
  { key: 'actions', label: 'sduiWizard.stepNav.actions', icon: 'bolt', tip: 'sduiWizard.stepNav.actionsTip' },
  { key: 'translations', label: 'sduiWizard.stepNav.translationsScreen', icon: 'translate', tip: 'sduiWizard.stepNav.translationsTip' },
  { key: 'preview', label: 'sduiWizard.stepNav.previewScreen', icon: 'visibility', tip: 'sduiWizard.stepNav.previewTip' },
] as const;

const FLOW_WIZARD_STEPS = [
  { key: 'base', label: 'sduiWizard.stepNav.base', icon: 'tune', tip: 'sduiWizard.stepNav.baseTip' },
  { key: 'steps', label: 'sduiWizard.stepNav.flowSteps', icon: 'dashboard_customize', tip: 'sduiWizard.stepNav.flowStepsTip' },
  { key: 'translations', label: 'sduiWizard.stepNav.translationsFlow', icon: 'translate', tip: 'sduiWizard.stepNav.translationsTip' },
  { key: 'preview', label: 'sduiWizard.stepNav.previewFlow', icon: 'visibility', tip: 'sduiWizard.stepNav.previewTip' },
] as const;

/** Icona indicativa per tipo di section, usata nella sidebar ad albero e nell'header delle card
 * nello step "Sezioni" — solo scopo di scansione visiva rapida, nessun impatto sul JSON generato. */
const SECTION_TYPE_ICONS: Record<SduiSectionType, string> = {
  form: 'edit_note',
  list: 'view_list',
  info: 'info',
  menu: 'menu',
  table: 'table_chart',
  filterBar: 'filter_alt',
  eventsSummary: 'event',
  groupedTable: 'view_agenda',
  cardList: 'view_module',
  calendar: 'calendar_month',
};

@Component({
  selector: 'app-sdui-function-builder-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    NgTemplateOutlet,
    MatDialogModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSelectModule,
    MatCheckboxModule,
    MatTooltipModule,
    DragDropModule,
    TranslatePipe,
    SduiKeyAutocompleteDirective,
  ],
  providers: [
    // Campi compatti: non riservare spazio fisso per hint/errore quando assenti (662 mat-form-field nel wizard).
    { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { subscriptSizing: 'dynamic', appearance: 'outline' } },
  ],
  templateUrl: './sdui-function-builder-dialog.html',
  styleUrl: './sdui-function-builder-dialog.scss',
})
export class SduiFunctionBuilderDialog {
  private readonly tenantService = inject(TenantService);
  private readonly snackbar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  readonly dialogRef = inject<MatDialogRef<SduiFunctionBuilderDialog, Record<string, unknown>>>(MatDialogRef);
  readonly data = inject<SduiFunctionBuilderDialogData>(MAT_DIALOG_DATA);

  // --- Autocomplete *Key: lingua UI admin corrente (segue il toggle IT/EN del toolbar, non la
  // lingua del dizionario SDUI mostrata nello step "Traduzioni", che resta sempre IT/EN/ES fisse) ---
  readonly uiLang = signal(this.translate.currentLang || 'it');

  /** Catalogo traduzioni (key→testo tradotto) per l'autocomplete dei campi *Key, nella lingua
   * UI admin corrente. Vuoto finché `loadTranslations()` (avviato subito all'apertura, vedi
   * costruttore) non ha completato il fetch di smh_it/smh_en dal tenant. */
  readonly translationCatalog = computed(() =>
    flattenTranslations(this.uiLang() === 'en' ? this.translationsEn() : this.translationsIt()),
  );

  constructor() {
    this.translate.onLangChange.subscribe((e) => this.uiLang.set(e.lang));
    this.loadTranslations();
  }

  readonly kinds = SDUI_KINDS;
  readonly sectionTypes = SDUI_SECTION_TYPES;
  readonly fieldComponents = SDUI_FIELD_COMPONENTS;
  readonly textCases = SDUI_TEXT_CASES;
  readonly keyboardTypes = SDUI_KEYBOARD_TYPES;
  readonly actionTypes = SDUI_ACTION_TYPES;
  readonly menuIcons = SDUI_MENU_ICONS;
  readonly badgeColors = SDUI_BADGE_COLORS;
  /** "bearer" = header di autorizzazione col token utente (default). "public" = nessun header —
   * unico valore valido quando l'entry point ha sduiWithoutAuth: true (nessun login, vedi manuale §1). */
  readonly authModes = ['bearer', 'public'];
  readonly httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  readonly textVariants = ['compact', 'medium', 'standard', 'large'] as const;
  /** Icone supportate per radioCardList.chips[]/lines[]/titleChips[] (§10 manuale). */
  readonly radioCardTemplateIcons = ['schedule', 'place', 'apartment', 'calendar'] as const;
  readonly radioCardTemplateGroups: { key: 'chips' | 'lines' | 'titleChips'; labelKey: string }[] = [
    { key: 'chips', labelKey: 'sduiWizard.fieldComponents.radioCardChipsLabel' },
    { key: 'lines', labelKey: 'sduiWizard.fieldComponents.radioCardLinesLabel' },
    { key: 'titleChips', labelKey: 'sduiWizard.fieldComponents.radioCardTitleChipsLabel' },
  ];

  readonly descriptor = signal<SduiDescriptor>(this.buildInitialDescriptor());
  readonly stepIndex = signal(0);

  readonly steps = computed(() => (this.descriptor().kind === 'screen' ? WIZARD_STEPS : FLOW_WIZARD_STEPS));
  readonly currentStepKey = computed(() => this.steps()[this.stepIndex()]?.key ?? 'base');

  // ------------------------------------------------------------------
  // Canvas smartphone mockup (Fase B) — anteprima indicativa/generica delle sections,
  // mostrata solo durante lo step "Sezioni": non riproduce pixel-per-pixel il rendering
  // reale del motore SDUI mobile (vedi direzione confermata con l'utente), serve solo a
  // dare un colpo d'occhio su struttura e ordine mentre si edita.
  // ------------------------------------------------------------------

  readonly sectionsStepIndex = computed(() => this.steps().findIndex(s => s.key === 'sections'));
  readonly stepsStepIndex = computed(() => this.steps().findIndex(s => s.key === 'steps'));
  readonly canvasVisible = computed(() => {
    const kind = this.descriptor().kind;
    const key = this.currentStepKey();
    return (kind === 'screen' && key === 'sections') || (kind === 'flow' && key === 'steps');
  });
  readonly calendarMockDays = Array.from({ length: 21 });

  // --- Canvas smartphone mockup per i flow: a differenza delle sections (tutte visibili insieme
  // nel mockup screen), gli step di un flow sono mostrati uno alla volta all'utente finale — il
  // canvas ne previsualizza quindi solo UNO per volta (`expandedFlowStepIndex`, default il primo). ---
  readonly expandedFlowStepIndex = signal<number | null>(null);
  readonly activeFlowStepIndex = computed(() => {
    const idx = this.expandedFlowStepIndex();
    const steps = this.descriptor().steps;
    if (idx !== null && idx < steps.length) return idx;
    return steps.length > 0 ? 0 : -1;
  });
  readonly activeFlowStep = computed(() => {
    const idx = this.activeFlowStepIndex();
    return idx >= 0 ? this.descriptor().steps[idx] : null;
  });

  /** Dall'albero di navigazione laterale, dal canvas o dalla card dell'editor: seleziona lo step
   * di flow da mostrare nel canvas (mirror di `selectSectionInSidebar` per le sections). */
  selectFlowStepInSidebar(stepIdx: number, flowStepIndex: number): void {
    this.stepIndex.set(stepIdx);
    this.expandedFlowStepIndex.set(flowStepIndex);
    setTimeout(() => {
      document.getElementById(`sdui-flow-step-card-${flowStepIndex}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  private readonly FIELD_KIND_MAP: Record<SduiFieldComponent, MockFieldKind> = {
    textInput: 'input', datePicker: 'input', timePicker: 'input', filePicker: 'input', qrScanner: 'input', captcha: 'input',
    checkbox: 'checkbox', animatedCheck: 'checkbox',
    toggle: 'toggle',
    dropdown: 'select', radioCard: 'select', radioCardList: 'select',
    summaryCard: 'card',
    chip: 'chip',
    staticText: 'text', readOnlyInfo: 'text',
    infoBanner: 'banner',
    row: 'container', column: 'container',
    actionButton: 'button',
    image: 'image',
  };

  mockFieldKind(c: SduiFieldComponent): MockFieldKind { return this.FIELD_KIND_MAP[c] ?? 'input'; }

  /** `true` quando il mock del componente mostra già il proprio testo (niente label separata sopra). */
  mockFieldShowsOwnLabel(kind: MockFieldKind): boolean {
    return kind === 'text' || kind === 'banner' || kind === 'button' || kind === 'chip';
  }

  /** Palette indicativa per i 5 variant chip (§8 manuale) — solo per il canvas, nessun impatto sul JSON. */
  private readonly CHIP_VARIANT_COLORS: Record<string, string> = {
    primary: '#2563eb', success: '#16a34a', warning: '#d97706', danger: '#dc2626', neutral: '#6b7280',
  };
  chipVariantColor(v?: string): string { return this.CHIP_VARIANT_COLORS[v ?? 'neutral'] ?? '#6b7280'; }

  /** Legenda indicativa di una badgeMap: il canvas non ha dati reali per valutare quale voce si
   * applicherebbe, quindi mostra tutti i colori/etichette configurati come riferimento visivo. */
  badgeEntries(map?: Record<string, SduiBadgeEntry>): SduiBadgeEntry[] { return map ? Object.values(map) : []; }

  /** Colore indicativo per rowAccent/leftBorder quando non derivato da una badgeMap — prima voce
   * della mappa se presente, altrimenti colore primario del tema canvas. */
  accentColor(map?: Record<string, SduiBadgeEntry>): string {
    const first = this.badgeEntries(map)[0];
    return first?.color || '#2563eb';
  }

  /** Stile indicativo (bordo colorato) per rowAccent (groupedTable) / leftBorder (table) applicato
   * alle card segnaposto del canvas — riflette posizione/colore configurati, non il valore reale
   * dell'item (indisponibile in fase di editing). */
  sectionAccentStyle(sec: SduiSection): Record<string, string> {
    if (sec.rowAccent) {
      const color = sec.rowAccent.colorFromBadge ? this.accentColor(sec.badgeMap) : '#2563eb';
      return sec.rowAccent.position === 'top' ? { 'border-top': `3px solid ${color}` } : { 'border-left': `3px solid ${color}` };
    }
    if (sec.leftBorder) {
      const vals = sec.leftBorderColorMap ? Object.values(sec.leftBorderColorMap) : [];
      return { 'border-left': `3px solid ${vals[0] || '#2563eb'}` };
    }
    return {};
  }

  /** Risolve una translationKey nel dizionario IT caricato per lo step "Traduzioni" — fallback sulla chiave grezza se assente/non caricato. */
  resolveTranslation(key: string | undefined | null): string {
    if (!key) return '';
    const dict = this.translationsIt();
    if (!dict) return key;
    const parts = key.split('.');
    let current: unknown = dict;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return key;
      }
    }
    return typeof current === 'string' ? current : key;
  }

  readonly issues = computed<SduiIssue[]>(() => validateDescriptor(this.descriptor()));
  readonly errorCount = computed(() => this.issues().filter(i => i.severity === 'error').length);
  readonly warningCount = computed(() => this.issues().filter(i => i.severity === 'warning').length);

  readonly jsonPreview = computed(() => JSON.stringify(descriptorToJson(this.descriptor()), null, 2));

  /** Path JSON presenti nell'entity originale ma non riprodotti dal wizard (attributi non gestiti):
   * calcolato una sola volta all'apertura in modifica, confrontando il JSON originale con quello che
   * il wizard rigenererebbe subito, senza alcuna modifica dell'utente. */
  readonly lostAttributePaths = signal<string[]>(this.computeInitialLostAttributePaths());
  readonly dataLossAlertDismissed = signal(false);
  dismissDataLossAlert(): void { this.dataLossAlertDismissed.set(true); }

  private computeInitialLostAttributePaths(): string[] {
    const existing = this.data.value;
    if (!existing || (existing['kind'] !== 'screen' && existing['kind'] !== 'flow')) return [];
    try {
      const roundTripped = descriptorToJson(jsonToDescriptor(existing, this.data.entityName));
      return findLostAttributePaths(existing, roundTripped);
    } catch {
      return [];
    }
  }

  // --- Sample response paste-in (generale, riusato anche da flattenNested) ---
  readonly sampleResponseText = signal('');
  readonly sampleResponseError = signal<string | null>(null);
  readonly detectedArrayPaths = signal<string[]>([]);
  readonly detectedFields = signal<string[]>([]);

  /** JSON parsato del sample response incollato, undefined se vuoto o non valido. */
  readonly parsedSampleResponse = computed<unknown>(() => {
    const text = this.sampleResponseText().trim();
    if (!text) return undefined;
    try {
      return JSON.parse(text);
    } catch {
      return undefined;
    }
  });

  /** Anteprima del valore risolto per un dot-path (itemsPath/groupsPath/arrayPath) contro
   * il sample response incollato. Ritorna null quando non c'è alcun sample da usare, cosi
   * il template puo' nascondere l'anteprima senza rumore visivo. */
  pathPreview(rawPath: string | undefined | null): { found: boolean; display: string } | null {
    const sample = this.parsedSampleResponse();
    if (sample === undefined || !(rawPath ?? '').trim()) return null;
    const result = resolveSamplePath(sample, rawPath);
    return this.toPathPreviewDisplay(result);
  }

  /** Anteprima dell'esistenza di un campo-chiave (es. matchField) sul primo item del
   * sample response incollato. Ritorna null quando non c'è alcun sample da usare. */
  fieldKeyPreview(key: string | undefined | null): { found: boolean; display: string } | null {
    const sample = this.parsedSampleResponse();
    if (sample === undefined || !(key ?? '').trim()) return null;
    const result = resolveSampleFieldKey(sample, key);
    return this.toPathPreviewDisplay(result);
  }

  private toPathPreviewDisplay(result: PathPreviewResult): { found: boolean; display: string } {
    if (!result.found) {
      return { found: false, display: this.translate.instant('sduiWizard.pathPreview.notFound') };
    }
    return {
      found: true,
      display: this.translate.instant('sduiWizard.pathPreview.found', { value: formatPathPreviewValue(result.value) }),
    };
  }

  // --- Checklist traduzioni ---
  readonly translationKeys = computed(() => Array.from(collectTranslationKeys(descriptorToJson(this.descriptor()))).sort());
  readonly translationsIt = signal<Record<string, unknown> | null>(null);
  readonly translationsEn = signal<Record<string, unknown> | null>(null);
  readonly translationsEs = signal<Record<string, unknown> | null>(null);
  readonly translationsLoaded = signal(false);
  readonly translationsLoading = signal(false);

  private buildInitialDescriptor(): SduiDescriptor {
    const existing = this.data.value;
    if (existing && (existing['kind'] === 'screen' || existing['kind'] === 'flow')) {
      return jsonToDescriptor(existing, this.data.entityName);
    }
    return createEmptyDescriptor('screen', this.data.entityName);
  }

  private update(fn: (d: SduiDescriptor) => void): void {
    this.descriptor.update(d => {
      const clone = structuredClone(d);
      fn(clone);
      return clone;
    });
  }

  // ------------------------------------------------------------------
  // Navigazione step
  // ------------------------------------------------------------------

  goToStep(i: number): void { this.stepIndex.set(i); }
  next(): void { this.stepIndex.update(i => Math.min(i + 1, this.steps().length - 1)); }
  back(): void { this.stepIndex.update(i => Math.max(i - 1, 0)); }

  /** Dall'albero di navigazione laterale o dal canvas: salta allo step "Sezioni", espande la
   * sezione scelta e la porta in vista nell'editor (gli step/sezioni possono essere lunghi). */
  selectSectionInSidebar(stepIdx: number, sectionIndex: number): void {
    this.stepIndex.set(stepIdx);
    this.expandedSectionIndex.set(sectionIndex);
    // Il DOM della card non esiste ancora nel frame corrente se si cambia anche step: si aspetta
    // il prossimo giro di change detection prima di cercarla.
    setTimeout(() => {
      document.getElementById(`sdui-section-card-${sectionIndex}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  /** Icona indicativa per il tipo di section (sidebar ad albero + header card) — solo UI, nessun impatto sul JSON. */
  sectionTypeIcon(type: SduiSectionType): string { return SECTION_TYPE_ICONS[type] ?? 'widgets'; }

  setKind(kind: SduiKind): void {
    this.update(d => {
      d.kind = kind;
      if (kind === 'screen') {
        d.screenId = d.screenId || this.data.entityName;
        d.flowId = '';
        if (d.steps.length === 0) d.steps = [];
      } else {
        d.flowId = d.flowId || this.data.entityName;
        d.screenId = '';
        if (d.steps.length === 0) d.steps = [createEmptyFlowStep()];
      }
    });
    this.stepIndex.set(0);
  }

  // ------------------------------------------------------------------
  // Step 1 — Base
  // ------------------------------------------------------------------

  setTitleKey(v: string): void { this.update(d => { d.titleKey = v; }); }
  setSubtitleKey(v: string): void { this.update(d => { d.subtitleKey = v; }); }
  setIdValue(v: string): void {
    this.update(d => { if (d.kind === 'screen') d.screenId = v; else d.flowId = v; });
  }
  setInitialStateJson(v: string): void { this.update(d => { d.initialStateJson = v; }); }
  toggleConfirmLeaveIfDirty(v: boolean): void { this.update(d => { d.confirmLeaveIfDirty = v; }); }
  toggleShowTechnicalError(v: boolean): void { this.update(d => { d.showTechnicalError = v || undefined; }); }
  toggleHideGlobalAppBarActions(v: boolean): void { this.update(d => { d.hideGlobalAppBarActions = v || undefined; }); }
  setOnExitConfirmKey(v: string): void { this.update(d => { d.onExit = { confirmKey: v }; }); }

  // ------------------------------------------------------------------
  // Step 2 — dataSource
  // ------------------------------------------------------------------

  toggleHasDataSource(has: boolean): void {
    this.update(d => { d.dataSource = has ? createEmptyDataSource() : createEmptyDataSource(); if (!has) d.dataSource.endpoint = ''; });
  }
  setDataSourceMethod(v: string): void { this.update(d => { d.dataSource.method = v; }); }
  setDataSourceEndpoint(v: string): void { this.update(d => { d.dataSource.endpoint = v; }); }
  setDataSourceAuth(v: string): void { this.update(d => { d.dataSource.auth = v; }); }

  // dataSource.bodyMapping (§4 manuale) — usata quando dataSource.method è diverso da GET
  addDataSourceBodyMappingEntry(): void {
    this.update(d => {
      const n = Object.keys(d.dataSource.bodyMapping).length;
      d.dataSource.bodyMapping[`campo${n + 1}`] = '$.';
    });
  }
  renameDataSourceBodyMappingKey(oldKey: string, newKey: string): void {
    this.update(d => {
      if (!newKey || oldKey === newKey) return;
      d.dataSource.bodyMapping[newKey] = d.dataSource.bodyMapping[oldKey];
      delete d.dataSource.bodyMapping[oldKey];
    });
  }
  setDataSourceBodyMappingValue(key: string, value: string): void {
    this.update(d => { d.dataSource.bodyMapping[key] = value; });
  }
  removeDataSourceBodyMappingEntry(key: string): void {
    this.update(d => { delete d.dataSource.bodyMapping[key]; });
  }
  dataSourceBodyMappingKeys(): string[] { return Object.keys(this.descriptor().dataSource.bodyMapping ?? {}); }

  // dataSource.captureToProfile / captureToState (§4 manuale) — persistono attributi letti
  // dalla risposta rispettivamente nel profilo utente o nello stato locale dello screen.
  addDataSourceCaptureEntry(which: 'captureToProfile' | 'captureToState'): void {
    this.update(d => {
      const map = (d.dataSource[which] ??= {});
      const n = Object.keys(map).length;
      map[`attributo${n + 1}`] = '$.';
    });
  }
  renameDataSourceCaptureKey(which: 'captureToProfile' | 'captureToState', oldKey: string, newKey: string): void {
    this.update(d => {
      const map = d.dataSource[which];
      if (!map || !newKey || oldKey === newKey) return;
      map[newKey] = map[oldKey];
      delete map[oldKey];
    });
  }
  setDataSourceCaptureValue(which: 'captureToProfile' | 'captureToState', key: string, value: string): void {
    this.update(d => { const map = d.dataSource[which]; if (map) map[key] = value; });
  }
  removeDataSourceCaptureEntry(which: 'captureToProfile' | 'captureToState', key: string): void {
    this.update(d => { delete d.dataSource[which]?.[key]; });
  }
  dataSourceCaptureKeys(which: 'captureToProfile' | 'captureToState'): string[] {
    return Object.keys(this.descriptor().dataSource[which] ?? {});
  }
  readonly dataSourceCaptureKinds = ['captureToProfile', 'captureToState'] as const;

  // dataSource.headers (§4 manuale) — header HTTP statici, sovrascrivono quelli di auth omonimi
  addDataSourceHeaderEntry(): void {
    this.update(d => {
      const map = (d.dataSource.headers ??= {});
      const n = Object.keys(map).length;
      map[`Header-${n + 1}`] = '';
    });
  }
  renameDataSourceHeaderKey(oldKey: string, newKey: string): void {
    this.update(d => {
      const map = d.dataSource.headers;
      if (!map || !newKey || oldKey === newKey) return;
      map[newKey] = map[oldKey];
      delete map[oldKey];
    });
  }
  setDataSourceHeaderValue(key: string, value: string): void {
    this.update(d => { const map = d.dataSource.headers; if (map) map[key] = value; });
  }
  removeDataSourceHeaderEntry(key: string): void {
    this.update(d => { delete d.dataSource.headers?.[key]; });
  }
  dataSourceHeaderKeys(): string[] { return Object.keys(this.descriptor().dataSource.headers ?? {}); }

  // dataSource.basicAuth (§4 manuale) — Authorization: Basic, da usare con auth: "public"
  toggleDataSourceBasicAuth(has: boolean): void {
    this.update(d => { d.dataSource.basicAuth = has ? { username: '', password: '' } : undefined; });
  }
  setDataSourceBasicAuthProp(key: 'username' | 'password', value: string): void {
    this.update(d => { if (d.dataSource.basicAuth) d.dataSource.basicAuth[key] = value; });
  }

  // dataSource.defaultDateRange (§4 manuale) — pre-popola fromField/toField nello stato al primo load
  toggleDataSourceDefaultDateRange(enabled: boolean): void {
    this.update(d => {
      d.dataSource.defaultDateRange = enabled ? { fromField: '', toField: '', daysAgo: 30 } : undefined;
    });
  }
  setDataSourceDefaultDateRangeProp(key: 'fromField' | 'toField', value: string): void {
    this.update(d => { if (d.dataSource.defaultDateRange) d.dataSource.defaultDateRange[key] = value; });
  }
  setDataSourceDefaultDateRangeDays(key: 'daysAgo' | 'daysForward', value: number | null): void {
    this.update(d => {
      if (!d.dataSource.defaultDateRange) return;
      if (value === null || Number.isNaN(value)) delete d.dataSource.defaultDateRange[key];
      else d.dataSource.defaultDateRange[key] = value;
    });
  }

  // Legge il "type" di un transform (response/request) senza forzare il narrowing a due sole
  // varianti: nel template, dopo aver escluso flattenNested/wrapAsSingleGroup (o unflattenNested),
  // TS considera il ramo custom "never" — questo helper bypassa quel limite solo per leggere il tag.
  transformTypeOf(t: { type?: string } | null | undefined): string {
    return t?.type ?? '';
  }

  toggleFlattenNested(enabled: boolean): void {
    this.update(d => { d.dataSource.responseTransform = enabled ? createEmptyFlattenNested() : null; });
  }
  setResponseTransformType(type: 'flattenNested' | 'wrapAsSingleGroup' | 'groupByField' | 'mapFields'): void {
    this.update(d => {
      d.dataSource.responseTransform =
        type === 'wrapAsSingleGroup' ? createEmptyWrapAsSingleGroup() :
        type === 'groupByField' ? createEmptyGroupByField() :
        type === 'mapFields' ? createEmptyMapFields() :
        createEmptyFlattenNested();
    });
  }
  setFlattenArrayPath(v: string): void { this.update(d => { if (d.dataSource.responseTransform?.type === 'flattenNested') d.dataSource.responseTransform.arrayPath = v; }); }
  setFlattenTargetPath(v: string): void { this.update(d => { if (d.dataSource.responseTransform?.type === 'flattenNested') d.dataSource.responseTransform.targetPath = v; }); }

  setWrapItemsPath(v: string): void { this.update(d => { if (d.dataSource.responseTransform?.type === 'wrapAsSingleGroup') d.dataSource.responseTransform.itemsPath = v; }); }
  setWrapTargetPath(v: string): void { this.update(d => { if (d.dataSource.responseTransform?.type === 'wrapAsSingleGroup') d.dataSource.responseTransform.targetPath = v; }); }
  setWrapGroupLabelKey(v: string): void { this.update(d => { if (d.dataSource.responseTransform?.type === 'wrapAsSingleGroup') d.dataSource.responseTransform.groupLabelKey = v; }); }
  addWrapStaticField(): void {
    this.update(d => {
      const rt = d.dataSource.responseTransform;
      if (rt?.type !== 'wrapAsSingleGroup') return;
      const n = Object.keys(rt.staticItemFields).length;
      rt.staticItemFields[`campo${n + 1}`] = '';
    });
  }
  renameWrapStaticField(oldKey: string, newKey: string): void {
    this.update(d => {
      const rt = d.dataSource.responseTransform;
      if (rt?.type !== 'wrapAsSingleGroup' || !newKey || oldKey === newKey) return;
      rt.staticItemFields[newKey] = rt.staticItemFields[oldKey];
      delete rt.staticItemFields[oldKey];
    });
  }
  setWrapStaticFieldValue(key: string, value: string): void {
    this.update(d => { const rt = d.dataSource.responseTransform; if (rt?.type === 'wrapAsSingleGroup') rt.staticItemFields[key] = value; });
  }
  removeWrapStaticField(key: string): void {
    this.update(d => { const rt = d.dataSource.responseTransform; if (rt?.type === 'wrapAsSingleGroup') delete rt.staticItemFields[key]; });
  }
  wrapStaticFieldKeys(): string[] {
    const rt = this.descriptor().dataSource.responseTransform;
    return rt?.type === 'wrapAsSingleGroup' ? Object.keys(rt.staticItemFields) : [];
  }

  // wrapAsSingleGroup.itemFields (§4.1.1 manuale) — copia un valore annidato in un campo piatto
  addWrapItemField(): void {
    this.update(d => {
      const rt = d.dataSource.responseTransform;
      if (rt?.type !== 'wrapAsSingleGroup') return;
      rt.itemFields ??= {};
      const n = Object.keys(rt.itemFields).length;
      rt.itemFields[`campo${n + 1}`] = '';
    });
  }
  renameWrapItemField(oldKey: string, newKey: string): void {
    this.update(d => {
      const rt = d.dataSource.responseTransform;
      if (rt?.type !== 'wrapAsSingleGroup' || !rt.itemFields || !newKey || oldKey === newKey) return;
      rt.itemFields[newKey] = rt.itemFields[oldKey];
      delete rt.itemFields[oldKey];
    });
  }
  setWrapItemFieldPath(key: string, path: string): void {
    this.update(d => { const rt = d.dataSource.responseTransform; if (rt?.type === 'wrapAsSingleGroup' && rt.itemFields) rt.itemFields[key] = path; });
  }
  removeWrapItemField(key: string): void {
    this.update(d => { const rt = d.dataSource.responseTransform; if (rt?.type === 'wrapAsSingleGroup' && rt.itemFields) { delete rt.itemFields[key]; if (Object.keys(rt.itemFields).length === 0) rt.itemFields = undefined; } });
  }
  wrapItemFieldKeys(): string[] {
    const rt = this.descriptor().dataSource.responseTransform;
    return rt?.type === 'wrapAsSingleGroup' ? Object.keys(rt.itemFields ?? {}) : [];
  }

  // wrapAsSingleGroup.dateFlags (§4.1.1 manuale) — badge "Scaduta"/"Programmata" in base alla data
  addWrapDateFlag(): void {
    this.update(d => {
      const rt = d.dataSource.responseTransform;
      if (rt?.type !== 'wrapAsSingleGroup') return;
      rt.dateFlags ??= [];
      rt.dateFlags.push({ dateField: '', targetField: '', pastValue: '' });
    });
  }
  setWrapDateFlagProp(index: number, prop: 'dateField' | 'targetField' | 'pastValue' | 'futureValue', value: string): void {
    this.update(d => {
      const rt = d.dataSource.responseTransform;
      if (rt?.type !== 'wrapAsSingleGroup' || !rt.dateFlags?.[index]) return;
      const flag = rt.dateFlags[index];
      if (prop === 'futureValue') flag.futureValue = value || undefined;
      else flag[prop] = value;
    });
  }
  removeWrapDateFlag(index: number): void {
    this.update(d => { const rt = d.dataSource.responseTransform; if (rt?.type === 'wrapAsSingleGroup') rt.dateFlags?.splice(index, 1); });
  }
  wrapDateFlags(): NonNullable<import('./sdui-model').SduiWrapAsSingleGroup['dateFlags']> {
    const rt = this.descriptor().dataSource.responseTransform;
    return rt?.type === 'wrapAsSingleGroup' ? (rt.dateFlags ?? []) : [];
  }

  setGroupByFieldItemsPath(v: string): void { this.update(d => { if (d.dataSource.responseTransform?.type === 'groupByField') d.dataSource.responseTransform.itemsPath = v; }); }
  setGroupByFieldTargetPath(v: string): void { this.update(d => { if (d.dataSource.responseTransform?.type === 'groupByField') d.dataSource.responseTransform.targetPath = v; }); }
  setGroupByFieldGroupField(v: string): void { this.update(d => { if (d.dataSource.responseTransform?.type === 'groupByField') d.dataSource.responseTransform.groupField = v; }); }
  setGroupByFieldGroupLabelField(v: string): void { this.update(d => { if (d.dataSource.responseTransform?.type === 'groupByField') d.dataSource.responseTransform.groupLabelField = v || undefined; }); }
  setGroupByFieldSortDescending(v: boolean): void { this.update(d => { if (d.dataSource.responseTransform?.type === 'groupByField') d.dataSource.responseTransform.sortGroupsDescending = v; }); }

  addFlattenField(): void {
    this.update(d => {
      const rt = d.dataSource.responseTransform;
      if (rt?.type !== 'flattenNested') return;
      const n = Object.keys(rt.fields).length;
      rt.fields[`campo${n + 1}`] = { path: '' };
    });
  }
  renameFlattenField(oldKey: string, newKey: string): void {
    this.update(d => {
      const rt = d.dataSource.responseTransform;
      if (rt?.type !== 'flattenNested' || !newKey || oldKey === newKey) return;
      rt.fields[newKey] = rt.fields[oldKey];
      delete rt.fields[oldKey];
    });
  }
  setFlattenFieldPath(key: string, path: string): void {
    this.update(d => { const rt = d.dataSource.responseTransform; if (rt?.type === 'flattenNested' && rt.fields[key]) rt.fields[key].path = path; });
  }
  setFlattenFieldFormat(key: string, format: string): void {
    this.update(d => { const rt = d.dataSource.responseTransform; if (rt?.type === 'flattenNested' && rt.fields[key]) rt.fields[key].format = format as never; });
  }
  setFlattenFieldLocale(key: string, locale: string): void {
    this.update(d => { const rt = d.dataSource.responseTransform; if (rt?.type === 'flattenNested' && rt.fields[key]) rt.fields[key].locale = locale; });
  }
  setFlattenFieldTrueValue(key: string, value: string): void {
    this.update(d => { const rt = d.dataSource.responseTransform; if (rt?.type === 'flattenNested' && rt.fields[key]) rt.fields[key].trueValue = value || undefined; });
  }
  setFlattenFieldFalseValue(key: string, value: string): void {
    this.update(d => { const rt = d.dataSource.responseTransform; if (rt?.type === 'flattenNested' && rt.fields[key]) rt.fields[key].falseValue = value || undefined; });
  }

  // flattenNested.rootFields (§4.1 manuale) — riporta campi della radice della risposta nello stato
  addRootFieldEntry(): void {
    this.update(d => {
      const rt = d.dataSource.responseTransform;
      if (rt?.type !== 'flattenNested') return;
      const n = Object.keys(rt.rootFields).length;
      rt.rootFields[`campo${n + 1}`] = '';
    });
  }
  renameRootFieldKey(oldKey: string, newKey: string): void {
    this.update(d => {
      const rt = d.dataSource.responseTransform;
      if (rt?.type !== 'flattenNested' || !newKey || oldKey === newKey) return;
      rt.rootFields[newKey] = rt.rootFields[oldKey];
      delete rt.rootFields[oldKey];
    });
  }
  setRootFieldPath(key: string, path: string): void {
    this.update(d => { const rt = d.dataSource.responseTransform; if (rt?.type === 'flattenNested') rt.rootFields[key] = path; });
  }
  removeRootFieldEntry(key: string): void {
    this.update(d => { const rt = d.dataSource.responseTransform; if (rt?.type === 'flattenNested') delete rt.rootFields[key]; });
  }
  rootFieldKeys(): string[] {
    const rt = this.descriptor().dataSource.responseTransform;
    return rt?.type === 'flattenNested' ? Object.keys(rt.rootFields) : [];
  }
  toggleFlattenFieldPathsMode(key: string, usePaths: boolean): void {
    this.update(d => {
      const rt = d.dataSource.responseTransform;
      if (rt?.type !== 'flattenNested' || !rt.fields[key]) return;
      rt.fields[key].paths = usePaths ? [''] : undefined;
    });
  }
  setFlattenFieldPaths(key: string, value: string): void {
    this.update(d => {
      const rt = d.dataSource.responseTransform;
      if (rt?.type !== 'flattenNested' || !rt.fields[key]) return;
      rt.fields[key].paths = value.split(',').map(s => s.trim()).filter(Boolean);
    });
  }
  removeFlattenField(key: string): void {
    this.update(d => { const rt = d.dataSource.responseTransform; if (rt?.type === 'flattenNested') delete rt.fields[key]; });
  }
  flattenFieldKeys(): string[] {
    const rt = this.descriptor().dataSource.responseTransform;
    return rt?.type === 'flattenNested' ? Object.keys(rt.fields) : [];
  }

  // mapFields.fields (§4.1 manuale) — stessa sintassi/UI di flattenNested.fields, ma scrive i
  // campi alla radice della risposta invece che sotto un targetPath annidato.
  addMapField(): void {
    this.update(d => {
      const rt = d.dataSource.responseTransform;
      if (rt?.type !== 'mapFields') return;
      const n = Object.keys(rt.fields).length;
      rt.fields[`campo${n + 1}`] = { path: '' };
    });
  }
  renameMapField(oldKey: string, newKey: string): void {
    this.update(d => {
      const rt = d.dataSource.responseTransform;
      if (rt?.type !== 'mapFields' || !newKey || oldKey === newKey) return;
      rt.fields[newKey] = rt.fields[oldKey];
      delete rt.fields[oldKey];
    });
  }
  setMapFieldPath(key: string, path: string): void {
    this.update(d => { const rt = d.dataSource.responseTransform; if (rt?.type === 'mapFields' && rt.fields[key]) rt.fields[key].path = path; });
  }
  setMapFieldFormat(key: string, format: string): void {
    this.update(d => { const rt = d.dataSource.responseTransform; if (rt?.type === 'mapFields' && rt.fields[key]) rt.fields[key].format = format as never; });
  }
  setMapFieldLocale(key: string, locale: string): void {
    this.update(d => { const rt = d.dataSource.responseTransform; if (rt?.type === 'mapFields' && rt.fields[key]) rt.fields[key].locale = locale; });
  }
  setMapFieldTrueValue(key: string, value: string): void {
    this.update(d => { const rt = d.dataSource.responseTransform; if (rt?.type === 'mapFields' && rt.fields[key]) rt.fields[key].trueValue = value || undefined; });
  }
  setMapFieldFalseValue(key: string, value: string): void {
    this.update(d => { const rt = d.dataSource.responseTransform; if (rt?.type === 'mapFields' && rt.fields[key]) rt.fields[key].falseValue = value || undefined; });
  }
  toggleMapFieldPathsMode(key: string, usePaths: boolean): void {
    this.update(d => {
      const rt = d.dataSource.responseTransform;
      if (rt?.type !== 'mapFields' || !rt.fields[key]) return;
      rt.fields[key].paths = usePaths ? [''] : undefined;
    });
  }
  setMapFieldPaths(key: string, value: string): void {
    this.update(d => {
      const rt = d.dataSource.responseTransform;
      if (rt?.type !== 'mapFields' || !rt.fields[key]) return;
      rt.fields[key].paths = value.split(',').map(s => s.trim()).filter(Boolean);
    });
  }
  removeMapField(key: string): void {
    this.update(d => { const rt = d.dataSource.responseTransform; if (rt?.type === 'mapFields') delete rt.fields[key]; });
  }
  mapFieldKeys(): string[] {
    const rt = this.descriptor().dataSource.responseTransform;
    return rt?.type === 'mapFields' ? Object.keys(rt.fields) : [];
  }

  /** Analizza un JSON di esempio incollato dall'utente e propone gli array annidati trovati. */
  analyzeSampleResponse(): void {
    this.sampleResponseError.set(null);
    const text = this.sampleResponseText().trim();
    if (!text) { this.detectedArrayPaths.set([]); return; }
    try {
      const parsed = JSON.parse(text);
      const paths = findNestedArrayPaths(parsed);
      this.detectedArrayPaths.set(paths);
      if (paths.length === 0) {
        this.sampleResponseError.set(this.translate.instant('sduiWizard.dataSource.noNestedArraysError'));
      }
    } catch {
      this.sampleResponseError.set(this.translate.instant('sduiWizard.dataSource.invalidJsonError'));
      this.detectedArrayPaths.set([]);
    }
  }

  applyDetectedArrayPath(path: string): void {
    this.update(d => {
      if (d.dataSource.responseTransform?.type !== 'flattenNested') d.dataSource.responseTransform = createEmptyFlattenNested();
      d.dataSource.responseTransform.arrayPath = path;
    });
    try {
      const parsed = JSON.parse(this.sampleResponseText());
      const leafFields = findLeafFieldsAtPath(parsed, path);
      this.detectedFields.set(leafFields);
    } catch { /* già validato in analyzeSampleResponse */ }
  }

  addSuggestedField(fieldName: string): void {
    this.update(d => {
      const rt = d.dataSource.responseTransform;
      if (rt?.type !== 'flattenNested') return;
      rt.fields[fieldName] = { path: `${rt.arrayPath.split('.').pop()}.${fieldName}` };
    });
  }

  // ------------------------------------------------------------------
  // Step 3 — Sections
  // ------------------------------------------------------------------

  /** Indice della sezione attualmente espansa nello step "Sezioni" (accordion, una alla volta
   * per evitare il "muro di campi" con tutte le sezioni aperte contemporaneamente). null = tutte chiuse. */
  readonly expandedSectionIndex = signal<number | null>(null);
  toggleSectionExpanded(i: number): void {
    this.expandedSectionIndex.update(cur => (cur === i ? null : i));
  }
  addSection(type: SduiSectionType): void {
    this.update(d => { d.sections.push(createEmptySection(type)); });
    this.expandedSectionIndex.set(this.descriptor().sections.length - 1);
  }
  removeSection(i: number): void {
    this.update(d => { d.sections.splice(i, 1); });
    this.expandedSectionIndex.update(cur => {
      if (cur === null) return null;
      if (cur === i) return null;
      return cur > i ? cur - 1 : cur;
    });
  }
  dropSection(event: CdkDragDrop<SduiSection[]>): void {
    this.update(d => moveItemInArray(d.sections, event.previousIndex, event.currentIndex));
    this.expandedSectionIndex.update(cur => {
      if (cur === null) return null;
      if (cur === event.previousIndex) return event.currentIndex;
      // Ricalcola l'indice spostando l'elemento intermedio come fa moveItemInArray.
      if (event.previousIndex < event.currentIndex && cur > event.previousIndex && cur <= event.currentIndex) return cur - 1;
      if (event.previousIndex > event.currentIndex && cur >= event.currentIndex && cur < event.previousIndex) return cur + 1;
      return cur;
    });
  }
  setSectionId(i: number, v: string): void { this.update(d => { d.sections[i].id = v; }); }
  setSectionTitleKey(i: number, v: string): void { this.update(d => { d.sections[i].titleKey = v; }); }
  setSectionDescriptionKey(i: number, v: string): void { this.update(d => { d.sections[i].descriptionKey = v; }); }
  setSectionProp<K extends keyof SduiSection>(i: number, key: K, value: SduiSection[K]): void {
    this.update(d => { (d.sections[i] as SduiSection)[key] = value; });
  }
  setSectionSearchableFields(i: number, csv: string): void {
    this.update(d => { d.sections[i].searchableFields = csv.split(',').map(s => s.trim()).filter(Boolean); });
  }
  setNestedProp(i: number, group: 'itemTemplate' | 'card' | 'dateFilter', key: string, value: unknown): void {
    this.update(d => {
      const section = d.sections[i] as unknown as Record<string, Record<string, unknown> | undefined>;
      const target = section[group];
      if (target) target[key] = value;
    });
  }

  // --- groupedTable.rowAccent / rowAttachment (§4 manuale) ---
  toggleRowAccent(sectionIndex: number, enabled: boolean): void {
    this.update(d => {
      d.sections[sectionIndex].rowAccent = enabled ? { position: 'start', colorFromBadge: false } : undefined;
    });
  }
  setRowAccentProp<K extends keyof NonNullable<SduiSection['rowAccent']>>(sectionIndex: number, key: K, value: NonNullable<SduiSection['rowAccent']>[K]): void {
    this.update(d => { const ra = d.sections[sectionIndex].rowAccent; if (ra) ra[key] = value; });
  }
  toggleRowAttachment(sectionIndex: number, enabled: boolean): void {
    this.update(d => {
      d.sections[sectionIndex].rowAttachment = enabled ? { countField: 'documentsCount', icon: 'attach_file' } : undefined;
    });
  }
  setRowAttachmentProp<K extends keyof NonNullable<SduiSection['rowAttachment']>>(sectionIndex: number, key: K, value: NonNullable<SduiSection['rowAttachment']>[K]): void {
    this.update(d => { const ra = d.sections[sectionIndex].rowAttachment; if (ra) ra[key] = value; });
  }

  // --- filterButton (§3.5 manuale) — bottom sheet filtri per table/groupedTable/cardList ---
  toggleFilterButton(sectionIndex: number, enabled: boolean): void {
    this.update(d => {
      d.sections[sectionIndex].filterButton = enabled ? { labelKey: '', groups: [] } : undefined;
    });
  }
  setFilterButtonLabelKey(sectionIndex: number, value: string): void {
    this.update(d => { const fb = d.sections[sectionIndex].filterButton; if (fb) fb.labelKey = value; });
  }
  addFilterGroup(sectionIndex: number): void {
    this.update(d => {
      const fb = d.sections[sectionIndex].filterButton;
      if (!fb) return;
      const n = fb.groups.length;
      fb.groups.push({ id: `gruppo${n + 1}`, options: [] });
    });
  }
  removeFilterGroup(sectionIndex: number, groupIndex: number): void {
    this.update(d => { d.sections[sectionIndex].filterButton?.groups.splice(groupIndex, 1); });
  }
  setFilterGroupProp<K extends keyof SduiFilterGroup>(sectionIndex: number, groupIndex: number, key: K, value: SduiFilterGroup[K]): void {
    this.update(d => {
      const g = d.sections[sectionIndex].filterButton?.groups[groupIndex];
      if (g) g[key] = value;
    });
  }
  toggleFilterGroupDateRange(sectionIndex: number, groupIndex: number, enabled: boolean): void {
    this.update(d => {
      const g = d.sections[sectionIndex].filterButton?.groups[groupIndex];
      if (g) g.dateRangeField = enabled ? { fromField: '', toField: '' } : undefined;
    });
  }
  setFilterGroupDateRangeProp(sectionIndex: number, groupIndex: number, key: 'fromField' | 'toField' | 'fromLabelKey' | 'toLabelKey' | 'dateLabelKey', value: string): void {
    this.update(d => {
      const g = d.sections[sectionIndex].filterButton?.groups[groupIndex];
      if (!g?.dateRangeField) return;
      if (key === 'fromField' || key === 'toField') g.dateRangeField[key] = value;
      else g.dateRangeField[key] = value || undefined;
    });
  }
  addFilterOption(sectionIndex: number, groupIndex: number): void {
    this.update(d => {
      const g = d.sections[sectionIndex].filterButton?.groups[groupIndex];
      if (!g) return;
      g.options = g.options ?? [];
      const n = g.options.length;
      g.options.push({ value: `valore${n + 1}` });
    });
  }
  removeFilterOption(sectionIndex: number, groupIndex: number, optionIndex: number): void {
    this.update(d => { d.sections[sectionIndex].filterButton?.groups[groupIndex]?.options?.splice(optionIndex, 1); });
  }
  setFilterOptionProp(sectionIndex: number, groupIndex: number, optionIndex: number, key: 'value' | 'labelKey' | 'color' | 'numberField' | 'numberLabelKey', value: string | undefined): void {
    this.update(d => {
      const o = d.sections[sectionIndex].filterButton?.groups[groupIndex]?.options?.[optionIndex];
      if (o) o[key] = value as never;
    });
  }
  setFilterOptionNumberProp(sectionIndex: number, groupIndex: number, optionIndex: number, key: 'daysAgo' | 'daysForward' | 'numberDefault', value: number | null): void {
    this.update(d => {
      const o = d.sections[sectionIndex].filterButton?.groups[groupIndex]?.options?.[optionIndex];
      if (!o) return;
      if (value === null || Number.isNaN(value)) delete o[key];
      else o[key] = value;
    });
  }
  setFilterOptionCustom(sectionIndex: number, groupIndex: number, optionIndex: number, checked: boolean): void {
    this.update(d => {
      const o = d.sections[sectionIndex].filterButton?.groups[groupIndex]?.options?.[optionIndex];
      if (o) o.custom = checked || undefined;
    });
  }
  toggleFilterGroupOptionsSource(sectionIndex: number, groupIndex: number, enabled: boolean): void {
    this.update(d => {
      const g = d.sections[sectionIndex].filterButton?.groups[groupIndex];
      if (!g) return;
      g.optionsSource = enabled ? { endpoint: '', auth: 'bearer', itemsField: '' } : undefined;
      if (enabled) { g.options = undefined; g.field = undefined; }
    });
  }
  setFilterGroupOptionsSourceProp<K extends keyof SduiFilterOptionsSource>(
    sectionIndex: number, groupIndex: number, key: K, value: SduiFilterOptionsSource[K],
  ): void {
    this.update(d => {
      const os = d.sections[sectionIndex].filterButton?.groups[groupIndex]?.optionsSource;
      if (os) os[key] = value;
    });
  }
  setFilterGroupOptionsSourceItemsField(sectionIndex: number, groupIndex: number, value: string): void {
    this.update(d => {
      const os = d.sections[sectionIndex].filterButton?.groups[groupIndex]?.optionsSource;
      if (!os) return;
      os.itemsField = value.includes(',') ? value.split(',').map(v => v.trim()).filter(Boolean) : value;
    });
  }
  filterGroupOptionsSourceItemsFieldText(sectionIndex: number, groupIndex: number): string {
    const itemsField = this.descriptor().sections[sectionIndex]?.filterButton?.groups[groupIndex]?.optionsSource?.itemsField;
    return Array.isArray(itemsField) ? itemsField.join(', ') : (itemsField ?? '');
  }
  queryParamKeys(sectionIndex: number, groupIndex: number): string[] {
    return Object.keys(this.descriptor().sections[sectionIndex]?.filterButton?.groups[groupIndex]?.queryParams ?? {});
  }
  addQueryParam(sectionIndex: number, groupIndex: number): void {
    this.update(d => {
      const g = d.sections[sectionIndex].filterButton?.groups[groupIndex];
      if (!g) return;
      g.queryParams = { ...(g.queryParams ?? {}), [`param${Object.keys(g.queryParams ?? {}).length + 1}`]: '' };
    });
  }
  renameQueryParamKey(sectionIndex: number, groupIndex: number, oldKey: string, newKey: string): void {
    this.update(d => {
      const g = d.sections[sectionIndex].filterButton?.groups[groupIndex];
      if (!g?.queryParams || !newKey || oldKey === newKey) return;
      const entries = Object.entries(g.queryParams).map(([k, v]) => [k === oldKey ? newKey : k, v] as const);
      g.queryParams = Object.fromEntries(entries);
    });
  }
  setQueryParamValue(sectionIndex: number, groupIndex: number, key: string, value: string): void {
    this.update(d => {
      const g = d.sections[sectionIndex].filterButton?.groups[groupIndex];
      if (g?.queryParams) g.queryParams[key] = value;
    });
  }
  removeQueryParam(sectionIndex: number, groupIndex: number, key: string): void {
    this.update(d => {
      const g = d.sections[sectionIndex].filterButton?.groups[groupIndex];
      if (g?.queryParams) delete g.queryParams[key];
    });
  }

  // --- rowDetail (§3.10 manuale) — dettaglio riga per table/groupedTable/cardList ---
  toggleRowDetail(i: number, enabled: boolean): void {
    this.update(d => { d.sections[i].rowDetail = enabled ? createEmptyRowDetail() : undefined; });
  }
  setRowDetailProp(i: number, key: keyof SduiRowDetail, value: unknown): void {
    this.update(d => { const rd = d.sections[i].rowDetail; if (rd) (rd as unknown as Record<string, unknown>)[key] = value; });
  }
  toggleRowDetailTapAction(i: number, enabled: boolean): void {
    this.update(d => { const rd = d.sections[i].rowDetail; if (rd) rd.tapAction = enabled ? createEmptyAction('navigateSdui') : null; });
  }
  addRowDetailChip(i: number): void {
    this.update(d => {
      const rd = d.sections[i].rowDetail;
      if (!rd) return;
      rd.chips = [...(rd.chips ?? []), { labelKey: '' }];
    });
  }
  setRowDetailChipProp(i: number, ci: number, key: 'labelKey' | 'visibleIf', value: string): void {
    this.update(d => {
      const chip = d.sections[i].rowDetail?.chips?.[ci];
      if (!chip) return;
      if (key === 'labelKey') chip.labelKey = value;
      else chip.visibleIf = value || undefined;
    });
  }
  removeRowDetailChip(i: number, ci: number): void {
    this.update(d => { d.sections[i].rowDetail?.chips?.splice(ci, 1); });
  }
  addRowDetailSection(i: number): void {
    this.update(d => { d.sections[i].rowDetail?.sections.push(createEmptyRowDetailSection()); });
  }
  removeRowDetailSection(i: number, si: number): void {
    this.update(d => { d.sections[i].rowDetail?.sections.splice(si, 1); });
  }
  setRowDetailSectionProp(i: number, si: number, key: keyof SduiRowDetailSection, value: unknown): void {
    this.update(d => {
      const s = d.sections[i].rowDetail?.sections[si];
      if (s) (s as unknown as Record<string, unknown>)[key] = value;
    });
  }
  /** Cambia il "kind" di una rowDetail section (fields/attachedDocuments/preview/documentDownload,
   * §3.10 manuale) — a differenza degli altri kind, documentDownload richiede anche un'azione di
   * default (downloadFile), qui inizializzata esplicitamente. */
  setRowDetailSectionKind(i: number, si: number, kind: 'fields' | 'attachedDocuments' | 'preview' | 'documentDownload'): void {
    this.update(d => {
      const s = d.sections[i].rowDetail?.sections[si];
      if (!s) return;
      s.type = kind === 'attachedDocuments' || kind === 'documentDownload' ? kind : undefined;
      s.preview = kind === 'preview';
      if (kind === 'documentDownload' && !s.action) s.action = createEmptyAction('downloadFile');
    });
  }
  addRowDetailSectionField(i: number, si: number): void {
    this.update(d => {
      const s = d.sections[i].rowDetail?.sections[si];
      if (s) { if (!s.fields) s.fields = []; s.fields.push({ key: '', labelKey: '' }); }
    });
  }
  removeRowDetailSectionField(i: number, si: number, fi: number): void {
    this.update(d => { d.sections[i].rowDetail?.sections[si]?.fields?.splice(fi, 1); });
  }
  setRowDetailSectionFieldProp(i: number, si: number, fi: number, key: 'key' | 'labelKey', value: string): void {
    this.update(d => {
      const f = d.sections[i].rowDetail?.sections[si]?.fields?.[fi];
      if (f) f[key] = value;
    });
  }
  // actionsSheet: condiviso tra il rowDetail globale (si === undefined) e le sue sections[] (si valorizzato).
  private actionsSheetTarget(d: SduiDescriptor, i: number, si?: number): SduiRowDetail | SduiRowDetailSection | undefined {
    const rd = d.sections[i].rowDetail;
    if (!rd) return undefined;
    return si === undefined ? rd : rd.sections[si];
  }
  addActionSheetItem(i: number, si?: number): void {
    this.update(d => {
      const t = this.actionsSheetTarget(d, i, si);
      if (t) t.actionsSheet = [...(t.actionsSheet ?? []), createEmptyActionSheetItem()];
    });
  }
  removeActionSheetItem(i: number, ai: number, si?: number): void {
    this.update(d => { this.actionsSheetTarget(d, i, si)?.actionsSheet?.splice(ai, 1); });
  }
  setActionSheetItemProp(i: number, ai: number, key: keyof SduiActionSheetItem, value: unknown, si?: number): void {
    this.update(d => {
      const item = this.actionsSheetTarget(d, i, si)?.actionsSheet?.[ai];
      if (item) (item as unknown as Record<string, unknown>)[key] = value;
    });
  }
  actionsSheetItems(i: number, si?: number): SduiActionSheetItem[] {
    return this.actionsSheetTarget(this.descriptor(), i, si)?.actionsSheet ?? [];
  }

  // --- table: bordo colorato verticale a sinistra (§3.5 manuale) ---
  addLeftBorderColorEntry(sectionIndex: number): void {
    this.update(d => {
      const s = d.sections[sectionIndex];
      if (!s.leftBorderColorMap) s.leftBorderColorMap = {};
      const n = Object.keys(s.leftBorderColorMap).length;
      s.leftBorderColorMap[`valore${n + 1}`] = SDUI_BADGE_COLORS[0];
    });
  }
  renameLeftBorderColorKey(sectionIndex: number, oldKey: string, newKey: string): void {
    this.update(d => {
      const map = d.sections[sectionIndex].leftBorderColorMap;
      if (!map || !newKey || oldKey === newKey) return;
      map[newKey] = map[oldKey];
      delete map[oldKey];
    });
  }
  setLeftBorderColorValue(sectionIndex: number, key: string, color: string): void {
    this.update(d => { const map = d.sections[sectionIndex].leftBorderColorMap; if (map) map[key] = color; });
  }
  removeLeftBorderColorEntry(sectionIndex: number, key: string): void {
    this.update(d => { const map = d.sections[sectionIndex].leftBorderColorMap; if (map) delete map[key]; });
  }
  leftBorderColorKeys(sectionIndex: number): string[] {
    return Object.keys(this.descriptor().sections[sectionIndex]?.leftBorderColorMap ?? {});
  }

  // --- groupedTable/cardList: badgeLabelKeys/secondaryBadgeLabelKeys, alternativa leggera a badgeMap (§3.9 manuale) ---
  addBadgeLabelKeyEntry(sectionIndex: number, secondary: boolean): void {
    this.update(d => {
      const s = d.sections[sectionIndex];
      const prop = secondary ? 'secondaryBadgeLabelKeys' : 'badgeLabelKeys';
      if (!s[prop]) s[prop] = {};
      const map = s[prop]!;
      const n = Object.keys(map).length;
      map[`valore${n + 1}`] = '';
    });
  }
  renameBadgeLabelKeyKey(sectionIndex: number, secondary: boolean, oldKey: string, newKey: string): void {
    this.update(d => {
      const prop = secondary ? 'secondaryBadgeLabelKeys' : 'badgeLabelKeys';
      const map = d.sections[sectionIndex][prop];
      if (!map || !newKey || oldKey === newKey) return;
      map[newKey] = map[oldKey];
      delete map[oldKey];
    });
  }
  setBadgeLabelKeyValue(sectionIndex: number, secondary: boolean, key: string, labelKey: string): void {
    this.update(d => {
      const prop = secondary ? 'secondaryBadgeLabelKeys' : 'badgeLabelKeys';
      const map = d.sections[sectionIndex][prop];
      if (map) map[key] = labelKey;
    });
  }
  removeBadgeLabelKeyEntry(sectionIndex: number, secondary: boolean, key: string): void {
    this.update(d => {
      const prop = secondary ? 'secondaryBadgeLabelKeys' : 'badgeLabelKeys';
      const map = d.sections[sectionIndex][prop];
      if (map) delete map[key];
    });
  }
  badgeLabelKeyKeys(sectionIndex: number, secondary: boolean): string[] {
    const s = this.descriptor().sections[sectionIndex];
    return Object.keys((secondary ? s?.secondaryBadgeLabelKeys : s?.badgeLabelKeys) ?? {});
  }

  // --- cardList: ordinamento client-side dentro ciascun gruppo (§3.9 manuale) ---
  addSortableField(sectionIndex: number): void {
    this.update(d => {
      const s = d.sections[sectionIndex];
      if (!s.sortableFields) s.sortableFields = [];
      s.sortableFields.push({ key: '', labelKey: '' });
    });
  }
  setSortableFieldKey(sectionIndex: number, idx: number, v: string): void {
    this.update(d => { const f = d.sections[sectionIndex].sortableFields?.[idx]; if (f) f.key = v; });
  }
  setSortableFieldLabelKey(sectionIndex: number, idx: number, v: string): void {
    this.update(d => { const f = d.sections[sectionIndex].sortableFields?.[idx]; if (f) f.labelKey = v; });
  }
  removeSortableField(sectionIndex: number, idx: number): void {
    this.update(d => { d.sections[sectionIndex].sortableFields?.splice(idx, 1); });
  }

  // --- card.elements: sistema atomico generico per cardList (§3.9.1 manuale) ---
  readonly cardElementTypes = SDUI_CARD_ELEMENT_TYPES;


  isCardElementFieldBased(type: SduiCardElementType | undefined): boolean {
    return !!type && SDUI_CARD_ELEMENT_FIELD_BASED.includes(type);
  }
  isCardElementContainer(type: SduiCardElementType | undefined): boolean {
    return type === 'row' || type === 'column';
  }
  childPath(path: number[], index: number): number[] { return [...path, index]; }

  toggleCardElementsMode(sectionIndex: number, enabled: boolean): void {
    this.update(d => {
      const section = d.sections[sectionIndex];
      section.card ??= { titleField: '' };
      if (enabled) {
        section.card.elements ??= [createEmptyCardElement('title')];
      } else {
        delete section.card.elements;
      }
    });
  }

  getCardElementAt(sectionIndex: number, path: number[]): SduiCardElement | undefined {
    const root = this.descriptor().sections[sectionIndex]?.card?.elements;
    return root ? this.resolveCardElement(root, path) : undefined;
  }

  addCardElement(sectionIndex: number, parentPath: number[] | null, type: SduiCardElementType): void {
    this.update(d => {
      const card = (d.sections[sectionIndex].card ??= { titleField: '' });
      const root = (card.elements ??= []);
      if (!parentPath || parentPath.length === 0) {
        root.push(createEmptyCardElement(type));
        return;
      }
      const node = this.resolveCardElement(root, parentPath);
      if (node) {
        node.children ??= [];
        node.children.push(createEmptyCardElement(type));
      }
    });
  }

  removeCardElement(sectionIndex: number, path: number[]): void {
    this.update(d => {
      const root = d.sections[sectionIndex].card?.elements;
      if (!root) return;
      const parent = this.resolveCardElementParent(root, path);
      if (parent) parent.arr.splice(parent.index, 1);
    });
  }

  moveCardElement(sectionIndex: number, path: number[], dir: -1 | 1): void {
    this.update(d => {
      const root = d.sections[sectionIndex].card?.elements;
      if (!root) return;
      const parent = this.resolveCardElementParent(root, path);
      if (!parent) return;
      const newIndex = parent.index + dir;
      if (newIndex < 0 || newIndex >= parent.arr.length) return;
      const [item] = parent.arr.splice(parent.index, 1);
      parent.arr.splice(newIndex, 0, item);
    });
  }

  setCardElementProp(sectionIndex: number, path: number[], key: string, value: unknown): void {
    this.update(d => {
      const root = d.sections[sectionIndex].card?.elements;
      if (!root) return;
      const node = this.resolveCardElement(root, path);
      if (node) (node as unknown as Record<string, unknown>)[key] = value;
    });
  }

  private resolveCardElement(elements: SduiCardElement[], path: number[]): SduiCardElement | undefined {
    let node: SduiCardElement | undefined;
    let arr = elements;
    for (const idx of path) {
      node = arr[idx];
      if (!node) return undefined;
      arr = node.children ?? [];
    }
    return node;
  }

  private resolveCardElementParent(elements: SduiCardElement[], path: number[]): { arr: SduiCardElement[]; index: number } | undefined {
    if (path.length === 0) return undefined;
    const parentPath = path.slice(0, -1);
    let arr = elements;
    for (const idx of parentPath) {
      const node = arr[idx];
      if (!node) return undefined;
      arr = node.children ?? (node.children = []);
    }
    return { arr, index: path[path.length - 1] };
  }

  addColumn(sectionIndex: number): void {
    this.update(d => { (d.sections[sectionIndex].columns ??= []).push({ key: '', labelKey: '' }); });
  }
  removeColumn(sectionIndex: number, colIndex: number): void {
    this.update(d => { d.sections[sectionIndex].columns?.splice(colIndex, 1); });
  }

  addMenuItem(sectionIndex: number): void {
    this.update(d => {
      (d.sections[sectionIndex].items ??= []).push({ labelKey: '', action: createEmptyAction('navigateSdui') });
    });
  }
  removeMenuItem(sectionIndex: number, itemIndex: number): void {
    this.update(d => { d.sections[sectionIndex].items?.splice(itemIndex, 1); });
  }

  // --- field builder (riusato da form section e da step di flow) ---

  addFieldToSection(sectionIndex: number, component: SduiFieldComponent): void {
    this.update(d => { (d.sections[sectionIndex].fields ??= []).push(createEmptyField(component)); });
  }
  removeFieldFromSection(sectionIndex: number, fieldIndex: number): void {
    this.update(d => { d.sections[sectionIndex].fields?.splice(fieldIndex, 1); });
  }
  dropField(sectionIndex: number, event: CdkDragDrop<SduiField[]>): void {
    this.update(d => {
      const arr = d.sections[sectionIndex].fields;
      if (arr) moveItemInArray(arr, event.previousIndex, event.currentIndex);
    });
  }
  setFieldProp(sectionIndex: number, fieldIndex: number, key: keyof SduiField, value: unknown): void {
    this.update(d => {
      const f = d.sections[sectionIndex].fields?.[fieldIndex];
      if (f) (f as unknown as Record<string, unknown>)[key] = value;
    });
  }
  setFieldValidation(sectionIndex: number, fieldIndex: number, key: SduiValidationKey, value: unknown): void {
    this.update(d => {
      const f = d.sections[sectionIndex].fields?.[fieldIndex];
      if (!f) return;
      f.validation ??= {};
      applyValidationKey(f.validation, key, value);
    });
  }
  toggleFieldOptions(sectionIndex: number, fieldIndex: number, enabled: boolean): void {
    this.update(d => {
      const f = d.sections[sectionIndex].fields?.[fieldIndex];
      if (f) f.options = enabled ? createEmptyOptions() : undefined;
    });
  }
  setFieldOptionsProp(sectionIndex: number, fieldIndex: number, key: string, value: unknown): void {
    this.update(d => {
      const f = d.sections[sectionIndex].fields?.[fieldIndex];
      if (f?.options) (f.options as unknown as Record<string, unknown>)[key] = value;
    });
  }

  // --- Helper puri per la mappa dichiarativa `options.fields` (opzioni remote, §10 manuale) ---
  // Non conoscono indici section/flow: operano sulla mappa e restituiscono la nuova versione,
  // da passare a setOptionsProp('fields', ...) — riusabili sia per form fields sia per flow fields.
  addOptionsField(fields: Record<string, SduiFlattenField> | undefined): Record<string, SduiFlattenField> {
    const next = { ...(fields ?? {}) };
    const n = Object.keys(next).length;
    next[`campo${n + 1}`] = { path: '' };
    return next;
  }
  renameOptionsField(fields: Record<string, SduiFlattenField> | undefined, oldKey: string, newKey: string): Record<string, SduiFlattenField> {
    const next = { ...(fields ?? {}) };
    if (!newKey || oldKey === newKey || !next[oldKey]) return next;
    next[newKey] = next[oldKey];
    delete next[oldKey];
    return next;
  }
  removeOptionsField(fields: Record<string, SduiFlattenField> | undefined, key: string): Record<string, SduiFlattenField> {
    const next = { ...(fields ?? {}) };
    delete next[key];
    return next;
  }
  setOptionsFieldPath(fields: Record<string, SduiFlattenField> | undefined, key: string, path: string): Record<string, SduiFlattenField> {
    const next = { ...(fields ?? {}) };
    if (next[key]) next[key] = { ...next[key], path };
    return next;
  }
  setOptionsFieldFormat(fields: Record<string, SduiFlattenField> | undefined, key: string, format: string): Record<string, SduiFlattenField> {
    const next = { ...(fields ?? {}) };
    if (next[key]) next[key] = { ...next[key], format: format as never };
    return next;
  }
  setOptionsFieldLocale(fields: Record<string, SduiFlattenField> | undefined, key: string, locale: string): Record<string, SduiFlattenField> {
    const next = { ...(fields ?? {}) };
    if (next[key]) next[key] = { ...next[key], locale };
    return next;
  }
  toggleOptionsFieldPathsMode(fields: Record<string, SduiFlattenField> | undefined, key: string, usePaths: boolean): Record<string, SduiFlattenField> {
    const next = { ...(fields ?? {}) };
    if (next[key]) next[key] = { ...next[key], paths: usePaths ? [''] : undefined };
    return next;
  }
  setOptionsFieldPaths(fields: Record<string, SduiFlattenField> | undefined, key: string, value: string): Record<string, SduiFlattenField> {
    const next = { ...(fields ?? {}) };
    if (next[key]) next[key] = { ...next[key], paths: value.split(',').map(s => s.trim()).filter(Boolean) };
    return next;
  }
  optionsFieldKeys(fields: Record<string, SduiFlattenField> | undefined): string[] {
    return Object.keys(fields ?? {});
  }

  // qrScanner.extract — mappa chiaveStato → regola (modificatore inline tipo "part:/:1"; le
  // regole oggetto {regex,group} eventualmente già presenti nell'entity sono preservate ma non
  // editabili graficamente, solo tramite valore stringa qui).
  extractKeys(extract: Record<string, string | { regex: string; group: number }> | undefined): string[] {
    return Object.keys(extract ?? {});
  }
  addExtractEntry(extract: Record<string, string | { regex: string; group: number }> | undefined): Record<string, string | { regex: string; group: number }> {
    const next = { ...(extract ?? {}) };
    const n = Object.keys(next).length;
    next[`campo${n + 1}`] = '';
    return next;
  }
  renameExtractKey(extract: Record<string, string | { regex: string; group: number }> | undefined, oldKey: string, newKey: string): Record<string, string | { regex: string; group: number }> {
    const next = { ...(extract ?? {}) };
    if (!newKey || oldKey === newKey || next[oldKey] === undefined) return next;
    next[newKey] = next[oldKey];
    delete next[oldKey];
    return next;
  }
  setExtractValue(extract: Record<string, string | { regex: string; group: number }> | undefined, key: string, value: string): Record<string, string | { regex: string; group: number }> {
    return { ...(extract ?? {}), [key]: value };
  }
  removeExtractEntry(extract: Record<string, string | { regex: string; group: number }> | undefined, key: string): Record<string, string | { regex: string; group: number }> {
    const next = { ...(extract ?? {}) };
    delete next[key];
    return next;
  }
  extractValueAsString(value: string | { regex: string; group: number } | undefined): string {
    return typeof value === 'string' ? value : '';
  }

  addStaticOptionValue(sectionIndex: number, fieldIndex: number): void {
    this.update(d => {
      const f = d.sections[sectionIndex].fields?.[fieldIndex];
      f?.options?.values.push({ value: '', labelKey: '' });
    });
  }
  removeStaticOptionValue(sectionIndex: number, fieldIndex: number, optIndex: number): void {
    this.update(d => { d.sections[sectionIndex].fields?.[fieldIndex]?.options?.values.splice(optIndex, 1); });
  }
  setStaticOptionValueProp(sectionIndex: number, fieldIndex: number, optIndex: number, key: 'value' | 'labelKey', value: string): void {
    this.update(d => {
      const opt = d.sections[sectionIndex].fields?.[fieldIndex]?.options?.values[optIndex];
      if (opt) opt[key] = value;
    });
  }

  setMenuItemProp(sectionIndex: number, itemIndex: number, key: 'icon' | 'labelKey' | 'descriptionKey' | 'svg_icon' | 'badge' | 'visibleIf' | 'trailingIcon', value: string | undefined): void {
    this.update(d => {
      const item = d.sections[sectionIndex].items?.[itemIndex];
      if (item) (item as unknown as Record<string, unknown>)[key] = value;
    });
  }
  setMenuItemIconBackground(sectionIndex: number, itemIndex: number, value: boolean | undefined): void {
    this.update(d => {
      const item = d.sections[sectionIndex].items?.[itemIndex];
      if (item) item.iconBackground = value;
    });
  }
  setColumnProp(sectionIndex: number, colIndex: number, key: 'key' | 'labelKey' | 'sortable', value: string | boolean): void {
    this.update(d => {
      const col = d.sections[sectionIndex].columns?.[colIndex];
      if (col) (col as unknown as Record<string, unknown>)[key] = value;
    });
  }

  // --- Binder helpers: espongono i metodi sopra come funzioni già "curried" sugli indici,
  // così il template (e l'ng-template #fieldEditor condiviso tra form/flow) non deve conoscere gli indici. ---

  bindFieldProp(sectionIndex: number, fieldIndex: number) {
    return (key: keyof SduiField, value: unknown) => this.setFieldProp(sectionIndex, fieldIndex, key, value);
  }
  bindFieldValidation(sectionIndex: number, fieldIndex: number) {
    return (key: SduiValidationKey, value: unknown) => this.setFieldValidation(sectionIndex, fieldIndex, key, value);
  }
  bindToggleOptions(sectionIndex: number, fieldIndex: number) {
    return (enabled: boolean) => this.toggleFieldOptions(sectionIndex, fieldIndex, enabled);
  }
  bindFieldOptionsProp(sectionIndex: number, fieldIndex: number) {
    return (key: string, value: unknown) => this.setFieldOptionsProp(sectionIndex, fieldIndex, key, value);
  }
  bindAddOption(sectionIndex: number, fieldIndex: number) {
    return () => this.addStaticOptionValue(sectionIndex, fieldIndex);
  }
  bindRemoveOption(sectionIndex: number, fieldIndex: number) {
    return (optIndex: number) => this.removeStaticOptionValue(sectionIndex, fieldIndex, optIndex);
  }
  bindSetOption(sectionIndex: number, fieldIndex: number) {
    return (optIndex: number, key: 'value' | 'labelKey', value: string) => this.setStaticOptionValueProp(sectionIndex, fieldIndex, optIndex, key, value);
  }
  bindRemoveField(sectionIndex: number, fieldIndex: number) {
    return () => this.removeFieldFromSection(sectionIndex, fieldIndex);
  }

  // infoBanner.primaryAction.sequence — helper puri, riusati sia per i field di
  // section (Step Sections) sia per quelli di flow step (Step Flow steps).
  addInfoBannerSequenceCall(list: SduiSequenceCall[] | undefined): SduiSequenceCall[] {
    return [...(list ?? []), createEmptySequenceCall()];
  }
  removeInfoBannerSequenceCall(list: SduiSequenceCall[] | undefined, index: number): SduiSequenceCall[] {
    return (list ?? []).filter((_, i) => i !== index);
  }
  setInfoBannerSequenceCallProp(list: SduiSequenceCall[] | undefined, index: number, key: 'method' | 'endpoint' | 'auth', value: string): SduiSequenceCall[] {
    return (list ?? []).map((c, i) => (i === index ? { ...c, [key]: value } : c));
  }

  // radioCardList.detailAction / summaryCard.flatFields+officeFields — helper puri (§8/§10 manuale),
  // riusati sia per field di section sia per field di flow step.
  addFlatField(list: SduiFlatField[] | undefined): SduiFlatField[] {
    return [...(list ?? []), { labelKey: '', field: '' }];
  }
  removeFlatField(list: SduiFlatField[] | undefined, index: number): SduiFlatField[] {
    return (list ?? []).filter((_, i) => i !== index);
  }
  setFlatFieldProp(list: SduiFlatField[] | undefined, index: number, key: 'labelKey' | 'field', value: string): SduiFlatField[] {
    return (list ?? []).map((f, i) => (i === index ? { ...f, [key]: value } : f));
  }
  setDetailActionProp(detailAction: SduiDetailAction | undefined, key: 'linkKey' | 'subtitleField' | 'badgeField' | 'officesField' | 'officeTitleKey' | 'titleVariant' | 'subtitleVariant' | 'officeTitleVariant', value: string): SduiDetailAction {
    return { ...(detailAction ?? { linkKey: '' }), [key]: value };
  }
  setDetailActionFlatFields(detailAction: SduiDetailAction | undefined, key: 'flatFields' | 'officeFields', list: SduiFlatField[]): SduiDetailAction {
    return { ...(detailAction ?? { linkKey: '' }), [key]: list };
  }

  // radioCardList: chips[]/lines[]/titleChips[] — liste di template {template, icon?} (§10 manuale).
  addRadioCardTemplateItem(list: SduiRadioCardTemplateItem[] | undefined): SduiRadioCardTemplateItem[] {
    return [...(list ?? []), { template: '' }];
  }
  removeRadioCardTemplateItem(list: SduiRadioCardTemplateItem[] | undefined, index: number): SduiRadioCardTemplateItem[] {
    return (list ?? []).filter((_, i) => i !== index);
  }
  setRadioCardTemplateItemProp(list: SduiRadioCardTemplateItem[] | undefined, index: number, key: 'template' | 'icon', value: string): SduiRadioCardTemplateItem[] {
    return (list ?? []).map((it, i) => (i === index ? { ...it, [key]: key === 'icon' && !value ? undefined : value } : it));
  }

  // qrScanner.scanFrame — toggle + shape/size.
  setScanFrameProp(scanFrame: { shape?: 'square' | 'rect' | 'none'; size?: number } | undefined, key: 'shape' | 'size', value: unknown): { shape?: 'square' | 'rect' | 'none'; size?: number } {
    return { ...(scanFrame ?? {}), [key]: value };
  }

  // ------------------------------------------------------------------
  // Step 4 — onSubmit
  // ------------------------------------------------------------------

  toggleHasOnSubmit(has: boolean): void {
    this.update(d => { d.onSubmit = has ? createEmptyOnSubmit() : null; });
  }
  setOnSubmitProp(key: 'method' | 'endpoint' | 'auth' | 'submitLabelKey' | 'cancelLabelKey', value: string): void {
    this.update(d => { if (d.onSubmit) d.onSubmit[key] = value; });
  }
  addBodyMappingEntry(): void {
    this.update(d => {
      if (!d.onSubmit) return;
      const n = Object.keys(d.onSubmit.bodyMapping).length;
      d.onSubmit.bodyMapping[`campo${n + 1}`] = '$.';
    });
  }
  renameBodyMappingKey(oldKey: string, newKey: string): void {
    this.update(d => {
      if (!d.onSubmit || !newKey || oldKey === newKey) return;
      d.onSubmit.bodyMapping[newKey] = d.onSubmit.bodyMapping[oldKey];
      delete d.onSubmit.bodyMapping[oldKey];
    });
  }
  setBodyMappingValue(key: string, value: string): void {
    this.update(d => { if (d.onSubmit) d.onSubmit.bodyMapping[key] = value; });
  }
  removeBodyMappingEntry(key: string): void {
    this.update(d => { if (d.onSubmit) delete d.onSubmit.bodyMapping[key]; });
  }
  bodyMappingKeys(): string[] { return Object.keys(this.descriptor().onSubmit?.bodyMapping ?? {}); }

  // onSubmit.requestTransform (unflattenNested/convertDates/convertTypes/chain, §4.1/§5 manuale)
  // — applicato al body dopo bodyMapping, un solo tipo alla volta (eccetto "chain", che li combina
  // ma non è editabile a blocchi dal wizard: solo preservato come JSON grezzo, vedi SduiOnSubmit).
  setRequestTransformType(type: 'none' | 'unflattenNested' | 'convertDates' | 'convertTypes'): void {
    this.update(d => {
      if (!d.onSubmit) return;
      if (type === 'none') { d.onSubmit.requestTransform = null; return; }
      if (type === 'unflattenNested') d.onSubmit.requestTransform = { type, itemsPath: '', targetPath: '', fields: {} };
      else if (type === 'convertDates') d.onSubmit.requestTransform = { type, fields: [] };
      else d.onSubmit.requestTransform = { type, fields: {} };
    });
  }
  unflattenRequestTransform(): { type: 'unflattenNested'; itemsPath: string; targetPath: string; fields: Record<string, string> } | undefined {
    const rt = this.descriptor().onSubmit?.requestTransform;
    return rt?.type === 'unflattenNested' ? rt : undefined;
  }
  setRequestTransformProp(key: 'itemsPath' | 'targetPath', value: string): void {
    this.update(d => { const rt = d.onSubmit?.requestTransform; if (rt?.type === 'unflattenNested') rt[key] = value; });
  }
  addRequestTransformFieldEntry(): void {
    this.update(d => {
      const rt = d.onSubmit?.requestTransform;
      if (rt?.type !== 'unflattenNested') return;
      const n = Object.keys(rt.fields).length;
      rt.fields[`campo${n + 1}`] = '';
    });
  }
  renameRequestTransformFieldKey(oldKey: string, newKey: string): void {
    this.update(d => {
      const rt = d.onSubmit?.requestTransform;
      if (rt?.type !== 'unflattenNested' || !newKey || oldKey === newKey) return;
      rt.fields[newKey] = rt.fields[oldKey];
      delete rt.fields[oldKey];
    });
  }
  setRequestTransformFieldValue(key: string, value: string): void {
    this.update(d => { const rt = d.onSubmit?.requestTransform; if (rt?.type === 'unflattenNested') rt.fields[key] = value; });
  }
  removeRequestTransformFieldEntry(key: string): void {
    this.update(d => { const rt = d.onSubmit?.requestTransform; if (rt?.type === 'unflattenNested') delete rt.fields[key]; });
  }
  requestTransformFieldKeys(): string[] {
    const rt = this.descriptor().onSubmit?.requestTransform;
    return rt?.type === 'unflattenNested' ? Object.keys(rt.fields) : [];
  }
  convertDatesRequestTransformFields(): string {
    const rt = this.descriptor().onSubmit?.requestTransform;
    return rt?.type === 'convertDates' ? rt.fields.join(', ') : '';
  }
  setConvertDatesRequestTransformFields(csv: string): void {
    this.update(d => {
      const rt = d.onSubmit?.requestTransform;
      if (rt?.type === 'convertDates') rt.fields = csv.split(',').map(s => s.trim()).filter(Boolean);
    });
  }
  convertTypesRequestTransformFieldKeys(): string[] {
    const rt = this.descriptor().onSubmit?.requestTransform;
    return rt?.type === 'convertTypes' ? Object.keys(rt.fields) : [];
  }
  addConvertTypesRequestTransformField(): void {
    this.update(d => {
      const rt = d.onSubmit?.requestTransform;
      if (rt?.type !== 'convertTypes') return;
      const n = Object.keys(rt.fields).length;
      rt.fields[`campo${n + 1}`] = 'number';
    });
  }
  renameConvertTypesRequestTransformFieldKey(oldKey: string, newKey: string): void {
    this.update(d => {
      const rt = d.onSubmit?.requestTransform;
      if (rt?.type !== 'convertTypes' || !newKey || oldKey === newKey) return;
      rt.fields[newKey] = rt.fields[oldKey];
      delete rt.fields[oldKey];
    });
  }
  setConvertTypesRequestTransformFieldValue(key: string, value: 'number' | 'boolean'): void {
    this.update(d => { const rt = d.onSubmit?.requestTransform; if (rt?.type === 'convertTypes') rt.fields[key] = value; });
  }
  removeConvertTypesRequestTransformFieldEntry(key: string): void {
    this.update(d => { const rt = d.onSubmit?.requestTransform; if (rt?.type === 'convertTypes') delete rt.fields[key]; });
  }


  // onSubmit.multipart (§5.0 manuale) — upload multipart/form-data alternativo al body JSON
  toggleOnSubmitMultipart(enabled: boolean): void {
    this.update(d => {
      if (!d.onSubmit) return;
      d.onSubmit.multipart = enabled || undefined;
      if (!enabled) { delete d.onSubmit.fileField; delete d.onSubmit.fileFieldName; }
    });
  }
  setOnSubmitMultipartProp(key: 'fileField' | 'fileFieldName', value: string): void {
    this.update(d => { if (d.onSubmit) d.onSubmit[key] = value || undefined; });
  }

  setOnSuccessAction(action: 'toast' | 'setActivePatient' | 'navigateBack'): void {
    this.update(d => { if (d.onSubmit) d.onSubmit.onSuccess.action = action; });
  }
  setOnSuccessMessageKey(v: string): void { this.update(d => { if (d.onSubmit) d.onSubmit.onSuccess.messageKey = v; }); }
  setOnErrorMessageKey(v: string): void { this.update(d => { if (d.onSubmit) d.onSubmit.onError.messageKey = v; }); }

  // navigateSdui/showTransitionScreen/resetToRoute/popScreen per l'onSubmit a livello screen (non flow step).
  toggleOnSuccessNavigateSdui(enabled: boolean): void {
    this.update(d => { if (d.onSubmit) d.onSubmit.onSuccess.navigateSdui = enabled ? createEmptyOnSuccessNavigateSdui() : null; });
  }
  setOnSuccessNavigateSduiEntity(value: string): void {
    this.update(d => { const n = d.onSubmit?.onSuccess.navigateSdui; if (n) n.entity = value; });
  }
  onSuccessNavigateSduiInitialStateKeys(): string[] {
    return Object.keys(this.descriptor().onSubmit?.onSuccess.navigateSdui?.initialState ?? {});
  }
  addOnSuccessNavigateSduiInitialState(): void {
    this.update(d => {
      const n = d.onSubmit?.onSuccess.navigateSdui;
      if (!n) return;
      const count = Object.keys(n.initialState).length;
      n.initialState[`campo${count + 1}`] = '$.campo';
    });
  }
  renameOnSuccessNavigateSduiInitialStateKey(oldKey: string, newKey: string): void {
    this.update(d => {
      const n = d.onSubmit?.onSuccess.navigateSdui;
      if (!n || !newKey || oldKey === newKey) return;
      n.initialState[newKey] = n.initialState[oldKey];
      delete n.initialState[oldKey];
    });
  }
  setOnSuccessNavigateSduiInitialStateValue(key: string, value: string): void {
    this.update(d => { const n = d.onSubmit?.onSuccess.navigateSdui; if (n) n.initialState[key] = value; });
  }
  removeOnSuccessNavigateSduiInitialStateEntry(key: string): void {
    this.update(d => { const n = d.onSubmit?.onSuccess.navigateSdui; if (n) delete n.initialState[key]; });
  }
  toggleOnSuccessShowTransitionScreen(enabled: boolean): void {
    this.update(d => { if (d.onSubmit) d.onSubmit.onSuccess.showTransitionScreen = enabled ? createEmptyShowTransitionScreen() : null; });
  }
  setOnSuccessShowTransitionScreenProp(key: keyof SduiShowTransitionScreen, value: unknown): void {
    this.update(d => {
      const t = d.onSubmit?.onSuccess.showTransitionScreen;
      if (t) (t as unknown as Record<string, unknown>)[key] = value;
    });
  }
  setOnSubmitResetToRoute(value: string): void {
    this.update(d => { if (d.onSubmit) d.onSubmit.onSuccess.resetToRoute = value || undefined; });
  }
  setOnSubmitPopScreen(value: boolean): void {
    this.update(d => { if (d.onSubmit) d.onSubmit.onSuccess.popScreen = value || undefined; });
  }

  /** §17.5 — vedi SduiOnSubmit.onSuccess.completeLogin. */
  toggleCompleteLogin(v: boolean): void {
    this.update(d => { if (d.onSubmit) d.onSubmit.onSuccess.completeLogin = v || undefined; });
  }

  // showSuccessScreen (§5.3 manuale) — alternativa a messageKey/navigateBack, ha priorità sugli altri due se presente.
  toggleShowSuccessScreen(has: boolean): void {
    this.update(d => {
      if (!d.onSubmit) return;
      d.onSubmit.onSuccess.showSuccessScreen = has
        ? { titleKey: '', actions: [{ type: 'navigateBack', labelKey: '', style: 'filled' }] }
        : null;
    });
  }
  setSuccessScreenProp(key: 'titleKey' | 'subtitleKey', value: string): void {
    this.update(d => { const s = d.onSubmit?.onSuccess.showSuccessScreen; if (s) s[key] = value; });
  }
  toggleSuccessScreenSummary(has: boolean): void {
    this.update(d => {
      const s = d.onSubmit?.onSuccess.showSuccessScreen;
      if (s) s.summary = has ? {} : undefined;
    });
  }
  setSuccessScreenSummaryProp(key: 'titleField' | 'badgeKey' | 'dateLabelKey', value: string): void {
    this.update(d => { const summary = d.onSubmit?.onSuccess.showSuccessScreen?.summary; if (summary) summary[key] = value; });
  }
  addSuccessScreenAction(): void {
    this.update(d => {
      const s = d.onSubmit?.onSuccess.showSuccessScreen;
      if (s && s.actions.length < 2) s.actions.push({ type: 'navigateBack', labelKey: '', style: 'outlined' });
    });
  }
  removeSuccessScreenAction(i: number): void {
    this.update(d => { d.onSubmit?.onSuccess.showSuccessScreen?.actions.splice(i, 1); });
  }
  setSuccessScreenActionProp<K extends keyof SduiSuccessScreenAction>(i: number, key: K, value: SduiSuccessScreenAction[K]): void {
    this.update(d => {
      const action = d.onSubmit?.onSuccess.showSuccessScreen?.actions[i];
      if (action) action[key] = value;
    });
  }

  // ------------------------------------------------------------------
  // Editor azione generico — riusato da primaryAction, menu.items[].action
  // e rowDetail.actionsSheet[].action (§6 manuale). Ogni istanza è individuata
  // da un SduiActionRef che localizza l'azione all'interno del descriptor.
  // ------------------------------------------------------------------

  readonly primaryActionRef: SduiActionRef = { kind: 'primary' };
  menuItemActionRef(si: number, mi: number): SduiActionRef { return { kind: 'menuItem', si, mi }; }
  actionSheetItemActionRef(si: number, ai: number, rsi?: number): SduiActionRef { return { kind: 'actionsSheet', si, ai, rsi }; }
  documentDownloadActionRef(si: number, rsi: number): SduiActionRef { return { kind: 'documentDownload', si, rsi }; }
  rowDetailTapActionRef(si: number): SduiActionRef { return { kind: 'rowDetailTap', si }; }
  fieldActionRef(si: number, fi: number, prop: 'action' | 'onScan'): SduiActionRef { return { kind: 'field', si, fi, prop }; }
  flowFieldActionRef(si: number, fi: number, prop: 'action' | 'onScan'): SduiActionRef { return { kind: 'flowField', si, fi, prop }; }

  private actionAt(d: SduiDescriptor, ref: SduiActionRef): SduiAction | null | undefined {
    switch (ref.kind) {
      case 'primary': return d.primaryAction;
      case 'menuItem': return d.sections[ref.si]?.items?.[ref.mi]?.action;
      case 'actionsSheet': return this.actionsSheetTarget(d, ref.si, ref.rsi)?.actionsSheet?.[ref.ai]?.action;
      case 'documentDownload': return d.sections[ref.si]?.rowDetail?.sections[ref.rsi]?.action;
      case 'rowDetailTap': return d.sections[ref.si]?.rowDetail?.tapAction;
      case 'field': return d.sections[ref.si]?.fields?.[ref.fi]?.[ref.prop];
      case 'flowField': return d.steps[ref.si]?.fields?.[ref.fi]?.[ref.prop];
    }
  }
  private setActionAt(d: SduiDescriptor, ref: SduiActionRef, action: SduiAction): void {
    switch (ref.kind) {
      case 'primary': d.primaryAction = action; return;
      case 'menuItem': { const item = d.sections[ref.si]?.items?.[ref.mi]; if (item) item.action = action; return; }
      case 'actionsSheet': {
        // `action` è annidata (schema corretto/attuale — vedi commento su
        // SduiActionSheetItem): le proprietà item-level (labelKey/field/style/
        // visibleWhenField*/visibleIf) restano invariate, si sostituisce solo `action`.
        const item = this.actionsSheetTarget(d, ref.si, ref.rsi)?.actionsSheet?.[ref.ai];
        if (item) item.action = action;
        return;
      }
      case 'documentDownload': {
        const rs = d.sections[ref.si]?.rowDetail?.sections[ref.rsi];
        if (rs) rs.action = action;
        return;
      }
      case 'rowDetailTap': {
        const rd = d.sections[ref.si]?.rowDetail;
        if (rd) rd.tapAction = action;
        return;
      }
      case 'field': {
        const field = d.sections[ref.si]?.fields?.[ref.fi];
        if (field) field[ref.prop] = action;
        return;
      }
      case 'flowField': {
        const field = d.steps[ref.si]?.fields?.[ref.fi];
        if (field) field[ref.prop] = action;
        return;
      }
    }
  }

  toggleHasPrimaryAction(has: boolean): void {
    this.update(d => { d.primaryAction = has ? createEmptyAction('reload') : null; });
  }
  setActionType(ref: SduiActionRef, type: SduiActionType): void {
    this.update(d => { this.setActionAt(d, ref, createEmptyAction(type)); });
  }
  setActionProp<K extends keyof SduiAction>(ref: SduiActionRef, key: K, value: SduiAction[K]): void {
    this.update(d => { const a = this.actionAt(d, ref); if (a) a[key] = value; });
  }
  actionWarning(type: SduiActionType): string | undefined {
    return this.actionTypes.find(t => t.value === type)?.warning;
  }

  // call / addCall / removeCall (confirmAndCall, toggleField, toggleFavorite)
  private actionCallSpec(ref: SduiActionRef, which: 'call' | 'addCall' | 'removeCall'): SduiCallSpec | undefined {
    return this.actionAt(this.descriptor(), ref)?.[which];
  }
  setActionCallProp(ref: SduiActionRef, which: 'call' | 'addCall' | 'removeCall', key: keyof SduiCallSpec, value: unknown): void {
    this.update(d => {
      const a = this.actionAt(d, ref);
      if (!a) return;
      const spec = a[which] ?? { endpoint: '', method: 'POST' };
      (spec as unknown as Record<string, unknown>)[key] = value;
      a[which] = spec;
    });
  }
  actionCallBodyMappingKeys(ref: SduiActionRef, which: 'call' | 'addCall' | 'removeCall'): string[] {
    return Object.keys(this.actionCallSpec(ref, which)?.bodyMapping ?? {});
  }
  addActionCallBodyMapping(ref: SduiActionRef, which: 'call' | 'addCall' | 'removeCall'): void {
    this.update(d => {
      const a = this.actionAt(d, ref);
      if (!a) return;
      const spec = a[which] ?? { endpoint: '', method: 'POST' };
      spec.bodyMapping = { ...(spec.bodyMapping ?? {}), '': '' };
      a[which] = spec;
    });
  }
  setActionCallBodyMappingValue(ref: SduiActionRef, which: 'call' | 'addCall' | 'removeCall', key: string, value: string): void {
    this.update(d => {
      const spec = this.actionAt(d, ref)?.[which];
      if (spec?.bodyMapping) spec.bodyMapping[key] = value;
    });
  }
  renameActionCallBodyMappingKey(ref: SduiActionRef, which: 'call' | 'addCall' | 'removeCall', oldKey: string, newKey: string): void {
    this.update(d => {
      const spec = this.actionAt(d, ref)?.[which];
      if (!spec?.bodyMapping || oldKey === newKey) return;
      const value = spec.bodyMapping[oldKey];
      delete spec.bodyMapping[oldKey];
      spec.bodyMapping[newKey] = value;
    });
  }
  removeActionCallBodyMappingEntry(ref: SduiActionRef, which: 'call' | 'addCall' | 'removeCall', key: string): void {
    this.update(d => {
      const spec = this.actionAt(d, ref)?.[which];
      if (spec?.bodyMapping) delete spec.bodyMapping[key];
    });
  }

  // onSuccess (confirmAndCall)
  setActionOnSuccessProp(ref: SduiActionRef, key: 'messageKey' | 'refreshDataSource' | 'popScreen', value: unknown): void {
    this.update(d => {
      const a = this.actionAt(d, ref);
      if (!a) return;
      a.onSuccess = { ...(a.onSuccess ?? {}), [key]: value };
    });
  }
  toggleActionOnSuccessRemoveFrom(ref: SduiActionRef, has: boolean): void {
    this.update(d => {
      const a = this.actionAt(d, ref);
      if (!a) return;
      a.onSuccess = { ...(a.onSuccess ?? {}) };
      a.onSuccess.removeFrom = has ? { groupsPath: '', groupItemsField: '', matchField: '' } : undefined;
    });
  }
  setActionOnSuccessRemoveFromProp(ref: SduiActionRef, key: 'groupsPath' | 'groupItemsField' | 'matchField', value: string): void {
    this.update(d => {
      const removeFrom = this.actionAt(d, ref)?.onSuccess?.removeFrom;
      if (removeFrom) removeFrom[key] = value;
    });
  }

  // onSuccess.showSuccessScreen (confirmAndCall, §6 manuale) — alternativa a messageKey,
  // ha priorità su di esso se presente. Niente "summary"/"type" per azione (vedi
  // SduiRowActionSuccessScreen): il motore chiude sempre la pagina alla pressione.
  toggleActionOnSuccessShowSuccessScreen(ref: SduiActionRef, has: boolean): void {
    this.update(d => {
      const a = this.actionAt(d, ref);
      if (!a) return;
      a.onSuccess = { ...(a.onSuccess ?? {}) };
      a.onSuccess.showSuccessScreen = has ? createEmptyRowActionSuccessScreen() : null;
    });
  }
  setActionOnSuccessShowSuccessScreenProp(ref: SduiActionRef, key: 'titleKey' | 'subtitleKey', value: string): void {
    this.update(d => {
      const ss = this.actionAt(d, ref)?.onSuccess?.showSuccessScreen;
      if (ss) ss[key] = value;
    });
  }
  addActionOnSuccessShowSuccessScreenAction(ref: SduiActionRef): void {
    this.update(d => {
      const ss = this.actionAt(d, ref)?.onSuccess?.showSuccessScreen;
      if (ss && ss.actions.length < 2) ss.actions.push({ labelKey: '', style: 'outlined' });
    });
  }
  removeActionOnSuccessShowSuccessScreenAction(ref: SduiActionRef, i: number): void {
    this.update(d => { this.actionAt(d, ref)?.onSuccess?.showSuccessScreen?.actions.splice(i, 1); });
  }
  setActionOnSuccessShowSuccessScreenActionProp(
    ref: SduiActionRef, i: number, key: 'labelKey' | 'style', value: string,
  ): void {
    this.update(d => {
      const action = this.actionAt(d, ref)?.onSuccess?.showSuccessScreen?.actions[i];
      if (action) (action as Record<string, string>)[key] = value;
    });
  }

  // updateInGroups (toggleField, toggleFavorite)
  toggleActionUpdateInGroups(ref: SduiActionRef, has: boolean): void {
    this.update(d => {
      const a = this.actionAt(d, ref);
      if (!a) return;
      a.updateInGroups = has ? { groupsPath: '', groupItemsField: '', matchField: '' } : undefined;
    });
  }
  setActionUpdateInGroupsProp(ref: SduiActionRef, key: 'groupsPath' | 'groupItemsField' | 'matchField', value: string): void {
    this.update(d => {
      const groups = this.actionAt(d, ref)?.updateInGroups;
      if (groups) groups[key] = value;
    });
  }

  // toggleField — confirmStyle "sheet" + successSheet (§6 manuale)
  setActionConfirmStyle(ref: SduiActionRef, value: '' | 'sheet'): void {
    this.update(d => {
      const a = this.actionAt(d, ref);
      if (a) a.confirmStyle = value === 'sheet' ? 'sheet' : undefined;
    });
  }
  toggleActionSuccessSheet(ref: SduiActionRef, has: boolean): void {
    this.update(d => {
      const a = this.actionAt(d, ref);
      if (!a) return;
      a.successSheet = has ? createEmptyToggleFieldSuccessSheet() : null;
    });
  }
  setActionSuccessSheetProp(
    ref: SduiActionRef,
    key: keyof import('./sdui-model').SduiToggleFieldSuccessSheet,
    value: string,
  ): void {
    this.update(d => {
      const sheet = this.actionAt(d, ref)?.successSheet;
      if (sheet) (sheet as unknown as Record<string, string>)[key] = value;
    });
  }

  // addToCalendar (§6 manuale)
  actionLocationText(ref: SduiActionRef): string {
    const loc = this.actionAt(this.descriptor(), ref)?.location;
    if (!loc) return '';
    return Array.isArray(loc) ? loc.join(', ') : loc;
  }
  setActionLocationText(ref: SduiActionRef, text: string): void {
    this.update(d => {
      const a = this.actionAt(d, ref);
      if (!a) return;
      const parts = text.split(',').map(p => p.trim()).filter(Boolean);
      a.location = parts.length === 0 ? undefined : parts.length === 1 ? parts[0] : parts;
    });
  }
  actionDescriptionText(ref: SduiActionRef): string {
    const desc = this.actionAt(this.descriptor(), ref)?.description;
    if (!desc?.length) return '';
    return desc.map(line => (typeof line === 'string' ? line : JSON.stringify(line))).join('\n');
  }
  setActionDescriptionText(ref: SduiActionRef, text: string): void {
    this.update(d => {
      const a = this.actionAt(d, ref);
      if (!a) return;
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      a.description = lines.length === 0 ? undefined : lines.map(line => {
        if (line.startsWith('{')) {
          try { return JSON.parse(line) as { labelKey: string; value: string }; } catch { /* non-JSON line, keep as string */ }
        }
        return line;
      });
    });
  }

  // analytics (§6 manuale) — generico su qualunque tipo di azione
  toggleActionAnalytics(ref: SduiActionRef, has: boolean): void {
    this.update(d => {
      const a = this.actionAt(d, ref);
      if (!a) return;
      a.analytics = has ? {} : undefined;
    });
  }
  setActionAnalyticsProp(ref: SduiActionRef, key: 'category' | 'event' | 'name', value: string): void {
    this.update(d => {
      const a = this.actionAt(d, ref);
      if (!a) return;
      a.analytics = { ...(a.analytics ?? {}), [key]: value || undefined };
    });
  }

  // ------------------------------------------------------------------
  // Flow — step editor
  // ------------------------------------------------------------------

  addFlowStep(): void { this.update(d => { d.steps.push(createEmptyFlowStep()); }); }
  removeFlowStep(i: number): void { this.update(d => { d.steps.splice(i, 1); }); }
  dropFlowStep(event: CdkDragDrop<SduiFlowStep[]>): void {
    this.update(d => moveItemInArray(d.steps, event.previousIndex, event.currentIndex));
  }
  setFlowStepProp(i: number, key: keyof SduiFlowStep, value: unknown): void {
    this.update(d => { (d.steps[i] as unknown as Record<string, unknown>)[key] = value; });
  }
  toggleFlowStepIsLast(i: number, isLast: boolean): void {
    this.update(d => {
      d.steps[i].isLastStep = isLast;
      if (isLast && !d.steps[i].onSubmit) d.steps[i].onSubmit = createEmptyOnSubmit();
      if (!isLast) d.steps[i].onSubmit = undefined;
    });
  }
  // reviewFields (§7 manuale) — solo nell'ultimo step: riepilogo read-only dei valori raccolti prima della conferma
  setFlowStepReviewFields(i: number, value: string): void {
    this.update(d => {
      const ids = value.split(',').map(v => v.trim()).filter(v => v.length > 0);
      d.steps[i].reviewFields = ids.length > 0 ? ids : undefined;
    });
  }
  toggleCanProceed(i: number, fieldId: string, checked: boolean): void {
    this.update(d => {
      const set = new Set(d.steps[i].canProceed);
      if (checked) set.add(fieldId); else set.delete(fieldId);
      d.steps[i].canProceed = Array.from(set);
    });
  }
  addFieldToFlowStep(i: number, component: SduiFieldComponent): void {
    this.update(d => { d.steps[i].fields.push(createEmptyField(component)); });
  }
  removeFieldFromFlowStep(i: number, fieldIndex: number): void {
    this.update(d => { d.steps[i].fields.splice(fieldIndex, 1); });
  }
  setFlowFieldProp(stepIndex: number, fieldIndex: number, key: keyof SduiField, value: unknown): void {
    this.update(d => { (d.steps[stepIndex].fields[fieldIndex] as unknown as Record<string, unknown>)[key] = value; });
  }
  setFlowFieldValidation(stepIndex: number, fieldIndex: number, key: SduiValidationKey, value: unknown): void {
    this.update(d => {
      const f = d.steps[stepIndex].fields[fieldIndex];
      if (!f) return;
      f.validation ??= {};
      applyValidationKey(f.validation, key, value);
    });
  }
  toggleFlowFieldOptions(stepIndex: number, fieldIndex: number, enabled: boolean): void {
    this.update(d => { const f = d.steps[stepIndex].fields[fieldIndex]; if (f) f.options = enabled ? createEmptyOptions() : undefined; });
  }
  setFlowFieldOptionsProp(stepIndex: number, fieldIndex: number, key: string, value: unknown): void {
    this.update(d => { const f = d.steps[stepIndex].fields[fieldIndex]; if (f?.options) (f.options as unknown as Record<string, unknown>)[key] = value; });
  }
  addFlowStaticOptionValue(stepIndex: number, fieldIndex: number): void {
    this.update(d => { d.steps[stepIndex].fields[fieldIndex]?.options?.values.push({ value: '', labelKey: '' }); });
  }
  removeFlowStaticOptionValue(stepIndex: number, fieldIndex: number, optIndex: number): void {
    this.update(d => { d.steps[stepIndex].fields[fieldIndex]?.options?.values.splice(optIndex, 1); });
  }
  setFlowStaticOptionValueProp(stepIndex: number, fieldIndex: number, optIndex: number, key: 'value' | 'labelKey', value: string): void {
    this.update(d => {
      const opt = d.steps[stepIndex].fields[fieldIndex]?.options?.values[optIndex];
      if (opt) opt[key] = value;
    });
  }
  setFlowStepOnSubmitProp(stepIndex: number, key: 'method' | 'endpoint' | 'auth' | 'submitLabelKey' | 'cancelLabelKey', value: string): void {
    this.update(d => { const os = d.steps[stepIndex].onSubmit; if (os) os[key] = value; });
  }
  /** onSubmit.failureCheck (§5.2.1 manuale) — solo per flow step: la risposta HTTP 200 viene
   * comunque trattata come fallimento se il campo indicato eguaglia il valore atteso. */
  toggleFlowStepOnSubmitFailureCheck(stepIndex: number, enabled: boolean): void {
    this.update(d => {
      const os = d.steps[stepIndex].onSubmit;
      if (os) os.failureCheck = enabled ? { field: '', equals: '' } : null;
    });
  }
  setFlowStepOnSubmitFailureCheckProp(stepIndex: number, key: 'field' | 'equals', value: string): void {
    this.update(d => { const fc = d.steps[stepIndex].onSubmit?.failureCheck; if (fc) fc[key] = value; });
  }

  // ------------------------------------------------------------------
  // Flow avanzato — dataSource "ping" dello step, prefetchSequence,
  // onSubmit.sequence, onSuccess.conclusion (§7/§7.1 manuale)
  // ------------------------------------------------------------------

  toggleFlowStepDataSource(stepIndex: number, enabled: boolean): void {
    this.update(d => {
      d.steps[stepIndex].dataSource = enabled ? createEmptyDataSource() : null;
    });
  }
  setFlowStepDataSourceProp(stepIndex: number, key: 'method' | 'endpoint' | 'auth', value: string): void {
    this.update(d => {
      const ds = d.steps[stepIndex].dataSource;
      if (ds) (ds as unknown as Record<string, unknown>)[key] = value;
    });
  }

  /** Ricava l'array di sequenza corretto: prefetchSequence dello step oppure onSubmit.sequence dell'ultimo step. */
  private sequenceArrayRef(d: SduiDescriptor, stepIndex: number, which: 'prefetch' | 'submit'): SduiSequenceCall[] {
    const step = d.steps[stepIndex];
    if (which === 'prefetch') return (step.prefetchSequence ??= []);
    step.onSubmit ??= createEmptyOnSubmit();
    return (step.onSubmit.sequence ??= []);
  }

  sequenceCalls(stepIndex: number, which: 'prefetch' | 'submit'): SduiSequenceCall[] {
    const step = this.descriptor().steps[stepIndex];
    return (which === 'prefetch' ? step?.prefetchSequence : step?.onSubmit?.sequence) ?? [];
  }

  addSequenceCall(stepIndex: number, which: 'prefetch' | 'submit'): void {
    this.update(d => { this.sequenceArrayRef(d, stepIndex, which).push(createEmptySequenceCall()); });
  }
  removeSequenceCall(stepIndex: number, which: 'prefetch' | 'submit', callIndex: number): void {
    this.update(d => { this.sequenceArrayRef(d, stepIndex, which).splice(callIndex, 1); });
  }
  setSequenceCallProp(stepIndex: number, which: 'prefetch' | 'submit', callIndex: number, key: 'method' | 'endpoint' | 'auth' | 'body', value: string): void {
    this.update(d => {
      const call = this.sequenceArrayRef(d, stepIndex, which)[callIndex];
      if (call) (call as unknown as Record<string, unknown>)[key] = value;
    });
  }

  setOnSubmitMode(stepIndex: number, mode: 'single' | 'sequence'): void {
    this.update(d => {
      const os = d.steps[stepIndex].onSubmit;
      if (!os) return;
      os.sequence = mode === 'sequence' ? (os.sequence?.length ? os.sequence : [createEmptySequenceCall()]) : null;
    });
  }

  sequenceBodyMappingKeys(stepIndex: number, which: 'prefetch' | 'submit', callIndex: number): string[] {
    return Object.keys(this.sequenceCalls(stepIndex, which)[callIndex]?.bodyMapping ?? {});
  }
  addSequenceBodyMapping(stepIndex: number, which: 'prefetch' | 'submit', callIndex: number): void {
    this.update(d => {
      const call = this.sequenceArrayRef(d, stepIndex, which)[callIndex];
      if (!call) return;
      const n = Object.keys(call.bodyMapping).length;
      call.bodyMapping[`campo${n + 1}`] = '$.';
    });
  }
  renameSequenceBodyMappingKey(stepIndex: number, which: 'prefetch' | 'submit', callIndex: number, oldKey: string, newKey: string): void {
    this.update(d => {
      const call = this.sequenceArrayRef(d, stepIndex, which)[callIndex];
      if (!call || !newKey || oldKey === newKey) return;
      call.bodyMapping[newKey] = call.bodyMapping[oldKey];
      delete call.bodyMapping[oldKey];
    });
  }
  setSequenceBodyMappingValue(stepIndex: number, which: 'prefetch' | 'submit', callIndex: number, key: string, value: string): void {
    this.update(d => { const call = this.sequenceArrayRef(d, stepIndex, which)[callIndex]; if (call) call.bodyMapping[key] = value; });
  }
  removeSequenceBodyMappingEntry(stepIndex: number, which: 'prefetch' | 'submit', callIndex: number, key: string): void {
    this.update(d => { const call = this.sequenceArrayRef(d, stepIndex, which)[callIndex]; if (call) delete call.bodyMapping[key]; });
  }

  sequenceCaptureMappingKeys(stepIndex: number, which: 'prefetch' | 'submit', callIndex: number): string[] {
    return Object.keys(this.sequenceCalls(stepIndex, which)[callIndex]?.captureMapping ?? {});
  }
  addSequenceCaptureMapping(stepIndex: number, which: 'prefetch' | 'submit', callIndex: number): void {
    this.update(d => {
      const call = this.sequenceArrayRef(d, stepIndex, which)[callIndex];
      if (!call) return;
      const n = Object.keys(call.captureMapping).length;
      call.captureMapping[`campoStato${n + 1}`] = '';
    });
  }
  renameSequenceCaptureMappingKey(stepIndex: number, which: 'prefetch' | 'submit', callIndex: number, oldKey: string, newKey: string): void {
    this.update(d => {
      const call = this.sequenceArrayRef(d, stepIndex, which)[callIndex];
      if (!call || !newKey || oldKey === newKey) return;
      call.captureMapping[newKey] = call.captureMapping[oldKey];
      delete call.captureMapping[oldKey];
    });
  }
  setSequenceCaptureMappingValue(stepIndex: number, which: 'prefetch' | 'submit', callIndex: number, key: string, value: string): void {
    this.update(d => { const call = this.sequenceArrayRef(d, stepIndex, which)[callIndex]; if (call) call.captureMapping[key] = value; });
  }
  removeSequenceCaptureMappingEntry(stepIndex: number, which: 'prefetch' | 'submit', callIndex: number, key: string): void {
    this.update(d => { const call = this.sequenceArrayRef(d, stepIndex, which)[callIndex]; if (call) delete call.captureMapping[key]; });
  }

  toggleSequenceCaptureOptions(stepIndex: number, which: 'prefetch' | 'submit', callIndex: number, enabled: boolean): void {
    this.update(d => {
      const call = this.sequenceArrayRef(d, stepIndex, which)[callIndex];
      if (call) call.captureOptions = enabled ? createEmptyCaptureOptions() : null;
    });
  }
  setSequenceCaptureOptionsProp(stepIndex: number, which: 'prefetch' | 'submit', callIndex: number, key: 'stateKey' | 'itemsField' | 'valueTemplate' | 'labelTemplate' | 'sublabelTemplate', value: string): void {
    this.update(d => {
      const co = this.sequenceArrayRef(d, stepIndex, which)[callIndex]?.captureOptions;
      if (co) (co as unknown as Record<string, unknown>)[key] = value;
    });
  }
  setSequenceCaptureOptionsMetaFields(stepIndex: number, which: 'prefetch' | 'submit', callIndex: number, csv: string): void {
    this.update(d => {
      const co = this.sequenceArrayRef(d, stepIndex, which)[callIndex]?.captureOptions;
      if (co) co.metaFields = csv.split(',').map(s => s.trim()).filter(Boolean);
    });
  }

  toggleNavigateSdui(stepIndex: number, enabled: boolean): void {
    this.update(d => {
      const os = d.steps[stepIndex].onSubmit;
      if (os) os.onSuccess.navigateSdui = enabled ? createEmptyOnSuccessNavigateSdui() : null;
    });
  }
  setNavigateSduiEntity(stepIndex: number, value: string): void {
    this.update(d => { const n = d.steps[stepIndex].onSubmit?.onSuccess.navigateSdui; if (n) n.entity = value; });
  }
  navigateSduiInitialStateKeys(stepIndex: number): string[] {
    return Object.keys(this.descriptor().steps[stepIndex]?.onSubmit?.onSuccess.navigateSdui?.initialState ?? {});
  }
  addNavigateSduiInitialState(stepIndex: number): void {
    this.update(d => {
      const n = d.steps[stepIndex].onSubmit?.onSuccess.navigateSdui;
      if (!n) return;
      const count = Object.keys(n.initialState).length;
      n.initialState[`campo${count + 1}`] = '$.campo';
    });
  }
  renameNavigateSduiInitialStateKey(stepIndex: number, oldKey: string, newKey: string): void {
    this.update(d => {
      const n = d.steps[stepIndex].onSubmit?.onSuccess.navigateSdui;
      if (!n || !newKey || oldKey === newKey) return;
      n.initialState[newKey] = n.initialState[oldKey];
      delete n.initialState[oldKey];
    });
  }
  setNavigateSduiInitialStateValue(stepIndex: number, key: string, value: string): void {
    this.update(d => { const n = d.steps[stepIndex].onSubmit?.onSuccess.navigateSdui; if (n) n.initialState[key] = value; });
  }
  removeNavigateSduiInitialStateEntry(stepIndex: number, key: string): void {
    this.update(d => { const n = d.steps[stepIndex].onSubmit?.onSuccess.navigateSdui; if (n) delete n.initialState[key]; });
  }
  toggleShowTransitionScreen(stepIndex: number, enabled: boolean): void {
    this.update(d => {
      const os = d.steps[stepIndex].onSubmit;
      if (os) os.onSuccess.showTransitionScreen = enabled ? createEmptyShowTransitionScreen() : null;
    });
  }
  setShowTransitionScreenProp(stepIndex: number, key: keyof SduiShowTransitionScreen, value: unknown): void {
    this.update(d => {
      const t = d.steps[stepIndex].onSubmit?.onSuccess.showTransitionScreen;
      if (t) (t as unknown as Record<string, unknown>)[key] = value;
    });
  }
  setOnSuccessResetToRoute(stepIndex: number, value: string): void {
    this.update(d => { const os = d.steps[stepIndex].onSubmit; if (os) os.onSuccess.resetToRoute = value || undefined; });
  }
  setOnSuccessPopScreen(stepIndex: number, value: boolean): void {
    this.update(d => { const os = d.steps[stepIndex].onSubmit; if (os) os.onSuccess.popScreen = value || undefined; });
  }


  bindFlowFieldProp(stepIndex: number, fieldIndex: number) {
    return (key: keyof SduiField, value: unknown) => this.setFlowFieldProp(stepIndex, fieldIndex, key, value);
  }
  bindFlowFieldValidation(stepIndex: number, fieldIndex: number) {
    return (key: SduiValidationKey, value: unknown) => this.setFlowFieldValidation(stepIndex, fieldIndex, key, value);
  }
  bindFlowToggleOptions(stepIndex: number, fieldIndex: number) {
    return (enabled: boolean) => this.toggleFlowFieldOptions(stepIndex, fieldIndex, enabled);
  }
  bindFlowFieldOptionsProp(stepIndex: number, fieldIndex: number) {
    return (key: string, value: unknown) => this.setFlowFieldOptionsProp(stepIndex, fieldIndex, key, value);
  }
  bindFlowAddOption(stepIndex: number, fieldIndex: number) {
    return () => this.addFlowStaticOptionValue(stepIndex, fieldIndex);
  }
  bindFlowRemoveOption(stepIndex: number, fieldIndex: number) {
    return (optIndex: number) => this.removeFlowStaticOptionValue(stepIndex, fieldIndex, optIndex);
  }
  bindFlowSetOption(stepIndex: number, fieldIndex: number) {
    return (optIndex: number, key: 'value' | 'labelKey', value: string) => this.setFlowStaticOptionValueProp(stepIndex, fieldIndex, optIndex, key, value);
  }
  bindRemoveFlowField(stepIndex: number, fieldIndex: number) {
    return () => this.removeFieldFromFlowStep(stepIndex, fieldIndex);
  }

  // ------------------------------------------------------------------
  // Step traduzioni
  // ------------------------------------------------------------------

  loadTranslations(): void {
    if (this.translationsLoading()) return;
    this.translationsLoading.set(true);
    const tenantId = this.data.tenantId;
    const load = (entity: string) => this.tenantService.getConfig(tenantId, 'mobile', 'local', entity).pipe(
      catchError(() => of(null)),
    );
    load('smh_it').subscribe(v => this.translationsIt.set(v?.configJson as Record<string, unknown> ?? null));
    load('smh_en').subscribe(v => this.translationsEn.set(v?.configJson as Record<string, unknown> ?? null));
    load('smh_es').subscribe(v => {
      this.translationsEs.set(v?.configJson as Record<string, unknown> ?? null);
      this.translationsLoading.set(false);
      this.translationsLoaded.set(true);
    });
  }

  translationStatus(key: string): { it: boolean; en: boolean; es: boolean } {
    return {
      it: hasTranslation(this.translationsIt(), key),
      en: hasTranslation(this.translationsEn(), key),
      es: hasTranslation(this.translationsEs(), key),
    };
  }

  // ------------------------------------------------------------------
  // Finalizzazione
  // ------------------------------------------------------------------

  copyJson(): void {
    navigator.clipboard?.writeText(this.jsonPreview()).then(
      () => this.snackbar.open(this.translate.instant('sduiWizard.snackbar.jsonCopied'), 'OK', { duration: 2500 }),
      () => this.snackbar.open(this.translate.instant('sduiWizard.snackbar.copyFailed'), 'OK', { duration: 4000 }),
    );
  }

  confirm(): void {
    if (this.errorCount() > 0) {
      this.snackbar.open(
        this.translate.instant('sduiWizard.snackbar.resolveErrorsFirst', { count: this.errorCount() }),
        'OK',
        { duration: 5000 },
      );
      return;
    }
    this.dialogRef.close(descriptorToJson(this.descriptor()));
  }

  cancel(): void { this.dialogRef.close(undefined); }
}

// ---------------------------------------------------------------------------
// Helpers standalone (no dipendenza da `this`)
// ---------------------------------------------------------------------------

/** Un valore "vuoto" (stringa vuota, array/oggetto vuoto, null/undefined) la cui assenza nel
 * round-trip non è considerata una perdita reale — solo normalizzazione dei default. */
function isEmptyJsonValue(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.keys(v as object).length === 0;
  return false;
}

/** Alcuni serializer del wizard omettono deliberatamente una chiave quando il suo valore coincide
 * col default implicito del motore (JSON più compatto) — es. `"method": "GET"` o `"titleVariant":
 * "standard"` dichiarati esplicitamente nel JSON originale spariscono nel round-trip pur restando
 * validi. Senza questa mappa verrebbero segnalati come "persi" per errore (falso positivo).
 *
 * Ogni chiave mappa a un ARRAY di valori legittimamente omissibili (non un valore singolo): lo
 * stesso nome di campo (es. `titleVariant`/`descriptionVariant`) ha default diversi a seconda del
 * componente che lo possiede in `cleanField`/`cleanSection` (`'compact'` per `readOnlyInfo`,
 * `'standard'` altrove) — con un solo valore per chiave, metà dei casi reali venivano segnalati
 * come falsi positivi. Tenere sincronizzata con ogni `if (x.y !== DEFAULT) out['y'] = ...` nei
 * `clean*()` di `sdui-model.ts`: un nuovo default omesso introdotto lì senza essere aggiunto qui
 * torna a generare falsi positivi di "dati persi". */
const SDUI_DEFAULT_OMITTED_VALUES: Record<string, unknown[]> = {
  method: ['GET'],
  auth: ['bearer'],
  variant: ['standard'],
  titleVariant: ['standard', 'compact'],
  descriptionVariant: ['standard', 'compact'],
  subtitleVariant: ['standard'],
  officeTitleVariant: ['standard'],
  headerVariant: ['standard'],
  eventsTitleVariant: ['standard'],
  labelVariant: ['standard'],
  orientation: ['vertical'],
  mainAxisAlignment: ['start'],
  crossAxisAlignment: ['start'],
  itemsPath: ['items'],
  targetPath: ['groupedItems'],
  groupItemsField: ['items'],
  bordered: [false],
  leftBorder: [false],
  keyboardType: ['text'],
  decimals: [2],
  layout: ['default'],
  cardPadding: [12],
  style: ['filled'],
  align: ['center'],
  autoOpenIdField: ['id'],
  field: ['documents'],
  sortGroupsDescending: [true],
  showIcons: [true],
  formats: [['qrCode']],
};

/** Confronto per valore (non per riferimento) tra `value` e i default noti registrati per
 * `key` in SDUI_DEFAULT_OMITTED_VALUES — necessario perché un default-array (es. `formats:
 * ['qrCode']` di qrScanner) non può mai essere lo stesso riferimento di un array appena
 * deserializzato da JSON.parse: un semplice `.includes()` lo avrebbe sempre mancato. */
function isLegitDefaultValue(key: string, value: unknown): boolean {
  const allowed = SDUI_DEFAULT_OMITTED_VALUES[key];
  if (!allowed) return false;
  const serialized = JSON.stringify(value);
  return allowed.some(v => JSON.stringify(v) === serialized);
}

/** Confronta ricorsivamente il JSON originale con quello rigenerato dal wizard (stessa struttura,
 * senza modifiche utente) e riporta i path presenti nell'originale ma completamente assenti dal
 * risultato — cioè attributi inseriti manualmente e non gestiti da nessun editor del wizard, che
 * andrebbero persi al primo salvataggio. Non segnala differenze di *valore* (solo di *presenza*),
 * per evitare falsi positivi dovuti a normalizzazioni/default legittimi (es. `auth` implicito). */
function findLostAttributePaths(original: unknown, roundTripped: unknown, path = ''): string[] {
  const lost: string[] = [];
  if (original === null || original === undefined) return lost;
  if (Array.isArray(original)) {
    const rtArr = Array.isArray(roundTripped) ? roundTripped : [];
    original.forEach((item, i) => {
      const childPath = `${path}[${i}]`;
      if (i >= rtArr.length) {
        if (!isEmptyJsonValue(item)) lost.push(childPath);
      } else {
        lost.push(...findLostAttributePaths(item, rtArr[i], childPath));
      }
    });
    return lost;
  }
  if (typeof original === 'object') {
    const rtObj = roundTripped && typeof roundTripped === 'object' && !Array.isArray(roundTripped)
      ? (roundTripped as Record<string, unknown>) : {};
    for (const [key, value] of Object.entries(original as Record<string, unknown>)) {
      const childPath = path ? `${path}.${key}` : key;
      if (!(key in rtObj)) {
        // Migrazione flat legacy -> nested canonico (es. rowDetail.actionsSheet[], commit
        // a88c384): un campo azione presente in root nell'originale può essere stato
        // rigenerato sotto `action.<key>` dal wizard. Non è una perdita se lo troviamo lì.
        const actionObj = rtObj['action'];
        if (actionObj && typeof actionObj === 'object' && !Array.isArray(actionObj) && key in (actionObj as Record<string, unknown>)) {
          lost.push(...findLostAttributePaths(value, (actionObj as Record<string, unknown>)[key], childPath));
          continue;
        }
        const isLegitDefault = isLegitDefaultValue(key, value);
        if (!isEmptyJsonValue(value) && !isLegitDefault) lost.push(childPath);
      } else {
        lost.push(...findLostAttributePaths(value, rtObj[key], childPath));
      }
    }
    return lost;
  }
  return lost;
}

/** Trova path puntati di array-dentro-array (2+ livelli) in un oggetto JSON di esempio. */
function findNestedArrayPaths(node: unknown, prefix = ''): string[] {
  const results: string[] = [];
  if (!node || typeof node !== 'object') return results;
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
      const currentPath = prefix ? `${prefix}.${key}` : key;
      const first = value[0] as Record<string, unknown>;
      for (const [innerKey, innerValue] of Object.entries(first)) {
        if (Array.isArray(innerValue) && innerValue.length > 0 && typeof innerValue[0] === 'object') {
          results.push(`${currentPath}.${innerKey}`);
        }
      }
      results.push(...findNestedArrayPaths(first, currentPath));
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      results.push(...findNestedArrayPaths(value, prefix ? `${prefix}.${key}` : key));
    }
  }
  return Array.from(new Set(results));
}

/** Restituisce i nomi dei campi foglia (non annidati) del primo elemento raggiungibile dal path indicato (2 livelli). */
function findLeafFieldsAtPath(node: unknown, dottedPath: string): string[] {
  const segments = dottedPath.split('.');
  let cur: unknown = node;
  for (const seg of segments) {
    if (Array.isArray(cur) && cur.length > 0) cur = cur[0];
    if (cur && typeof cur === 'object') cur = (cur as Record<string, unknown>)[seg];
    else return [];
  }
  if (Array.isArray(cur) && cur.length > 0) cur = cur[0];
  if (cur && typeof cur === 'object') {
    return Object.entries(cur as Record<string, unknown>)
      .filter(([, v]) => typeof v !== 'object')
      .map(([k]) => k);
  }
  return [];
}

/** Converte un JSON già pubblicato (screen/flow) nel modello editabile dal wizard. Le proprietà
 * sconosciute al wizard su section/field/action/card/cardElement/rowDetail/actionsSheet item/
 * options/validation sopravvivono a un giro wizard -> JSON (vedi withRaw() in sdui-model.ts); per
 * i nodi ricostruiti da zero (onSubmit, sequenceCall, conclusion, flowStep, voci di menu,
 * dataSource, flattenNested/wrapAsSingleGroup) resta valida solo la vista JSON grezza come escape
 * hatch. */
function jsonToDescriptor(json: Record<string, unknown>, fallbackEntityName: string): SduiDescriptor {
  const kind = (json['kind'] as SduiKind) ?? 'screen';
  const d = createEmptyDescriptor(kind, fallbackEntityName);
  d.schemaVersion = (json['schemaVersion'] as string) ?? '1.0.0';
  d.screenId = (json['screenId'] as string) ?? (kind === 'screen' ? fallbackEntityName : '');
  d.flowId = (json['flowId'] as string) ?? (kind === 'flow' ? fallbackEntityName : '');
  d.titleKey = (json['titleKey'] as string) ?? '';
  d.subtitleKey = json['subtitleKey'] as string | undefined;
  d.hideGlobalAppBarActions = Boolean(json['hideGlobalAppBarActions']);
  d.initialStateJson = json['initialState'] ? JSON.stringify(json['initialState'], null, 2) : '{}';
  d.confirmLeaveIfDirty = Boolean(json['confirmLeaveIfDirty']);
  d.showTechnicalError = Boolean(json['showTechnicalError']);
  const onExit = json['onExit'] as { confirmKey?: string } | undefined;
  if (onExit) d.onExit = onExit;

  if (kind === 'screen') {
    const ds = json['dataSource'] as Record<string, unknown> | undefined;
    if (ds) d.dataSource = dataSourceFromJson(ds);
    d.sections = ((json['sections'] as Record<string, unknown>[]) ?? []).map(sectionFromJson);
    if (json['primaryAction']) d.primaryAction = actionFromJson(json['primaryAction'] as Record<string, unknown>);
    if (json['onSubmit']) d.onSubmit = onSubmitFromJson(json['onSubmit'] as Record<string, unknown>);
  } else {
    d.steps = ((json['steps'] as Record<string, unknown>[]) ?? []).map((s, i, arr) => {
      const step: SduiFlowStep = {
        id: (s['id'] as string) ?? '',
        titleKey: (s['titleKey'] as string) ?? '',
        descriptionKey: s['descriptionKey'] as string | undefined,
        visibleIf: s['visibleIf'] as string | undefined,
        fields: ((s['fields'] as Record<string, unknown>[]) ?? []).map(fieldFromJson),
        canProceed: (s['canProceed'] as string[]) ?? [],
        next: s['next'] as string | undefined,
        reviewFields: s['reviewFields'] as string[] | undefined,
        isLastStep: Boolean(s['onSubmit']) || i === arr.length - 1 && !s['next'],
        dataSource: s['dataSource'] ? dataSourceFromJson(s['dataSource'] as Record<string, unknown>) : null,
        prefetchSequence: ((s['prefetchSequence'] as Record<string, unknown>[]) ?? []).map(sequenceCallFromJson),
      };
      if (s['onSubmit']) step.onSubmit = onSubmitFromJson(s['onSubmit'] as Record<string, unknown>);
      // Preserva eventuali chiavi ignote al wizard per il round-trip JSON -> wizard -> JSON.
      for (const k of Object.keys(s)) {
        if (!(SDUI_FLOW_STEP_KNOWN_KEYS as readonly string[]).includes(k)) {
          (step as unknown as Record<string, unknown>)[k] = s[k];
        }
      }
      return step;
    });
  }
  return d;
}

function sectionFromJson(s: Record<string, unknown>): SduiSection {
  const section = createEmptySection((s['type'] as SduiSectionType) ?? 'form');
  Object.assign(section, s);
  // eventsSummary usa nel JSON le stesse chiavi di groupedTable/cardList (groupsPath, groupItemsField,
  // labelKey) ma nel model del wizard sono tenute distinte (*Summary) per non confonderle con le
  // omonime di groupedTable/cardList: vanno rimappate esplicitamente, altrimenti si perdono in edit.
  if (s['type'] === 'eventsSummary') {
    section.groupsPathSummary = (s['groupsPath'] as string) ?? '';
    section.groupItemsFieldSummary = s['groupItemsField'] as string | undefined;
    section.summaryLabelKey = s['labelKey'] as string | undefined;
  }
  // form: la chiave JSON `card` è booleana (wrap Material Card), non l'oggetto SduiCard usato da
  // cardList/calendar — Object.assign l'avrebbe assegnata (errata) a section.card, va rimappata.
  if (s['type'] === 'form') {
    section.formCard = Boolean(s['card']) || undefined;
    section.card = undefined;
  }
  if (Array.isArray(s['fields'])) section.fields = (s['fields'] as Record<string, unknown>[]).map(fieldFromJson);
  if (Array.isArray(s['items'])) {
    section.items = (s['items'] as Record<string, unknown>[]).map(i => {
      const item = {
        icon: i['icon'] as string | undefined,
        labelKey: (i['labelKey'] as string) ?? '',
        descriptionKey: i['descriptionKey'] as string | undefined,
        action: actionFromJson((i['action'] as Record<string, unknown>) ?? { type: 'reload' }),
        svg_icon: i['svg_icon'] as string | undefined,
        badge: i['badge'] as 'link' | 'login' | undefined,
        visibleIf: i['visibleIf'] as string | undefined,
        trailingIcon: i['trailingIcon'] as string | undefined,
        iconBackground: i['iconBackground'] as boolean | undefined,
      };
      // Preserva eventuali chiavi item-level ignote al wizard (es. titleVariant) per il
      // round-trip JSON -> wizard -> JSON, come già fatto per actionSheetItemFromJson.
      for (const k of Object.keys(i)) {
        if (!(SDUI_MENU_ITEM_KNOWN_KEYS as readonly string[]).includes(k)) {
          (item as unknown as Record<string, unknown>)[k] = i[k];
        }
      }
      return item;
    });
  }
  if (s['rowDetail']) {
    const rd = s['rowDetail'] as Record<string, unknown>;
    section.rowDetail = {
      ...(rd as object),
      sections: ((rd['sections'] as Record<string, unknown>[]) ?? []).map(rowDetailSectionFromJson),
      actionsSheet: ((rd['actionsSheet'] as Record<string, unknown>[]) ?? []).map(actionSheetItemFromJson),
    } as SduiRowDetail;
  }
  return section;
}

/** Voce di `rowDetail.actionsSheet` (§3.10 manuale): l'azione è annidata sotto `action:`
 * (schema corretto/attuale). Fallback su `a` stesso come azione se `action` è assente,
 * per compatibilità con entity storiche salvate prima del fix engine sh-core `2e7f130`
 * (quando il motore leggeva erroneamente i campi flat dalla root dell'item). */
function actionSheetItemFromJson(a: Record<string, unknown>): SduiActionSheetItem {
  const nested = a['action'] as Record<string, unknown> | undefined;
  const item: SduiActionSheetItem = {
    labelKey: a['labelKey'] as string | undefined,
    field: a['field'] as string | undefined,
    labelKeyWhenTrue: a['labelKeyWhenTrue'] as string | undefined,
    labelKeyWhenFalse: a['labelKeyWhenFalse'] as string | undefined,
    visibleIf: a['visibleIf'] as string | undefined,
    style: a['style'] as 'filled' | 'outline' | undefined,
    visibleWhenFieldTrue: a['visibleWhenFieldTrue'] as string | undefined,
    visibleWhenFieldFalse: a['visibleWhenFieldFalse'] as string | undefined,
    action: actionFromJson(nested ?? a),
  };
  // Preserva eventuali chiavi item-level ignote al wizard, ma solo se la sorgente usa già
  // il formato nested corrente: nel fallback legacy flat i campi extra sono già stati
  // recuperati dentro `action` da actionFromJson, e duplicarli qui come chiavi item-level
  // stray romperebbe il round-trip (due copie divergenti degli stessi dati).
  if (nested) {
    for (const k of Object.keys(a)) {
      if (!(SDUI_ACTION_SHEET_ITEM_KNOWN_KEYS as readonly string[]).includes(k)) {
        (item as unknown as Record<string, unknown>)[k] = a[k];
      }
    }
  }
  return item;
}

function rowDetailSectionFromJson(s: Record<string, unknown>): SduiRowDetailSection {
  const section: SduiRowDetailSection = {
    titleKey: s['titleKey'] as string | undefined,
    type: s['type'] === 'attachedDocuments' || s['type'] === 'documentDownload' ? s['type'] as 'attachedDocuments' | 'documentDownload' : undefined,
    field: s['field'] as string | undefined,
    preview: Boolean(s['preview']),
    previewEndpoint: s['previewEndpoint'] as string | undefined,
    fields: (s['fields'] as { key: string; labelKey: string }[]) ?? [],
    actionsSheet: Array.isArray(s['actionsSheet']) ? (s['actionsSheet'] as Record<string, unknown>[]).map(actionSheetItemFromJson) : undefined,
    titleField: s['titleField'] as string | undefined,
    subtitleField: s['subtitleField'] as string | undefined,
    action: s['action'] ? actionFromJson(s['action'] as Record<string, unknown>) : undefined,
  };
  // Preserva eventuali chiavi ignote al wizard per il round-trip JSON -> wizard -> JSON.
  for (const k of Object.keys(s)) {
    if (!(SDUI_ROW_DETAIL_SECTION_KNOWN_KEYS as readonly string[]).includes(k)) {
      (section as unknown as Record<string, unknown>)[k] = s[k];
    }
  }
  return section;
}


function fieldFromJson(f: Record<string, unknown>): SduiField {
  const field = createEmptyField((f['component'] as SduiFieldComponent) ?? 'textInput');
  Object.assign(field, f);
  if (Array.isArray(f['children'])) field.children = (f['children'] as Record<string, unknown>[]).map(fieldFromJson);
  if (f['options']) {
    const o = f['options'] as Record<string, unknown>;
    field.options = {
      ...createEmptyOptions(),
      ...(o as object),
      values: (o['values'] as never[]) ?? [],
      fields: o['fields'] ? parseFlattenFieldsMap(o['fields'] as Record<string, unknown>) : undefined,
      metaFields: (o['metaFields'] as string[]) ?? [],
    } as never;
  }
  // infoBanner: infoDialog e primaryAction.sequence nel JSON hanno struttura annidata,
  // ma il model del wizard li tiene appiattiti (infoDialogTitleKey/BodyKey, primaryActionSequence).
  if (f['component'] === 'infoBanner') {
    const infoDialog = f['infoDialog'] as Record<string, unknown> | undefined;
    field.infoDialogTitleKey = infoDialog?.['titleKey'] as string | undefined;
    field.infoDialogBodyKey = infoDialog?.['bodyKey'] as string | undefined;
    const primaryAction = f['primaryAction'] as Record<string, unknown> | undefined;
    field.primaryActionSequence = Array.isArray(primaryAction?.['sequence'])
      ? (primaryAction['sequence'] as Record<string, unknown>[]).map(sequenceCallFromJson)
      : undefined;
  }
  // filePicker: la chiave JSON grezza è 'style' ("attachments"), rinominata filePickerStyle
  // nel model per non collidere con lo 'style' di azioni/successSheet (filled/outline/destructive).
  if (f['component'] === 'filePicker' && f['style'] === 'attachments') {
    field.filePickerStyle = 'attachments';
  }
  // actionButton/qrScanner: action/onScan sono SduiAction annidate (stesso editor di menu/
  // actionsSheet), vanno riparsate con actionFromJson invece dello spread grezzo di Object.assign.
  if (f['component'] === 'actionButton') {
    field.action = f['action'] ? actionFromJson(f['action'] as Record<string, unknown>) : createEmptyAction('reload');
  }
  if (f['component'] === 'qrScanner') {
    field.onScan = f['onScan'] ? actionFromJson(f['onScan'] as Record<string, unknown>) : createEmptyAction('reload');
  }
  return field;
}

function actionFromJson(a: Record<string, unknown>): SduiAction {
  return { type: (a['type'] as SduiActionType) ?? 'reload', ...(a as object) } as SduiAction;
}

function onSubmitFromJson(o: Record<string, unknown>): ReturnType<typeof createEmptyOnSubmit> {
  const base = createEmptyOnSubmit();
  const onSuccessRaw = (o['onSuccess'] as Record<string, unknown>) ?? {};
  // `conclusion` (schermata nativa di flow) è stata rimossa dal motore (sh-core f18190e):
  // un'entity storica che la contenesse ancora viene letta ignorandola silenziosamente
  // (non fa più nulla lato engine), senza tentare un fallback automatico su `navigateSdui`
  // perché richiederebbe un'entity di destinazione che il wizard non può inventare da solo.
  const navigateSduiRaw = onSuccessRaw['navigateSdui'] as Record<string, unknown> | undefined;
  const showTransitionScreenRaw = onSuccessRaw['showTransitionScreen'] as Record<string, unknown> | undefined;
  return {
    ...base,
    ...(o as object),
    bodyMapping: (o['bodyMapping'] as Record<string, string>) ?? {},
    sequence: Array.isArray(o['sequence']) ? (o['sequence'] as Record<string, unknown>[]).map(sequenceCallFromJson) : null,
    onSuccess: {
      ...base.onSuccess,
      ...onSuccessRaw,
      navigateSdui: navigateSduiRaw
        ? ({ ...createEmptyOnSuccessNavigateSdui(), ...navigateSduiRaw, initialState: (navigateSduiRaw['initialState'] as Record<string, string>) ?? {} } as SduiOnSuccessNavigateSdui)
        : null,
      showTransitionScreen: showTransitionScreenRaw
        ? ({ ...createEmptyShowTransitionScreen(), ...showTransitionScreenRaw } as SduiShowTransitionScreen)
        : null,
    },
    onError: { ...base.onError, ...(o['onError'] as object ?? {}) },
    requestTransform: (o['requestTransform'] as never) ?? null,
  } as ReturnType<typeof createEmptyOnSubmit>;
}

function sequenceCallFromJson(c: Record<string, unknown>): SduiSequenceCall {
  const call = createEmptySequenceCall();
  const result: SduiSequenceCall = {
    ...call,
    method: (c['method'] as string) ?? 'GET',
    endpoint: (c['endpoint'] as string) ?? '',
    auth: (c['auth'] as string) ?? 'bearer',
    bodyMapping: (c['bodyMapping'] as Record<string, string>) ?? {},
    body: c['body'] !== undefined ? JSON.stringify(c['body'], null, 2) : undefined,
    captureMapping: (c['captureMapping'] as Record<string, string>) ?? {},
    captureOptions: c['captureOptions']
      ? ({ ...createEmptyCaptureOptions(), ...(c['captureOptions'] as object) } as SduiCaptureOptions)
      : null,
  };
  // Preserva eventuali chiavi ignote al wizard per il round-trip JSON -> wizard -> JSON.
  for (const k of Object.keys(c)) {
    if (!(SDUI_SEQUENCE_CALL_KNOWN_KEYS as readonly string[]).includes(k)) {
      (result as unknown as Record<string, unknown>)[k] = c[k];
    }
  }
  return result;
}
