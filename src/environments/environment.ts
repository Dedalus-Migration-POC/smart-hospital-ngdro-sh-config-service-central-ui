/**
 * Environment di default = produzione.
 * In prod il bundle è servito dietro lo stesso reverse proxy del backend,
 * quindi same-origin: chiamiamo /api/... in modo relativo.
 *
 * In dev il file viene sostituito da environment.development.ts via
 * fileReplacements (vedi angular.json), che punta esplicitamente al
 * backend locale su http://localhost:8081/api.
 */
export const environment = {
  production: true,
  apiBaseUrl: '/api',
} as const;
