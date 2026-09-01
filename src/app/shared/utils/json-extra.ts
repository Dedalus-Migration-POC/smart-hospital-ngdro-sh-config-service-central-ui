/**
 * Utility per preservare, negli editor grafici dei JSON di configurazione, gli
 * attributi non conosciuti/gestiti dalla UI. Senza questo, salvare dall'editor
 * grafico un JSON con campi extra (aggiunti manualmente o da versioni future)
 * causerebbe la perdita silenziosa di quei campi.
 */

/** Restituisce le proprietà di `obj` non presenti in `knownKeys`. */
export function extractExtra(
  obj: object | null | undefined,
  knownKeys: string[],
): Record<string, unknown> {
  const extra: Record<string, unknown> = {};
  if (!obj) return extra;
  for (const [key, value] of Object.entries(obj)) {
    if (!knownKeys.includes(key)) extra[key] = value;
  }
  return extra;
}

/**
 * Riordina le chiavi di `values` secondo `originalOrder` (l'ordine delle chiavi
 * nel JSON caricato inizialmente), lasciando in coda eventuali chiavi nuove non
 * presenti prima. Necessario perché unire `{ ...extra, ...knownFields }` mette
 * sempre gli attributi sconosciuti in testa, alterando l'ordine originale del JSON
 * (es. un attributo aggiunto in coda finirebbe in cima dopo il salvataggio).
 */
export function reorderKeys(
  values: Record<string, unknown>,
  originalOrder: string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of originalOrder) {
    if (key in values) result[key] = values[key];
  }
  for (const key of Object.keys(values)) {
    if (!(key in result)) result[key] = values[key];
  }
  return result;
}
