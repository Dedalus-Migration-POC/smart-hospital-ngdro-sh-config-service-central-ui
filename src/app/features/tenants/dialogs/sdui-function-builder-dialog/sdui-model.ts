/**
 * Modello dati + catalogo per il wizard "Costruttore funzioni SDUI" (canale mobile).
 *
 * Rispecchia la struttura documentata nel manuale `sh-core/docs/SDUI_MANUAL.md`.
 * Copre gli attributi più comuni per ogni tipo di section/field/action; per i casi
 * più esotici (prefetchSequence, conclusion di flow, template opzioni remote
 * avanzati...) resta disponibile la vista JSON grezza dell'ultimo step del wizard.
 */

export type SduiKind = 'screen' | 'flow';

// `label`/`tip`/`warning` sono chiavi i18n (namespace `sduiWizard.*`), risolte via
// pipe `translate` nel template — non testo da mostrare direttamente.
export const SDUI_KINDS: { value: SduiKind; label: string }[] = [
  { value: 'screen', label: 'sduiWizard.kinds.screen' },
  { value: 'flow', label: 'sduiWizard.kinds.flow' },
];

// ---------------------------------------------------------------------------
// Header comune
// ---------------------------------------------------------------------------

export interface SduiOnExit {
  confirmKey?: string;
}

// ---------------------------------------------------------------------------
// dataSource (solo screen) + transform di risposta
// ---------------------------------------------------------------------------

export interface SduiFlattenField {
  path: string;
  format?: 'boolFromString' | 'stringFromBool' | 'localizedLabel' | 'dateLabel' | 'timeLabel' | 'monthName' | 'fileSize' | '';
  trueValue?: string;
  falseValue?: string;
  locale?: string;
  /** Coalesce multi-percorso: se presente ha priorità assoluta su path/format/locale
   * (§4 manuale) — restituisce il primo valore non vuoto tra i percorsi elencati. */
  paths?: string[];
}

export interface SduiFlattenNested {
  type: 'flattenNested';
  arrayPath: string;
  targetPath: string;
  fields: Record<string, SduiFlattenField>;
  rootFields: Record<string, string>;
}

/** Avvolge un array piatto in un unico gruppo `{label, items}` per usarlo con
 * `cardList`/`groupedTable` (§4.1.1 manuale). */
export interface SduiWrapAsSingleGroup {
  type: 'wrapAsSingleGroup';
  itemsPath: string;
  targetPath: string;
  groupLabelKey?: string;
  /** Mappa `{campoOutput: "percorso.puntato"}` che copia un valore annidato di ogni item
   * in un campo piatto, usabile da titleField/subtitleField/rowDetail (§4.1.1 manuale). */
  itemFields?: Record<string, string>;
  /** Scrive in `targetField` di ogni item `pastValue`/`futureValue` in base al confronto
   * tra `dateField` e oggi (§4.1.1 manuale) — utile per badge tipo "Scaduta" senza codice
   * dedicato. */
  dateFlags?: { dateField: string; targetField: string; pastValue: string; futureValue?: string }[];
  staticItemFields: Record<string, string>;
}

/** Raggruppa un array piatto in PIÙ gruppi in base al valore di un campo dell'item
 * (a differenza di `wrapAsSingleGroup`, che produce sempre un solo gruppo — §4.1.2 manuale). */
export interface SduiGroupByField {
  type: 'groupByField';
  itemsPath: string;
  targetPath: string;
  groupField: string;
  groupLabelField?: string;
  sortGroupsDescending?: boolean;
}

/** Transform di risposta custom con logica hardcoded nell'engine Dart (es.
 * "buildProfilesList"), non generica/editabile dal wizard: preservata as-is
 * su un giro JSON -> wizard -> JSON invece di essere ricostruita. */
export interface SduiCustomTransform {
  type: string;
  [key: string]: unknown;
}

/** Aggiunge alla radice della risposta i campi descritti da `fields` (stessa sintassi di
 * flattenNested: percorso puntato con indici array, {path, format} o {paths} — §4.1 manuale);
 * i campi originali restano. Pensato per risorse annidate (es. FHIR) lette da
 * readOnlyInfo.valueField. */
export interface SduiMapFields {
  type: 'mapFields';
  fields: Record<string, SduiFlattenField>;
}

export type SduiResponseTransform = SduiFlattenNested | SduiWrapAsSingleGroup | SduiGroupByField | SduiMapFields;

export interface SduiDataSource {
  method: string;
  endpoint: string;
  auth: string;
  bodyMapping: Record<string, string>;
  responseTransform: SduiResponseTransform | null;
  defaultDateRange?: { fromField: string; toField: string; daysAgo?: number; daysForward?: number };
  /** Mappa `{chiaveAttributo: "$.dot.path"}` (§4 manuale): persiste attributi di profilo
   * ("ProfileResponse", eventualmente in additionalAttributes) leggibili da qualunque
   * screen/flow successivo tramite lo stesso placeholder `{campo}` dello stato. Chiavi
   * riservate (firstName/lastName/fiscalCode/email/phone/dateOfBirth/placeOfBirth/gender/
   * postalAddress) finiscono nel campo dedicato di ProfileResponse invece che in
   * additionalAttributes. Solo a livello screen (il dataSource di uno step flow è un
   * ping "usa e getta", la risposta viene scartata). */
  captureToProfile?: Record<string, string>;
  /** Come captureToProfile ma scrive nello stato locale dello screen invece che nel profilo
   * persistito (§4 manuale) — utile per pre-selezionare un valore noto solo dopo il fetch
   * (es. dropdown "azienda attiva"). Il valore catturato è sempre convertito a stringa. */
  captureToState?: Record<string, string>;
  /** Header HTTP statici aggiunti alla richiesta, sovrascrivono quelli di auth omonimi
   * (§4 manuale). Valori fissi nel JSON: evitare per segreti condivisi (preferire un proxy
   * lato server). */
  headers?: Record<string, string>;
  /** Genera `Authorization: Basic base64(username:password)` (§4 manuale) — da usare con
   * `auth: "public"` per non sovrascrivere l'header. Valori in chiaro nel JSON. */
  basicAuth?: { username: string; password: string };
}

/** Legge un `dataSource` grezzo (screen o flow-step: stessa forma) da JSON. */
export function dataSourceFromJson(ds: Record<string, unknown>): SduiDataSource {
  return {
    method: (ds['method'] as string) ?? 'GET',
    endpoint: (ds['endpoint'] as string) ?? '',
    auth: (ds['auth'] as string) ?? 'bearer',
    bodyMapping: (ds['bodyMapping'] as Record<string, string>) ?? {},
    responseTransform: parseResponseTransform(ds['responseTransform'] as Record<string, unknown> | undefined) ?? null,
    defaultDateRange: ds['defaultDateRange'] as SduiDataSource['defaultDateRange'] | undefined,
    captureToProfile: (ds['captureToProfile'] as Record<string, string>) ?? undefined,
    captureToState: (ds['captureToState'] as Record<string, string>) ?? undefined,
    headers: (ds['headers'] as Record<string, string>) ?? undefined,
    basicAuth: (ds['basicAuth'] as { username: string; password: string }) ?? undefined,
  };
}

/** Legge un `responseTransform` grezzo, riconoscendo i tre tipi generici editabili dal
 * wizard (`flattenNested`/`wrapAsSingleGroup`/`groupByField`, §4 manuale); qualunque altro tipo
 * (transform custom hardcoded nell'engine) viene preservato as-is. */
export function parseResponseTransform(rt: Record<string, unknown> | undefined): SduiResponseTransform | undefined {
  if (!rt) return undefined;
  if (rt['type'] === 'flattenNested') {
    return {
      type: 'flattenNested',
      arrayPath: (rt['arrayPath'] as string) ?? '',
      targetPath: (rt['targetPath'] as string) ?? '',
      fields: parseFlattenFieldsMap(rt['fields'] as Record<string, unknown>),
      rootFields: (rt['rootFields'] as Record<string, string>) ?? {},
    };
  }
  if (rt['type'] === 'wrapAsSingleGroup') {
    return {
      type: 'wrapAsSingleGroup',
      itemsPath: (rt['itemsPath'] as string) ?? 'items',
      targetPath: (rt['targetPath'] as string) ?? 'groupedItems',
      groupLabelKey: rt['groupLabelKey'] as string | undefined,
      itemFields: (rt['itemFields'] as Record<string, string>) ?? undefined,
      dateFlags: (rt['dateFlags'] as SduiWrapAsSingleGroup['dateFlags']) ?? undefined,
      staticItemFields: (rt['staticItemFields'] as Record<string, string>) ?? {},
    };
  }
  if (rt['type'] === 'groupByField') {
    return {
      type: 'groupByField',
      itemsPath: (rt['itemsPath'] as string) ?? 'items',
      targetPath: (rt['targetPath'] as string) ?? 'groupedItems',
      groupField: (rt['groupField'] as string) ?? '',
      groupLabelField: rt['groupLabelField'] as string | undefined,
      sortGroupsDescending: rt['sortGroupsDescending'] as boolean | undefined,
    };
  }
  if (rt['type'] === 'mapFields') {
    return {
      type: 'mapFields',
      fields: parseFlattenFieldsMap(rt['fields'] as Record<string, unknown>),
    };
  }
  // Transform custom con logica hardcoded nell'engine (es. "buildProfilesList"): il wizard
  // non la conosce/edita, la preserva as-is per non perderla su un giro JSON -> wizard -> JSON
  // (vedi SduiCustomTransform — non fa parte dell'union per non rompere il narrowing altrove).
  return rt as unknown as SduiResponseTransform;
}

export function createEmptyDataSource(): SduiDataSource {
  return {
    method: 'GET',
    endpoint: '',
    auth: 'bearer',
    bodyMapping: {},
    responseTransform: null,
  };
}

export function createEmptyFlattenNested(): SduiFlattenNested {
  return { type: 'flattenNested', arrayPath: '', targetPath: '', fields: {}, rootFields: {} };
}

export function createEmptyWrapAsSingleGroup(): SduiWrapAsSingleGroup {
  return { type: 'wrapAsSingleGroup', itemsPath: 'items', targetPath: 'groupedItems', staticItemFields: {} };
}

export function createEmptyGroupByField(): SduiGroupByField {
  return { type: 'groupByField', itemsPath: 'items', targetPath: 'groupedItems', groupField: '', sortGroupsDescending: true };
}

export function createEmptyMapFields(): SduiMapFields {
  return { type: 'mapFields', fields: {} };
}

// ---------------------------------------------------------------------------
// Validazione field
// ---------------------------------------------------------------------------

export interface SduiValidation {
  required?: boolean;
  pattern?: string;
  equalsField?: string;
  errorKeys?: { required?: string; pattern?: string; equalsField?: string };
}

export type SduiValidationKey =
  | 'required'
  | 'pattern'
  | 'equalsField'
  | 'errorKeys.required'
  | 'errorKeys.pattern'
  | 'errorKeys.equalsField';

/** Applica un aggiornamento a SduiValidation, gestendo anche le chiavi annidate errorKeys.*. */
export function applyValidationKey(validation: SduiValidation, key: SduiValidationKey, value: unknown): void {
  if (key.startsWith('errorKeys.')) {
    const subKey = key.slice('errorKeys.'.length) as 'required' | 'pattern' | 'equalsField';
    validation.errorKeys ??= {};
    validation.errorKeys[subKey] = value as string;
  } else {
    (validation as Record<string, unknown>)[key] = value;
  }
}

// ---------------------------------------------------------------------------
// Opzioni per dropdown/radioCard/radioCardList
// ---------------------------------------------------------------------------

export type SduiOptionsSource = 'static' | 'fromState' | 'remote' | 'selected';

export interface SduiOptionValue {
  value: string;
  labelKey: string;
  sublabelKey?: string;
  descriptionKey?: string;
}

export interface SduiOptions {
  source: SduiOptionsSource;
  values: SduiOptionValue[];
  path: string;
  endpoint: string;
  auth: string;
  itemsField: string;
  fields?: Record<string, SduiFlattenField>;
  valueTemplate: string;
  labelTemplate: string;
  sublabelTemplate: string;
  metaFields: string[];
  pageSize: number;
  /** Opzione fittizia mostrata (dropdown/radioCardList `remote`) quando la lista risolta è
   * vuota, invece di un componente vuoto/inutilizzabile (§10 manuale). `value: ""` è la
   * convenzione tipica per non inviare alcun valore reale se selezionata. */
  emptyFallback?: { value: string; labelKey: string } | null;
  /** Con `source: "selected"`: id del field la cui opzione già scelta viene mostrata da sola
   * (value/label/meta letti da `{of}`/`{of}Label`/`{of}Meta`), utile in un riepilogo. */
  of?: string;
  /** Con `source: "selected"`: la card non è toccabile. */
  readOnly?: boolean;
}

export function createEmptyOptions(): SduiOptions {
  return {
    source: 'static',
    values: [],
    path: '',
    endpoint: '',
    auth: 'bearer',
    itemsField: 'items',
    valueTemplate: '',
    labelTemplate: '',
    sublabelTemplate: '',
    metaFields: [],
    pageSize: 5,
    emptyFallback: null,
    of: '',
    readOnly: false,
  };
}


// ---------------------------------------------------------------------------
// Field (component di form)
// ---------------------------------------------------------------------------

export type SduiFieldComponent =
  | 'textInput' | 'datePicker' | 'timePicker' | 'filePicker' | 'checkbox' | 'toggle'
  | 'dropdown' | 'radioCard' | 'radioCardList' | 'summaryCard' | 'captcha' | 'chip'
  | 'staticText' | 'readOnlyInfo' | 'infoBanner' | 'row' | 'column'
  | 'actionButton' | 'qrScanner' | 'image' | 'animatedCheck';

export const SDUI_FIELD_COMPONENTS: { value: SduiFieldComponent; label: string; needsOptions: boolean }[] = [
  { value: 'textInput', label: 'sduiWizard.fieldComponents.textInput', needsOptions: false },
  { value: 'datePicker', label: 'sduiWizard.fieldComponents.datePicker', needsOptions: false },
  { value: 'timePicker', label: 'sduiWizard.fieldComponents.timePicker', needsOptions: false },
  { value: 'filePicker', label: 'sduiWizard.fieldComponents.filePicker', needsOptions: false },
  { value: 'checkbox', label: 'sduiWizard.fieldComponents.checkbox', needsOptions: false },
  { value: 'toggle', label: 'sduiWizard.fieldComponents.toggle', needsOptions: false },
  { value: 'dropdown', label: 'sduiWizard.fieldComponents.dropdown', needsOptions: true },
  { value: 'radioCard', label: 'sduiWizard.fieldComponents.radioCard', needsOptions: true },
  { value: 'radioCardList', label: 'sduiWizard.fieldComponents.radioCardList', needsOptions: true },
  { value: 'summaryCard', label: 'sduiWizard.fieldComponents.summaryCard', needsOptions: false },
  { value: 'captcha', label: 'sduiWizard.fieldComponents.captcha', needsOptions: false },
  { value: 'chip', label: 'sduiWizard.fieldComponents.chip', needsOptions: false },
  { value: 'staticText', label: 'sduiWizard.fieldComponents.staticText', needsOptions: false },
  { value: 'readOnlyInfo', label: 'sduiWizard.fieldComponents.readOnlyInfo', needsOptions: false },
  { value: 'infoBanner', label: 'sduiWizard.fieldComponents.infoBanner', needsOptions: false },
  { value: 'row', label: 'sduiWizard.fieldComponents.row', needsOptions: false },
  { value: 'column', label: 'sduiWizard.fieldComponents.column', needsOptions: false },
  { value: 'actionButton', label: 'sduiWizard.fieldComponents.actionButton', needsOptions: false },
  { value: 'qrScanner', label: 'sduiWizard.fieldComponents.qrScanner', needsOptions: false },
  { value: 'image', label: 'sduiWizard.fieldComponents.image', needsOptions: false },
  { value: 'animatedCheck', label: 'sduiWizard.fieldComponents.animatedCheck', needsOptions: false },
];

export interface SduiFlatField {
  labelKey: string;
  field: string;
}

/** Normalizzazione del testo mentre si digita (§8). Qualunque altro valore e'
 * ignorato dall'engine (CaseTextInputFormatter.fromJson ritorna null), quindi
 * il wizard offre solo i due riconosciuti piu' l'assenza dell'opzione. */
export type SduiTextCase = 'upper' | 'lower';

/** Tastiera mostrata su mobile (§8). `text` e' il default dell'engine
 * (resolveSduiKeyboardType ricade li' per ogni valore non riconosciuto). */
export type SduiKeyboardType = 'text' | 'number' | 'decimal' | 'email' | 'phone';

export const SDUI_TEXT_CASES: { value: SduiTextCase | ''; label: string }[] = [
  { value: '', label: 'sduiWizard.textCase.none' },
  { value: 'upper', label: 'sduiWizard.textCase.upper' },
  { value: 'lower', label: 'sduiWizard.textCase.lower' },
];

export const SDUI_KEYBOARD_TYPES: { value: SduiKeyboardType; label: string }[] = [
  { value: 'text', label: 'sduiWizard.keyboardType.text' },
  { value: 'number', label: 'sduiWizard.keyboardType.number' },
  { value: 'decimal', label: 'sduiWizard.keyboardType.decimal' },
  { value: 'email', label: 'sduiWizard.keyboardType.email' },
  { value: 'phone', label: 'sduiWizard.keyboardType.phone' },
];

export interface SduiDetailAction {
  linkKey: string;
  subtitleField?: string;
  badgeField?: string;
  flatFields?: SduiFlatField[];
  officesField?: string;
  officeTitleKey?: string;
  officeFields?: SduiFlatField[];
  /** Varianti font (AppTheme compact/medium/standard/large), default `standard`. */
  titleVariant?: 'compact' | 'medium' | 'standard' | 'large';
  subtitleVariant?: 'compact' | 'medium' | 'standard' | 'large';
  officeTitleVariant?: 'compact' | 'medium' | 'standard' | 'large';
}

export interface SduiField {
  id: string;
  component: SduiFieldComponent;
  labelKey: string;
  visibleIf?: string;
  paddingBottom?: number;
  validation?: SduiValidation;
  options?: SduiOptions;
  // textInput (§8 manuale)
  multiline?: boolean;
  maxLines?: number;
  hintKey?: string;
  textCase?: SduiTextCase;
  keyboardType?: SduiKeyboardType;
  /** decimals (solo con keyboardType "decimal", default 2 lato engine). */
  decimals?: number;
  obscureText?: boolean;
  maxLength?: number;
  trim?: boolean;
  // datePicker
  minDate?: string;
  maxDate?: string;
  // filePicker
  allowedExtensions?: string[];
  placeholderKey?: string;
  /** Scarta file più grandi di N MB (errore `maxSizeErrorKey`, placeholder `{max}`). */
  maxSizeMb?: number;
  maxSizeErrorKey?: string;
  /** `"attachments"`: design "Aggiungi documento" — riquadro con titolo/help/bottone invece
   * del campo con bordo (§"filePicker" manuale). */
  filePickerStyle?: 'attachments';
  emptyTitleKey?: string;
  helpKey?: string;
  buttonLabelKey?: string;
  removeLabelKey?: string;
  replaceLabelKey?: string;
  // readOnlyInfo
  valueField?: string;
  /** "stacked": etichetta sopra e valore sotto, allineati a sinistra, senza icona né padding del
   * ListTile. Default "default" (layout storico a riga singola). */
  layout?: 'default' | 'stacked';
  // captcha
  siteKey?: string;
  baseUrl?: string;
  theme?: string;
  // chip
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  // infoBanner
  linkKey?: string;
  infoDialogTitleKey?: string;
  infoDialogBodyKey?: string;
  buttonKey?: string;
  primaryActionSequence?: SduiSequenceCall[];
  actionMessageKey?: string;
  // row/column
  children?: SduiField[];
  gap?: number;
  widthPercent?: number;
  flex?: number;
  shrinkWrap?: boolean;
  /** Racchiude il container in una Card a tutta larghezza (§"Container row/column: card"). */
  card?: boolean;
  /** Padding (px) della Card, solo con card:true. Default 12. */
  cardPadding?: number;
  // radioCardList (§10 manuale)
  badgeField?: string;
  delegateHeaderKey?: string;
  loadMoreLabelKey?: string;
  filterBy?: string;
  ownBadgeKey?: string;
  detailAction?: SduiDetailAction;
  /** Varianti font (nome card/descrizioni/intestazioni di gruppo). */
  titleVariant?: 'compact' | 'medium' | 'standard' | 'large';
  descriptionVariant?: 'compact' | 'medium' | 'standard' | 'large';
  headerVariant?: 'compact' | 'medium' | 'standard' | 'large';
  /** Chiave in `meta` (dd/MM/yyyy o ISO) per il riquadro data a sinistra del testo. */
  dateBadgeField?: string;
  /** Chip arrotondate sotto il titolo, lette da `meta` (es. `{template: "{timeLabel}", icon: "schedule"}`). */
  chips?: SduiRadioCardTemplateItem[];
  /** Righe con icona sotto le chip (stessa forma di chips[]); righe vuote omesse. */
  lines?: SduiRadioCardTemplateItem[];
  /** Chip affiancate al titolo sulla stessa riga (stessa forma di chips[]). */
  titleChips?: SduiRadioCardTemplateItem[];
  /** Nasconde il cerchio del radio button. */
  hideRadio?: boolean;
  /** Spessore bordo card selezionata (default 2). */
  selectedBorderWidth?: number;
  /** `lines[]` a tutta larghezza sotto data e titolo invece che in colonna a destra. */
  fullWidthLines?: boolean;
  /** Testo mostrato se esiste la card propria (`meta.isMe`) ma nessuna opzione in delega. */
  emptyDelegatesKey?: string;
  // summaryCard (condivide badgeField con radioCardList)
  titleValueField?: string;
  subtitleField?: string;
  flatFields?: SduiFlatField[];
  officesField?: string;
  officeTitleKey?: string;
  officeFields?: SduiFlatField[];
  // actionButton (§8 manuale)
  /** Stile del bottone a tutta larghezza (default `filled`). */
  style?: 'filled' | 'outlined' | 'destructive';
  action?: SduiAction;
  // qrScanner (§8 manuale)
  scanTitleKey?: string;
  scanPattern?: string;
  scanHintKey?: string;
  scanInvalidKey?: string;
  /** Nomi `BarcodeFormat` (default `["qrCode"]`), es. `code128`/`ean13` per i codici a barre. */
  formats?: string[];
  /** Riquadro guida al centro dello scanner. */
  scanFrame?: { shape?: 'square' | 'rect' | 'none'; size?: number };
  /** `{chiaveStato: regola}`, regola = modificatore inline (es. `part:/:1`) o `{regex, group}`. */
  extract?: Record<string, string | { regex: string; group: number }>;
  onScan?: SduiAction;
  // image / animatedCheck (§8 manuale)
  svg?: string;
  width?: number;
  height?: number;
  align?: 'left' | 'center' | 'right';
  tint?: boolean;
  size?: number;
}

export function createEmptyField(component: SduiFieldComponent = 'textInput'): SduiField {
  const field: SduiField = {
    id: '',
    component,
    labelKey: '',
  };
  if (component === 'dropdown' || component === 'radioCard' || component === 'radioCardList') {
    field.options = createEmptyOptions();
  }
  if (component === 'row' || component === 'column') {
    field.children = [];
    field.gap = 8;
  }
  if (component === 'actionButton') {
    field.style = 'filled';
    field.action = { type: 'reload' };
  }
  if (component === 'qrScanner') {
    field.formats = ['qrCode'];
    field.onScan = { type: 'reload' };
  }
  if (component === 'image' || component === 'animatedCheck') {
    field.align = 'center';
  }
  return field;
}

// ---------------------------------------------------------------------------
// Azioni dichiarative
// ---------------------------------------------------------------------------

export type SduiActionType =
  | 'navigateSdui' | 'reload' | 'openExternal' | 'call' | 'downloadFile'
  | 'confirmAndCall' | 'toggleField' | 'toggleFavorite' | 'addToCalendar' | 'logout';

export const SDUI_ACTION_TYPES: { value: SduiActionType; label: string; warning?: string }[] = [
  { value: 'navigateSdui', label: 'sduiWizard.actionTypes.navigateSdui.label' },
  { value: 'reload', label: 'sduiWizard.actionTypes.reload.label' },
  { value: 'openExternal', label: 'sduiWizard.actionTypes.openExternal.label', warning: 'sduiWizard.actionTypes.openExternal.warning' },
  { value: 'call', label: 'sduiWizard.actionTypes.call.label', warning: 'sduiWizard.actionTypes.call.warning' },
  { value: 'downloadFile', label: 'sduiWizard.actionTypes.downloadFile.label' },
  { value: 'confirmAndCall', label: 'sduiWizard.actionTypes.confirmAndCall.label' },
  { value: 'toggleField', label: 'sduiWizard.actionTypes.toggleField.label' },
  { value: 'toggleFavorite', label: 'sduiWizard.actionTypes.toggleFavorite.label' },
  { value: 'addToCalendar', label: 'sduiWizard.actionTypes.addToCalendar.label' },
  { value: 'logout', label: 'sduiWizard.actionTypes.logout.label' },
];

export interface SduiCallSpec {
  endpoint: string;
  method: string;
  auth?: string;
  bodyMapping?: Record<string, string>;
}

/** Variante "leggera" di SduiSuccessScreen (§5.3 manuale) per confirmAndCall (azioni di
 * riga): niente `summary` (nessun equivalente sensato per un delete), niente `type` per
 * azione (il motore chiude sempre la pagina alla pressione, indipendentemente dal valore). */
export interface SduiRowActionSuccessScreen {
  titleKey: string;
  subtitleKey?: string;
  actions: { labelKey: string; style?: 'filled' | 'outlined' }[];
}

export function createEmptyRowActionSuccessScreen(): SduiRowActionSuccessScreen {
  return { titleKey: '', actions: [{ labelKey: '', style: 'filled' }] };
}

/** toggleField.successSheet (§6 manuale): pannello di esito mostrato dopo il successo del
 * toggle quando confirmStyle è "sheet". Varianti WhenTrue/WhenFalse opzionali, altrimenti
 * si usano i campi base. */
export interface SduiToggleFieldSuccessSheet {
  titleKey?: string;
  titleKeyWhenTrue?: string;
  titleKeyWhenFalse?: string;
  messageKey?: string;
  messageKeyWhenTrue?: string;
  messageKeyWhenFalse?: string;
  primaryLabelKey: string;
  secondaryLabelKey?: string;
}

export function createEmptyToggleFieldSuccessSheet(): SduiToggleFieldSuccessSheet {
  return { primaryLabelKey: '' };
}

/** Statistiche d'uso opzionali su qualunque azione (§6 manuale, "Statistiche d'uso") — mai
 * dati personali o clinici. */
export interface SduiActionAnalytics {
  category?: string;
  event?: string;
  name?: string;
}

export interface SduiAction {
  type: SduiActionType;
  // primaryAction (icona + label del FloatingActionButton — §6 manuale)
  icon?: string;
  labelKey?: string;
  // navigateSdui
  entity?: string;
  assetPath?: string;
  initialStateFromItem?: Record<string, string>;
  /** navigateSdui (§6 manuale): forza il contesto auth della pagina aperta — default eredita
   * quello corrente; da un entry point pubblico verso una pagina autenticata va messo false. */
  sduiWithoutAuth?: boolean;
  // downloadFile
  endpoint?: string;
  fileName?: string;
  auth?: string;
  successMessageKey?: string;
  errorMessageKey?: string;
  /** downloadFile (§6 manuale): campo dell'item col MIME type reale del documento, passato
   * esplicitamente a OpenFilex.open invece di lasciare che lo deduca dall'estensione — utile
   * quando fileName non può includere un'estensione affidabile. */
  mimeTypeField?: string;
  // confirmAndCall
  confirmTitleKey?: string;
  confirmMessageKey?: string;
  call?: SduiCallSpec;
  onSuccess?: {
    messageKey?: string;
    refreshDataSource?: boolean;
    removeFrom?: { groupsPath: string; groupItemsField: string; matchField: string };
    /** Alternativa a messageKey (priorità su di esso se presente) — riusa lo stesso widget
     * generico `SduiSuccessScreen` di §5.3, senza "summary": qui il motore (action_runner.dart)
     * ignora `type` e chiude sempre la pagina alla pressione, quindi non esiste un vero
     * "resetForm" per un'azione di riga come un delete (§6 manuale). */
    showSuccessScreen?: SduiRowActionSuccessScreen | null;
    /** confirmAndCall.onSuccess.popScreen (§7.1 manuale): chiude la screen dopo l'azione,
     * ritornando true al chiamante. Se combinato con showSuccessScreen, la pagina di successo
     * si apre per prima e la screen viene chiusa alla chiusura di quella pagina. */
    popScreen?: boolean;
  };
  // toggleField
  field?: string;
  updateInGroups?: { groupsPath: string; groupItemsField: string; matchField: string };
  // toggleField — varianti direzionali (decise dal valore del campo prima del toggle)
  labelKeyWhenTrue?: string;
  labelKeyWhenFalse?: string;
  confirmTitleKeyWhenTrue?: string;
  confirmMessageKeyWhenTrue?: string;
  confirmTitleKeyWhenFalse?: string;
  confirmMessageKeyWhenFalse?: string;
  /** toggleField (§6 manuale): mostra la conferma come pannello dal basso invece del dialog
   * standard. */
  confirmStyle?: 'sheet';
  /** toggleField (§6 manuale): pannello di esito mostrato dopo il successo quando confirmStyle
   * è "sheet". */
  successSheet?: SduiToggleFieldSuccessSheet | null;
  // toggleFavorite
  favoriteIdField?: string;
  addCall?: SduiCallSpec;
  removeCall?: SduiCallSpec;
  // addToCalendar (§6 manuale)
  start?: string;
  time?: string;
  end?: string;
  durationMinutes?: number;
  title?: string;
  titleKey?: string;
  location?: string | string[];
  description?: (string | { labelKey: string; value: string })[];
  reminderMinutes?: number;
  /** Statistiche d'uso opzionali (§6 manuale) — personalizza l'evento inviato da runAction. */
  analytics?: SduiActionAnalytics;
}

export function createEmptyAction(type: SduiActionType = 'navigateSdui'): SduiAction {
  const action: SduiAction = { type };
  if (type === 'confirmAndCall') action.call = { endpoint: '', method: 'DELETE' };
  if (type === 'toggleField') {
    action.field = 'flag';
  }
  if (type === 'toggleFavorite') {
    action.field = 'favorite';
    action.favoriteIdField = 'favoriteId';
    action.addCall = { endpoint: '', method: 'POST' };
    action.removeCall = { endpoint: '', method: 'DELETE' };
  }
  if (type === 'addToCalendar') {
    action.start = '{startDate}';
    action.durationMinutes = 30;
  }
  return action;
}

// ---------------------------------------------------------------------------
// primaryAction (icone whitelist condivisa con i menu)
// ---------------------------------------------------------------------------

export const SDUI_MENU_ICONS = [
  'privacy_tip', 'notifications', 'history', 'tune', 'launch', 'phone_callback',
  'call', 'payment', 'download', 'cancel', 'add', 'event_available',
] as const;

export const SDUI_BADGE_COLORS = ['green', 'amber', 'red', 'blue', 'black'] as const;

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

export type SduiSectionType =
  | 'form' | 'list' | 'info' | 'menu' | 'table' | 'filterBar' | 'eventsSummary'
  | 'groupedTable' | 'cardList' | 'calendar';

export const SDUI_SECTION_TYPES: { value: SduiSectionType; label: string; tip: string }[] = [
  { value: 'form', label: 'sduiWizard.sectionTypes.form.label', tip: 'sduiWizard.sectionTypes.form.tip' },
  { value: 'list', label: 'sduiWizard.sectionTypes.list.label', tip: 'sduiWizard.sectionTypes.list.tip' },
  { value: 'info', label: 'sduiWizard.sectionTypes.info.label', tip: 'sduiWizard.sectionTypes.info.tip' },
  { value: 'menu', label: 'sduiWizard.sectionTypes.menu.label', tip: 'sduiWizard.sectionTypes.menu.tip' },
  { value: 'table', label: 'sduiWizard.sectionTypes.table.label', tip: 'sduiWizard.sectionTypes.table.tip' },
  { value: 'filterBar', label: 'sduiWizard.sectionTypes.filterBar.label', tip: 'sduiWizard.sectionTypes.filterBar.tip' },
  { value: 'eventsSummary', label: 'sduiWizard.sectionTypes.eventsSummary.label', tip: 'sduiWizard.sectionTypes.eventsSummary.tip' },
  { value: 'groupedTable', label: 'sduiWizard.sectionTypes.groupedTable.label', tip: 'sduiWizard.sectionTypes.groupedTable.tip' },
  { value: 'cardList', label: 'sduiWizard.sectionTypes.cardList.label', tip: 'sduiWizard.sectionTypes.cardList.tip' },
  { value: 'calendar', label: 'sduiWizard.sectionTypes.calendar.label', tip: 'sduiWizard.sectionTypes.calendar.tip' },
];

export interface SduiColumn {
  key: string;
  labelKey: string;
  sortable?: boolean;
}

export interface SduiFilterOption {
  value: string;
  labelKey?: string;
  color?: string;
  daysAgo?: number;
  daysForward?: number;
  /** Se `true`, selezionando questa opzione il bottom sheet mostra un date picker manuale
   * per `fromField`/`toField` invece di calcolarli da `daysAgo`/`daysForward` (§3.5 manuale). */
  custom?: boolean;
  /** Opzione "ultimi N" (§3.5 manuale): campo di stato che riceve il numero inserito
   * (azzera fromField/toField, usato come placeholder `{numberField}` nell'endpoint). */
  numberField?: string;
  /** Etichetta del campo numerico mostrato quando questa opzione è selezionata. */
  numberLabelKey?: string;
  /** Valore iniziale del campo numerico. */
  numberDefault?: number;
}

export interface SduiFilterOptionsSource {
  endpoint: string;
  auth?: 'bearer' | 'public';
  /** Nome (o lista di nomi) di array nella risposta da cui estrarre le opzioni. */
  itemsField: string | string[];
  /** Identificativo dell'opzione: template con placeholder `{campo}` (alternativa a valueField). */
  valueTemplate?: string;
  /** Identificativo dell'opzione: nome diretto di un campo (alternativa a valueTemplate). */
  valueField?: string;
  /** Path (anche con punti) della label; `{lang}` = lingua corrente con fallback it. */
  labelField?: string;
}

export interface SduiFilterGroup {
  id: string;
  /** Titolo della sezione nel bottom sheet filtri — letto da filter_sheet.dart come
   * `g['titleKey']` (NON `labelKey`, nonostante gli esempi del manuale: verificato sul
   * motore reale, `openFilterSheet` in filter_sheet.dart righe 166/258). */
  titleKey?: string;
  field?: string;
  labelField?: string;
  colorField?: string;
  multiSelect?: boolean;
  options?: SduiFilterOption[];
  /** Opzioni scaricate da endpoint alla prima apertura del bottom sheet e tenute in stato
   * `filterOptions.{id}` — alternativa a `options` statico/derivato da `field` (§3.5 manuale). */
  optionsSource?: SduiFilterOptionsSource;
  /** Con `optionsSource`: mappa nome parametro query → campo dell'opzione scelta, ripetuto
   * per ogni valore selezionato e aggiunto alla dataSource GET. */
  queryParams?: Record<string, string>;
  dateRangeField?: {
    fromField: string;
    toField: string;
    fromLabelKey?: string;
    toLabelKey?: string;
    /** Usata solo quando fromField === toField (caso "un giorno solo", §3.5 manuale): etichetta
     * della singola riga data mostrata al posto delle due righe "Da"/"A". */
    dateLabelKey?: string;
  };
}

export interface SduiFilterButton {
  labelKey: string;
  groups: SduiFilterGroup[];
}


export interface SduiBadgeEntry {
  labelKey: string;
  color: string;
}

/** Voce di `rowDetail.actionsSheet` (§3.10/§6 manuale): l'azione è annidata sotto la
 * chiave `action:` — schema corretto e attuale, sia da manuale che dal motore Dart
 * (`card_detail_page.dart` -> `_openActionsSheet`, che legge `a['action']` con fallback
 * sull'item stesso solo per compatibilità con entity storiche pre-fix del commit sh-core
 * `2e7f130`, quando l'engine leggeva erroneamente i campi flat dalla root). `labelKey`/
 * `field`/`labelKeyWhenTrue`/`labelKeyWhenFalse`/`visibleIf`/`style`/`visibleWhenField*`
 * sono proprietà genuinamente item-level, lette da `card_detail_page.dart` stesso (mai
 * passate a `runAction`) — da non confondere con eventuali omonime dentro `action` (es. il
 * `field` di un'azione `toggleField`, concetto diverso: il campo da alternare, non
 * l'etichetta dinamica della voce del bottom sheet). */
export interface SduiActionSheetItem {
  labelKey?: string;
  field?: string;
  labelKeyWhenTrue?: string;
  labelKeyWhenFalse?: string;
  visibleIf?: string;
  style?: 'filled' | 'outline' | 'destructive';
  visibleWhenFieldTrue?: string;
  visibleWhenFieldFalse?: string;
  action: SduiAction;
}

export interface SduiRowDetailSection {
  titleKey?: string;
  type?: 'attachedDocuments' | 'documentDownload';
  field?: string;
  preview?: boolean;
  previewEndpoint?: string;
  fields?: { key: string; labelKey: string }[];
  // documentDownload (§3.10 manuale): UNA sola card sempre visibile con download diretto,
  // senza pulsante "⋮" — alternativa più scopribile ad actionsSheet per un solo documento.
  titleField?: string;
  subtitleField?: string;
  action?: SduiAction;
  actionsSheet?: SduiActionSheetItem[];
}

export interface SduiRadioCardTemplateItem {
  template: string;
  icon?: 'schedule' | 'place' | 'apartment' | 'calendar';
}

export interface SduiRowDetailChip {
  labelKey: string;
  visibleIf?: string;
}


export interface SduiRowDetail {
  detailEndpoint?: string;
  detailTitleKey?: string;
  titleField?: string;
  /** Azione eseguita al tap sulla card al posto della pagina di dettaglio (§3.10 manuale).
   * Con tapAction valorizzato, `sections` non è necessario (pagina di dettaglio non si apre). */
  tapAction?: SduiAction | null;
  /** "bottom": le azioni di actionsSheet diventano bottoni a piena larghezza in fondo alla
   * pagina di dettaglio invece del foglio dal pulsante "⋮" (utile con una sola azione). */
  actionsLayout?: 'bottom';
  /** Varianti font (tema AppTheme) opzionali per titolo grande/titoli sezione/etichette/valori. */
  titleVariant?: 'compact' | 'medium' | 'standard' | 'large';
  sectionTitleVariant?: 'compact' | 'medium' | 'standard' | 'large';
  labelVariant?: 'compact' | 'medium' | 'standard' | 'large';
  valueVariant?: 'compact' | 'medium' | 'standard' | 'large';
  /** Chip generici sopra il titolo del dettaglio (§3.10 manuale, sh-core e42edb2):
   * sostituisce `personalField`/`personalLabelKey` (rimossi dal motore, card_detail_page.dart
   * legge solo `chips[]`). Non confondere con `card.personalField`/`personalLabelKey`
   * (SduiCard, livello card-list, non toccato da questo cambio). */
  chips?: SduiRowDetailChip[];
  badgeField?: string;
  badgeMap?: Record<string, SduiBadgeEntry>;
  secondaryBadgeField?: string;
  secondaryBadgeMap?: Record<string, SduiBadgeEntry>;
  sections: SduiRowDetailSection[];
  actionsSheet?: SduiActionSheetItem[];
}

export function createEmptyRowDetail(): SduiRowDetail {
  return { titleField: '', sections: [] };
}

export function createEmptyRowDetailSection(): SduiRowDetailSection {
  return { titleKey: '', fields: [] };
}

export function createEmptyActionSheetItem(): SduiActionSheetItem {
  return { action: createEmptyAction() };
}

export interface SduiMenuItem {
  icon?: string;
  labelKey: string;
  descriptionKey?: string;
  action: SduiAction;
  /** SVG raw o base64 mostrato al posto di `icon` (§3.4 manuale); ripiega su `icon` se assente/non valido. */
  svg_icon?: string;
  /** Solo con `layout: "serviceCards"`: badge "Link" o "Accedi" (quest'ultimo solo senza sessione). */
  badge?: 'link' | 'login';
  /** Nasconde la voce se l'espressione (stessa sintassi dei field, §5) è falsa sullo stato. */
  visibleIf?: string;
  /** Sostituisce la freccia a destra (stessa whitelist chiusa di `icon`). */
  trailingIcon?: string;
  /** Override per-voce di `iconBackground` a livello sezione. */
  iconBackground?: boolean;
}

export interface SduiListItemTemplate {
  titleField: string;
  subtitleField?: string;
  valueField: string;
  enabledWhenFieldTrue?: string;
  enabledWhenFieldFalse?: string;
}

export interface SduiCard {
  titleField: string;
  subtitleField?: string;
  dateField?: string;
  organizationField?: string;
  badgeField?: string;
  badgeMap?: Record<string, SduiBadgeEntry>;
  favoriteField?: string;
  hiddenField?: string;
  personalField?: string;
  personalLabelKey?: string;
  /** Tile compatto: una riga titolo, sotto "organizationField · dateField", stella a destra —
   * niente note/sottotitolo. Stili solo da tema (§3.9 manuale). Ideale per widget Home. */
  compact?: boolean;
  /** Espressione (sintassi visibleIf, valutata sull'item, card non compatta) che decide se
   * mostrare l'icona/etichetta "Oscurato/Visibile" — es. "hidden == true" (§3.9 manuale). */
  hiddenIconVisibleIf?: string;
  /** Come sopra ma per organizationField — es. "personal != true" nasconde l'ente per i
   * documenti inseriti dal cittadino (§3.9 manuale, card non compatta). */
  organizationVisibleIf?: string;
  // Formato atomico generico (§3.9.1 manuale) — se `elements` è presente, ha
  // priorità e sostituisce del tutto i campi legacy sopra.
  gap?: number;
  elements?: SduiCardElement[];
}

/** Tipi di elemento atomico + container di layout per `card.elements` (§3.9.1). */
export type SduiCardElementType =
  | 'title' | 'subtitle' | 'text' | 'keyValue' | 'date' | 'dateBadge' | 'badge'
  | 'chipsRow' | 'favorite' | 'personalBadge' | 'icon' | 'divider' | 'verticalDivider' | 'spacer'
  | 'row' | 'column';

export const SDUI_CARD_ELEMENT_TYPES: SduiCardElementType[] = [
  'title', 'subtitle', 'text', 'keyValue', 'date', 'dateBadge', 'badge',
  'chipsRow', 'favorite', 'personalBadge', 'icon', 'divider', 'verticalDivider', 'spacer',
  'row', 'column',
];

/** Tipi che leggono un valore da `field` sull'item (tutti tranne i container e divider/spacer statici). */
export const SDUI_CARD_ELEMENT_FIELD_BASED: SduiCardElementType[] = [
  'title', 'subtitle', 'text', 'keyValue', 'date', 'dateBadge', 'badge', 'chipsRow', 'favorite', 'personalBadge',
];

export interface SduiCardElement {
  type: SduiCardElementType;
  field?: string;
  labelKey?: string;
  variant?: string;
  align?: string;
  // keyValue
  orientation?: 'vertical' | 'horizontal';
  /** keyValue (§3.9.1 manuale): chiave di traduzione mostrata al posto del valore quando
   * item[field] è null/vuoto, invece di una riga vuota o di nascondere l'intero elemento. */
  emptyValueKey?: string;
  /** keyValue: stile dell'etichetta, default `standard` come `variant` (stessa dimensione
   * del valore, mai più piccola). Valori ammessi: compact/standard/large. */
  labelVariant?: 'compact' | 'standard' | 'large';
  // badge
  badgeMap?: Record<string, SduiBadgeEntry>;
  // icon (statica se field assente, mappata da valore se field+iconMap presenti)
  icon?: string;
  color?: string;
  size?: number;
  iconMap?: Record<string, { icon?: string; color?: string; labelKey?: string; size?: number }>;
  // icon — sfondo circolare "avatar" (opzionale)
  circleBackground?: boolean;
  circleColor?: string;
  circleSize?: number;
  // dateBadge — riquadro "giorno grande + mese abbreviato" (§3.9.1 manuale;
  // di default nessun box: opt-in con `bordered: true` o backgroundColor/borderColor)
  bordered?: boolean;
  backgroundColor?: string;
  borderColor?: string;
  borderRadius?: number;
  dayColor?: string;
  monthColor?: string;
  monthKeyPrefix?: string;
  // divider / spacer / verticalDivider
  height?: number;
  width?: number;
  // verticalDivider (§3.9.1 manuale) — altezza automatica (IntrinsicHeight lato engine)
  thickness?: number;
  indent?: number;
  endIndent?: number;
  // comune a tutti
  visibleWhenFieldTrue?: string;
  visibleWhenFieldFalse?: string;
  // container row/column
  children?: SduiCardElement[];
  gap?: number;
  mainAxisAlignment?: string;
  crossAxisAlignment?: string;
  // valido solo come figlio di un container row
  flex?: number;
}

export function createEmptyCardElement(type: SduiCardElementType): SduiCardElement {
  const el: SduiCardElement = { type };
  if (type === 'row' || type === 'column') el.children = [];
  if (type === 'keyValue') el.orientation = 'vertical';
  return el;
}


export interface SduiTabs {
  field: string;
  options: { value: string; labelKey: string; itemFilterField?: string }[];
}

export interface SduiSection {
  id: string;
  type: SduiSectionType;
  titleKey?: string;
  descriptionKey?: string;
  titleVariant?: 'compact' | 'standard' | 'large';
  descriptionVariant?: 'compact' | 'standard' | 'large';
  /** Nasconde l'intera section se falsa (qualunque type — §11 manuale), stessa sintassi/stessi
   * operatori del visibleIf di field/step ma valutata sullo stato dello screen. */
  visibleIf?: string;

  // form
  fields?: SduiField[];

  // list
  itemsPath?: string;
  itemTemplate?: SduiListItemTemplate;

  // info
  linkLabelKey?: string;
  linkUrl?: string;

  // menu
  items?: SduiMenuItem[];
  /** `"cards"`: ogni voce in Card separata con spazio tra loro; `"serviceCards"`: come
   * `cards` ma stile dashboard FSE (colori/font dal tema FSE, voci con `badge`). Default:
   * una sola Card con divisori (§3.4 manuale). */
  layout?: 'cards' | 'serviceCards';
  /** `false` nasconde le icone a sinistra di tutte le voci del menu. */
  showIcons?: boolean;
  /** L'icona sta in un cerchio/riquadro come nella dashboard FSE (default false), override
   * possibile per-voce con `SduiMenuItem.iconBackground`. */
  iconBackground?: boolean;

  // table / groupedTable / cardList (condivisi)
  columns?: SduiColumn[];
  searchableFields?: string[];
  filterButton?: SduiFilterButton;
  rowDetail?: SduiRowDetail;
  /** Campo di stato con l'id di un item: dopo il caricamento la section apre da sola il
   * rowDetail di quell'item (una sola volta, poi azzerato). Tipicamente valorizzato da
   * navigateSdui.initialStateFromItem — §3.9 manuale. Funziona anche su screen oltre ai flow. */
  autoOpenItemField?: string;
  /** Nome del campo id dell'item confrontato con autoOpenItemField (default "id"). */
  autoOpenIdField?: string;

  // table — bordo colorato verticale a sinistra (§3.5 manuale)
  leftBorder?: boolean;
  leftBorderField?: string;
  leftBorderColorMap?: Record<string, string>;

  // groupedTable / cardList (condivisi)
  groupsPath?: string;
  groupLabelField?: string;
  groupItemsField?: string;
  badgeField?: string;
  badgeMap?: Record<string, SduiBadgeEntry>;
  /** Alternativa più leggera a badgeMap: mappa un valore a una sola labelKey, senza colore
   * dedicato. Se entrambi sono presenti per lo stesso valore, badgeMap ha priorità (§3.9 manuale). */
  badgeLabelKeys?: Record<string, string>;
  secondaryBadgeField?: string;
  secondaryBadgeMap?: Record<string, SduiBadgeEntry>;
  secondaryBadgeLabelKeys?: Record<string, string>;
  summaryLabelKey?: string;
  /** Chiave usata al posto di summaryLabelKey quando il totale è esattamente 1 — singolare
   * (es. "È presente 1 documento...", §3.9 manuale, cardList). */
  summaryLabelKeyOne?: string;
  summaryFromField?: string;
  summaryToField?: string;

  /** groupedTable (§4 manuale "rowAccent"): barra colorata accanto/sopra la card, indica
   * visivamente il tipo evento senza sostituire il chip testuale (WCAG 1.4.1). */
  rowAccent?: { position?: 'start' | 'top'; colorFromBadge?: boolean };
  /** groupedTable: le colonne 2 e 3 vanno su righe separate invece che unite da " · ". */
  rowDescriptionSplit?: boolean;
  /** groupedTable: icona cerchiata col numero di allegati a destra della card (nascosta se 0). */
  rowAttachment?: { countField?: string; icon?: string; labelKey?: string };

  searchPlaceholderKey?: string;
  tabs?: SduiTabs;
  card?: SduiCard;
  /** form (§3.1 manuale): stessa chiave JSON `card`, ma lì è un booleano — avvolge l'intera
   * section in una Card del tema — invece dell'oggetto SduiCard di cardList/calendar. Tenuta
   * come proprietà distinta nel model per non rompere il tipo di `card` altrove nel wizard. */
  formCard?: boolean;
  /** form (§3.1 manuale): con `formCard: true`, il titolo sezione sta sopra la card invece
   * che dentro. Default false. */
  titleOutsideCard?: boolean;
  /** Ordinamento client-side dentro ciascun gruppo (§3.9 manuale). */
  sortableFields?: { key: string; labelKey: string }[];

  // filterBar
  searchField?: string;
  dateFilter?: { fromField: string; toField: string; fromLabelKey?: string; toLabelKey?: string; applyLabelKey?: string };

  // eventsSummary
  groupsPathSummary?: string;
  groupItemsFieldSummary?: string;
  fromField?: string;
  toField?: string;

  // calendar (§3.9.1 manuale) — riusa itemsPath, searchableFields, searchPlaceholderKey, card, rowDetail
  dateField?: string;
  eventsTitleKey?: string;
  eventsTitleVariant?: 'compact' | 'standard' | 'large';
}

export function createEmptySection(type: SduiSectionType): SduiSection {
  const base: SduiSection = { id: '', type };
  switch (type) {
    case 'form':
      base.fields = [];
      break;
    case 'list':
      // Default 'items': la risposta più comune è un array puro, che il motore
      // avvolge automaticamente come {"items": [...]} nello stato (vedi tip in UI).
      base.itemsPath = 'items';
      base.itemTemplate = { titleField: '', valueField: '' };
      break;
    case 'menu':
      base.items = [];
      break;
    case 'table':
      base.itemsPath = 'items';
      base.columns = [];
      break;
    case 'groupedTable':
      base.groupsPath = '';
      base.groupLabelField = '';
      base.groupItemsField = 'items';
      base.columns = [];
      break;
    case 'cardList':
      base.groupsPath = '';
      base.groupLabelField = '';
      base.groupItemsField = 'items';
      base.card = { titleField: '' };
      break;
    case 'filterBar':
      base.dateFilter = { fromField: '', toField: '' };
      break;
    case 'eventsSummary':
      base.groupsPathSummary = '';
      break;
    case 'calendar':
      base.itemsPath = 'items';
      base.dateField = 'eventDate';
      base.card = { titleField: '' };
      break;
    default:
      break;
  }
  return base;
}

// ---------------------------------------------------------------------------
// onSubmit
// ---------------------------------------------------------------------------

export interface SduiSuccessScreenAction {
  type: 'navigateBack' | 'resetForm';
  labelKey: string;
  style?: 'filled' | 'outlined';
}

export interface SduiSuccessScreen {
  titleKey: string;
  subtitleKey?: string;
  summary?: { titleField?: string; badgeKey?: string; dateLabelKey?: string };
  actions: SduiSuccessScreenAction[];
}

/** Una singola chiamata di `prefetchSequence`/`onSubmit.sequence` (§7 manuale). */
export interface SduiSequenceCall {
  method: string;
  endpoint: string;
  auth?: string;
  /** Body letterale con placeholder, editato come JSON grezzo (usato in alternativa a bodyMapping). */
  body?: string;
  bodyMapping: Record<string, string>;
  captureMapping: Record<string, string>;
  captureOptions?: SduiCaptureOptions | null;
}

export interface SduiCaptureOptions {
  stateKey: string;
  itemsField?: string;
  valueTemplate: string;
  labelTemplate?: string;
  sublabelTemplate?: string;
  metaFields: string[];
}

export function createEmptySequenceCall(): SduiSequenceCall {
  return { method: 'GET', endpoint: '', auth: 'bearer', bodyMapping: {}, captureMapping: {}, captureOptions: null };
}

export function createEmptyCaptureOptions(): SduiCaptureOptions {
  return { stateKey: '', valueTemplate: '', metaFields: [] };
}

/** Schermata di conferma a fine flow, aperta come un'altra entità SDUI (§7.1 manuale,
 * sh-core commit f18190e). Sostituisce la vecchia `onSuccess.conclusion` (schermata nativa
 * dedicata), rimossa dal motore: nessun fallback, un'entity che usa ancora `conclusion` non
 * mostra più nulla a fine submit. */
export interface SduiOnSuccessNavigateSdui {
  entity: string;
  /** Ogni valore è "$.campo" (stato del flow), "@.patientId"/"@.userId" (sessione) o un
   * letterale — stessa convenzione di bodyMapping. */
  initialState: Record<string, string>;
}

export function createEmptyOnSuccessNavigateSdui(): SduiOnSuccessNavigateSdui {
  return { entity: '', initialState: {} };
}

/** Schermata di attesa "da -> a" (§5.3 bis manuale) — solo screen, solo con
 * onSuccess.action: "setActivePatient". Si chiude da sola come navigateBack, a meno che
 * nello stesso onSuccess sia presente anche showSuccessScreen (ha priorità). */
export interface SduiShowTransitionScreen {
  titleKey: string;
  subtitleKey?: string;
  captionKey?: string;
  logoSvg?: string;
  logoHeight?: number;
  durationMs?: number;
}

export function createEmptyShowTransitionScreen(): SduiShowTransitionScreen {
  return { titleKey: '' };
}

export interface SduiOnSubmit {
  method: string;
  endpoint: string;
  auth: string;
  submitLabelKey?: string;
  /** Mostra sotto il bottone di invio un bottone outlined "Annulla" che chiude la schermata
   * (rispetta confirmLeaveIfDirty). Il bottone di invio resta sempre attivo (§8 manuale). */
  cancelLabelKey?: string;
  bodyMapping: Record<string, string>;
  /** Solo per l'onSubmit dell'ultimo step di un flow: sequenza di chiamate al posto di un singolo endpoint. */
  sequence?: SduiSequenceCall[] | null;
  /** Solo flow (§5.2.1 manuale): riconosce un rifiuto di business logic incapsulato in un body
   * HTTP 200 (backend legacy come WHR). Se `body[field].toString() === equals`, la richiesta
   * viene trattata come errore (stesso ramo onError, incluso humanizeFlowBackendError). */
  failureCheck?: { field: string; equals: string } | null;
  requestTransform: ({
    type: 'unflattenNested';
    itemsPath: string;
    targetPath: string;
    fields: Record<string, string>;
  } | {
    /** Converte in-place uno o più campi del body da "dd/MM/yyyy" a ISO-8601 prima dell'invio. */
    type: 'convertDates';
    fields: string[];
  } | {
    /** Converte in-place uno o più campi del body al tipo indicato (number/boolean) prima dell'invio. */
    type: 'convertTypes';
    fields: Record<string, 'number' | 'boolean'>;
  } | {
    /** Applica in sequenza più requestTransform (ognuno riceve l'output del precedente);
     * i singoli step non sono editabili dal wizard, solo preservati come JSON grezzo. */
    type: 'chain';
    steps: Record<string, unknown>[];
  }) | null;
  multipart?: boolean;
  fileField?: string;
  fileFieldName?: string;
  onSuccess: {
    action?: 'toast' | 'setActivePatient' | 'clearActivePatient' | 'navigateBack';
    /** Convenzione alternativa/legacy a `action: 'navigateBack'` (screen_renderer.dart:
     * `onSuccess['navigateBack'] == true`) — l'engine controlla entrambe in OR, il wizard
     * preserva qualunque delle due forme fosse presente nel JSON originale. */
    navigateBack?: boolean;
    messageKey?: string;
    valuePath?: string;
    showSuccessScreen?: SduiSuccessScreen | null;
    /** Solo flow di login (§17.5): estrae i token dalla risposta secondo il blocco
     * `customAuth` di `base` e crea la sessione. Senza questo flag il login riesce
     * lato backend ma l'utente resta sloggato. */
    completeLogin?: boolean;
    /** Solo flow, ultimo step (§7.1, sh-core f18190e): pushReplacement verso un'altra entity
     * SDUI, sostituisce la vecchia `conclusion` (schermata nativa, rimossa dal motore). */
    navigateSdui?: SduiOnSuccessNavigateSdui | null;
    /** Solo screen, solo con `action: 'setActivePatient'` (§5.3 bis): schermata di attesa
     * "da -> a" alternativa a `showSuccessScreen` (quest'ultima ha priorità se entrambe presenti). */
    showTransitionScreen?: SduiShowTransitionScreen | null;
    /** Barra delega (§1, §6): nome di route (es. "HomeRoute") da cui ricreare lo stack di
     * navigazione dopo il successo, mostrando prima `messageKey` se presente. */
    resetToRoute?: string;
    /** Chiude lo screen corrente tornando indietro di uno step senza altre azioni. */
    popScreen?: boolean;
  };
  /** `action` qui non è letto da nessun handler engine (verificato su `flow_renderer.dart`/
   * `screen_renderer.dart`, che leggono solo `messageKey`): dato legacy/extra presente in
   * produzione (es. "toast"), preservato as-is per non perderlo su un giro JSON -> wizard -> JSON. */
  onError: { messageKey?: string; action?: string };
}

export function createEmptyOnSubmit(): SduiOnSubmit {
  return {
    method: 'PUT',
    endpoint: '',
    auth: 'bearer',
    bodyMapping: {},
    sequence: null,
    failureCheck: null,
    requestTransform: null,
    onSuccess: { action: 'toast', messageKey: '', navigateSdui: null, showTransitionScreen: null },
    onError: { messageKey: 'errors.generic' },
  };
}

// ---------------------------------------------------------------------------
// Flow (supporto base: step con field/canProceed/next, ultimo step con onSubmit)
// ---------------------------------------------------------------------------

export interface SduiFlowStep {
  id: string;
  titleKey: string;
  descriptionKey?: string;
  /** Nasconde titleKey+descriptionKey e i bottoni footer dello step quando falsa (§7/§11 manuale). */
  visibleIf?: string;
  fields: SduiField[];
  canProceed: string[];
  next?: string;
  reviewFields?: string[];
  isLastStep: boolean; // helper solo-UI: determina se mostrare onSubmit invece di next
  /** Ping/prefetch "usa e getta": la risposta viene scartata (§7 manuale). Stessa forma del
   * `dataSource` a livello screen (incluso `responseTransform`/`defaultDateRange`). */
  dataSource?: SduiDataSource | null;
  /** Sequenza ordinata di chiamate con captureMapping verso lo stato — un errore qui blocca lo step. */
  prefetchSequence: SduiSequenceCall[];
  onSubmit?: SduiOnSubmit;
}

export function createEmptyFlowStep(): SduiFlowStep {
  return { id: '', titleKey: '', fields: [], canProceed: [], isLastStep: false, dataSource: null, prefetchSequence: [] };
}

// ---------------------------------------------------------------------------
// Descrittore radice
// ---------------------------------------------------------------------------

export interface SduiDescriptor {
  schemaVersion: string;
  kind: SduiKind;
  screenId: string;
  flowId: string;
  titleKey: string;
  subtitleKey?: string;
  initialStateJson: string; // editata come JSON grezzo (mappa libera)
  confirmLeaveIfDirty?: boolean;
  onExit?: SduiOnExit;
  dataSource: SduiDataSource;
  sections: SduiSection[];
  primaryAction: SduiAction | null;
  onSubmit: SduiOnSubmit | null;
  steps: SduiFlowStep[];
  /** Solo flow (§7.2): mostra il dettaglio tecnico quando il caricamento di uno step
   * fallisce. Diagnostico, da tenere spento in produzione. */
  showTechnicalError?: boolean;
  /** Esclude le azioni globali dell'app bar (sdui_app_bar_actions) solo per questa pagina;
   * valido su screen e flow, non sui widget incorporati (§2 manuale). */
  hideGlobalAppBarActions?: boolean;
}

export function createEmptyDescriptor(kind: SduiKind, entityName: string): SduiDescriptor {
  return {
    schemaVersion: '1.0.0',
    kind,
    screenId: kind === 'screen' ? entityName : '',
    flowId: kind === 'flow' ? entityName : '',
    titleKey: '',
    initialStateJson: '{}',
    dataSource: createEmptyDataSource(),
    sections: [],
    primaryAction: null,
    onSubmit: kind === 'screen' ? null : null,
    steps: kind === 'flow' ? [createEmptyFlowStep()] : [],
  };
}

/** Converte il modello editor in un plain object pronto per JSON.stringify, omettendo le chiavi non pertinenti al `kind`. */
export function descriptorToJson(d: SduiDescriptor): Record<string, unknown> {
  const out: Record<string, unknown> = {
    schemaVersion: d.schemaVersion || '1.0.0',
    kind: d.kind,
  };
  if (d.kind === 'screen') {
    out['screenId'] = d.screenId;
  } else {
    out['flowId'] = d.flowId;
  }
  out['titleKey'] = d.titleKey;
  if (d.subtitleKey) out['subtitleKey'] = d.subtitleKey;
  if (d.hideGlobalAppBarActions) out['hideGlobalAppBarActions'] = true;

  let initialState: unknown;
  try { initialState = d.initialStateJson?.trim() ? JSON.parse(d.initialStateJson) : undefined; } catch { initialState = undefined; }
  if (initialState && typeof initialState === 'object' && Object.keys(initialState).length > 0) {
    out['initialState'] = initialState;
  }

  if (d.kind === 'screen') {
    if (d.confirmLeaveIfDirty) out['confirmLeaveIfDirty'] = true;
    if (d.dataSource?.endpoint) {
      const ds: Record<string, unknown> = {
        method: d.dataSource.method || 'GET',
        endpoint: d.dataSource.endpoint,
        auth: d.dataSource.auth || 'bearer',
      };
      if (Object.keys(d.dataSource.bodyMapping ?? {}).length > 0) ds['bodyMapping'] = d.dataSource.bodyMapping;
      if (d.dataSource.responseTransform) ds['responseTransform'] = cleanResponseTransform(d.dataSource.responseTransform);
      if (d.dataSource.defaultDateRange) ds['defaultDateRange'] = d.dataSource.defaultDateRange;
      if (Object.keys(d.dataSource.captureToProfile ?? {}).length > 0) ds['captureToProfile'] = d.dataSource.captureToProfile;
      if (Object.keys(d.dataSource.captureToState ?? {}).length > 0) ds['captureToState'] = d.dataSource.captureToState;
      if (Object.keys(d.dataSource.headers ?? {}).length > 0) ds['headers'] = d.dataSource.headers;
      if (d.dataSource.basicAuth?.username || d.dataSource.basicAuth?.password) ds['basicAuth'] = d.dataSource.basicAuth;
      out['dataSource'] = ds;
    }
    out['sections'] = d.sections.map(cleanSection);
    if (d.primaryAction) out['primaryAction'] = cleanAction(d.primaryAction);
    if (d.onSubmit) out['onSubmit'] = cleanOnSubmit(d.onSubmit);
  } else {
    if (d.onExit?.confirmKey) out['onExit'] = { confirmKey: d.onExit.confirmKey };
    if (d.showTechnicalError) out['showTechnicalError'] = true;
    out['steps'] = d.steps.map(cleanFlowStep);
  }
  return out;
}

/**
 * Preserva le proprietà JSON sconosciute al wizard su un giro JSON -> wizard -> JSON.
 *
 * `node` è l'oggetto modello del wizard (section/field/action/card/...): quando proviene
 * da un import JSON (via `Object.assign`/spread nelle funzioni `*FromJson`), porta con sé
 * — come normali proprietà enumerabili — anche le chiavi non riconosciute dal wizard,
 * oltre a quelle note. `knownKeys` elenca TUTTE le chiavi che il corrispondente `clean*`
 * gestisce esplicitamente (per qualunque variante/tipo, non solo quella attiva): vengono
 * sempre escluse dal grezzo, cosi la cancellazione di un campo nel wizard vince sempre
 * sul valore originale. Il resto (chiavi ignote) viene riportato in output, posizionato
 * prima delle chiavi curate cosi que queste ultime possano sovrascriverle in caso di
 * conflitto imprevisto.
 *
 * Limite noto: copre solo i nodi il cui modello wizard è una copia diretta (o quasi) del
 * JSON originale (section, field, action, card, cardElement, rowDetail, actionsSheet item,
 * options, validation...). Nodi ricostruiti da zero a partire da singoli campi selezionati
 * (onSubmit, sequenceCall, conclusion, flowStep, voci di menu, dataSource,
 * flattenNested/wrapAsSingleGroup) non sono coperti: per questi resta valida la vista
 * JSON grezza come escape hatch per proprietà esotiche.
 */
function withRaw(node: object | null | undefined, knownKeys: readonly string[], out: Record<string, unknown>): Record<string, unknown> {
  if (!node) return out;
  const rec = node as Record<string, unknown>;
  const extra: Record<string, unknown> = {};
  for (const k of Object.keys(rec)) {
    if (!knownKeys.includes(k)) extra[k] = rec[k];
  }
  return { ...extra, ...out };
}

/** Serializza una mappa dichiarativa `fields` (percorso/paths + formattatore),
 * condivisa da `flattenNested`/`unflattenNested` (§4) e dalle opzioni `remote` (§10). */
function cleanFlattenFieldsMap(fields: Record<string, SduiFlattenField>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v.paths?.length) {
      // Coalesce multi-percorso: `path`/`format`/`locale` ignorati dal motore quando `paths` è presente.
      out[k] = { paths: v.paths };
      continue;
    }
    if (!v.path) continue;
    out[k] = v.format ? { path: v.path, format: v.format, ...(v.trueValue ? { trueValue: v.trueValue } : {}), ...(v.falseValue ? { falseValue: v.falseValue } : {}), ...(v.locale ? { locale: v.locale } : {}) } : v.path;
  }
  return out;
}

/** Deserializza una mappa dichiarativa `fields` grezza da JSON (§4/§10 manuale):
 * entry stringa = percorso semplice, entry oggetto = shape già `SduiFlattenField`. */
export function parseFlattenFieldsMap(raw: Record<string, unknown> | undefined): Record<string, SduiFlattenField> {
  const fields: Record<string, SduiFlattenField> = {};
  for (const [k, v] of Object.entries(raw ?? {})) {
    fields[k] = typeof v === 'string' ? { path: v } : (v as SduiFlattenField);
  }
  return fields;
}

function cleanFlattenNested(f: SduiFlattenNested): Record<string, unknown> {
  const fields = cleanFlattenFieldsMap(f.fields);
  const out: Record<string, unknown> = { type: 'flattenNested', arrayPath: f.arrayPath, targetPath: f.targetPath };
  if (Object.keys(fields).length > 0) out['fields'] = fields;
  if (Object.keys(f.rootFields).length > 0) out['rootFields'] = f.rootFields;
  return out;
}

/** Serializza un `responseTransform`: i tre tipi generici editabili dal wizard vengono
 * ricostruiti campo per campo, qualunque altro tipo (custom, hardcoded nell'engine) viene
 * riemesso as-is — vedi `parseResponseTransform`. */
export function cleanResponseTransform(rt: SduiResponseTransform): Record<string, unknown> {
  if (rt.type === 'wrapAsSingleGroup') return cleanWrapAsSingleGroup(rt);
  if (rt.type === 'flattenNested') return cleanFlattenNested(rt);
  if (rt.type === 'groupByField') return cleanGroupByField(rt);
  if (rt.type === 'mapFields') return cleanMapFields(rt);
  return rt as Record<string, unknown>;
}

function cleanMapFields(f: SduiMapFields): Record<string, unknown> {
  const fields = cleanFlattenFieldsMap(f.fields);
  const out: Record<string, unknown> = { type: 'mapFields' };
  if (Object.keys(fields).length > 0) out['fields'] = fields;
  return out;
}

function cleanWrapAsSingleGroup(f: SduiWrapAsSingleGroup): Record<string, unknown> {
  const out: Record<string, unknown> = {
    type: 'wrapAsSingleGroup',
    itemsPath: f.itemsPath || 'items',
    targetPath: f.targetPath || 'groupedItems',
  };
  if (f.groupLabelKey) out['groupLabelKey'] = f.groupLabelKey;
  if (Object.keys(f.itemFields ?? {}).length > 0) out['itemFields'] = f.itemFields;
  if (f.dateFlags?.length) out['dateFlags'] = f.dateFlags;
  if (Object.keys(f.staticItemFields ?? {}).length > 0) out['staticItemFields'] = f.staticItemFields;
  return out;
}

function cleanGroupByField(f: SduiGroupByField): Record<string, unknown> {
  const out: Record<string, unknown> = {
    type: 'groupByField',
    itemsPath: f.itemsPath || 'items',
    targetPath: f.targetPath || 'groupedItems',
    groupField: f.groupField || '',
  };
  if (f.groupLabelField) out['groupLabelField'] = f.groupLabelField;
  // sortGroupsDescending di default true lato engine (§4.1.2 manuale): scritto in JSON solo
  // quando esplicitamente impostato a false, per non appesantire l'output nel caso comune.
  if (f.sortGroupsDescending === false) out['sortGroupsDescending'] = false;
  return out;
}

const SDUI_OPTIONS_KNOWN_KEYS = ['source', 'values', 'path', 'endpoint', 'auth', 'itemsField', 'fields', 'valueTemplate', 'labelTemplate', 'sublabelTemplate', 'metaFields', 'pageSize', 'emptyFallback', 'of', 'readOnly'] as const;

function cleanOptions(o: SduiOptions): Record<string, unknown> {
  const out: Record<string, unknown> = { source: o.source };
  if (o.source === 'static') out['values'] = o.values;
  if (o.source === 'fromState') out['path'] = o.path;
  if (o.source === 'selected') {
    if (o.of) out['of'] = o.of;
    if (o.readOnly) out['readOnly'] = true;
  }
  if (o.source === 'remote') {
    out['endpoint'] = o.endpoint;
    out['auth'] = o.auth || 'bearer';
    if (o.itemsField) out['itemsField'] = o.itemsField;
    if (o.fields && Object.keys(o.fields).length > 0) {
      const fields = cleanFlattenFieldsMap(o.fields);
      if (Object.keys(fields).length > 0) out['fields'] = fields;
    }
    out['valueTemplate'] = o.valueTemplate;
    if (o.labelTemplate) out['labelTemplate'] = o.labelTemplate;
    if (o.sublabelTemplate) out['sublabelTemplate'] = o.sublabelTemplate;
    if (o.metaFields.length > 0) out['metaFields'] = o.metaFields;
    // 5 e' il default SOLO del wizard (createEmptyOptions), non un valore da omettere: se
    // l'entity originale lo aveva esplicito, va riemesso identico per non falsare il diff.
    if (o.pageSize) out['pageSize'] = o.pageSize;
    if (o.emptyFallback?.labelKey) out['emptyFallback'] = { value: o.emptyFallback.value ?? '', labelKey: o.emptyFallback.labelKey };
  }
  return withRaw(o, SDUI_OPTIONS_KNOWN_KEYS, out);
}

const SDUI_VALIDATION_KNOWN_KEYS = ['required', 'pattern', 'equalsField', 'errorKeys'] as const;

function cleanValidation(v: SduiValidation): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (v.required) out['required'] = true;
  if (v.pattern) out['pattern'] = v.pattern;
  if (v.equalsField) out['equalsField'] = v.equalsField;
  const errorKeys: Record<string, unknown> = {};
  if (v.errorKeys?.required) errorKeys['required'] = v.errorKeys.required;
  if (v.errorKeys?.pattern) errorKeys['pattern'] = v.errorKeys.pattern;
  if (v.errorKeys?.equalsField) errorKeys['equalsField'] = v.errorKeys.equalsField;
  if (Object.keys(errorKeys).length > 0) out['errorKeys'] = errorKeys;
  return withRaw(v, SDUI_VALIDATION_KNOWN_KEYS, out);
}

// Chiavi note gestite esplicitamente da cleanField per qualunque componente. 'infoDialog' e
// 'primaryAction' sono le chiavi JSON grezze di infoBanner (rimappate su infoDialogTitleKey/
// BodyKey e primaryActionSequence nel model del wizard, vedi fieldFromJson): vanno escluse
// esplicitamente perché non coincidono coi nomi delle proprietà del model.
const SDUI_FIELD_KNOWN_KEYS = [
  'id', 'component', 'labelKey', 'visibleIf', 'paddingBottom', 'validation', 'options',
  'multiline', 'maxLines', 'hintKey', 'textCase', 'keyboardType', 'decimals', 'obscureText', 'maxLength', 'trim',
  'minDate', 'maxDate', 'allowedExtensions', 'placeholderKey',
  'maxSizeMb', 'maxSizeErrorKey', 'style', 'emptyTitleKey', 'helpKey', 'buttonLabelKey', 'removeLabelKey', 'replaceLabelKey',
  'valueField', 'siteKey', 'baseUrl', 'theme', 'variant', 'linkKey',
  'infoDialogTitleKey', 'infoDialogBodyKey', 'infoDialog', 'buttonKey',
  'primaryActionSequence', 'primaryAction', 'actionMessageKey',
  'children', 'gap', 'widthPercent', 'flex', 'shrinkWrap',
  'badgeField', 'delegateHeaderKey', 'loadMoreLabelKey', 'filterBy', 'ownBadgeKey', 'detailAction',
  'titleVariant', 'descriptionVariant', 'headerVariant', 'dateBadgeField', 'chips', 'lines', 'titleChips',
  'hideRadio', 'selectedBorderWidth', 'fullWidthLines', 'emptyDelegatesKey',
  'titleValueField', 'subtitleField', 'flatFields', 'officesField', 'officeTitleKey', 'officeFields',
  'action', 'scanTitleKey', 'scanPattern', 'scanHintKey', 'scanInvalidKey', 'formats', 'scanFrame', 'extract', 'onScan',
  'svg', 'width', 'height', 'align', 'tint', 'size', 'layout', 'card', 'cardPadding',
] as const;

export function cleanField(f: SduiField): Record<string, unknown> {
  const out: Record<string, unknown> = { id: f.id, component: f.component, labelKey: f.labelKey };
  if (f.visibleIf) out['visibleIf'] = f.visibleIf;
  if (f.paddingBottom != null) out['paddingBottom'] = f.paddingBottom;
  if (f.validation && (f.validation.required || f.validation.pattern || f.validation.equalsField)) {
    out['validation'] = cleanValidation(f.validation);
  }
  if (f.options) out['options'] = cleanOptions(f.options);
  if (f.component === 'textInput') {
    if (f.multiline) { out['multiline'] = true; if (f.maxLines) out['maxLines'] = f.maxLines; }
    if (f.hintKey) out['hintKey'] = f.hintKey;
    if (f.textCase) out['textCase'] = f.textCase;
    // 'text' e' gia' il default dell'engine: non lo scriviamo per non gonfiare il JSON.
    if (f.keyboardType && f.keyboardType !== 'text') out['keyboardType'] = f.keyboardType;
    if (f.keyboardType === 'decimal' && f.decimals != null && f.decimals !== 2) out['decimals'] = f.decimals;
    if (f.obscureText) out['obscureText'] = true;
    if (f.maxLength) out['maxLength'] = f.maxLength;
    if (f.trim) out['trim'] = true;
  }
  if (f.component === 'datePicker') {
    if (f.minDate) out['minDate'] = f.minDate;
    if (f.maxDate) out['maxDate'] = f.maxDate;
  }
  if (f.component === 'filePicker') {
    if (f.allowedExtensions?.length) out['allowedExtensions'] = f.allowedExtensions;
    if (f.placeholderKey) out['placeholderKey'] = f.placeholderKey;
    if (f.maxSizeMb != null) out['maxSizeMb'] = f.maxSizeMb;
    if (f.maxSizeErrorKey) out['maxSizeErrorKey'] = f.maxSizeErrorKey;
    if (f.filePickerStyle === 'attachments') {
      out['style'] = 'attachments';
      if (f.emptyTitleKey) out['emptyTitleKey'] = f.emptyTitleKey;
      if (f.helpKey) out['helpKey'] = f.helpKey;
      if (f.buttonLabelKey) out['buttonLabelKey'] = f.buttonLabelKey;
      if (f.removeLabelKey) out['removeLabelKey'] = f.removeLabelKey;
      if (f.replaceLabelKey) out['replaceLabelKey'] = f.replaceLabelKey;
    }
  }
  if (f.component === 'readOnlyInfo') {
    if (f.valueField) out['valueField'] = f.valueField;
    if (f.layout && f.layout !== 'default') out['layout'] = f.layout;
    if (f.titleVariant && f.titleVariant !== 'compact') out['titleVariant'] = f.titleVariant;
    if (f.descriptionVariant && f.descriptionVariant !== 'compact') out['descriptionVariant'] = f.descriptionVariant;
  }
  if (f.component === 'captcha') {
    if (f.siteKey) out['siteKey'] = f.siteKey;
    if (f.baseUrl) out['baseUrl'] = f.baseUrl;
    if (f.theme) out['theme'] = f.theme;
  }
  if (f.component === 'chip' && f.variant) out['variant'] = f.variant;
  if (f.component === 'infoBanner') {
    if (f.linkKey) out['linkKey'] = f.linkKey;
    if (f.infoDialogTitleKey || f.infoDialogBodyKey) {
      out['infoDialog'] = { titleKey: f.infoDialogTitleKey ?? '', bodyKey: f.infoDialogBodyKey ?? '' };
    }
    if (f.buttonKey) out['buttonKey'] = f.buttonKey;
    if (f.primaryActionSequence?.length) out['primaryAction'] = { sequence: f.primaryActionSequence.map(cleanSequenceCall) };
    if (f.actionMessageKey) out['actionMessageKey'] = f.actionMessageKey;
  }
  if ((f.component === 'row' || f.component === 'column') && f.children) {
    out['children'] = f.children.map(cleanField);
    if (f.gap != null) out['gap'] = f.gap;
    if (f.widthPercent != null) out['widthPercent'] = f.widthPercent;
    if (f.flex != null) out['flex'] = f.flex;
    if (f.shrinkWrap) out['shrinkWrap'] = true;
    if (f.card) {
      out['card'] = true;
      if (f.cardPadding != null && f.cardPadding !== 12) out['cardPadding'] = f.cardPadding;
    }
  }
  if (f.component === 'radioCardList') {
    if (f.badgeField) out['badgeField'] = f.badgeField;
    if (f.delegateHeaderKey) out['delegateHeaderKey'] = f.delegateHeaderKey;
    if (f.loadMoreLabelKey) out['loadMoreLabelKey'] = f.loadMoreLabelKey;
    if (f.filterBy) out['filterBy'] = f.filterBy;
    if (f.ownBadgeKey) out['ownBadgeKey'] = f.ownBadgeKey;
    if (f.detailAction?.linkKey) out['detailAction'] = cleanDetailAction(f.detailAction);
    if (f.titleVariant && f.titleVariant !== 'standard') out['titleVariant'] = f.titleVariant;
    if (f.descriptionVariant && f.descriptionVariant !== 'standard') out['descriptionVariant'] = f.descriptionVariant;
    if (f.headerVariant && f.headerVariant !== 'standard') out['headerVariant'] = f.headerVariant;
    if (f.dateBadgeField) out['dateBadgeField'] = f.dateBadgeField;
    if (f.chips?.length) out['chips'] = f.chips;
    if (f.lines?.length) out['lines'] = f.lines;
    if (f.titleChips?.length) out['titleChips'] = f.titleChips;
    if (f.hideRadio) out['hideRadio'] = true;
    if (f.selectedBorderWidth != null) out['selectedBorderWidth'] = f.selectedBorderWidth;
    if (f.fullWidthLines) out['fullWidthLines'] = true;
    if (f.emptyDelegatesKey) out['emptyDelegatesKey'] = f.emptyDelegatesKey;
  }
  if (f.component === 'summaryCard') {
    if (f.valueField) out['valueField'] = f.valueField;
    if (f.titleValueField) out['titleValueField'] = f.titleValueField;
    if (f.subtitleField) out['subtitleField'] = f.subtitleField;
    if (f.badgeField) out['badgeField'] = f.badgeField;
    if (f.flatFields?.length) out['flatFields'] = f.flatFields;
    if (f.officesField) out['officesField'] = f.officesField;
    if (f.officeTitleKey) out['officeTitleKey'] = f.officeTitleKey;
    if (f.officeFields?.length) out['officeFields'] = f.officeFields;
  }
  if (f.component === 'actionButton') {
    if (f.style && f.style !== 'filled') out['style'] = f.style;
    if (f.action) out['action'] = cleanAction(f.action);
  }
  if (f.component === 'qrScanner') {
    if (f.hintKey) out['hintKey'] = f.hintKey;
    if (f.scanTitleKey) out['scanTitleKey'] = f.scanTitleKey;
    if (f.scanPattern) out['scanPattern'] = f.scanPattern;
    if (f.scanHintKey) out['scanHintKey'] = f.scanHintKey;
    if (f.scanInvalidKey) out['scanInvalidKey'] = f.scanInvalidKey;
    if (f.formats?.length && !(f.formats.length === 1 && f.formats[0] === 'qrCode')) out['formats'] = f.formats;
    if (f.scanFrame && (f.scanFrame.shape || f.scanFrame.size != null)) out['scanFrame'] = f.scanFrame;
    if (f.extract && Object.keys(f.extract).length > 0) out['extract'] = f.extract;
    if (f.onScan) out['onScan'] = cleanAction(f.onScan);
  }
  if (f.component === 'image') {
    if (f.svg) out['svg'] = f.svg;
    if (f.width != null) out['width'] = f.width;
    if (f.height != null) out['height'] = f.height;
    if (f.align && f.align !== 'center') out['align'] = f.align;
    if (f.tint) out['tint'] = true;
  }
  if (f.component === 'animatedCheck') {
    if (f.size != null) out['size'] = f.size;
    if (f.align && f.align !== 'center') out['align'] = f.align;
  }
  return withRaw(f, SDUI_FIELD_KNOWN_KEYS, out);
}

const SDUI_DETAIL_ACTION_KNOWN_KEYS = ['linkKey', 'subtitleField', 'badgeField', 'flatFields', 'officesField', 'officeTitleKey', 'officeFields', 'titleVariant', 'subtitleVariant', 'officeTitleVariant'] as const;

function cleanDetailAction(d: SduiDetailAction): Record<string, unknown> {
  const out: Record<string, unknown> = { linkKey: d.linkKey };
  if (d.subtitleField) out['subtitleField'] = d.subtitleField;
  if (d.badgeField) out['badgeField'] = d.badgeField;
  if (d.flatFields?.length) out['flatFields'] = d.flatFields;
  if (d.officesField) out['officesField'] = d.officesField;
  if (d.officeTitleKey) out['officeTitleKey'] = d.officeTitleKey;
  if (d.officeFields?.length) out['officeFields'] = d.officeFields;
  if (d.titleVariant && d.titleVariant !== 'standard') out['titleVariant'] = d.titleVariant;
  if (d.subtitleVariant && d.subtitleVariant !== 'standard') out['subtitleVariant'] = d.subtitleVariant;
  if (d.officeTitleVariant && d.officeTitleVariant !== 'standard') out['officeTitleVariant'] = d.officeTitleVariant;
  return withRaw(d, SDUI_DETAIL_ACTION_KNOWN_KEYS, out);
}


const SDUI_ACTION_KNOWN_KEYS = [
  'type', 'icon', 'labelKey', 'entity', 'assetPath', 'initialStateFromItem', 'sduiWithoutAuth',
  'endpoint', 'fileName', 'auth', 'successMessageKey', 'errorMessageKey', 'mimeTypeField',
  'confirmTitleKey', 'confirmMessageKey', 'call', 'onSuccess', 'field', 'updateInGroups',
  'labelKeyWhenTrue', 'labelKeyWhenFalse',
  'confirmTitleKeyWhenTrue', 'confirmMessageKeyWhenTrue', 'confirmTitleKeyWhenFalse', 'confirmMessageKeyWhenFalse',
  'confirmStyle', 'successSheet',
  'favoriteIdField', 'addCall', 'removeCall',
  'start', 'time', 'end', 'durationMinutes', 'title', 'titleKey', 'location', 'description', 'reminderMinutes',
  'analytics',
] as const;

function cleanAction(a: SduiAction): Record<string, unknown> {
  const out: Record<string, unknown> = { type: a.type };
  if (a.icon) out['icon'] = a.icon;
  if (a.labelKey) out['labelKey'] = a.labelKey;
  if (a.entity) out['entity'] = a.entity;
  if (a.assetPath) out['assetPath'] = a.assetPath;
  if (a.initialStateFromItem) out['initialStateFromItem'] = a.initialStateFromItem;
  if (a.sduiWithoutAuth !== undefined) out['sduiWithoutAuth'] = a.sduiWithoutAuth;
  if (a.endpoint) out['endpoint'] = a.endpoint;
  if (a.fileName) out['fileName'] = a.fileName;
  if (a.auth) out['auth'] = a.auth;
  if (a.successMessageKey) out['successMessageKey'] = a.successMessageKey;
  if (a.errorMessageKey) out['errorMessageKey'] = a.errorMessageKey;
  if (a.mimeTypeField) out['mimeTypeField'] = a.mimeTypeField;
  if (a.confirmTitleKey) out['confirmTitleKey'] = a.confirmTitleKey;
  if (a.confirmMessageKey) out['confirmMessageKey'] = a.confirmMessageKey;
  if (a.call) out['call'] = a.call;
  if (a.onSuccess) out['onSuccess'] = a.onSuccess;
  if (a.field) out['field'] = a.field;
  if (a.updateInGroups) out['updateInGroups'] = a.updateInGroups;
  if (a.labelKeyWhenTrue) out['labelKeyWhenTrue'] = a.labelKeyWhenTrue;
  if (a.labelKeyWhenFalse) out['labelKeyWhenFalse'] = a.labelKeyWhenFalse;
  if (a.confirmTitleKeyWhenTrue) out['confirmTitleKeyWhenTrue'] = a.confirmTitleKeyWhenTrue;
  if (a.confirmMessageKeyWhenTrue) out['confirmMessageKeyWhenTrue'] = a.confirmMessageKeyWhenTrue;
  if (a.confirmTitleKeyWhenFalse) out['confirmTitleKeyWhenFalse'] = a.confirmTitleKeyWhenFalse;
  if (a.confirmMessageKeyWhenFalse) out['confirmMessageKeyWhenFalse'] = a.confirmMessageKeyWhenFalse;
  if (a.confirmStyle) out['confirmStyle'] = a.confirmStyle;
  if (a.successSheet) out['successSheet'] = a.successSheet;
  if (a.favoriteIdField) out['favoriteIdField'] = a.favoriteIdField;
  if (a.addCall) out['addCall'] = a.addCall;
  if (a.removeCall) out['removeCall'] = a.removeCall;
  if (a.start) out['start'] = a.start;
  if (a.time) out['time'] = a.time;
  if (a.end) out['end'] = a.end;
  if (a.durationMinutes !== undefined) out['durationMinutes'] = a.durationMinutes;
  if (a.title) out['title'] = a.title;
  if (a.titleKey) out['titleKey'] = a.titleKey;
  if (a.location) out['location'] = a.location;
  if (a.description?.length) out['description'] = a.description;
  if (a.reminderMinutes !== undefined) out['reminderMinutes'] = a.reminderMinutes;
  if (a.analytics) out['analytics'] = a.analytics;
  return withRaw(a, SDUI_ACTION_KNOWN_KEYS, out);
}

const SDUI_CARD_ELEMENT_KNOWN_KEYS = [
  'type', 'field', 'labelKey', 'variant', 'align', 'orientation', 'emptyValueKey', 'labelVariant', 'badgeMap',
  'icon', 'color', 'size', 'iconMap', 'circleBackground', 'circleColor', 'circleSize',
  'bordered', 'backgroundColor', 'borderColor', 'borderRadius', 'dayColor', 'monthColor', 'monthKeyPrefix',
  'thickness', 'indent', 'endIndent', 'height', 'width', 'visibleWhenFieldTrue', 'visibleWhenFieldFalse',
  'children', 'gap', 'mainAxisAlignment', 'crossAxisAlignment', 'flex',
] as const;

function cleanCardElement(el: SduiCardElement): Record<string, unknown> {
  const out: Record<string, unknown> = { type: el.type };
  if (el.field) out['field'] = el.field;
  if (el.labelKey) out['labelKey'] = el.labelKey;
  if (el.variant && el.variant !== 'standard') out['variant'] = el.variant;
  if (el.align) out['align'] = el.align;
  if (el.type === 'keyValue') {
    if (el.orientation && el.orientation !== 'vertical') out['orientation'] = el.orientation;
    if (el.emptyValueKey) out['emptyValueKey'] = el.emptyValueKey;
    if (el.labelVariant && el.labelVariant !== 'standard') out['labelVariant'] = el.labelVariant;
  }
  if (el.badgeMap) out['badgeMap'] = el.badgeMap;
  if (el.type === 'icon') {
    if (el.icon) out['icon'] = el.icon;
    if (el.color) out['color'] = el.color;
    if (el.size != null) out['size'] = el.size;
    if (el.iconMap) out['iconMap'] = el.iconMap;
    if (el.circleBackground) {
      out['circleBackground'] = true;
      if (el.circleColor) out['circleColor'] = el.circleColor;
      if (el.circleSize != null) out['circleSize'] = el.circleSize;
    }
  }
  if (el.type === 'dateBadge') {
    if (el.size != null) out['size'] = el.size;
    if (el.bordered) out['bordered'] = true;
    if (el.backgroundColor) out['backgroundColor'] = el.backgroundColor;
    if (el.borderColor) out['borderColor'] = el.borderColor;
    if (el.borderRadius != null) out['borderRadius'] = el.borderRadius;
    if (el.dayColor) out['dayColor'] = el.dayColor;
    if (el.monthColor) out['monthColor'] = el.monthColor;
    if (el.monthKeyPrefix) out['monthKeyPrefix'] = el.monthKeyPrefix;
  }
  if (el.type === 'verticalDivider') {
    if (el.thickness != null) out['thickness'] = el.thickness;
    if (el.indent != null) out['indent'] = el.indent;
    if (el.endIndent != null) out['endIndent'] = el.endIndent;
    if (el.color) out['color'] = el.color;
  }
  if (el.height != null) out['height'] = el.height;
  if (el.width != null) out['width'] = el.width;
  if (el.visibleWhenFieldTrue) out['visibleWhenFieldTrue'] = el.visibleWhenFieldTrue;
  if (el.visibleWhenFieldFalse) out['visibleWhenFieldFalse'] = el.visibleWhenFieldFalse;
  if (el.type === 'row' || el.type === 'column') {
    if (el.gap != null) out['gap'] = el.gap;
    if (el.type === 'row' && el.mainAxisAlignment) out['mainAxisAlignment'] = el.mainAxisAlignment;
    if (el.crossAxisAlignment) out['crossAxisAlignment'] = el.crossAxisAlignment;
    out['children'] = (el.children ?? []).map(cleanCardElement);
  }
  if (el.flex != null) out['flex'] = el.flex;
  return withRaw(el, SDUI_CARD_ELEMENT_KNOWN_KEYS, out);
}

const SDUI_CARD_KNOWN_KEYS = [
  'titleField', 'subtitleField', 'dateField', 'organizationField', 'badgeField', 'badgeMap',
  'favoriteField', 'hiddenField', 'personalField', 'personalLabelKey', 'gap', 'elements',
  'compact', 'hiddenIconVisibleIf', 'organizationVisibleIf',
] as const;

function cleanCard(card: SduiCard): Record<string, unknown> {
  if (card.elements) {
    const out: Record<string, unknown> = { elements: card.elements.map(cleanCardElement) };
    if (card.gap != null) out['gap'] = card.gap;
    return withRaw(card, SDUI_CARD_KNOWN_KEYS, out);
  }
  const out: Record<string, unknown> = { titleField: card.titleField };
  if (card.subtitleField) out['subtitleField'] = card.subtitleField;
  if (card.dateField) out['dateField'] = card.dateField;
  if (card.organizationField) out['organizationField'] = card.organizationField;
  if (card.badgeField) out['badgeField'] = card.badgeField;
  if (card.badgeMap) out['badgeMap'] = card.badgeMap;
  if (card.favoriteField) out['favoriteField'] = card.favoriteField;
  if (card.hiddenField) out['hiddenField'] = card.hiddenField;
  if (card.personalField) out['personalField'] = card.personalField;
  if (card.personalLabelKey) out['personalLabelKey'] = card.personalLabelKey;
  if (card.compact) out['compact'] = true;
  if (card.hiddenIconVisibleIf) out['hiddenIconVisibleIf'] = card.hiddenIconVisibleIf;
  if (card.organizationVisibleIf) out['organizationVisibleIf'] = card.organizationVisibleIf;
  return withRaw(card, SDUI_CARD_KNOWN_KEYS, out);
}

// Chiavi note gestite esplicitamente da cleanSection, per qualunque tipo di section.
// 'labelKey' è la chiave JSON grezza di eventsSummary (rimappata su summaryLabelKey nel
// model del wizard, vedi sectionFromJson) e va esclusa esplicitamente per lo stesso motivo
// di 'infoDialog'/'primaryAction' in cleanField.
const SDUI_SECTION_KNOWN_KEYS = [
  'id', 'type', 'titleKey', 'descriptionKey', 'titleVariant', 'descriptionVariant', 'visibleIf',
  'fields', 'itemsPath', 'itemTemplate', 'linkLabelKey', 'linkUrl', 'items', 'layout', 'showIcons', 'iconBackground',
  'columns', 'searchableFields', 'filterButton', 'rowDetail', 'autoOpenItemField', 'autoOpenIdField',
  'leftBorder', 'leftBorderField', 'leftBorderColorMap',
  'groupsPath', 'groupLabelField', 'groupItemsField', 'badgeField', 'badgeMap', 'badgeLabelKeys',
  'secondaryBadgeField', 'secondaryBadgeMap', 'secondaryBadgeLabelKeys', 'summaryLabelKey', 'summaryLabelKeyOne', 'summaryFromField', 'summaryToField',
  'rowAccent', 'rowDescriptionSplit', 'rowAttachment',
  'searchPlaceholderKey', 'tabs', 'card', 'formCard', 'titleOutsideCard', 'sortableFields',
  'searchField', 'dateFilter',
  'groupsPathSummary', 'groupItemsFieldSummary', 'labelKey', 'fromField', 'toField',
  'dateField', 'eventsTitleKey', 'eventsTitleVariant',
] as const;

function cleanSection(s: SduiSection): Record<string, unknown> {
  const out: Record<string, unknown> = { id: s.id, type: s.type };
  if (s.titleKey) out['titleKey'] = s.titleKey;
  if (s.descriptionKey) out['descriptionKey'] = s.descriptionKey;
  if (s.visibleIf) out['visibleIf'] = s.visibleIf;
  if (s.titleVariant && s.titleVariant !== 'standard') out['titleVariant'] = s.titleVariant;
  if (s.descriptionVariant && s.descriptionVariant !== 'standard') out['descriptionVariant'] = s.descriptionVariant;

  if (s.type === 'form') {
    out['fields'] = (s.fields ?? []).map(cleanField);
    // form.card è un booleano (§3.1 manuale, diverso dall'oggetto SduiCard di cardList/calendar):
    // avvolge l'intera section in una Card del tema. Tenuto come formCard nel model (vedi commento
    // su SduiSection.formCard) per non collidere col tipo oggetto di card altrove.
    if (s.formCard) out['card'] = true;
    if (s.titleOutsideCard) out['titleOutsideCard'] = true;
  }

  if (s.type === 'list') {
    out['itemsPath'] = s.itemsPath;
    out['itemTemplate'] = s.itemTemplate;
  }

  if (s.type === 'info') {
    if (s.linkLabelKey) out['linkLabelKey'] = s.linkLabelKey;
    if (s.linkUrl) out['linkUrl'] = s.linkUrl;
  }

  if (s.type === 'menu') {
    out['items'] = (s.items ?? []).map(i => ({ ...i, action: cleanAction(i.action) }));
    if (s.layout) out['layout'] = s.layout;
    if (s.showIcons === false) out['showIcons'] = false;
    if (s.iconBackground) out['iconBackground'] = true;
  }

  if (s.type === 'table' || s.type === 'groupedTable' || s.type === 'cardList') {
    if (s.columns) out['columns'] = s.columns;
    if (s.searchableFields?.length) out['searchableFields'] = s.searchableFields;
    if (s.filterButton) out['filterButton'] = s.filterButton;
    if (s.rowDetail) out['rowDetail'] = cleanRowDetail(s.rowDetail);
    if (s.autoOpenItemField) out['autoOpenItemField'] = s.autoOpenItemField;
    if (s.autoOpenIdField && s.autoOpenIdField !== 'id') out['autoOpenIdField'] = s.autoOpenIdField;
  }
  if (s.type === 'table') {
    out['itemsPath'] = s.itemsPath;
    if (s.leftBorder) out['leftBorder'] = true;
    if (s.leftBorderField) out['leftBorderField'] = s.leftBorderField;
    if (s.leftBorderColorMap && Object.keys(s.leftBorderColorMap).length > 0) out['leftBorderColorMap'] = s.leftBorderColorMap;
  }
  if (s.type === 'groupedTable' || s.type === 'cardList') {
    out['groupsPath'] = s.groupsPath;
    out['groupLabelField'] = s.groupLabelField;
    out['groupItemsField'] = s.groupItemsField || 'items';
    if (s.badgeField) out['badgeField'] = s.badgeField;
    if (s.badgeMap) out['badgeMap'] = s.badgeMap;
    if (s.badgeLabelKeys && Object.keys(s.badgeLabelKeys).length > 0) out['badgeLabelKeys'] = s.badgeLabelKeys;
    if (s.secondaryBadgeField) out['secondaryBadgeField'] = s.secondaryBadgeField;
    if (s.secondaryBadgeMap) out['secondaryBadgeMap'] = s.secondaryBadgeMap;
    if (s.secondaryBadgeLabelKeys && Object.keys(s.secondaryBadgeLabelKeys).length > 0) out['secondaryBadgeLabelKeys'] = s.secondaryBadgeLabelKeys;
    if (s.summaryLabelKey) out['summaryLabelKey'] = s.summaryLabelKey;
    if (s.summaryFromField) out['summaryFromField'] = s.summaryFromField;
    if (s.summaryToField) out['summaryToField'] = s.summaryToField;
  }
  if (s.type === 'groupedTable') {
    if (s.rowAccent) out['rowAccent'] = s.rowAccent;
    if (s.rowDescriptionSplit) out['rowDescriptionSplit'] = true;
    if (s.rowAttachment) out['rowAttachment'] = s.rowAttachment;
  }
  if (s.type === 'cardList') {
    if (s.searchPlaceholderKey) out['searchPlaceholderKey'] = s.searchPlaceholderKey;
    if (s.tabs) out['tabs'] = s.tabs;
    if (s.card) out['card'] = cleanCard(s.card);
    if (s.sortableFields?.length) out['sortableFields'] = s.sortableFields;
    if (s.summaryLabelKeyOne) out['summaryLabelKeyOne'] = s.summaryLabelKeyOne;
  }

  if (s.type === 'filterBar') {
    if (s.searchField) out['searchField'] = s.searchField;
    if (s.dateFilter) out['dateFilter'] = s.dateFilter;
  }

  if (s.type === 'eventsSummary') {
    out['groupsPath'] = s.groupsPathSummary;
    if (s.summaryLabelKey) out['labelKey'] = s.summaryLabelKey;
    if (s.groupItemsFieldSummary) out['groupItemsField'] = s.groupItemsFieldSummary;
    if (s.fromField) out['fromField'] = s.fromField;
    if (s.toField) out['toField'] = s.toField;
    if (s.searchableFields?.length) out['searchableFields'] = s.searchableFields;
  }

  if (s.type === 'calendar') {
    out['itemsPath'] = s.itemsPath;
    if (s.dateField) out['dateField'] = s.dateField;
    if (s.eventsTitleKey) out['eventsTitleKey'] = s.eventsTitleKey;
    if (s.eventsTitleVariant && s.eventsTitleVariant !== 'standard') out['eventsTitleVariant'] = s.eventsTitleVariant;
    if (s.searchPlaceholderKey) out['searchPlaceholderKey'] = s.searchPlaceholderKey;
    if (s.searchableFields?.length) out['searchableFields'] = s.searchableFields;
    if (s.card) out['card'] = cleanCard(s.card);
    if (s.rowDetail) out['rowDetail'] = cleanRowDetail(s.rowDetail);
  }

  return withRaw(s, SDUI_SECTION_KNOWN_KEYS, out);
}

/** Chiavi item-level note di `SduiActionSheetItem` — usata sia da `cleanActionSheetItem`
 * (withRaw) sia dal parsing in sdui-function-builder-dialog.ts per capire quali chiavi
 * del JSON grezzo sono "note" e quali vanno preservate come extra ignote al wizard. */
export const SDUI_ACTION_SHEET_ITEM_KNOWN_KEYS = [
  'labelKey', 'field', 'labelKeyWhenTrue', 'labelKeyWhenFalse', 'visibleIf',
  'style', 'visibleWhenFieldTrue', 'visibleWhenFieldFalse', 'action',
] as const;

/** Serializza una voce di actionsSheet (§3.10 manuale): `action` è annidata sotto la
 * chiave `action:` (schema corretto/attuale — vedi commento su `SduiActionSheetItem`),
 * editata con lo stesso editor grafico generico di primaryAction/menu (#actionEditor). */
function cleanActionSheetItem(item: SduiActionSheetItem): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (item.labelKey) out['labelKey'] = item.labelKey;
  if (item.field) out['field'] = item.field;
  if (item.labelKeyWhenTrue) out['labelKeyWhenTrue'] = item.labelKeyWhenTrue;
  if (item.labelKeyWhenFalse) out['labelKeyWhenFalse'] = item.labelKeyWhenFalse;
  if (item.visibleIf) out['visibleIf'] = item.visibleIf;
  if (item.style) out['style'] = item.style;
  if (item.visibleWhenFieldTrue) out['visibleWhenFieldTrue'] = item.visibleWhenFieldTrue;
  if (item.visibleWhenFieldFalse) out['visibleWhenFieldFalse'] = item.visibleWhenFieldFalse;
  out['action'] = cleanAction(item.action);
  return withRaw(item, SDUI_ACTION_SHEET_ITEM_KNOWN_KEYS, out);
}

function cleanActionsSheet(items: SduiActionSheetItem[] | undefined): Record<string, unknown>[] {
  return (items ?? []).map(cleanActionSheetItem);
}

function cleanRowDetailSection(s: SduiRowDetailSection): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (s.titleKey) out['titleKey'] = s.titleKey;
  if (s.type === 'attachedDocuments') {
    out['type'] = 'attachedDocuments';
    if (s.field && s.field !== 'documents') out['field'] = s.field;
  } else if (s.type === 'documentDownload') {
    out['type'] = 'documentDownload';
    if (s.titleField) out['titleField'] = s.titleField;
    if (s.subtitleField) out['subtitleField'] = s.subtitleField;
    if (s.action) out['action'] = cleanAction(s.action);
  } else if (s.preview) {
    out['preview'] = true;
    if (s.previewEndpoint) out['previewEndpoint'] = s.previewEndpoint;
  } else if (s.fields?.length) {
    out['fields'] = s.fields;
  }
  const actionsSheet = cleanActionsSheet(s.actionsSheet);
  if (actionsSheet.length) out['actionsSheet'] = actionsSheet;
  return out;
}

const SDUI_ROW_DETAIL_KNOWN_KEYS = [
  'sections', 'detailEndpoint', 'detailTitleKey', 'titleField', 'chips',
  'badgeField', 'badgeMap', 'secondaryBadgeField', 'secondaryBadgeMap', 'actionsSheet',
  'tapAction', 'actionsLayout', 'titleVariant', 'sectionTitleVariant', 'labelVariant', 'valueVariant',
] as const;

function cleanRowDetail(r: SduiRowDetail): Record<string, unknown> {
  const out: Record<string, unknown> = { sections: r.sections.map(cleanRowDetailSection) };
  if (r.detailEndpoint) out['detailEndpoint'] = r.detailEndpoint;
  if (r.detailTitleKey) out['detailTitleKey'] = r.detailTitleKey;
  if (r.titleField) out['titleField'] = r.titleField;
  if (r.tapAction) out['tapAction'] = cleanAction(r.tapAction);
  if (r.actionsLayout) out['actionsLayout'] = r.actionsLayout;
  if (r.titleVariant) out['titleVariant'] = r.titleVariant;
  if (r.sectionTitleVariant) out['sectionTitleVariant'] = r.sectionTitleVariant;
  if (r.labelVariant) out['labelVariant'] = r.labelVariant;
  if (r.valueVariant) out['valueVariant'] = r.valueVariant;
  if (r.chips?.length) out['chips'] = r.chips;
  if (r.badgeField) out['badgeField'] = r.badgeField;
  if (r.badgeMap) out['badgeMap'] = r.badgeMap;
  if (r.secondaryBadgeField) out['secondaryBadgeField'] = r.secondaryBadgeField;
  if (r.secondaryBadgeMap) out['secondaryBadgeMap'] = r.secondaryBadgeMap;
  const actionsSheet = cleanActionsSheet(r.actionsSheet);
  if (actionsSheet.length) out['actionsSheet'] = actionsSheet;
  return withRaw(r, SDUI_ROW_DETAIL_KNOWN_KEYS, out);
}

function cleanSequenceCall(c: SduiSequenceCall): Record<string, unknown> {
  const out: Record<string, unknown> = { endpoint: c.endpoint };
  if (c.method && c.method !== 'GET') out['method'] = c.method;
  if (c.auth && c.auth !== 'bearer') out['auth'] = c.auth;
  if (Object.keys(c.bodyMapping ?? {}).length > 0) out['bodyMapping'] = c.bodyMapping;
  if (c.body?.trim()) {
    try { out['body'] = JSON.parse(c.body); } catch { /* JSON non valido: segnalato dal validatore */ }
  }
  if (Object.keys(c.captureMapping ?? {}).length > 0) out['captureMapping'] = c.captureMapping;
  if (c.captureOptions?.stateKey) {
    const co: Record<string, unknown> = { stateKey: c.captureOptions.stateKey, valueTemplate: c.captureOptions.valueTemplate };
    if (c.captureOptions.itemsField) co['itemsField'] = c.captureOptions.itemsField;
    if (c.captureOptions.labelTemplate) co['labelTemplate'] = c.captureOptions.labelTemplate;
    if (c.captureOptions.sublabelTemplate) co['sublabelTemplate'] = c.captureOptions.sublabelTemplate;
    if (c.captureOptions.metaFields?.length) co['metaFields'] = c.captureOptions.metaFields;
    out['captureOptions'] = co;
  }
  return out;
}

function cleanOnSubmit(o: SduiOnSubmit): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (o.sequence && o.sequence.length > 0) {
    out['sequence'] = o.sequence.map(cleanSequenceCall);
  } else {
    out['method'] = o.method;
    out['endpoint'] = o.endpoint;
    out['auth'] = o.auth || 'bearer';
  }
  if (o.submitLabelKey) out['submitLabelKey'] = o.submitLabelKey;
  if (o.cancelLabelKey) out['cancelLabelKey'] = o.cancelLabelKey;
  if (o.failureCheck?.field) out['failureCheck'] = { field: o.failureCheck.field, equals: o.failureCheck.equals ?? '' };
  if (Object.keys(o.bodyMapping ?? {}).length > 0) out['bodyMapping'] = o.bodyMapping;
  if (o.requestTransform?.type) out['requestTransform'] = o.requestTransform;
  if (o.multipart) {
    out['multipart'] = true;
    if (o.fileField) out['fileField'] = o.fileField;
    if (o.fileFieldName) out['fileFieldName'] = o.fileFieldName;
  }
  const onSuccess: Record<string, unknown> = {};
  if (o.onSuccess?.action) onSuccess['action'] = o.onSuccess.action;
  if (o.onSuccess?.navigateBack) onSuccess['navigateBack'] = true;
  if (o.onSuccess?.messageKey) onSuccess['messageKey'] = o.onSuccess.messageKey;
  if (o.onSuccess?.valuePath) onSuccess['valuePath'] = o.onSuccess.valuePath;
  if (o.onSuccess?.resetToRoute) onSuccess['resetToRoute'] = o.onSuccess.resetToRoute;
  if (o.onSuccess?.popScreen) onSuccess['popScreen'] = true;
  if (o.onSuccess?.showSuccessScreen) {
    onSuccess['showSuccessScreen'] = o.onSuccess.showSuccessScreen;
  } else if (o.onSuccess?.showTransitionScreen?.titleKey) {
    onSuccess['showTransitionScreen'] = o.onSuccess.showTransitionScreen;
  }
  if (o.onSuccess?.navigateSdui?.entity) onSuccess['navigateSdui'] = o.onSuccess.navigateSdui;
  // Fuori dal ramo showSuccessScreen: l'engine lo legge comunque (flow_renderer.dart,
  // `onSubmit['onSuccess']?['completeLogin'] == true`), indipendentemente dal resto.
  if (o.onSuccess?.completeLogin) onSuccess['completeLogin'] = true;
  if (Object.keys(onSuccess).length > 0) out['onSuccess'] = onSuccess;
  if (o.onError?.messageKey || o.onError?.action) {
    const onError: Record<string, unknown> = {};
    if (o.onError.messageKey) onError['messageKey'] = o.onError.messageKey;
    if (o.onError.action) onError['action'] = o.onError.action;
    out['onError'] = onError;
  }
  return out;
}

function cleanFlowStep(s: SduiFlowStep): Record<string, unknown> {
  const out: Record<string, unknown> = { id: s.id, titleKey: s.titleKey };
  if (s.descriptionKey) out['descriptionKey'] = s.descriptionKey;
  if (s.visibleIf) out['visibleIf'] = s.visibleIf;
  if (s.dataSource?.endpoint) {
    const ds: Record<string, unknown> = { endpoint: s.dataSource.endpoint };
    if (s.dataSource.method && s.dataSource.method !== 'GET') ds['method'] = s.dataSource.method;
    if (s.dataSource.auth && s.dataSource.auth !== 'bearer') ds['auth'] = s.dataSource.auth;
    if (Object.keys(s.dataSource.bodyMapping ?? {}).length > 0) ds['bodyMapping'] = s.dataSource.bodyMapping;
    if (s.dataSource.responseTransform) ds['responseTransform'] = cleanResponseTransform(s.dataSource.responseTransform);
    if (s.dataSource.defaultDateRange) ds['defaultDateRange'] = s.dataSource.defaultDateRange;
    out['dataSource'] = ds;
  }
  if (s.prefetchSequence?.length) out['prefetchSequence'] = s.prefetchSequence.map(cleanSequenceCall);
  if (s.fields.length > 0) out['fields'] = s.fields.map(cleanField);
  if (s.canProceed.length > 0) out['canProceed'] = s.canProceed;
  if (s.reviewFields?.length) out['reviewFields'] = s.reviewFields;
  if (s.isLastStep && s.onSubmit) {
    out['onSubmit'] = cleanOnSubmit(s.onSubmit);
  } else if (s.next) {
    out['next'] = s.next;
  }
  return out;
}
