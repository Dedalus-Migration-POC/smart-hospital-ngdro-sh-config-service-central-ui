# sh-config-service-central-ui — Istruzioni per GitHub Copilot

Frontend Angular **admin** del configuratore centrale SmartHospital. GUI consumata dagli operatori interni Dedalus per gestire customer, installation on-prem, tenant, configurazioni applicative, utenti e audit log.

## Identità del modulo

Il backend (API) è il modulo gemello **`sh-config-service-central`** (Spring Boot). Questo repo è solo la GUI Angular SPA: niente logica di dominio, il client chiama solo l'API e renderizza.

| Modulo | Dove gira | Ruolo |
|---|---|---|
| **sh-config-service-central** *(backend)* | cloud, JAR Spring Boot | API REST con auth JWT, push verso istanze on-prem |
| **sh-config-service-central-ui** *(questo)* | bundle statico, nginx/CDN, same-origin col backend in prod | GUI admin |
| `sh-config-service` *(on-prem)* | on-prem cliente | NON consumato dal FE — il FE parla solo col central |

## Backend gemello (locale)

Path: `../backend/sh-config-service-central/`

- **Auth**: `POST /api/auth/login` → `{token, expiresAt}` JWT HS256
- **Identità corrente**: `GET /api/auth/me` → `{username, role}`
- **Token**: header `Authorization: Bearer <token>` su tutto, eccetto `/auth/login` e `/actuator/health`
- **Path API**: `/api/...` (context-path Spring)
- **Base URL dev**: `http://localhost:8081/api`
- **CORS dev**: `DevCorsConfig.java` profile-scoped a `dev`, permette `http://localhost:4200`

## Endpoint principali

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

## Stack

- **Angular 21.2**, Node 20.19+
- **Angular Material 21.2** — tema `azure-blue` M3, typography globale, animations abilitate
- **Standalone components**, routing, TypeScript strict, SCSS
- HTTP: `HttpClient` + `HttpInterceptor` per JWT da `localStorage`
- Auth guard, redirect a `/login` su 401
- State: **Signals** + service DI (no NgRx)
- Niente SSR/SSG — builder `@angular/build:application`
- Test: **Vitest**
- Lint: `ng add @angular/eslint` quando serve

## Struttura cartelle

```
src/app/
  core/<area>/          # servizi singleton, interceptor, guard (es. core/auth/)
  layout/               # AdminShell: sidenav + toolbar
  features/<feature>/   # pagine, componenti, servizi, modelli per dominio
    pages/
    components/
    services/
    models.ts
    dialogs/
    <feature>.routes.ts
  shared/               # componenti/pipe/directive riusabili tra feature
src/environments/       # environment.ts (prod) + environment.development.ts (dev)
```

## Convenzioni di codice

- **Naming file**: niente suffissi `.service.ts` / `.component.ts` (convenzione Angular 19+). Una classe per file, nome in kebab-case.
- **API client**: un service per dominio, tipi TS allineati ai DTO Java (records → interfaces). Niente `any`.
- **Errori HTTP**: shape `{error: string, timestamp, fieldErrors?}`. Usare `toUserMessage(err, fallback?)` da `core/http/api-error.ts` per estrarre il messaggio user-facing.
- **Auth storage**: token in `localStorage` con chiavi `sh.cs.authToken` / `sh.cs.authTokenExpiresAt`. Stato in `AuthService.currentUser` (signal).
- **Routing**: `/login` è route bare (no shell). Tutto il resto è child di `''` con `AdminShell` e `canActivate: [authGuard]`.
- **Sidenav**: `AdminShell.navItems` è la fonte di verità del menu. Item senza `path` → "prossimamente".
- **Messaggi utente**: `MatSnackBar` — errori 6000ms, conferme 3000–4000ms.
- **Nuova feature**: sottoalbero `features/<nome>/` + `<nome>.routes.ts` + `loadChildren` in `app.routes.ts` + path in `navItems`.
- **Componenti riusabili**: in `shared/` (es. `shared/dialogs/confirm-dialog/`).

## Sicurezza / segreti

- **API key** on-prem: cifrata a riposo, mai mostrata in chiaro. Badge "configurata" + bottone "Ruota" via dialog.
- **Payload master key**: esposta in chiaro dal backend su `GET /installations/{id}/payload-master-key`. Mostrare solo in dialog dedicato con bottone "Copia", nessuna persistenza inline.
- Quando il central genera una nuova master key: mostrarla **una sola volta** subito dopo l'operazione con bottone copia.

## Preferenze da rispettare

- **Niente "Co-Authored-By: Claude/Copilot"** nei commit.
- **README aggiornato** contestualmente ad ogni cambio di script/setup/struttura.
- Messaggi ed errori all'utente in **italiano**.
- Commit message in **italiano**, stile descrittivo.
- Niente commenti ridondanti nel codice: commentare solo ciò che necessita chiarimento.

## Git

```
remote: ssh://git@ci-git.dedalus.lan:1022/smart-hospital-ngdro/sh-config-service-central-ui.git
branch: main
```

## Credenziali dev (backend locale)

```
username: admin
password: DedalUs4$!
base URL: http://localhost:8081/api
```

DB locale: customer "asl-latina", installation "localdev" (→ on-prem `:8080`), tenant "healthcare", config pushata, utenti admin, audit log popolato.

## Roadmap (stato corrente)

- [x] Scaffold Angular 21 + Angular Material
- [x] Environment, auth (login, interceptor, guard, `/auth/me`)
- [x] AdminShell (sidenav + toolbar, nav items, filtraggio per ruolo)
- [x] Feature Customer (lista, create, detail, edit, soft delete)
- [x] Feature Installation (embedded in Customer + pagina `/installations/:id` con sicurezza, sync status, soft delete)
- [x] Feature Tenants → Configs (CRUD + push + rollback + resync)
- [x] Users + Audit log (ADMIN-only)
- [x] Editor grafico canale web (`base`): dialog 5 tab + anteprima live `WebPagePreview`
- [ ] Build produzione + Dockerfile + Jenkinsfile
