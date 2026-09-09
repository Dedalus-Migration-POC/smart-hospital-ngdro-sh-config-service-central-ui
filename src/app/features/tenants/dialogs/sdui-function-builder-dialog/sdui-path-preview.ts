/**
 * Risoluzione "anteprima path" per il wizard SDUI: dato un JSON di esempio incollato
 * dall'utente (risposta API di esempio, mai serializzato nell'output del wizard, vedi
 * `sampleResponseText` in sdui-function-builder-dialog.ts), prova a risolvere il valore
 * puntato da un path-like field (itemsPath/groupsPath/arrayPath) o l'esistenza di un
 * campo-chiave (matchField) sul primo item disponibile.
 *
 * Convenzioni di path supportate (§15 manuale SDUI_MANUAL.md):
 * - dot-path diretto (es. "notifications.consents"): usato da arrayPath/itemsPath.
 * - dot-path con prefisso "$." (es. "$.gruppi"): usato da groupsPath quando legge dallo
 *   stato del motore — qui il prefisso viene rimosso e il resto risolto allo stesso modo,
 *   trattando il JSON di esempio come approssimazione dello stato (valida se non c'è un
 *   responseTransform che lo trasforma ulteriormente prima di raggiungere lo stato).
 * Non gestisce "@.campo" (sessione utente, non risolvibile da una risposta di esempio) né i
 * placeholder "{campo}" degli endpoint (risolti runtime dal motore, non dal wizard).
 */

export interface PathPreviewResult {
  /** true se il path/campo è stato risolto con successo nel JSON di esempio. */
  readonly found: boolean;
  /** Valore risolto, presente solo se found === true. */
  readonly value?: unknown;
}

/** Risolve un dot-path (con eventuale prefisso "$." rimosso) contro un JSON di esempio,
 * scendendo automaticamente al primo elemento quando un segmento intermedio è un array
 * (stessa convenzione già usata per la UI di flattenNested — vedi findLeafFieldsAtPath). */
export function resolveSamplePath(sample: unknown, rawPath: string | undefined | null): PathPreviewResult {
  const path = (rawPath ?? '').trim();
  if (!path) return { found: false };
  const cleaned = path.startsWith('$.') ? path.slice(2) : path;
  if (!cleaned) return { found: false };
  let cur: unknown = sample;
  for (const seg of cleaned.split('.')) {
    if (!seg) continue;
    if (Array.isArray(cur)) cur = cur.length > 0 ? cur[0] : undefined;
    if (cur && typeof cur === 'object' && seg in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[seg];
    } else {
      return { found: false };
    }
  }
  return { found: true, value: cur };
}

/** Cerca un campo-chiave (non un path, es. matchField) nel primo item disponibile: se il
 * sample è già un array lo usa direttamente, altrimenti cerca il primo array di oggetti a
 * livello superiore, altrimenti tratta il sample stesso come item singolo. */
export function resolveSampleFieldKey(sample: unknown, key: string | undefined | null): PathPreviewResult {
  const k = (key ?? '').trim();
  if (!k || !sample || typeof sample !== 'object') return { found: false };
  let item: unknown = sample;
  if (Array.isArray(sample)) {
    item = sample.length > 0 ? sample[0] : undefined;
  } else {
    const firstArray = Object.values(sample as Record<string, unknown>)
      .find((v): v is unknown[] => Array.isArray(v) && v.length > 0 && typeof v[0] === 'object');
    if (firstArray) item = firstArray[0];
  }
  if (item && typeof item === 'object' && k in (item as Record<string, unknown>)) {
    return { found: true, value: (item as Record<string, unknown>)[k] };
  }
  return { found: false };
}

/** Formatta il valore risolto in una stringa breve leggibile per l'anteprima UI. */
export function formatPathPreviewValue(value: unknown): string {
  if (value === undefined) return '';
  if (value === null) return 'null';
  if (Array.isArray(value)) {
    return `array (${value.length} element${value.length === 1 ? 'o' : 'i'})`;
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>);
    return `{${keys.slice(0, 6).join(', ')}${keys.length > 6 ? ', …' : ''}}`;
  }
  const s = JSON.stringify(value);
  return s.length > 80 ? `${s.slice(0, 77)}...` : s;
}
