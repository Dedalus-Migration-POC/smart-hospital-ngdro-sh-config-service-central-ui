/**
 * Dev locale: le chiamate a /api sono relative e vengono inoltrate al backend
 * locale (http://localhost:8081) tramite il proxy di `ng serve` (proxy.local.json),
 * così browser e API sono same-origin: niente CORS, niente problemi di cookie
 * cross-site (il JWT httpOnly `sh_jwt` viaggia come su un dominio unico).
 */
export const environment = {
  production: false,
  apiBaseUrl: '/api',
} as const;
