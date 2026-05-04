# sh-config-service-central-ui

Frontend Angular **admin** del configuratore centrale SmartHospital. SPA consumata dagli operatori interni Dedalus per gestire customer, installation on-prem, tenant, configurazioni applicative, utenti e audit log. Parla solo con il backend gemello `sh-config-service-central` (Spring Boot, JWT, REST).

## Stack

- Angular 21.2 (standalone components, signals, routing)
- Angular Material 21.2 (tema azure-blue M3, typography globale, animations)
- TypeScript strict, SCSS
- Vitest per i test unitari
- Builder `@angular/build:application` (no SSR)

## Prerequisiti

- Node **20.19+** e npm 10+
- Backend `sh-config-service-central` in esecuzione su `http://localhost:8081` (vedi il README del repo gemello). In profilo `dev` ha già il CORS attivo per `http://localhost:4200`.

## Installazione

```bash
npm install
```

## Avvio dev server

```bash
npm start
```

Apre `http://localhost:4200/` con hot reload. Le chiamate API andranno a `http://localhost:8081/api` (vedi `src/environments/environment.ts` quando verrà creato).

Credenziali admin di default sul backend locale:

```
username: admin
password: DedalUs4$!
```

## Build di produzione

```bash
npm run build
```

Output in `dist/sh-config-service-central-ui/`. In prod il bundle viene servito da nginx/CDN dietro lo stesso reverse proxy del backend, quindi same-origin (niente CORS).

## Test

```bash
npm test
```

Vitest esegue i `*.spec.ts` nel sorgente.

## Struttura cartelle

```
src/
├── environments/
│   ├── environment.ts             # prod (apiBaseUrl: '/api')
│   └── environment.development.ts # dev  (apiBaseUrl: 'http://localhost:8081/api')
└── app/
    ├── core/
    │   └── auth/                  # AuthService (signal), interceptor JWT, guard
    ├── features/
    │   ├── auth/pages/login-page/ # form Material
    │   └── home/pages/home-page/  # placeholder protetto
    └── shared/                    # (vuoto, per ora)
```

Le feature di dominio future (customers, installations, tenants, configs, users, audit) seguiranno `pages/`, `components/`, `services/`, `models/`. Tipi TS allineati ai DTO Java del backend (records → interfaces).

## Auth

- Login: `POST /api/auth/login` → `{token, expiresAt}` salvato in `localStorage` (`sh.cs.authToken`, `sh.cs.authTokenExpiresAt`).
- Identità: `GET /api/auth/me` chiamato dopo il login e dal route guard quando il token è in storage ma il signal è vuoto (caso refresh).
- Interceptor: attacca `Authorization: Bearer <token>` a tutte le chiamate verso `apiBaseUrl` eccetto `/auth/login`. Su `401` pulisce lo stato e redirige a `/login?returnUrl=...`.
- Guard: `authGuard` (functional `CanActivateFn`) protegge le route che richiedono utente loggato.
- Logout: bottone in `HomePage` → `AuthService.logout()` → clear + redirect.

## Convenzioni

- Errori utente in **italiano**, log misti.
- Niente `any` se evitabile.
- Commit message in italiano, descrittivi (vedi `git log` del backend per esempi).
- README e CLAUDE.md vanno aggiornati nello stesso commit che cambia script/setup/struttura, mai in commit separato.

## Contesto architetturale

Per il quadro completo (endpoint API, flussi push, channel statici, decisioni di stack, roadmap) vedi `CLAUDE.md` in questo repo.
