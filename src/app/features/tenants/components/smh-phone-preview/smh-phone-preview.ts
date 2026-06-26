import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { SmhUiRenderJson, ServiceItem, WidgetItem } from '../../dialogs/smh-ui-render-editor-dialog/smh-ui-render-editor-dialog';
import { SmhThemeDataJson } from '../../dialogs/smh-theme-data-editor-dialog/smh-theme-data-editor-dialog';
import { SmhServiceConfigJson } from '../../dialogs/smh-service-config-editor-dialog/smh-service-config-editor-dialog';

type HomeSection =
  | { type: 'category'; name: string; items: ServiceItem[] }
  | { type: 'widgets'; items: WidgetItem[] };

const RESERVED_HOME_KEYS = new Set(['app_bar', 'search_bar', 'header']);

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
