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

Apre `http://localhost:4200/` con hot reload. Le chiamate API andranno a `http://localhost:8081/api`.

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
    ├── layout/
    │   └── admin-shell/           # sidenav + toolbar, parent delle route protette
    ├── features/
    │   ├── auth/pages/login-page/
    │   ├── home/pages/home-page/  # dashboard KPI + grafici (solo ADMIN)
    │   ├── customers/             # lista + dettaglio + create dialog
    │   │   ├── customers.routes.ts
    │   │   ├── models.ts
    │   │   ├── services/customers.ts
    │   │   ├── pages/{customers-page,customer-detail-page}/
    │   │   └── dialogs/customer-create-dialog/
    │   ├── installations/         # dettaglio /installations/:id + sezione embedded in CustomerDetail
    │   │   ├── installations.routes.ts
    │   │   ├── models.ts
    │   │   ├── services/installations.ts
    │   │   ├── pages/installation-detail-page/
    │   │   ├── components/customer-installations-section/
    │   │   └── dialogs/{installation-create,rotate-api-key,rotate-payload-master-key,show-payload-master-key}-dialog/
    │   └── tenants/               # configurazioni per tenant/canale/entity
    │       ├── models.ts
    │       ├── services/tenants.ts
    │       ├── components/
    │       │   ├── config-channel-section/     # editor JSON + history + resync
    │       │   ├── installation-tenants-section/
    │       │   └── smh-phone-preview/          # mockup telefono live
    │       └── dialogs/
    │           ├── smh-ui-render-editor-dialog/    # editor grafico home screen mobile
    │           ├── smh-spid-provider-editor-dialog/ # editor grafico provider SPID
    │           ├── smh-faq-editor-dialog/           # editor grafico FAQ
    │           ├── config-version-diff-dialog/
    │           └── _smh-editor-base.scss            # mixin SCSS condiviso dagli editor SMH
    └── shared/
        ├── components/svg-upload-field/ # campo upload SVG con anteprima
        └── dialogs/confirm-dialog/
```

## Funzionalità principali

### Dashboard admin

Visibile solo agli utenti ADMIN. Mostra:

- **5 KPI card**: clienti attivi, on-prem online, utenti attivi, azioni di oggi, tasso di successo
- **KPI on-prem online**: caricamento progressivo — per ogni installation attiva lancia un health check verso il backend gemello e aggiorna il contatore in tempo reale
- **Grafici Chart.js**: attività giornaliera (ultimi 30 giorni, line chart), stato clienti (doughnut), top 10 azioni per tipo (bar orizzontale)

### Gestione configurazioni

- Editor JSON con syntax validation, history delle versioni, rollback con confronto diff
- **Entity obbligatorie per canale mobile**: `smh_ui_render`, `smh_spid_provider`, `smh_faq`, `smh_link_service_config`, `smh_service_config` compaiono sempre nella barra entity (anche senza config salvata), con default strutturati invece di `{}`
- Sezione JSON collassata di default per le entity che hanno un editor grafico

### Editor grafici SMH (canale mobile)

| Entity | Cosa gestisce |
|--------|---------------|
| `smh_ui_render` | Home screen dell'app: app bar, banner, categorie + servizi (griglia 2 colonne), navigation bar |
| `smh_spid_provider` | Lista provider SPID (id, nome, icona SVG) con drag-and-drop |
| `smh_faq` | Domande frequenti (id, domanda, risposta) con drag-and-drop |

Caratteristiche comuni:
- Drag-and-drop per riordinare gli elementi
- Upload SVG con anteprima inline (decodifica sia raw SVG che base64)
- ID servizi con autocomplete filtrato (esclude ID già in uso per evitare duplicati)

### Preview mobile live

Visibile a destra dell'editor quando si modifica `smh_ui_render` sul canale mobile. Aggiorna in tempo reale mentre si edita il JSON. Mostra:
- App bar con logo (dimensione naturale) e barra di stato
- Banner header (se `show_card: true`)
- Griglia categorie/servizi con icone, badge link (🔗) e lucchetto (🔒) dove applicabile
- Navigation bar con icone

Il badge link compare solo se l'ID del servizio è presente in `smh_link_service_config`.

### Health check on-prem (solo ADMIN)

Nella lista installation del dettaglio customer: colonna **"Stato on-prem"** con:
- Spinner durante il controllo
- Pallino verde = on-prem raggiungibile (qualsiasi risposta HTTP)
- Pallino rosso = timeout o connection refused

I controlli partono in parallelo al caricamento della lista e si aggiornano progressivamente.

## Auth

- Login: `POST /api/auth/login` → `{token, expiresAt}` salvato in `localStorage` (`sh.cs.authToken`, `sh.cs.authTokenExpiresAt`).
- Identità: `GET /api/auth/me` chiamato dopo il login e dal route guard quando il token è in storage ma il signal è vuoto (caso refresh).
- Interceptor: attacca `Authorization: Bearer <token>` a tutte le chiamate verso `apiBaseUrl` eccetto `/auth/login`. Su `401` pulisce lo stato e redirige a `/login?returnUrl=...`.
- Guard: `authGuard` (functional `CanActivateFn`) protegge le route che richiedono utente loggato.

## Layout admin

- `AdminShell` è la shell per tutte le route protette: sidenav responsive (side su desktop, over su mobile) + toolbar con utente/ruolo/logout.
- Voci di navigazione in `AdminShell.navItems`: `icon`, `label`, `path` opzionale, `requiredRole` opzionale.

## Convenzioni

- Errori utente in **italiano**, log misti.
- Niente `any` se evitabile.
- Commit message in italiano, descrittivi.
- README e CLAUDE.md vanno aggiornati nello stesso commit che cambia script/setup/struttura.

## Contesto architetturale

Per il quadro completo (endpoint API, flussi push, channel statici, decisioni di stack, roadmap) vedi `CLAUDE.md` in questo repo.
