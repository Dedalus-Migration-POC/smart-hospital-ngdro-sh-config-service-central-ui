/**
 * Validatore del descrittore SDUI — applica le regole "Attenzione" documentate
 * nel manuale (`sh-core/docs/SDUI_MANUAL.md`) che non sono esprimibili come
 * semplice obbligatorietà di campo (whitelist icone, notazioni per contesto,
 * mutue esclusioni, ecc.).
 */
import {
  SDUI_MENU_ICONS,
  SduiDescriptor,
  SduiField,
  SduiFlowStep,
  SduiSection,
} from './sdui-model';

export interface SduiIssue {
  severity: 'error' | 'warning';
  path: string;
  message: string;
}

export function validateDescriptor(d: SduiDescriptor): SduiIssue[] {
  const issues: SduiIssue[] = [];
  const push = (severity: SduiIssue['severity'], path: string, message: string): void => {
    issues.push({ severity, path, message });
  };

  // --- Header ---
  const id = d.kind === 'screen' ? d.screenId : d.flowId;
  if (!id?.trim()) push('error', 'header', `${d.kind === 'screen' ? 'screenId' : 'flowId'} obbligatorio.`);
  if (!d.titleKey?.trim()) push('error', 'header', 'titleKey obbligatorio (titolo AppBar).');
  try {
    if (d.initialStateJson?.trim()) JSON.parse(d.initialStateJson);
  } catch {
    push('error', 'header', 'initialState non è un JSON valido.');
  }

  if (d.kind === 'screen') {
    validateScreen(d, push);
  } else {
    validateFlow(d, push);
  }

  return issues;
}

function validateScreen(d: SduiDescriptor, push: (s: SduiIssue['severity'], p: string, m: string) => void): void {
  if (d.sections.length === 0) {
    push('warning', 'sections', 'Nessuna section dichiarata — la schermata risulterà vuota.');
  }
  const seenSectionIds = new Set<string>();
  d.sections.forEach((s, i) => validateSection(s, `sections[${i}]`, seenSectionIds, push, true));

  if (d.dataSource?.endpoint) {
    if (d.dataSource.method && d.dataSource.method !== 'GET' && Object.keys(d.dataSource.bodyMapping ?? {}).length === 0) {
      push('warning', 'dataSource', `method "${d.dataSource.method}" senza bodyMapping/body: verrà inviato un body vuoto {}.`);
    }
    const rt = d.dataSource.responseTransform;
    if (rt?.type === 'flattenNested') {
      if (!rt.arrayPath) push('error', 'dataSource.responseTransform', 'arrayPath obbligatorio per flattenNested.');
      if (!rt.targetPath) push('error', 'dataSource.responseTransform', 'targetPath obbligatorio per flattenNested.');
    }
    if (rt?.type === 'wrapAsSingleGroup') {
      if (!rt.itemsPath) push('error', 'dataSource.responseTransform', 'itemsPath obbligatorio per wrapAsSingleGroup.');
      if (!rt.targetPath) push('error', 'dataSource.responseTransform', 'targetPath obbligatorio per wrapAsSingleGroup.');
    }
  }

  if (d.onSubmit) {
    if (!d.onSubmit.method) push('error', 'onSubmit', 'method obbligatorio (nessun default, a differenza di dataSource).');
    if (!d.onSubmit.endpoint) push('error', 'onSubmit', 'endpoint obbligatorio.');
    for (const key of Object.keys(d.onSubmit.bodyMapping ?? {})) {
      const val = d.onSubmit.bodyMapping[key];
      if (val.startsWith('@.')) {
        push('error', `onSubmit.bodyMapping.${key}`, '"@." non è supportato in bodyMapping di onSubmit su screen — usa {patientId}/{userId} nell\'endpoint.');
      }
    }
    if (d.onSubmit.requestTransform) {
      if (!d.onSubmit.requestTransform.itemsPath) push('error', 'onSubmit.requestTransform', 'itemsPath obbligatorio per unflattenNested.');
      if (!d.onSubmit.requestTransform.targetPath) push('error', 'onSubmit.requestTransform', 'targetPath obbligatorio per unflattenNested.');
    }
    if (d.onSubmit.multipart && !d.onSubmit.fileField) {
      push('error', 'onSubmit', 'multipart:true richiede fileField (id del field filePicker).');
    }
  }

  if (d.primaryAction) {
    validateAction(d.primaryAction, 'primaryAction', push);
  }
}

function validateFlow(d: SduiDescriptor, push: (s: SduiIssue['severity'], p: string, m: string) => void): void {
  if (d.steps.length === 0) {
    push('error', 'steps', 'Un flow richiede almeno uno step.');
    return;
  }
  const ids = new Set(d.steps.map(s => s.id).filter(Boolean));
  d.steps.forEach((step, i) => validateFlowStep(step, i, ids, push));
}

function validateFlowStep(
  step: SduiFlowStep,
  index: number,
  allStepIds: Set<string>,
  push: (s: SduiIssue['severity'], p: string, m: string) => void,
): void {
  const path = `steps[${index}]`;
  if (!step.id?.trim()) push('error', path, 'id obbligatorio (usato come target di "next").');
  if (!step.titleKey?.trim()) push('error', path, 'titleKey obbligatorio.');

  if (step.isLastStep) {
    if (!step.onSubmit) {
      push('error', path, 'Ultimo step senza onSubmit: il tasto "Avanti" non farà nulla.');
    } else {
      const os = step.onSubmit;
      if (os.sequence && os.sequence.length > 0) {
        os.sequence.forEach((call, ci) => validateSequenceCall(call, `${path}.onSubmit.sequence[${ci}]`, push));
      } else {
        if (!os.method) push('error', `${path}.onSubmit`, 'method obbligatorio (oppure usa "sequence" per una catena di chiamate).');
        if (!os.endpoint) push('error', `${path}.onSubmit`, 'endpoint obbligatorio (oppure usa "sequence" per una catena di chiamate).');
      }

      const concl = os.onSuccess.conclusion;
      if (concl) {
        if (!concl.titleKey?.trim()) push('error', `${path}.onSubmit.onSuccess.conclusion`, 'titleKey obbligatorio.');
        if (concl.payAction && !concl.payAction.url?.trim()) {
          push('error', `${path}.onSubmit.onSuccess.conclusion.payAction`, 'url obbligatorio quando payAction è presente.');
        }
        if (concl.downloadAction) {
          if (!concl.downloadAction.endpoint?.trim()) push('error', `${path}.onSubmit.onSuccess.conclusion.downloadAction`, 'endpoint obbligatorio.');
          if (!concl.downloadAction.fileName?.trim()) push('error', `${path}.onSubmit.onSuccess.conclusion.downloadAction`, 'fileName obbligatorio.');
        }
        if (concl.cancelAction) {
          const ca = concl.cancelAction;
          if (!ca.endpoint?.trim()) push('error', `${path}.onSubmit.onSuccess.conclusion.cancelAction`, 'endpoint obbligatorio.');
          if (!ca.confirmTitleKey?.trim()) push('error', `${path}.onSubmit.onSuccess.conclusion.cancelAction`, 'confirmTitleKey obbligatorio.');
          if (!ca.confirmMessageKey?.trim()) push('error', `${path}.onSubmit.onSuccess.conclusion.cancelAction`, 'confirmMessageKey obbligatorio.');
          for (const key of Object.keys(ca.bodyMapping ?? {})) {
            const val = ca.bodyMapping[key];
            if (val?.includes('@.userId')) {
              push('warning', `${path}.onSubmit.onSuccess.conclusion.cancelAction.bodyMapping.${key}`, '"@.userId" non è supportato: risolve silenziosamente a null. Nel motore SDUI il prefisso "@." supporta solo "@.patientId".');
            }
          }
        }
      }
    }
  } else if (!step.next?.trim()) {
    push('error', path, 'Step intermedio senza "next": il tasto "Avanti" non farà nulla silenziosamente.');
  } else if (!allStepIds.has(step.next)) {
    push('error', path, `next="${step.next}" non corrisponde a nessuno step id esistente.`);
  }

  if (step.dataSource && !step.dataSource.endpoint?.trim()) {
    push('error', `${path}.dataSource`, 'endpoint obbligatorio quando dataSource è presente.');
  }
  step.prefetchSequence.forEach((call, ci) => validateSequenceCall(call, `${path}.prefetchSequence[${ci}]`, push));

  for (const fieldId of step.canProceed) {
    const exists = step.fields.some(f => f.id === fieldId);
    if (!exists) push('warning', path, `canProceed referenzia "${fieldId}" ma non esiste un field con quell'id in questo step.`);
  }

  const seenFieldIds = new Set<string>();
  step.fields.forEach((f, i) => validateField(f, `${path}.fields[${i}]`, seenFieldIds, push, false));
}

function validateSequenceCall(
  call: { method?: string; endpoint?: string; captureOptions?: { stateKey?: string; valueTemplate?: string } | null },
  path: string,
  push: (s: SduiIssue['severity'], p: string, m: string) => void,
): void {
  if (!call.method) push('error', path, 'method obbligatorio.');
  if (!call.endpoint?.trim()) push('error', path, 'endpoint obbligatorio.');
  if (call.captureOptions) {
    if (!call.captureOptions.stateKey?.trim()) push('error', `${path}.captureOptions`, 'stateKey obbligatorio.');
    if (!call.captureOptions.valueTemplate?.trim()) push('error', `${path}.captureOptions`, 'valueTemplate obbligatorio.');
  }
}

function validateSection(
  s: SduiSection,
  path: string,
  seenIds: Set<string>,
  push: (sev: SduiIssue['severity'], p: string, m: string) => void,
  isScreen: boolean,
): void {
  if (!s.id?.trim()) push('error', path, 'id obbligatorio.');
  else if (seenIds.has(s.id)) push('warning', path, `id "${s.id}" duplicato tra le sections.`);
  else seenIds.add(s.id);

  switch (s.type) {
    case 'form': {
      const seenFieldIds = new Set<string>();
      (s.fields ?? []).forEach((f, i) => validateField(f, `${path}.fields[${i}]`, seenFieldIds, push, isScreen));
      break;
    }
    case 'list':
      if (!s.itemsPath) push('error', path, 'itemsPath obbligatorio.');
      if (!s.itemTemplate?.titleField) push('error', `${path}.itemTemplate`, 'titleField obbligatorio (cast diretto non-null, altrimenti crash).');
      if (!s.itemTemplate?.valueField) push('error', `${path}.itemTemplate`, 'valueField obbligatorio (cast diretto non-null, altrimenti crash).');
      break;
    case 'menu':
      (s.items ?? []).forEach((item, i) => {
        if (!item.labelKey) push('error', `${path}.items[${i}]`, 'labelKey obbligatorio.');
        if (item.icon && !SDUI_MENU_ICONS.includes(item.icon as typeof SDUI_MENU_ICONS[number])) {
          push('warning', `${path}.items[${i}]`, `icon "${item.icon}" non è nella whitelist chiusa di 12 valori: ricadrà silenziosamente su "arrow_forward".`);
        }
        validateAction(item.action, `${path}.items[${i}].action`, push);
      });
      break;
    case 'table':
      if (!s.itemsPath) push('error', path, 'itemsPath obbligatorio.');
      if (!s.columns?.length) push('warning', path, 'Nessuna colonna dichiarata.');
      validateRowDetail(s, path, push);
      break;
    case 'groupedTable':
      if (!s.groupsPath) push('error', path, 'groupsPath obbligatorio.');
      if (!s.groupLabelField) push('warning', path, 'groupLabelField non dichiarato: userà il default del motore "label" (ricade a stringa vuota se il campo non esiste sui gruppi).');
      if (!s.columns?.length) push('warning', path, 'Nessuna colonna dichiarata.');
      validateRowDetail(s, path, push);
      break;
    case 'cardList':
      if (!s.groupsPath) push('error', path, 'groupsPath obbligatorio.');
      if (!s.groupLabelField) push('warning', path, 'groupLabelField non dichiarato: userà il default del motore "label" (ricade a stringa vuota se il campo non esiste sui gruppi).');
      if (!s.card?.elements?.length && !s.card?.titleField) push('warning', `${path}.card`, 'titleField non dichiarato (formato legacy): la card non avrà alcun titolo visibile. Ignorato se usi il layout libero "card.elements".');
      validateRowDetail(s, path, push);
      break;
    case 'filterBar':
      if (!s.dateFilter?.fromField && !s.searchField) {
        push('warning', path, 'Né searchField né dateFilter dichiarati: la barra non avrà alcun controllo utile.');
      }
      break;
    case 'eventsSummary':
      if (!s.groupsPathSummary) push('error', path, 'groupsPath obbligatorio.');
      if (!s.summaryLabelKey && !s.titleKey) {
        push('warning', path, 'labelKey mancante: ricorda che deve contenere letteralmente "{n}" (e "{from}"/"{to}" se usati).');
      }
      break;
    case 'calendar':
      if (!s.itemsPath) push('error', path, 'itemsPath obbligatorio (cast diretto non-null, altrimenti crash).');
      if (!s.card?.elements?.length && !s.card?.titleField) push('warning', `${path}.card`, 'titleField non dichiarato (formato legacy): la card degli eventi non avrà alcun titolo visibile. Ignorato se usi il layout libero "card.elements".');
      validateRowDetail(s, path, push);
      break;
    default:
      break;
  }
}

function validateRowDetail(s: SduiSection, path: string, push: (sev: SduiIssue['severity'], p: string, m: string) => void): void {
  if (!s.rowDetail) return;
  if (!s.rowDetail.sections?.length) {
    push('error', `${path}.rowDetail`, 'sections obbligatorio: senza, il tap sulla riga non apre nulla (anche con detailEndpoint presente).');
  }
}

function validateField(
  f: SduiField,
  path: string,
  seenIds: Set<string>,
  push: (sev: SduiIssue['severity'], p: string, m: string) => void,
  isScreen: boolean,
): void {
  if (!f.id?.trim()) push('error', path, 'id obbligatorio (anche per staticText: causa crash a runtime se assente).');
  else if (seenIds.has(f.id)) push('warning', path, `id "${f.id}" duplicato tra i field.`);
  else seenIds.add(f.id);

  if (f.component !== 'row' && f.component !== 'column' && !f.labelKey?.trim()) {
    push('warning', path, 'labelKey mancante.');
  }

  if (f.validation?.pattern) {
    const p = f.validation.pattern;
    if (!p.startsWith('^') || !p.endsWith('$')) {
      push('warning', path, 'pattern senza ancore ^...$: il match è una substring-search, non valida l\'intero valore.');
    }
  }

  if (f.options) {
    if (f.options.source === 'remote' && f.component !== 'dropdown' && f.component !== 'radioCardList') {
      push('error', path, 'options.source="remote" è supportato solo per dropdown e radioCardList.');
    }
    if (f.options.source === 'remote' && !f.options.endpoint) {
      push('error', `${path}.options`, 'endpoint obbligatorio per options remote.');
    }
    if (f.options.source === 'remote' && !f.options.valueTemplate) {
      push('error', `${path}.options`, 'valueTemplate obbligatorio per options remote.');
    }
    if (f.options.source === 'fromState' && f.options.path?.startsWith('$.')) {
      push('warning', `${path}.options`, 'path non va prefissato con "$." (a differenza di bodyMapping): verrebbe cercata letteralmente la chiave "$".');
    }
    if (f.options.source === 'static' && f.options.values.length === 0) {
      push('warning', `${path}.options`, 'Nessun valore statico dichiarato.');
    }
  }

  if (f.visibleIf && f.validation?.required) {
    push('warning', path, 'Field condizionalmente nascosto (visibleIf) ma anche required: se nascosto e vuoto, blocca comunque submit/avanzamento senza un errore visibile riconducibile a un campo a schermo.');
  }

  if ((f.component === 'row' || f.component === 'column') && f.children) {
    f.children.forEach((child, i) => validateField(child, `${path}.children[${i}]`, seenIds, push, isScreen));
  }
}

function validateAction(a: { type: string; entity?: string; assetPath?: string; endpoint?: string; call?: { bodyMapping?: Record<string, string> }; confirmTitleKey?: string; confirmMessageKey?: string }, path: string, push: (sev: SduiIssue['severity'], p: string, m: string) => void): void {
  if (a.type === 'navigateSdui' && !a.entity && !a.assetPath) push('error', path, 'entity (o assetPath) obbligatorio per navigateSdui.');
  if (a.type === 'downloadFile' && !a.endpoint) push('error', path, 'endpoint obbligatorio per downloadFile.');
  if (a.type === 'confirmAndCall') {
    if (!a.confirmTitleKey || !a.confirmMessageKey) push('error', path, 'confirmTitleKey/confirmMessageKey obbligatori per confirmAndCall.');
    if (!a.call?.bodyMapping) return;
    for (const val of Object.values(a.call.bodyMapping)) {
      if (val.startsWith('@.')) push('error', `${path}.call.bodyMapping`, '"@." non è supportato in confirmAndCall.call.bodyMapping: verrebbe inviato come stringa letterale.');
    }
  }
  if (a.type === 'openExternal' || a.type === 'call') {
    push('warning', path, `Azione "${a.type}" è un placeholder non implementato: mostrerà solo uno snackbar generico.`);
  }
}
