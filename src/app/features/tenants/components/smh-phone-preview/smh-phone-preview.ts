import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { SmhUiRenderJson, ServiceItem, WidgetItem } from '../../dialogs/smh-ui-render-editor-dialog/smh-ui-render-editor-dialog';
import { SmhThemeDataJson, SmhFseAppBarConfig, SmhFseDashboardTheme } from '../../dialogs/smh-theme-data-editor-dialog/smh-theme-data-editor-dialog';
import { SmhServiceConfigJson } from '../../dialogs/smh-service-config-editor-dialog/smh-service-config-editor-dialog';

type HomeSection =
  | { type: 'category'; name: string; items: ServiceItem[] }
  | { type: 'widgets'; items: WidgetItem[] };

// `services_groups` ([{title, ids}]) è il meccanismo di raggruppamento usato SOLO
// dalla schermata completa "Servizi"/"Altri servizi" della fse dashboard
// (sh-core FseDashboardRenderUtils.servicesGroups) — la home (sia standard che fse)
// legge esclusivamente le prime due chiavi di `home.body` (vedi sh-core FseHomeScreen.build:
// sectionKeys[0]/[1]). Va quindi ignorato qui, altrimenti viene scambiato per una
// categoria reale e genera card vuote (item = {title, ids}, senza id/svg_icon/subtitle).
const RESERVED_HOME_KEYS = new Set(['app_bar', 'search_bar', 'header', 'services_groups']);

/** Fattore di scala del mockup telefono rispetto a un device reale (~256px vs ~390dp). */
const FSE_PREVIEW_FONT_SCALE = 0.6;

/** Logo di default della fse app bar quando `fse_dashboard.app_bar.logos` non è configurato — vedi sh-core `kFseDefaultLogoSvg`. */
const FSE_DEFAULT_LOGO_SVG = `<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
  <rect width="40" height="40" rx="10" fill="#19509A"/>
  <path d="M20 9v22M9 20h22" stroke="white" stroke-width="4" stroke-linecap="round"/>
</svg>`;

@Component({
  selector: 'app-smh-phone-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './smh-phone-preview.html',
  styleUrl: './smh-phone-preview.scss',
})
export class SmhPhonePreview {
  readonly renderData    = input<SmhUiRenderJson | null>(null);
  readonly themeData     = input<SmhThemeDataJson | null>(null);
  readonly translations  = input<Record<string, unknown> | null>(null);
  readonly serviceConfig = input<SmhServiceConfigJson | null>(null);
  /** Valore di `dashboardVariant` letto dall'entity mobile `base`. `"fse"` attiva la variante "Fse Dashboard". */
  readonly dashboardVariant = input<string | null>(null);

  readonly isFse = computed(() => this.dashboardVariant() === 'fse');

  readonly themeVars = computed(() => {
    const t = this.themeData();
    if (!t) return {};
    return {
      '--phone-primary':     t.colorScheme?.primary     ?? t.primaryColor             ?? '#0D47A1',
      '--phone-on-primary':  t.colorScheme?.onPrimary   ?? '#FFFFFF',
      '--phone-bg':          t.scaffoldBackgroundColor  ?? '#ecf0f5',
      '--phone-card-bg':     t.cardTheme?.color         ?? '#FFFFFF',
      '--phone-card-radius': `${t.cardTheme?.shape?.borderRadius ?? 8}px`,
      '--phone-on-surface':  t.colorScheme?.onSurface   ?? '#000000',
    };
  });

  private readonly fseConfig = computed(() => this.themeData()?.fse_dashboard ?? {});

  /** CSS custom properties per la variante Fse Dashboard, con gli stessi default di sh-core `fse_theme.dart`. */
  readonly fseThemeVars = computed(() => {
    const primary = this.themeVars()['--phone-primary'] ?? '#19509A';
    const t: SmhFseDashboardTheme = this.fseConfig().theme ?? {};
    return {
      // Passthrough del colore primario globale — riusato dalla bottom nav
      // (stessa regola di sh-core: Theme.of(context).primaryColor, non ctaButtonColor).
      '--phone-primary':            primary,
      '--fse-scaffold-bg':          t.scaffold_background_color ?? '#F0F3F8',
      '--fse-card-bg':              t.card_background_color     ?? '#FFFFFF',
      '--fse-card-radius':          `${t.card_radius             ?? 8}px`,
      '--fse-card-shadow-color':    t.card_shadow_color          ?? '#1F2A44',
      '--fse-card-shadow-opacity':  `${t.card_shadow_opacity     ?? 0.10}`,
      '--fse-card-shadow-blur':     `${t.card_shadow_blur_radius ?? 10}px`,
      '--fse-card-shadow-spread':   `${t.card_shadow_spread_radius ?? 0}px`,
      '--fse-card-shadow-offset-y': `${t.card_shadow_offset_y    ?? 3}px`,
      '--fse-banner-border-color':  t.banner_border_color        ?? primary,
      '--fse-banner-border-width':  `${t.banner_border_width     ?? 1.5}px`,
      '--fse-banner-shadow-color':  t.banner_shadow_color        ?? '#1F2A44',
      '--fse-banner-shadow-opacity': `${t.banner_shadow_opacity  ?? 0.22}`,
      '--fse-banner-shadow-blur':   `${t.banner_shadow_blur_radius ?? 18}px`,
      '--fse-banner-shadow-spread': `${t.banner_shadow_spread_radius ?? 1}px`,
      '--fse-banner-shadow-offset-y': `${t.banner_shadow_offset_y ?? 6}px`,
      '--fse-icon-bg':              t.icon_background_color      ?? '#F1F2F4',
      '--fse-icon-color':           t.icon_color                 ?? '#1F2A44',
      '--fse-icon-radius':          `${t.icon_radius              ?? 999}px`,
      '--fse-badge-border-color':   t.badge_border_color         ?? primary,
      '--fse-badge-text-color':     t.badge_text_color           ?? primary,
      '--fse-badge-bg':             t.badge_background_color     ?? `color-mix(in srgb, ${t.badge_border_color ?? primary} 10%, transparent)`,
      '--fse-badge-border-width':   `${t.badge_border_width      ?? 1}px`,
      '--fse-badge-radius':         `${t.badge_radius            ?? 20}px`,
      // Il mockup telefono è renderizzato a ~0.6x rispetto alle dimensioni reali di un device
      // (il resto del preview usa font hardcoded tarati a questa scala, es. .fse-grid__title a 9.5px
      // contro i ~16sp reali). Applichiamo lo stesso fattore al valore dp configurato nel tema
      // (default sh-core 10 → 6px, invariato rispetto al preview pre-esistente) per restare
      // proporzionato anche quando il tenant configura un badge_font_size più grande.
      '--fse-badge-font-size':      `${(t.badge_font_size        ?? 10) * FSE_PREVIEW_FONT_SCALE}px`,
      '--fse-title-color':          t.title_color                ?? '#111827',
      '--fse-subtitle-color':       t.subtitle_color              ?? '#6B7280',
      '--fse-cta-button-color':     t.cta_button_color            ?? primary,
      '--fse-cta-button-text-color':       t.cta_button_text_color       ?? '#FFFFFF',
      '--fse-cta-button-bg':               t.cta_button_background_color ?? (t.cta_button_color ?? primary),
      '--fse-cta-button-border-color':     t.cta_button_border_color     ?? (t.cta_button_color ?? primary),
      '--fse-cta-button-border-width':     `${t.cta_button_border_width  ?? 0}px`,
      '--fse-cta-button-shadow-opacity':   t.cta_button_shadow_visible   === false ? '0' : '0.3',
      '--fse-cta-button-radius':           `${t.cta_button_radius        ?? 20}px`,
    };
  });

  readonly fseBackgroundPatternVisible = computed(() => this.fseConfig().theme?.background_pattern_visible ?? true);
  readonly fseBackgroundPatternUri = computed(() => {
    if (!this.fseBackgroundPatternVisible()) return '';
    return this.svgUri(this.fseConfig().theme?.background_pattern_svg);
  });

  readonly fseWelcomeVisible = computed(() => this.fseConfig().welcome_heading?.visible ?? true);

  /** Config app bar della fse dashboard, con default (vedi sh-core `FseAppBarConfig.fromThemeDataMap`). */
  readonly fseAppBar = computed(() => {
    const cfg: SmhFseAppBarConfig = this.fseConfig().app_bar ?? {};
    const logos = (cfg.logos ?? []).map(l => l.svg_icon).filter((s): s is string => !!s);
    return {
      visible: cfg.visible ?? true,
      backgroundColor: cfg.background_color ?? '#FFFFFF',
      height: cfg.height ?? 72,
      logos: logos.length > 0 ? logos : [FSE_DEFAULT_LOGO_SVG],
      titleText: cfg.title_text ?? '',
      titleTextColor: cfg.title_text_color ?? '#0F2A4A',
      showNotificationBell: cfg.show_notification_bell ?? true,
      showProfileAvatar: cfg.show_profile_avatar ?? true,
      profileAvatarBackgroundColor: cfg.profile_avatar_background_color ?? '#1F2A44',
      profileAvatarIconColor: cfg.profile_avatar_icon_color ?? '#FFFFFF',
      extraActions: cfg.extra_actions ?? [],
    };
  });

  private previewCount(key: 'servizi_principali_preview_count' | 'altri_servizi_preview_count', fallback: number): number {
    const v = this.fseConfig()[key];
    return typeof v === 'number' ? v : fallback;
  }

  /** Sole sezioni "categoria" di `home.body`, nell'ordine JSON — la 1ª è "Servizi principali", la 2ª "Altri servizi" (stessa regola di sh-core `FseHomeScreen`). */
  private readonly fseCategorySections = computed(() =>
    this.homeSections().filter((s): s is Extract<HomeSection, { type: 'category' }> => s.type === 'category'),
  );
  readonly fseWidgetSections = computed(() => this.homeSections().filter(s => s.type === 'widgets'));

  readonly fsePrincipaliSectionName = computed(() => this.fseCategorySections()[0]?.name ?? null);
  readonly fseAltriSectionName = computed(() => this.fseCategorySections()[1]?.name ?? null);

  readonly fsePrincipaliItems = computed(() =>
    (this.fseCategorySections()[0]?.items ?? []).slice(0, this.previewCount('servizi_principali_preview_count', 4)),
  );
  readonly fseAltriItems = computed(() =>
    (this.fseCategorySections()[1]?.items ?? []).slice(0, this.previewCount('altri_servizi_preview_count', 2)),
  );

  /** Item con lock/link "badge": in preview l'utente è sempre considerato non loggato, come per il resto del simulatore. */
  fseIsLink(item: ServiceItem): boolean {
    return !!item.link;
  }
  fseShowLock(item: ServiceItem): boolean {
    return !!item.show_lock && !this.fseIsLink(item);
  }

  /** Mappa id → { hidden, disabled, link } dal service config */
  private readonly svcMap = computed((): Map<string, { hidden: boolean; disabled: boolean; link?: string }> => {
    const map = new Map<string, { hidden: boolean; disabled: boolean; link?: string }>();
    for (const s of this.serviceConfig()?.services ?? []) {
      map.set(s.id, { hidden: !!s.hidden, disabled: !!s.disabled, link: s.link });
    }
    return map;
  });

  readonly homeSections = computed((): HomeSection[] => {
    const home = this.renderData()?.home;
    if (!home) return [];
    const svc = this.svcMap();
    const sections: HomeSection[] = [];
    for (const [key, value] of Object.entries(home)) {
      if (RESERVED_HOME_KEYS.has(key) || !value) continue;
      if (Array.isArray(value)) {
        if (value.length === 0) continue;
        if ('title' in (value[0] as object)) {
          // Categoria: filtra hidden, arricchisce con disabled/link dal service config
          const items = (value as ServiceItem[])
            .filter(item => !svc.get(item.id)?.hidden)
            .map(item => {
              const cfg = svc.get(item.id);
              return cfg ? { ...item, disabled: cfg.disabled, link: cfg.link ?? item.link } : item;
            });
          sections.push({ type: 'category', name: key, items });
        } else {
          sections.push({ type: 'widgets', items: value as WidgetItem[] });
        }
      } else if (typeof value === 'object') {
        for (const [catName, items] of Object.entries(value as Record<string, ServiceItem[]>)) {
          if (!Array.isArray(items)) continue;
          const filtered = items
            .filter(item => !svc.get(item.id)?.hidden)
            .map(item => {
              const cfg = svc.get(item.id);
              return cfg ? { ...item, disabled: cfg.disabled, link: cfg.link ?? item.link } : item;
            });
          sections.push({ type: 'category', name: catName, items: filtered });
        }
      }
    }
    return sections;
  });

  /** Risolve una chiave dot-notation (es. "home_screen.body.faq_title") nel JSON annidato delle traduzioni. */
  t(key: string | null | undefined): string {
    if (!key) return '';
    const dict = this.translations();
    if (!dict) return key;
    const parts = key.split('.');
    let current: unknown = dict;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return key;
      }
    }
    return typeof current === 'string' ? current : key;
  }

  svgUri(svg: string | null | undefined): string {
    if (!svg) return '';
    const t = svg.trimStart();
    if (t.startsWith('<') || t.startsWith('<?xml')) {
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    }
    return `data:image/svg+xml;base64,${svg}`;
  }
}
