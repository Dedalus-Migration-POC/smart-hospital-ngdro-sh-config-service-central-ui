import { DatePipe, UpperCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { of } from 'rxjs';
import { catchError, startWith } from 'rxjs/operators';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AuthService } from '../../../../core/auth/auth';
import { toUserMessage } from '../../../../core/http/api-error';
import {
  ConfirmDialog,
  ConfirmDialogData,
} from '../../../../shared/dialogs/confirm-dialog/confirm-dialog';
import {
  ConfigVersionDiffDialog,
  ConfigVersionDiffDialogData,
} from '../../dialogs/config-version-diff-dialog/config-version-diff-dialog';
import { SmhPhonePreview } from '../smh-phone-preview/smh-phone-preview';
import {
  WebAppConfigEditorDialog,
  WebAppConfigEditorDialogData,
  WebAppConfigJson,
} from '../../dialogs/web-app-config-editor-dialog/web-app-config-editor-dialog';
import {
  SmhFaqEditorDialog,
  SmhFaqEditorDialogData,
  SmhFaqJson,
} from '../../dialogs/smh-faq-editor-dialog/smh-faq-editor-dialog';
import {
  SmhMinAppVersionEditorDialog,
  SmhMinAppVersionEditorDialogData,
  SmhMinAppVersionJson,
} from '../../dialogs/smh-min-app-version-editor-dialog/smh-min-app-version-editor-dialog';
import {
  SmhNewsEditorDialog,
  SmhNewsEditorDialogData,
  SmhNewsJson,
} from '../../dialogs/smh-news-editor-dialog/smh-news-editor-dialog';
import {
  ServiceItem,
  SmhServiceConfigEditorDialog,
  SmhServiceConfigEditorDialogData,
  SmhServiceConfigJson,
} from '../../dialogs/smh-service-config-editor-dialog/smh-service-config-editor-dialog';
import {
  SmhSpidProviderEditorDialog,
  SmhSpidProviderEditorDialogData,
  SmhSpidProviderJson,
} from '../../dialogs/smh-spid-provider-editor-dialog/smh-spid-provider-editor-dialog';
import {
  SmhThemeDataEditorDialog,
  SmhThemeDataEditorDialogData,
  SmhThemeDataJson,
} from '../../dialogs/smh-theme-data-editor-dialog/smh-theme-data-editor-dialog';
import {
  SmhTutorialEditorDialog,
  SmhTutorialEditorDialogData,
  SmhTutorialJson,
} from '../../dialogs/smh-tutorial-editor-dialog/smh-tutorial-editor-dialog';
import {
  SmhUiRenderEditorDialog,
  SmhUiRenderEditorDialogData,
  SmhUiRenderJson,
} from '../../dialogs/smh-ui-render-editor-dialog/smh-ui-render-editor-dialog';
import { AppConfigVersion, ChannelId, EntityInfo, PushPackage } from '../../models';
import { TenantService } from '../../services/tenants';

interface JsonError {
  message: string;
  line: number | null;
  col: number | null;
}

function jsonValidator(): ValidatorFn {
  return (control: AbstractControl) => {
    const v = control.value as string;
    if (!v?.trim()) return null;
    try {
      JSON.parse(v);
      return null;
    } catch (e) {
      const msg = (e as SyntaxError).message;
      let line: number | null = null;
      let col: number | null = null;
      const posMatch = msg.match(/at position (\d+)/);
      if (posMatch) {
        const pos = parseInt(posMatch[1], 10);
        const before = v.substring(0, pos);
        const lines = before.split('\n');
        line = lines.length;
        col = lines[lines.length - 1].length + 1;
      }
      return { invalidJson: { message: msg, line, col } as JsonError };
    }
  };
}

const ENTITY_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

function extractServiceIds(config: unknown): string[] {
  const pickIds = (arr: unknown[]): string[] =>
    arr.flatMap((item) =>
      item && typeof item === 'object' && 'id' in item && typeof (item as Record<string, unknown>)['id'] === 'string'
        ? [(item as Record<string, unknown>)['id'] as string]
        : [],
    );
  if (Array.isArray(config)) return pickIds(config);
  if (config && typeof config === 'object') {
    for (const val of Object.values(config as Record<string, unknown>)) {
      if (Array.isArray(val)) {
        const ids = pickIds(val);
        if (ids.length > 0) return ids;
      }
    }
  }
  return [];
}

@Component({
  selector: 'app-config-channel-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    UpperCasePipe,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatExpansionModule,
    MatSelectModule,
    MatTooltipModule,
    TranslatePipe,
    SmhPhonePreview,
  ],
  templateUrl: './config-channel-section.html',
  styleUrl: './config-channel-section.scss',
})
export class ConfigChannelSection {
  readonly tenantId = input.required<string>();
  readonly channelId = input.required<ChannelId>();

  private readonly tenantService = inject(TenantService);
  private readonly auth = inject(AuthService);
  private readonly snackbar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly translate = inject(TranslateService);

  // Entity selection — resets to 'base' whenever tenantId or channelId changes
  readonly entity = linkedSignal({
    source: () => `${this.tenantId()}::${this.channelId()}`,
    computation: () => 'base',
  });
  readonly entities = signal<string[]>(['base']);
  readonly addingEntity = signal(false);
  readonly newEntityControl = new FormControl('', [
    Validators.required,
    Validators.pattern(ENTITY_PATTERN),
  ]);

  readonly initialized = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly resyncing = signal(false);
  readonly historyLoading = signal(false);
  readonly rollingBack = signal<number | null>(null);
  readonly disabledEntities = signal<Set<string>>(new Set());
  readonly disablingEntity = signal(false);
  readonly enablingEntity = signal(false);

  readonly activeVersion = signal<AppConfigVersion | null>(null);
  readonly history = signal<AppConfigVersion[]>([]);
  readonly errorMessage = signal<string | null>(null);

  readonly configControl = new FormControl('', [Validators.required, jsonValidator()]);

  readonly isUnauthorizedSync = computed(() => {
    const v = this.activeVersion();
    return v?.syncStatus === 'DRAFT' && (v.syncError?.includes('401') ?? false);
  });

  constructor() {
    // Load entity list when tenant/channel changes
    effect(() => {
      const tenantId = this.tenantId();
      const channelId = this.channelId();
      this.entities.set(['base']);
      this.initialized.set(false);
      this.translationsCache.set(new Map());
      this.loadEntities(tenantId, channelId);
    });

    // Load config whenever tenant, channel, or entity changes
    effect(() => {
      const tenantId = this.tenantId();
      const channelId = this.channelId();
      const entity = this.entity();
      this.loadConfig(tenantId, channelId, entity);
    });

    // Fetch translation on-demand when previewLang changes (if not already cached)
    effect(() => {
      const lang = this.previewLang();
      const tenantId = this.tenantId();
      if (this.channelId() !== 'mobile') return;
      const entity = `smh_${lang}`;
      if (this.translationsCache().has(entity)) return;
      this.tenantService.getConfig(tenantId, 'mobile', 'local', entity)
        .pipe(catchError(() => of(null)))
        .subscribe((cfg) => {
          if (cfg) {
            this.translationsCache.update(m => new Map(m).set(entity, cfg.configJson as Record<string, unknown>));
          }
        });
    });
  }

  private loadEntities(tenantId: string, channelId: string): void {
    this.tenantService.getEntities(tenantId, channelId).subscribe({
      next: (list: EntityInfo[]) => {
        // Update disabled entities set
        this.disabledEntities.set(new Set(list.filter((e) => !e.enabled).map((e) => e.entity)));
        // Merge entity names
        const merged = new Set([...this.entities(), ...list.map((e) => e.entity)]);
        merged.add('base');
        if (channelId === 'mobile') {
          ConfigChannelSection.MOBILE_MANDATORY_ENTITIES.forEach((e) => merged.add(e));
          merged.add(ConfigChannelSection.translationEntity());
        }
        const sorted = [...merged].sort((a, b) => {
          if (a === 'base') return -1;
          if (b === 'base') return 1;
          return a.localeCompare(b);
        });
        this.entities.set(sorted);
        if (channelId === 'mobile') {
          this.prefetchMobilePreviewCaches(tenantId);
        }
      },
      error: () => {
        const base = new Set<string>(['base']);
        if (channelId === 'mobile') {
          ConfigChannelSection.MOBILE_MANDATORY_ENTITIES.forEach((e) => base.add(e));
          base.add(ConfigChannelSection.translationEntity());
        }
        this.entities.update((list) => {
          const merged = new Set([...list, ...base]);
          return [...merged].sort((a, b) => (a === 'base' ? -1 : b === 'base' ? 1 : a.localeCompare(b)));
        });
        if (channelId === 'mobile') {
          this.prefetchMobilePreviewCaches(tenantId);
        }
      },
    });
  }

  private prefetchMobilePreviewCaches(tenantId: string): void {
    this.tenantService.getConfig(tenantId, 'mobile', 'local', 'smh_ui_render')
      .pipe(catchError(() => of(null)))
      .subscribe((cfg) => {
        if (cfg) this.cachedUiRenderJson.set(cfg.configJson as SmhUiRenderJson);
      });
    this.tenantService.getConfig(tenantId, 'mobile', 'local', 'smh_theme_data')
      .pipe(catchError(() => of(null)))
      .subscribe((cfg) => {
        if (cfg) this.cachedThemeDataJson.set(cfg.configJson as SmhThemeDataJson);
      });
    this.tenantService.getConfig(tenantId, 'mobile', 'local', 'smh_service_config')
      .pipe(catchError(() => of(null)))
      .subscribe((cfg) => {
        if (cfg) {
          const raw = cfg.configJson;
          const parsed: SmhServiceConfigJson = Array.isArray(raw)
            ? { services: raw as SmhServiceConfigJson['services'] }
            : (raw as SmhServiceConfigJson) ?? { services: [] };
          this.cachedServiceConfigJson.set(parsed);
        }
      });
    const translationEntity = ConfigChannelSection.translationEntity();
    const fallbackToIt$ = this.tenantService.getConfig(tenantId, 'mobile', 'local', 'smh_it').pipe(catchError(() => of(null)));
    const fallbackToEn$ = translationEntity !== 'smh_en'
      ? this.tenantService.getConfig(tenantId, 'mobile', 'local', 'smh_en').pipe(catchError(() => fallbackToIt$))
      : fallbackToIt$;
    this.tenantService.getConfig(tenantId, 'mobile', 'local', translationEntity)
      .pipe(catchError(() => fallbackToEn$))
      .subscribe((cfg) => {
        if (cfg) {
          this.translationsCache.update(m => new Map(m).set(translationEntity, cfg.configJson as Record<string, unknown>));
        }
      });
  }

  selectEntity(e: string): void {
    if (this.entity() === e) return;
    this.cancelAddEntity();
    this.entity.set(e);
  }

  startAddEntity(): void {
    this.newEntityControl.reset('');
    this.addingEntity.set(true);
  }

  cancelAddEntity(): void {
    this.addingEntity.set(false);
    this.newEntityControl.reset('');
  }

  confirmAddEntity(): void {
    this.newEntityControl.markAsTouched();
    if (this.newEntityControl.invalid) return;
    const name = (this.newEntityControl.value ?? '').trim();
    if (!this.entities().includes(name)) {
      this.entities.update((list) => {
        const updated = [...list, name];
        updated.sort((a, b) => {
          if (a === 'base') return -1;
          if (b === 'base') return 1;
          return a.localeCompare(b);
        });
        return updated;
      });
    }
    this.entity.set(name);
    this.cancelAddEntity();
  }

  private loadConfig(tenantId: string, channelId: string, entity: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.activeVersion.set(null);
    this.history.set([]);
    this.tenantService.getConfig(tenantId, channelId, 'local', entity).subscribe({
      next: (active) => {
        const pretty = active.configJson != null
          ? JSON.stringify(active.configJson, null, 2)
          : '';
        this.configControl.reset(pretty);
        if (channelId === 'mobile' && entity === 'smh_ui_render') {
          this.cachedUiRenderJson.set(active.configJson as SmhUiRenderJson);
        }
        if (channelId === 'mobile' && entity === 'smh_theme_data') {
          this.cachedThemeDataJson.set(active.configJson as SmhThemeDataJson);
        }
        if (channelId === 'mobile' && entity === 'smh_service_config') {
          const raw = active.configJson;
          const parsed: SmhServiceConfigJson = Array.isArray(raw)
            ? { services: raw as SmhServiceConfigJson['services'] }
            : (raw as SmhServiceConfigJson) ?? { services: [] };
          this.cachedServiceConfigJson.set(parsed);
        }
        if (channelId === 'mobile' && entity === ConfigChannelSection.translationEntity()) {
          this.translationsCache.update(m => new Map(m).set(entity, active.configJson as Record<string, string>));
        }
        this.loading.set(false);
        this.initialized.set(true);
        this.loadHistory(tenantId, channelId, entity);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        if ((err as { status?: number })?.status === 404) {
          const def = ConfigChannelSection.ENTITY_DEFAULTS[entity];
          this.configControl.reset(def !== undefined ? JSON.stringify(def, null, 2) : '{}');
          this.activeVersion.set(null);
          this.initialized.set(true);
          this.loadHistory(tenantId, channelId, entity);
        } else {
          this.errorMessage.set(toUserMessage(err, this.translate.instant('config.loadError')));
          this.initialized.set(true);
        }
      },
    });
  }

  private loadHistory(tenantId: string, channelId: string, entity: string): void {
    this.historyLoading.set(true);
    this.tenantService.getHistory(tenantId, channelId, entity).subscribe({
      next: (versions) => {
        this.history.set(versions);
        const active = versions.find((v) => v.active) ?? null;
        this.activeVersion.set(active);
        this.historyLoading.set(false);
      },
      error: () => {
        this.historyLoading.set(false);
      },
    });
  }

  prettify(): void {
    const v = this.configControl.value ?? '';
    if (!v.trim()) return;
    try {
      const parsed: unknown = JSON.parse(v);
      this.configControl.setValue(JSON.stringify(parsed, null, 2));
      this.configControl.markAsDirty();
    } catch {
      this.configControl.markAsTouched();
    }
  }

  save(): void {
    this.configControl.markAsTouched();
    if (this.configControl.invalid || this.saving()) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(this.configControl.value ?? '{}');
    } catch {
      return;
    }

    const tenantId = this.tenantId();
    const channelId = this.channelId();
    const entity = this.entity();

    this.saving.set(true);
    this.tenantService.putConfig(tenantId, channelId, entity, parsed).subscribe({
      next: (version) => {
        this.saving.set(false);
        this.activeVersion.set(version);
        const pretty = JSON.stringify(version.configJson, null, 2);
        this.configControl.reset(pretty);
        this.entities.update((list) => {
          if (list.includes(entity)) return list;
          return [...list, entity].sort((a, b) =>
            a === 'base' ? -1 : b === 'base' ? 1 : a.localeCompare(b),
          );
        });
        this.loadHistory(tenantId, channelId, entity);
        this.loadEntities(tenantId, channelId);
        if (version.pushPackage) {
          void this.handleBrowserPush(version, tenantId, channelId, entity);
        } else {
          this.snackbar.open(
            this.translate.instant(version.syncStatus === 'SYNCED' ? 'config.saveSynced' : 'config.saveDraftWarning'),
            'OK',
            { duration: version.syncStatus === 'SYNCED' ? 3000 : 6000 },
          );
        }
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.snackbar.open(
          toUserMessage(err, this.translate.instant('config.saveError')),
          'OK',
          { duration: 6000 },
        );
      },
    });
  }

  resync(): void {
    if (this.resyncing()) return;
    const tenantId = this.tenantId();
    const channelId = this.channelId();
    const entity = this.entity();
    this.resyncing.set(true);
    this.tenantService.resync(tenantId, channelId, entity).subscribe({
      next: (version) => {
        this.resyncing.set(false);
        this.activeVersion.set(version);
        if (version.pushPackage) {
          void this.handleBrowserPush(version, tenantId, channelId, entity);
        } else {
          this.snackbar.open(
            this.translate.instant(version.syncStatus === 'SYNCED' ? 'config.resyncSynced' : 'config.resyncDraft'),
            'OK',
            { duration: version.syncStatus === 'SYNCED' ? 3000 : 6000 },
          );
          this.loadHistory(tenantId, channelId, entity);
        }
      },
      error: (err: unknown) => {
        this.resyncing.set(false);
        this.snackbar.open(
          toUserMessage(err, this.translate.instant('config.resyncError')),
          'OK',
          { duration: 6000 },
        );
      },
    });
  }

  /**
   * Flusso browser-assisted push: il server centrale non ha raggiunto l'on-prem
   * (tipicamente behind VPN), ma il browser dell'admin potrebbe riuscirci.
   * 1. Health check diretto browser → on-prem
   * 2. Se raggiungibile → dialog di conferma
   * 3. Se confermato → PUT diretto browser → on-prem con il push package pre-cifrato
   * 4. Notifica esito al central (push-confirm)
   */
  private async handleBrowserPush(
    version: AppConfigVersion,
    tenantId: string,
    channelId: string,
    entity: string,
  ): Promise<void> {
    const pkg = version.pushPackage!;

    this.snackbar.open(this.translate.instant('config.browserPushChecking'), 'OK', { duration: 4000 });

    const reachable = await fetch(`${pkg.baseUrl}/actuator/health`, {
      mode: 'no-cors',
      signal: AbortSignal.timeout(5000),
    }).then(() => true).catch(() => false);

    if (!reachable) {
      this.snackbar.open(this.translate.instant('config.browserPushUnreachable'), 'OK', { duration: 8000 });
      return;
    }

    const confirmed = await new Promise<boolean>((resolve) => {
      const data: ConfirmDialogData = {
        title: this.translate.instant('config.browserPushConfirmTitle'),
        message: this.translate.instant('config.browserPushConfirmMessage'),
        confirmLabel: this.translate.instant('config.browserPushConfirmButton'),
        destructive: false,
      };
      const ref = this.dialog.open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, { data });
      ref.afterClosed().subscribe((result) => resolve(result === true));
    });

    if (!confirmed) return;

    this.snackbar.open(this.translate.instant('config.browserPushInProgress'), undefined, { duration: 0 });

    let remoteVersion: number | null = null;
    let pushError: string | null = null;
    let pushOk = false;

    try {
      const res = await fetch(pkg.targetUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': pkg.apiKey },
        body: JSON.stringify({ payload: pkg.encryptedPayload }),
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const data = await res.json() as { version?: number };
        remoteVersion = data.version ?? null;
        pushOk = true;
      } else {
        pushError = `On-prem ha risposto ${res.status}`;
      }
    } catch (e) {
      pushError = e instanceof Error ? e.message : 'Errore rete';
    }

    this.tenantService.pushConfirm(tenantId, channelId, entity, pushOk, remoteVersion, pushError).subscribe({
      next: (confirmed) => {
        this.activeVersion.set(confirmed);
        this.loadHistory(tenantId, channelId, entity);
        this.snackbar.open(
          this.translate.instant(pushOk ? 'config.browserPushSynced' : 'config.browserPushFailed'),
          'OK',
          { duration: pushOk ? 3000 : 6000 },
        );
      },
      error: () => {
        this.snackbar.open(this.translate.instant('config.browserPushConfirmError'), 'OK', { duration: 6000 });
      },
    });
  }

  readonly isAdmin = computed(() => {
    const role = this.auth.currentUser()?.role;
    return role === 'ADMIN' || role === 'DELIVERY';
  });
  readonly isCurrentEntityDisabled = computed(() => this.disabledEntities().has(this.entity()));
  readonly isSmhUiRender = computed(() => this.entity() === 'smh_ui_render');
  readonly isSmhSpidProvider = computed(() => this.entity() === 'smh_spid_provider');
  readonly isSmhFaq = computed(() => this.entity() === 'smh_faq');
  readonly isSmhServiceConfig = computed(() => this.entity() === 'smh_service_config');
  readonly isSmhMinAppVersion = computed(() => this.entity() === 'smh_min_app_version');
  readonly isSmhNews = computed(() => this.entity() === 'smh_news');
  readonly isSmhTutorial   = computed(() => this.entity() === 'smh_tutorial');
  readonly isSmhThemeData  = computed(() => this.entity() === 'smh_theme_data');
  readonly isWebBase       = computed(() => this.channelId() === 'web' && this.entity() === 'base');

  private static readonly GRAPHIC_EDITOR_ENTITIES = new Set([
    'smh_ui_render', 'smh_spid_provider', 'smh_faq',
    'smh_service_config', 'smh_min_app_version', 'smh_news', 'smh_tutorial',
    'smh_theme_data',
  ]);

  private static readonly MOBILE_MANDATORY_ENTITIES = [
    'smh_ui_render',
    'smh_spid_provider',
    'smh_faq',
    'smh_service_config',
    'smh_it',
    'smh_en',
    'smh_min_app_version',
    'smh_news',
    'smh_tutorial',
    'smh_theme_data',
  ];

  private static readonly ENTITY_DEFAULTS: Record<string, unknown> = {
    smh_ui_render: {
      home: {
        app_bar: { title: '', svg_icon: null },
        search_bar: { hint_label: 'Cerca servizi...' },
        header: [],
        body: {},
      },
      navigation_bar: { services: [] },
    },
    smh_spid_provider: { providers: [] },
    smh_faq: [],
    smh_service_config: [],
    smh_it: {},
    smh_en: {},
    smh_min_app_version: { ios: '1.0', android: '1.0' },
    smh_news: [],
    smh_tutorial: { cdnBaseUrl: '', youtubePlaylistUrl: '' },
    smh_theme_data: {
      primaryColor: '#19509A',
      primarySwatch: 'blue',
      scaffoldBackgroundColor: '#E9F1FC',
      colorScheme: {
        primary: '#19509A', onPrimary: '#FFFFFF',
        secondary: '#065170', onSecondary: '#FFFFFF',
        error: '#FF0000', onError: '#FFFFFF',
        brightness: 'light', surface: '#FFFFFF', onSurface: '#000000',
      },
      textTheme: {
        fontFamily: 'TitilliumWeb',
        titleLarge: { fontWeight: 'w600', fontSize: 24 },
        bodyMedium: { fontWeight: 'w600', fontSize: 18 },
        bodySmall:  { fontWeight: 'normal', fontSize: 16 },
        labelSmall: { fontWeight: 'w700', fontSize: 16 },
      },
      tabBarTheme: {
        dividerColor: '#1A1A1A',
        labelStyle:           { fontSize: 16, fontWeight: 'w600', color: '#19509A' },
        unselectedLabelStyle: { fontSize: 16, fontWeight: 'w600', color: '#9E9E9E' },
      },
      cardTheme: {
        elevation: 5,
        shape: { type: 'RoundedRectangleBorder', borderRadius: 5.0 },
        color: '#FFFFFF',
      },
    },
  };

  hasGraphicEditor(entity: string): boolean {
    if (this.channelId() === 'web' && entity === 'base') return true;
    return ConfigChannelSection.GRAPHIC_EDITOR_ENTITIES.has(entity);
  }

  private readonly configValue = toSignal(
    this.configControl.valueChanges.pipe(startWith(this.configControl.value)),
    { initialValue: this.configControl.value },
  );

  private readonly cachedUiRenderJson  = signal<SmhUiRenderJson | null>(null);
  private readonly cachedThemeDataJson = signal<SmhThemeDataJson | null>(null);
  private readonly cachedServiceConfigJson = signal<SmhServiceConfigJson | null>(null);
  private readonly translationsCache   = signal<Map<string, Record<string, unknown>>>(new Map());

  /** Ricava l'entity di traduzione dalla lingua del browser (es. "it" → "smh_it"). Default: "smh_en". */
  private static translationEntity(): string {
    const lang = navigator.language.split('-')[0].toLowerCase();
    return `smh_${lang}`;
  }

  /** Lingua selezionata nel simulatore (codice a 2 lettere). Reset al cambio di tenant/channel. */
  readonly previewLang = linkedSignal({
    source: () => `${this.tenantId()}::${this.channelId()}`,
    computation: () => ConfigChannelSection.translationEntity().slice(4),
  });

  /** Lingue disponibili nel simulatore: entità smh_XX presenti nella lista. */
  readonly previewLangs = computed(() =>
    this.entities()
      .filter(e => /^smh_[a-z]{2}$/.test(e))
      .map(e => e.slice(4)),
  );

  readonly showPreview = computed(() =>
    this.channelId() === 'mobile' && (this.isSmhUiRender() || this.isSmhThemeData()),
  );

  readonly previewJson = computed((): SmhUiRenderJson | null => {
    if (!this.showPreview()) return null;
    if (this.isSmhUiRender()) {
      const raw = this.configValue();
      if (!raw?.trim()) return this.cachedUiRenderJson();
      try { return JSON.parse(raw) as SmhUiRenderJson; } catch { return this.cachedUiRenderJson(); }
    }
    return this.cachedUiRenderJson();
  });

  readonly previewThemeJson = computed((): SmhThemeDataJson | null => {
    if (!this.showPreview()) return null;
    if (this.isSmhThemeData()) {
      const raw = this.configValue();
      if (!raw?.trim()) return this.cachedThemeDataJson();
      try { return JSON.parse(raw) as SmhThemeDataJson; } catch { return this.cachedThemeDataJson(); }
    }
    return this.cachedThemeDataJson();
  });

  readonly previewServiceConfig = computed((): SmhServiceConfigJson | null => {
    if (this.isSmhServiceConfig()) {
      const raw = this.configValue();
      if (!raw?.trim()) return this.cachedServiceConfigJson();
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? { services: parsed } : parsed as SmhServiceConfigJson;
      } catch { return this.cachedServiceConfigJson(); }
    }
    return this.cachedServiceConfigJson();
  });

  readonly previewTranslationsJson = computed((): Record<string, unknown> | null => {
    if (!this.showPreview()) return null;
    const lang = this.previewLang();
    const entity = `smh_${lang}`;
    const cached = this.translationsCache().get(entity) ?? null;
    if (this.entity() === entity) {
      const raw = this.configValue();
      if (!raw?.trim()) return cached;
      try { return JSON.parse(raw) as Record<string, unknown>; } catch { return cached; }
    }
    return cached;
  });

  openGraphicEditor(): void {
    let parsed: SmhUiRenderJson = {};
    const raw = this.configControl.value ?? '';
    if (raw.trim()) {
      try { parsed = JSON.parse(raw) as SmhUiRenderJson; } catch { /* usa vuoto */ }
    }
    const tenantId = this.tenantId();
    const channelId = this.channelId();
    const emptyConfig = { source: 'local' as const, configJson: [] as unknown };
    this.tenantService.getConfig(tenantId, channelId, 'local', 'smh_service_config')
      .pipe(catchError(() => of(emptyConfig)))
      .subscribe((svcCfg) => {
      const availableServiceIds = extractServiceIds(svcCfg.configJson);
      const data: SmhUiRenderEditorDialogData = { value: parsed, availableServiceIds };
      const ref = this.dialog.open<SmhUiRenderEditorDialog, SmhUiRenderEditorDialogData, SmhUiRenderJson>(
        SmhUiRenderEditorDialog,
        { data, autoFocus: 'first-tabbable', maxWidth: '960px', width: '960px', maxHeight: '90svh' },
      );
      ref.afterClosed().subscribe((result) => {
        if (result === undefined) return;
        const pretty = JSON.stringify(result, null, 2);
        this.configControl.setValue(pretty);
        this.configControl.markAsDirty();
      });
    });
  }

  openSpidProviderEditor(): void {
    let parsed: SmhSpidProviderJson = { providers: [] };
    const raw = this.configControl.value ?? '';
    if (raw.trim()) {
      try { parsed = JSON.parse(raw) as SmhSpidProviderJson; } catch { /* usa vuoto */ }
    }
    const data: SmhSpidProviderEditorDialogData = { value: parsed };
    const ref = this.dialog.open<SmhSpidProviderEditorDialog, SmhSpidProviderEditorDialogData, SmhSpidProviderJson>(
      SmhSpidProviderEditorDialog,
      { data, autoFocus: 'first-tabbable', maxWidth: '720px', width: '720px', maxHeight: '90svh' },
    );
    ref.afterClosed().subscribe((result) => {
      if (result === undefined) return;
      this.configControl.setValue(JSON.stringify(result, null, 2));
      this.configControl.markAsDirty();
    });
  }

  openFaqEditor(): void {
    let parsed: SmhFaqJson = [];
    const raw = this.configControl.value ?? '';
    if (raw.trim()) {
      try { parsed = JSON.parse(raw) as SmhFaqJson; } catch { /* usa vuoto */ }
    }
    const data: SmhFaqEditorDialogData = { value: parsed };
    const ref = this.dialog.open<SmhFaqEditorDialog, SmhFaqEditorDialogData, SmhFaqJson>(
      SmhFaqEditorDialog,
      { data, autoFocus: 'first-tabbable', maxWidth: '720px', width: '720px', maxHeight: '90svh' },
    );
    ref.afterClosed().subscribe((result) => {
      if (result === undefined) return;
      this.configControl.setValue(JSON.stringify(result, null, 2));
      this.configControl.markAsDirty();
    });
  }

  openServiceConfigEditor(): void {
    const raw = this.configControl.value ?? '';
    let parsed: SmhServiceConfigJson = { services: [] };
    if (raw.trim()) {
      try { parsed = JSON.parse(raw) as SmhServiceConfigJson; } catch { /* usa vuoto */ }
    }
    const data: SmhServiceConfigEditorDialogData = { value: parsed };
    const ref = this.dialog.open<SmhServiceConfigEditorDialog, SmhServiceConfigEditorDialogData, SmhServiceConfigJson | ServiceItem[]>(
      SmhServiceConfigEditorDialog,
      { data, autoFocus: 'first-tabbable', maxWidth: '720px', width: '720px', maxHeight: '90svh' },
    );
    ref.afterClosed().subscribe((result) => {
      if (result === undefined) return;
      this.configControl.setValue(JSON.stringify(result, null, 2));
      this.configControl.markAsDirty();
    });
  }

  onDisableEntity(): void {
    const entity = this.entity();
    const data: ConfirmDialogData = {
      title: this.translate.instant('config.disableEntityTitle', { entity }),
      message: this.translate.instant('config.disableEntityMessage', { entity }),
      confirmLabel: this.translate.instant('config.disableEntityConfirm'),
      destructive: true,
    };
    const ref = this.dialog.open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, { data });
    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      const tenantId = this.tenantId();
      const channelId = this.channelId();
      this.disablingEntity.set(true);
      this.tenantService.disableEntity(tenantId, channelId, entity).subscribe({
        next: () => {
          this.disablingEntity.set(false);
          this.disabledEntities.update((s) => new Set([...s, entity]));
          this.snackbar.open(
            this.translate.instant('config.disableEntitySuccess', { entity }),
            'OK',
            { duration: 4000 },
          );
        },
        error: (err: unknown) => {
          this.disablingEntity.set(false);
          this.snackbar.open(
            toUserMessage(err, this.translate.instant('config.disableEntityError')),
            'OK',
            { duration: 6000 },
          );
        },
      });
    });
  }

  onEnableEntity(): void {
    const tenantId = this.tenantId();
    const channelId = this.channelId();
    const entity = this.entity();
    this.enablingEntity.set(true);
    this.tenantService.enableEntity(tenantId, channelId, entity).subscribe({
      next: () => {
        this.enablingEntity.set(false);
        this.disabledEntities.update((s) => {
          const next = new Set(s);
          next.delete(entity);
          return next;
        });
        this.snackbar.open(
          this.translate.instant('config.enableEntitySuccess', { entity }),
          'OK',
          { duration: 3000 },
        );
      },
      error: (err: unknown) => {
        this.enablingEntity.set(false);
        this.snackbar.open(
          toUserMessage(err, this.translate.instant('config.enableEntityError')),
          'OK',
          { duration: 6000 },
        );
      },
    });
  }

  openMinAppVersionEditor(): void {
    const raw = this.configControl.value ?? '';
    let parsed: SmhMinAppVersionJson = { ios: '1.0', android: '1.0' };
    if (raw.trim()) {
      try { parsed = JSON.parse(raw) as SmhMinAppVersionJson; } catch { /* usa default */ }
    }
    const data: SmhMinAppVersionEditorDialogData = { value: parsed };
    const ref = this.dialog.open<SmhMinAppVersionEditorDialog, SmhMinAppVersionEditorDialogData, SmhMinAppVersionJson>(
      SmhMinAppVersionEditorDialog,
      { data, autoFocus: 'first-tabbable', maxWidth: '480px', width: '480px', maxHeight: '90svh' },
    );
    ref.afterClosed().subscribe((result) => {
      if (result === undefined) return;
      this.configControl.setValue(JSON.stringify(result, null, 2));
      this.configControl.markAsDirty();
    });
  }

  openNewsEditor(): void {
    const raw = this.configControl.value ?? '';
    let parsed: SmhNewsJson = [];
    if (raw.trim()) {
      try { parsed = JSON.parse(raw) as SmhNewsJson; } catch { /* usa default */ }
    }
    const data: SmhNewsEditorDialogData = { value: parsed };
    const ref = this.dialog.open<SmhNewsEditorDialog, SmhNewsEditorDialogData, SmhNewsJson>(
      SmhNewsEditorDialog,
      { data, autoFocus: 'first-tabbable', maxWidth: '720px', width: '720px', maxHeight: '90svh' },
    );
    ref.afterClosed().subscribe((result) => {
      if (result === undefined) return;
      this.configControl.setValue(JSON.stringify(result, null, 2));
      this.configControl.markAsDirty();
    });
  }

  openTutorialEditor(): void {
    const raw = this.configControl.value ?? '';
    let parsed: SmhTutorialJson = { cdnBaseUrl: '', youtubePlaylistUrl: '' };
    if (raw.trim()) {
      try { parsed = JSON.parse(raw) as SmhTutorialJson; } catch { /* usa default */ }
    }
    const data: SmhTutorialEditorDialogData = { value: parsed };
    const ref = this.dialog.open<SmhTutorialEditorDialog, SmhTutorialEditorDialogData, SmhTutorialJson>(
      SmhTutorialEditorDialog,
      { data, autoFocus: 'first-tabbable', maxWidth: '560px', width: '560px', maxHeight: '90svh' },
    );
    ref.afterClosed().subscribe((result) => {
      if (result === undefined) return;
      this.configControl.setValue(JSON.stringify(result, null, 2));
      this.configControl.markAsDirty();
    });
  }

  openThemeDataEditor(): void {
    const raw = this.configControl.value ?? '';
    let parsed: SmhThemeDataJson = {};
    if (raw.trim()) {
      try { parsed = JSON.parse(raw) as SmhThemeDataJson; } catch { /* usa default */ }
    }
    const data: SmhThemeDataEditorDialogData = { value: parsed };
    const ref = this.dialog.open<SmhThemeDataEditorDialog, SmhThemeDataEditorDialogData, SmhThemeDataJson>(
      SmhThemeDataEditorDialog,
      { data, autoFocus: 'first-tabbable', maxWidth: '800px', width: '800px', maxHeight: '90svh' },
    );
    ref.afterClosed().subscribe((result) => {
      if (result === undefined) return;
      this.configControl.setValue(JSON.stringify(result, null, 2));
      this.configControl.markAsDirty();
    });
  }

  openWebConfigEditor(): void {
    let parsed: WebAppConfigJson = {};
    const raw = this.configControl.value ?? '';
    if (raw.trim()) {
      try { parsed = JSON.parse(raw) as WebAppConfigJson; } catch { /* usa default */ }
    }
    const data: WebAppConfigEditorDialogData = { value: parsed };
    const ref = this.dialog.open<WebAppConfigEditorDialog, WebAppConfigEditorDialogData, WebAppConfigJson>(
      WebAppConfigEditorDialog,
      { data, autoFocus: 'first-tabbable', width: '95vw', maxWidth: '95vw', height: '92vh', maxHeight: '92vh' },
    );
    ref.afterClosed().subscribe((result) => {
      if (result === undefined) return;
      this.configControl.setValue(JSON.stringify(result, null, 2));
      this.configControl.markAsDirty();
    });
  }

  openDiff(target: AppConfigVersion): void {
    const active = this.activeVersion();
    if (!active) return;
    const data: ConfigVersionDiffDialogData = { activeVersion: active, targetVersion: target };
    const ref = this.dialog.open<ConfigVersionDiffDialog, ConfigVersionDiffDialogData, boolean>(
      ConfigVersionDiffDialog,
      { data, maxWidth: '1160px', width: '95vw' },
    );
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) this.doRollback(target.version);
    });
  }

  confirmRollback(version: AppConfigVersion): void {
    const data: ConfirmDialogData = {
      title: this.translate.instant('config.rollbackConfirmTitle', { version: version.version }),
      message: this.translate.instant('config.rollbackConfirmMessage', { version: version.version }),
      confirmLabel: this.translate.instant('config.rollbackConfirmButton'),
      destructive: false,
    };
    const ref = this.dialog.open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
      data,
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) this.doRollback(version.version);
    });
  }

  private doRollback(version: number): void {
    const tenantId = this.tenantId();
    const channelId = this.channelId();
    const entity = this.entity();
    this.rollingBack.set(version);
    this.tenantService.rollback(tenantId, channelId, entity, version).subscribe({
      next: (newVersion) => {
        this.rollingBack.set(null);
        this.activeVersion.set(newVersion);
        const pretty = JSON.stringify(newVersion.configJson, null, 2);
        this.configControl.reset(pretty);
        if (newVersion.pushPackage) {
          void this.handleBrowserPush(newVersion, tenantId, channelId, entity);
        } else {
          this.snackbar.open(
            this.translate.instant(
              newVersion.syncStatus === 'SYNCED' ? 'config.rollbackSynced' : 'config.rollbackDraft',
              { version },
            ),
            'OK',
            { duration: newVersion.syncStatus === 'SYNCED' ? 3000 : 6000 },
          );
          this.loadHistory(tenantId, channelId, entity);
        }
      },
      error: (err: unknown) => {
        this.rollingBack.set(null);
        this.snackbar.open(
          toUserMessage(err, this.translate.instant('config.rollbackError')),
          'OK',
          { duration: 6000 },
        );
      },
    });
  }
}
