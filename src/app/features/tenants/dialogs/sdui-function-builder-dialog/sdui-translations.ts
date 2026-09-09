/**
 * Estrae ricorsivamente tutte le chiavi di traduzione (`*Key`, incluso `errorKeys.*`)
 * da un descrittore SDUI già serializzato in plain object — usato per la checklist
 * traduzioni (§13 del manuale: ogni *Key deve esistere in smh_it/smh_en/smh_es).
 */
export function collectTranslationKeys(node: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(node)) {
    for (const item of node) collectTranslationKeys(item, out);
    return out;
  }
  if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (typeof value === 'string' && /Key$/.test(key) && value.trim()) {
        out.add(value);
      } else if (typeof value === 'object') {
        collectTranslationKeys(value, out);
      }
    }
  }
  return out;
}

/** Legge un valore da una mappa di traduzioni annidata (namespace puntato "Screen.title"). */
export function hasTranslation(translations: Record<string, unknown> | null, key: string): boolean {
  if (!translations) return false;
  const parts = key.split('.');
  let cur: unknown = translations;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return false;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === 'string' && cur.trim().length > 0;
}
