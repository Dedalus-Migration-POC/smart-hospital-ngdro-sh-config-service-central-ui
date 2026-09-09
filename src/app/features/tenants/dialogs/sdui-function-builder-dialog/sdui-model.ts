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
  format?: 'boolFromString' | 'stringFromBool' | 'localizedLabel' | 'dateLabel' | 'timeLabel' | '';
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
  staticItemFields: Record<string, string>;
}

export type SduiResponseTransform = SduiFlattenNested | SduiWrapAsSingleGroup;

export interface SduiDataSource {
  method: string;
  endpoint: string;
  auth: string;
  bodyMapping: Record<string, string>;
  responseTransform: SduiResponseTransform | null;
  defaultDateRange?: { fromField: string; toField: string; daysAgo?: number; daysForward?: number };
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

export type SduiOptionsSource = 'static' | 'fromState' | 'remote';

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
  };
}

// ---------------------------------------------------------------------------
// Field (component di form)
// ---------------------------------------------------------------------------

export type SduiFieldComponent =
  | 'textInput' | 'datePicker' | 'timePicker' | 'filePicker' | 'checkbox' | 'toggle'
  | 'dropdown' | 'radioCard' | 'radioCardList' | 'summaryCard' | 'captcha' | 'chip'
  | 'staticText' | 'readOnlyInfo' | 'infoBanner' | 'row' | 'column';

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
];

export interface SduiFlatField {
  labelKey: string;
  field: string;
}

export interface SduiDetailAction {
  linkKey: string;
  subtitleField?: string;
  badgeField?: string;
  flatFields?: SduiFlatField[];
  officesField?: string;
  officeTitleKey?: string;
  officeFields?: SduiFlatField[];
}

export interface SduiField {
  id: string;
  component: SduiFieldComponent;
  labelKey: string;
  visibleIf?: string;
  paddingBottom?: number;
  validation?: SduiValidation;
  options?: SduiOptions;
  // textInput
  multiline?: boolean;
  maxLines?: number;
  // datePicker
  minDate?: string;
  maxDate?: string;
  // filePicker
  allowedExtensions?: string[];
  placeholderKey?: string;
  // readOnlyInfo
  valueField?: string;
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
  // radioCardList (§10 manuale)
  badgeField?: string;
  delegateHeaderKey?: string;
  loadMoreLabelKey?: string;
  filterBy?: string;
  ownBadgeKey?: string;
  detailAction?: SduiDetailAction;
  // summaryCard (condivide badgeField con radioCardList)
  titleValueField?: string;
  subtitleField?: string;
  flatFields?: SduiFlatField[];
  officesField?: string;
  officeTitleKey?: string;
  officeFields?: SduiFlatField[];
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
  return field;
}

// ---------------------------------------------------------------------------
// Azioni dichiarative
// ---------------------------------------------------------------------------

export type SduiActionType =
  | 'navigateSdui' | 'reload' | 'openExternal' | 'call' | 'downloadFile'
  | 'confirmAndCall' | 'toggleField' | 'toggleFavorite';

export const SDUI_ACTION_TYPES: { value: SduiActionType; label: string; warning?: string }[] = [
  { value: 'navigateSdui', label: 'sduiWizard.actionTypes.navigateSdui.label' },
  { value: 'reload', label: 'sduiWizard.actionTypes.reload.label' },
  { value: 'openExternal', label: 'sduiWizard.actionTypes.openExternal.label', warning: 'sduiWizard.actionTypes.openExternal.warning' },
  { value: 'call', label: 'sduiWizard.actionTypes.call.label', warning: 'sduiWizard.actionTypes.call.warning' },
  { value: 'downloadFile', label: 'sduiWizard.actionTypes.downloadFile.label' },
  { value: 'confirmAndCall', label: 'sduiWizard.actionTypes.confirmAndCall.label' },
  { value: 'toggleField', label: 'sduiWizard.actionTypes.toggleField.label' },
  { value: 'toggleFavorite', label: 'sduiWizard.actionTypes.toggleFavorite.label' },
];

export interface SduiCallSpec {
  endpoint: string;
  method: string;
  auth?: string;
  bodyMapping?: Record<string, string>;
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
  // downloadFile
  endpoint?: string;
  fileName?: string;
  auth?: string;
  successMessageKey?: string;
  errorMessageKey?: string;
  // confirmAndCall
  confirmTitleKey?: string;
  confirmMessageKey?: string;
  call?: SduiCallSpec;
  onSuccess?: {
    messageKey?: string;
    refreshDataSource?: boolean;
    removeFrom?: { groupsPath: string; groupItemsField: string; matchField: string };
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
  // toggleFavorite
  favoriteIdField?: string;
  addCall?: SduiCallSpec;
  removeCall?: SduiCallSpec;
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
}

export interface SduiFilterGroup {
  id: string;
  labelKey?: string;
  field?: string;
  labelField?: string;
  colorField?: string;
  multiSelect?: boolean;
  options: SduiFilterOption[];
  dateRangeField?: { fromField: string; toField: string };
}

export interface SduiFilterButton {
  labelKey: string;
  groups: SduiFilterGroup[];
}

export interface SduiBadgeEntry {
  labelKey: string;
  color: string;
}

export interface SduiActionSheetItem {
  labelKey?: string;
  field?: string;
  labelKeyWhenTrue?: string;
  labelKeyWhenFalse?: string;
  /** Wizard-only: `action` (§6 manuale) editata come JSON grezzo — evita di dover
   * reimplementare l'intero editor azione (già molto ricco, vedi step "Azioni") per ogni
   * voce di actionsSheet; stessa strategia già usata per initialStateJson/call.body. */
  actionJson: string;
  visibleWhenFieldTrue?: string;
  visibleWhenFieldFalse?: string;
}

export interface SduiRowDetailSection {
  titleKey?: string;
  type?: 'attachedDocuments';
  field?: string;
  preview?: boolean;
  previewEndpoint?: string;
  fields?: { key: string; labelKey: string }[];
  actionsSheet?: SduiActionSheetItem[];
}

export interface SduiRowDetail {
  detailEndpoint?: string;
  detailTitleKey?: string;
  titleField?: string;
  personalField?: string;
  personalLabelKey?: string;
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
  return { labelKey: '', actionJson: JSON.stringify(createEmptyAction(), null, 2) };
}

export interface SduiMenuItem {
  icon?: string;
  labelKey: string;
  descriptionKey?: string;
  action: SduiAction;
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

  // table / groupedTable / cardList (condivisi)
  columns?: SduiColumn[];
  searchableFields?: string[];
  filterButton?: SduiFilterButton;
  rowDetail?: SduiRowDetail;

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
  summaryFromField?: string;
  summaryToField?: string;

  // cardList
  searchPlaceholderKey?: string;
  tabs?: SduiTabs;
  card?: SduiCard;
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

/** Schermata di conclusione dedicata di un flow (§7.1 manuale). */
export interface SduiConclusion {
  titleKey: string;
  subtitleKey?: string;
  codeLabelKey?: string;
  codeField?: string;
  titleField?: string;
  dateField?: string;
  facilityField?: string;
  addressField?: string;
  cityField?: string;
  payAction?: { url: string } | null;
  downloadAction?: { endpoint: string; auth?: string; fileName: string } | null;
  cancelAction?: {
    endpoint: string;
    method: string;
    auth?: string;
    bodyMapping: Record<string, string>;
    confirmTitleKey: string;
    confirmMessageKey: string;
  } | null;
}

export function createEmptyConclusion(): SduiConclusion {
  return { titleKey: '', payAction: null, downloadAction: null, cancelAction: null };
}

export interface SduiOnSubmit {
  method: string;
  endpoint: string;
  auth: string;
  submitLabelKey?: string;
  bodyMapping: Record<string, string>;
  /** Solo per l'onSubmit dell'ultimo step di un flow: sequenza di chiamate al posto di un singolo endpoint. */
  sequence?: SduiSequenceCall[] | null;
  requestTransform: {
    type: 'unflattenNested';
    itemsPath: string;
    targetPath: string;
    fields: Record<string, string>;
  } | null;
  multipart?: boolean;
  fileField?: string;
  fileFieldName?: string;
  onSuccess: {
    action?: 'toast' | 'setActivePatient' | 'navigateBack';
    messageKey?: string;
    valuePath?: string;
    showSuccessScreen?: SduiSuccessScreen | null;
    /** Solo flow, ultimo step: schermata di recap post-conferma (§7.1). */
    conclusion?: SduiConclusion | null;
  };
  onError: { messageKey?: string };
}

export function createEmptyOnSubmit(): SduiOnSubmit {
  return {
    method: 'PUT',
    endpoint: '',
    auth: 'bearer',
    bodyMapping: {},
    sequence: null,
    requestTransform: null,
    onSuccess: { action: 'toast', messageKey: '', conclusion: null },
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
  fields: SduiField[];
  canProceed: string[];
  next?: string;
  reviewFields?: string[];
  isLastStep: boolean; // helper solo-UI: determina se mostrare onSubmit invece di next
  /** Ping/prefetch "usa e getta": la risposta viene scartata (§7 manuale). */
  dataSource?: { method: string; endpoint: string; auth?: string; bodyMapping: Record<string, string> } | null;
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
      if (d.dataSource.responseTransform) {
        ds['responseTransform'] = d.dataSource.responseTransform.type === 'wrapAsSingleGroup'
          ? cleanWrapAsSingleGroup(d.dataSource.responseTransform)
          : cleanFlattenNested(d.dataSource.responseTransform);
      }
      if (d.dataSource.defaultDateRange) ds['defaultDateRange'] = d.dataSource.defaultDateRange;
      out['dataSource'] = ds;
    }
    out['sections'] = d.sections.map(cleanSection);
    if (d.primaryAction) out['primaryAction'] = cleanAction(d.primaryAction);
    if (d.onSubmit) out['onSubmit'] = cleanOnSubmit(d.onSubmit);
  } else {
    if (d.onExit?.confirmKey) out['onExit'] = { confirmKey: d.onExit.confirmKey };
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
 * JSON originale (section, field, action, card, cardElement, rowDetail, options,
 * validation...). Nodi ricostruiti da zero a partire da singoli campi selezionati
 * (onSubmit, sequenceCall, conclusion, flowStep, voci di menu/actionsSheet, dataSource,
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

function cleanWrapAsSingleGroup(f: SduiWrapAsSingleGroup): Record<string, unknown> {
  const out: Record<string, unknown> = {
    type: 'wrapAsSingleGroup',
    itemsPath: f.itemsPath || 'items',
    targetPath: f.targetPath || 'groupedItems',
  };
  if (f.groupLabelKey) out['groupLabelKey'] = f.groupLabelKey;
  if (Object.keys(f.staticItemFields ?? {}).length > 0) out['staticItemFields'] = f.staticItemFields;
  return out;
}

const SDUI_OPTIONS_KNOWN_KEYS = ['source', 'values', 'path', 'endpoint', 'auth', 'itemsField', 'fields', 'valueTemplate', 'labelTemplate', 'sublabelTemplate', 'metaFields', 'pageSize'] as const;

function cleanOptions(o: SduiOptions): Record<string, unknown> {
  const out: Record<string, unknown> = { source: o.source };
  if (o.source === 'static') out['values'] = o.values;
  if (o.source === 'fromState') out['path'] = o.path;
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
    if (o.pageSize && o.pageSize !== 5) out['pageSize'] = o.pageSize;
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
  'multiline', 'maxLines', 'minDate', 'maxDate', 'allowedExtensions', 'placeholderKey',
  'valueField', 'siteKey', 'baseUrl', 'theme', 'variant', 'linkKey',
  'infoDialogTitleKey', 'infoDialogBodyKey', 'infoDialog', 'buttonKey',
  'primaryActionSequence', 'primaryAction', 'actionMessageKey',
  'children', 'gap', 'widthPercent', 'flex', 'shrinkWrap',
  'badgeField', 'delegateHeaderKey', 'loadMoreLabelKey', 'filterBy', 'ownBadgeKey', 'detailAction',
  'titleValueField', 'subtitleField', 'flatFields', 'officesField', 'officeTitleKey', 'officeFields',
] as const;

function cleanField(f: SduiField): Record<string, unknown> {
  const out: Record<string, unknown> = { id: f.id, component: f.component, labelKey: f.labelKey };
  if (f.visibleIf) out['visibleIf'] = f.visibleIf;
  if (f.paddingBottom != null) out['paddingBottom'] = f.paddingBottom;
  if (f.validation && (f.validation.required || f.validation.pattern || f.validation.equalsField)) {
    out['validation'] = cleanValidation(f.validation);
  }
  if (f.options) out['options'] = cleanOptions(f.options);
  if (f.component === 'textInput') {
    if (f.multiline) { out['multiline'] = true; if (f.maxLines) out['maxLines'] = f.maxLines; }
  }
  if (f.component === 'datePicker') {
    if (f.minDate) out['minDate'] = f.minDate;
    if (f.maxDate) out['maxDate'] = f.maxDate;
  }
  if (f.component === 'filePicker') {
    if (f.allowedExtensions?.length) out['allowedExtensions'] = f.allowedExtensions;
    if (f.placeholderKey) out['placeholderKey'] = f.placeholderKey;
  }
  if (f.component === 'readOnlyInfo' && f.valueField) out['valueField'] = f.valueField;
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
  }
  if (f.component === 'radioCardList') {
    if (f.badgeField) out['badgeField'] = f.badgeField;
    if (f.delegateHeaderKey) out['delegateHeaderKey'] = f.delegateHeaderKey;
    if (f.loadMoreLabelKey) out['loadMoreLabelKey'] = f.loadMoreLabelKey;
    if (f.filterBy) out['filterBy'] = f.filterBy;
    if (f.ownBadgeKey) out['ownBadgeKey'] = f.ownBadgeKey;
    if (f.detailAction?.linkKey) out['detailAction'] = cleanDetailAction(f.detailAction);
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
  return withRaw(f, SDUI_FIELD_KNOWN_KEYS, out);
}

const SDUI_DETAIL_ACTION_KNOWN_KEYS = ['linkKey', 'subtitleField', 'badgeField', 'flatFields', 'officesField', 'officeTitleKey', 'officeFields'] as const;

function cleanDetailAction(d: SduiDetailAction): Record<string, unknown> {
  const out: Record<string, unknown> = { linkKey: d.linkKey };
  if (d.subtitleField) out['subtitleField'] = d.subtitleField;
  if (d.badgeField) out['badgeField'] = d.badgeField;
  if (d.flatFields?.length) out['flatFields'] = d.flatFields;
  if (d.officesField) out['officesField'] = d.officesField;
  if (d.officeTitleKey) out['officeTitleKey'] = d.officeTitleKey;
  if (d.officeFields?.length) out['officeFields'] = d.officeFields;
  return withRaw(d, SDUI_DETAIL_ACTION_KNOWN_KEYS, out);
}

const SDUI_ACTION_KNOWN_KEYS = [
  'type', 'icon', 'labelKey', 'entity', 'assetPath', 'initialStateFromItem',
  'endpoint', 'fileName', 'auth', 'successMessageKey', 'errorMessageKey',
  'confirmTitleKey', 'confirmMessageKey', 'call', 'onSuccess', 'field', 'updateInGroups',
  'labelKeyWhenTrue', 'labelKeyWhenFalse',
  'confirmTitleKeyWhenTrue', 'confirmMessageKeyWhenTrue', 'confirmTitleKeyWhenFalse', 'confirmMessageKeyWhenFalse',
  'favoriteIdField', 'addCall', 'removeCall',
] as const;

function cleanAction(a: SduiAction): Record<string, unknown> {
  const out: Record<string, unknown> = { type: a.type };
  if (a.icon) out['icon'] = a.icon;
  if (a.labelKey) out['labelKey'] = a.labelKey;
  if (a.entity) out['entity'] = a.entity;
  if (a.assetPath) out['assetPath'] = a.assetPath;
  if (a.initialStateFromItem) out['initialStateFromItem'] = a.initialStateFromItem;
  if (a.endpoint) out['endpoint'] = a.endpoint;
  if (a.fileName) out['fileName'] = a.fileName;
  if (a.auth) out['auth'] = a.auth;
  if (a.successMessageKey) out['successMessageKey'] = a.successMessageKey;
  if (a.errorMessageKey) out['errorMessageKey'] = a.errorMessageKey;
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
  if (a.favoriteIdField) out['favoriteIdField'] = a.favoriteIdField;
  if (a.addCall) out['addCall'] = a.addCall;
  if (a.removeCall) out['removeCall'] = a.removeCall;
  return withRaw(a, SDUI_ACTION_KNOWN_KEYS, out);
}

const SDUI_CARD_ELEMENT_KNOWN_KEYS = [
  'type', 'field', 'labelKey', 'variant', 'align', 'orientation', 'badgeMap',
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
  if (el.type === 'keyValue' && el.orientation && el.orientation !== 'vertical') out['orientation'] = el.orientation;
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
  return withRaw(card, SDUI_CARD_KNOWN_KEYS, out);
}

// Chiavi note gestite esplicitamente da cleanSection, per qualunque tipo di section.
// 'labelKey' è la chiave JSON grezza di eventsSummary (rimappata su summaryLabelKey nel
// model del wizard, vedi sectionFromJson) e va esclusa esplicitamente per lo stesso motivo
// di 'infoDialog'/'primaryAction' in cleanField.
const SDUI_SECTION_KNOWN_KEYS = [
  'id', 'type', 'titleKey', 'descriptionKey', 'titleVariant', 'descriptionVariant',
  'fields', 'itemsPath', 'itemTemplate', 'linkLabelKey', 'linkUrl', 'items',
  'columns', 'searchableFields', 'filterButton', 'rowDetail',
  'leftBorder', 'leftBorderField', 'leftBorderColorMap',
  'groupsPath', 'groupLabelField', 'groupItemsField', 'badgeField', 'badgeMap', 'badgeLabelKeys',
  'secondaryBadgeField', 'secondaryBadgeMap', 'secondaryBadgeLabelKeys', 'summaryLabelKey', 'summaryFromField', 'summaryToField',
  'searchPlaceholderKey', 'tabs', 'card', 'sortableFields',
  'searchField', 'dateFilter',
  'groupsPathSummary', 'groupItemsFieldSummary', 'labelKey', 'fromField', 'toField',
  'dateField', 'eventsTitleKey', 'eventsTitleVariant',
] as const;

function cleanSection(s: SduiSection): Record<string, unknown> {
  const out: Record<string, unknown> = { id: s.id, type: s.type };
  if (s.titleKey) out['titleKey'] = s.titleKey;
  if (s.descriptionKey) out['descriptionKey'] = s.descriptionKey;
  if (s.titleVariant && s.titleVariant !== 'standard') out['titleVariant'] = s.titleVariant;
  if (s.descriptionVariant && s.descriptionVariant !== 'standard') out['descriptionVariant'] = s.descriptionVariant;

  if (s.type === 'form') out['fields'] = (s.fields ?? []).map(cleanField);

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
  }

  if (s.type === 'table' || s.type === 'groupedTable' || s.type === 'cardList') {
    if (s.columns) out['columns'] = s.columns;
    if (s.searchableFields?.length) out['searchableFields'] = s.searchableFields;
    if (s.filterButton) out['filterButton'] = s.filterButton;
    if (s.rowDetail) out['rowDetail'] = cleanRowDetail(s.rowDetail);
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
  if (s.type === 'cardList') {
    if (s.searchPlaceholderKey) out['searchPlaceholderKey'] = s.searchPlaceholderKey;
    if (s.tabs) out['tabs'] = s.tabs;
    if (s.card) out['card'] = cleanCard(s.card);
    if (s.sortableFields?.length) out['sortableFields'] = s.sortableFields;
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

/** Serializza una voce di actionsSheet (§3.10 manuale): `action` è editata come JSON
 * grezzo nel wizard (SduiActionSheetItem.actionJson) e riparsata qui a fine flusso.
 * Se il JSON è vuoto/non valido, la voce viene scartata silenziosamente (segnalato dal
 * validatore "Regole", non blocca la generazione delle altre voci). */
function cleanActionSheetItem(item: SduiActionSheetItem): Record<string, unknown> | null {
  let action: unknown = null;
  try { action = item.actionJson?.trim() ? JSON.parse(item.actionJson) : null; } catch { action = null; }
  if (!action) return null;
  const out: Record<string, unknown> = { action };
  if (item.labelKey) out['labelKey'] = item.labelKey;
  if (item.field) out['field'] = item.field;
  if (item.labelKeyWhenTrue) out['labelKeyWhenTrue'] = item.labelKeyWhenTrue;
  if (item.labelKeyWhenFalse) out['labelKeyWhenFalse'] = item.labelKeyWhenFalse;
  if (item.visibleWhenFieldTrue) out['visibleWhenFieldTrue'] = item.visibleWhenFieldTrue;
  if (item.visibleWhenFieldFalse) out['visibleWhenFieldFalse'] = item.visibleWhenFieldFalse;
  return out;
}

function cleanActionsSheet(items: SduiActionSheetItem[] | undefined): Record<string, unknown>[] {
  return (items ?? []).map(cleanActionSheetItem).filter((x): x is Record<string, unknown> => x !== null);
}

function cleanRowDetailSection(s: SduiRowDetailSection): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (s.titleKey) out['titleKey'] = s.titleKey;
  if (s.type === 'attachedDocuments') {
    out['type'] = 'attachedDocuments';
    if (s.field && s.field !== 'documents') out['field'] = s.field;
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
  'sections', 'detailEndpoint', 'detailTitleKey', 'titleField', 'personalField', 'personalLabelKey',
  'badgeField', 'badgeMap', 'secondaryBadgeField', 'secondaryBadgeMap', 'actionsSheet',
] as const;

function cleanRowDetail(r: SduiRowDetail): Record<string, unknown> {
  const out: Record<string, unknown> = { sections: r.sections.map(cleanRowDetailSection) };
  if (r.detailEndpoint) out['detailEndpoint'] = r.detailEndpoint;
  if (r.detailTitleKey) out['detailTitleKey'] = r.detailTitleKey;
  if (r.titleField) out['titleField'] = r.titleField;
  if (r.personalField) out['personalField'] = r.personalField;
  if (r.personalLabelKey) out['personalLabelKey'] = r.personalLabelKey;
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

function cleanConclusion(c: SduiConclusion): Record<string, unknown> {
  const out: Record<string, unknown> = { titleKey: c.titleKey };
  if (c.subtitleKey) out['subtitleKey'] = c.subtitleKey;
  if (c.codeLabelKey) out['codeLabelKey'] = c.codeLabelKey;
  if (c.codeField) out['codeField'] = c.codeField;
  if (c.titleField) out['titleField'] = c.titleField;
  if (c.dateField) out['dateField'] = c.dateField;
  if (c.facilityField) out['facilityField'] = c.facilityField;
  if (c.addressField) out['addressField'] = c.addressField;
  if (c.cityField) out['cityField'] = c.cityField;
  if (c.payAction?.url) out['payAction'] = { url: c.payAction.url };
  if (c.downloadAction?.endpoint) {
    const d: Record<string, unknown> = { endpoint: c.downloadAction.endpoint, fileName: c.downloadAction.fileName };
    if (c.downloadAction.auth && c.downloadAction.auth !== 'bearer') d['auth'] = c.downloadAction.auth;
    out['downloadAction'] = d;
  }
  if (c.cancelAction?.endpoint) {
    const ca: Record<string, unknown> = {
      endpoint: c.cancelAction.endpoint,
      method: c.cancelAction.method || 'PUT',
      confirmTitleKey: c.cancelAction.confirmTitleKey,
      confirmMessageKey: c.cancelAction.confirmMessageKey,
    };
    if (c.cancelAction.auth && c.cancelAction.auth !== 'bearer') ca['auth'] = c.cancelAction.auth;
    if (Object.keys(c.cancelAction.bodyMapping ?? {}).length > 0) ca['bodyMapping'] = c.cancelAction.bodyMapping;
    out['cancelAction'] = ca;
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
  if (Object.keys(o.bodyMapping ?? {}).length > 0) out['bodyMapping'] = o.bodyMapping;
  if (o.requestTransform?.itemsPath) out['requestTransform'] = o.requestTransform;
  if (o.multipart) {
    out['multipart'] = true;
    if (o.fileField) out['fileField'] = o.fileField;
    if (o.fileFieldName) out['fileFieldName'] = o.fileFieldName;
  }
  const onSuccess: Record<string, unknown> = {};
  if (o.onSuccess?.showSuccessScreen) {
    onSuccess['showSuccessScreen'] = o.onSuccess.showSuccessScreen;
  } else {
    if (o.onSuccess?.action) onSuccess['action'] = o.onSuccess.action;
    if (o.onSuccess?.messageKey) onSuccess['messageKey'] = o.onSuccess.messageKey;
    if (o.onSuccess?.valuePath) onSuccess['valuePath'] = o.onSuccess.valuePath;
  }
  if (o.onSuccess?.conclusion?.titleKey) onSuccess['conclusion'] = cleanConclusion(o.onSuccess.conclusion);
  if (Object.keys(onSuccess).length > 0) out['onSuccess'] = onSuccess;
  if (o.onError?.messageKey) out['onError'] = { messageKey: o.onError.messageKey };
  return out;
}

function cleanFlowStep(s: SduiFlowStep): Record<string, unknown> {
  const out: Record<string, unknown> = { id: s.id, titleKey: s.titleKey };
  if (s.descriptionKey) out['descriptionKey'] = s.descriptionKey;
  if (s.dataSource?.endpoint) {
    const ds: Record<string, unknown> = { endpoint: s.dataSource.endpoint };
    if (s.dataSource.method && s.dataSource.method !== 'GET') ds['method'] = s.dataSource.method;
    if (s.dataSource.auth && s.dataSource.auth !== 'bearer') ds['auth'] = s.dataSource.auth;
    if (Object.keys(s.dataSource.bodyMapping ?? {}).length > 0) ds['bodyMapping'] = s.dataSource.bodyMapping;
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
