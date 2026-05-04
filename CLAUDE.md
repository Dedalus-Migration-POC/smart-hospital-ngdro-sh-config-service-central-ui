# sh-config-service-central-ui — Contesto progetto

Frontend Angular **admin** del configuratore centrale SmartHospital. GUI consumata dagli operatori interni Dedalus per gestire customer, installation on-prem, tenant, configurazioni applicative, utenti e audit log.

> Questo file è caricato automaticamente da Claude Code: contiene il contesto architetturale che NON va perso fra sessioni.

## Identità del modulo

Il backend (API) è il modulo gemello **`sh-config-service-central`** (Spring Boot, già scritto e funzionante). Questo repo è solo la GUI Angular SPA. Niente logica di dominio: il client chiama solo l'API e renderizza.

| Modulo | Dove gira | Ruolo |
|---|---|---|
| **sh-config-service-central** *(backend)* | cloud, JAR Spring Boot | API REST con auth JWT, push verso istanze on-prem |
| **sh-config-service-central-ui** *(questo)* | bundle statico, servito da nginx/CDN dietro lo stesso reverse proxy del backend in prod | GUI admin |
| `sh-config-service` *(on-prem)* | on-prem cliente | NON consumato dal FE — il FE parla solo col central |

## Repo backend gemello (locale)

`../backend/sh-config-service-central/` — leggi `CLAUDE.md` e `README.md` lì per il contratto API completo. In particolare:

- **Auth**: `POST /api/auth/login` → `{token, expiresAt}` JWT HS256
- **Identità corrente**: `GET /api/auth/me` → `{username, role}`
- **Token**: header `Authorization: Bearer <token>` su tutto, eccetto `/auth/login` e `/actuator/health`
- **Path API**: `/api/...` (context-path Spring)
- **Base URL dev**: `http://localhost:8081/api`
- **CORS dev**: già configurato lato backend (`security/DevCorsConfig.java`, attivo solo con profilo `dev`) per consentire `http://localhost:4200`. In prod il bean non viene caricato e FE+BE sono same-origin dietro lo stesso reverse proxy.

## Endpoint principali (per orientarsi)

```
/auth/login                                         # POST credenziali → JWT
/auth/me                                            # GET identità corrente

/users                                              # CRUD utenti admin (ADMIN-only su alcune azioni)
/users/{id}/password                                # PUT cambio password (self/admin-reset)

/customers                                          # CRUD clienti
/customers/{id}/installations                       # CRUD installation per customer
/installations/{id}                                 # GET/PUT/DELETE installation
/installations/{id}/api-key                         # PUT rotazione API key on-prem
/installations/{id}/payload-master-key              # GET (in chiaro!) + PUT rotazione

/installations/{id}/tenants                         # CRUD tenant per installation
/tenants/{id}                                       # GET/PUT/DELETE tenant

/tenants/{id}/configs/{channelId}                   # PUT (salva+pusha), GET (?source=remote|local)
/tenants/{id}/configs/{channelId}/history           # GET (?source=local|remote)
/tenants/{id}/configs/{channelId}/rollback/{version}# POST rollback + push
/tenants/{id}/configs/{channelId}/resync            # POST recovery dopo DRAFT

/audit                                              # GET solo ADMIN, paginato + filtri
```

Stato push delle config: `SYNCED` (push riuscito, contiene `remoteVersion`) o `DRAFT` (push fallito, `syncError` testuale).

Channel statici: `mobile`, `web`, `totem`. Default `entity = "base"`.

## Credenziali dev

Backend in localhost, JWT login con:

```
username: admin
password: DedalUs4$!
```

(default da `application.yml` del backend, allineato anche al DB locale).

## Stack effettivo

- **Angular 21.2** (latest stabile al momento dello scaffold), Node 20.19+
- **Angular Material 21.2** (tema `azure-blue` M3, typography globale, animations abilitate) — scelto come libreria UI: ufficiale Google, copre tutti i componenti admin (table, form, dialog, sidenav, snackbar) senza CSS custom.
- **Standalone components** (default in 21), routing, TypeScript strict, SCSS
- HTTP: `HttpClient` + `HttpInterceptor` per attaccare il JWT da `localStorage`
- Auth guard sui path autenticati, redirect a `/login` su 401
- State: **Signals** + service DI (no NgRx)
- Niente SSR/SSG (admin SPA, builder `@angular/build:application`)
- Test: **Vitest** (default Angular 21, sostituisce Karma/Jasmine)
- Lint: nessuno setup-pacchetto installato per ora (`ng add @angular/eslint` quando serve)

### Decisioni chiuse durante lo scaffold (2026-05-04)

1. **Component library = Angular Material** — l'utente ha esplicitamente delegato la scelta perché non conosce il FE; scelta conservativa standard. Non c'è una convenzione Dedalus nota condivisa con altri FE: in caso emergesse, valutare migrazione.
2. **Versione Angular = latest (21.2)** — nessun vincolo di compatibilità, progetto greenfield.
3. **CORS dev** — fatto nel commit `26f7fd5` del backend (`DevCorsConfig` profile-scoped a `dev`).
4. **Scaffold** — eseguito con `npx @angular/cli@latest new sh-app --routing --style=scss --strict --skip-git --skip-install --ssr=false --package-manager=npm --defaults` in `/tmp` e poi spostato qui (perché la dir aveva già `.git` e `CLAUDE.md`). Il flag `--directory=.` non esiste più in Angular 21.

## Convenzioni

- Stessa convenzione del backend: italiano nei messaggi/errori utente, log misti, niente di shouty.
- Struttura cartelle:
  - `src/app/core/<area>/` per servizi singleton, interceptor, guard (es. `core/auth/`).
  - `src/app/layout/` per la shell admin (sidenav + toolbar) e altri layout di pagina condivisi.
  - `src/app/features/<feature>/{pages,components,services,models}` per ogni dominio (customers, installations, tenants, configs, users, audit).
  - `src/app/shared/` per componenti/pipe/directive riusabili (vuota finché non serve).
  - `src/environments/` per `environment.ts` (prod default) + `environment.development.ts` (sostituito via fileReplacements).
- Naming dei file: niente più suffissi `.service.ts` / `.component.ts` (convenzione Angular 19+, vedi scaffold). Una classe per file, nome file = nome classe in kebab-case.
- API client: un service per dominio, tipi TS allineati ai DTO Java (records → interfaces).
- Niente `any` se evitabile.
- Errori uniformi dal backend: shape `{error: string, timestamp, fieldErrors?}` (vedi `core/auth/models.ts → ApiError`).
- Auth: token + expiresAt in `localStorage` (chiavi `sh.cs.authToken` / `sh.cs.authTokenExpiresAt`). Stato corrente in `AuthService.currentUser` (signal). Su 401 di chiamate autenticate l'interceptor pulisce e ridireziona a `/login` con `returnUrl`.
- Routing: `/login` è una route bare (no shell). Tutto il resto è child di una route `''` che monta `AdminShell` con `canActivate: [authGuard]`. Le nuove sezioni vanno aggiunte come children di quella, in modo che ereditino sidenav e toolbar.
- Sidenav: `AdminShell.navItems` è la fonte di verità per il menu di sinistra. Item con `path` cliccabili, item senza `path` mostrati come "prossimamente". Aggiungere il `path` (e creare la route relativa) man mano che le sezioni vengono implementate.

## Preferenze utente da rispettare anche qui

- **Niente "Co-Authored-By: Claude"** nei commit.
- **README sempre aggiornato** quando cambiano script/setup/struttura, in commit contestuale (non separato).
- Errori esposti all'utente in **italiano**.
- Commit message in italiano, stile descrittivo (vedi `git log` del backend per esempi).

## Setup git

Repo già inizializzato in questa cartella:
```
git remote -v
# origin  ssh://git@ci-git.dedalus.lan:1022/smart-hospital-ngdro/sh-config-service-central-ui.git
```

Branch default: `main`. Niente push iniziale finché non c'è uno scaffold pulito da committare.

## Roadmap

- [x] Scaffold Angular 21 + Angular Material
- [x] CORS lato backend per dev (commit `26f7fd5` su `sh-config-service-central`)
- [x] `environment.ts` con `apiBaseUrl` (`/api` in prod, `http://localhost:8081/api` in dev via fileReplacements)
- [x] Modulo auth: login page Material, JWT interceptor, auth guard, `/auth/me` post-login + idratazione su refresh
- [x] Layout admin (`AdminShell`: sidenav responsive + toolbar con utente/ruolo/logout, nav items con placeholder per le sezioni future, filtraggio per ruolo)
- [ ] Feature per dominio (customers → installations → tenants → configs)
- [ ] Users + Audit log (ADMIN-only routes)
- [ ] Build di produzione + Dockerfile + Jenkinsfile (`buildNode` se shared lib disponibile)

## Test del backend

Il backend gira già in localhost:

```bash
curl -s http://localhost:8081/api/actuator/health  # 401 se richiede auth, 200 se aperto
```

Login per ottenere il token:
```bash
curl -s -X POST http://localhost:8081/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"DedalUs4$!"}'
```

Su DB locale ci sono già dati di test (1 customer "asl-latina", 1 installation "localdev" che punta all'on-prem `:8080`, 1 tenant "healthcare", config attiva pushata, alcuni utenti admin, audit log popolato).
