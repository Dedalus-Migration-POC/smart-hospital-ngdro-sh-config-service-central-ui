import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { SmhUiRenderJson, ServiceItem } from '../../dialogs/smh-ui-render-editor-dialog/smh-ui-render-editor-dialog';
import { SmhThemeDataJson } from '../../dialogs/smh-theme-data-editor-dialog/smh-theme-data-editor-dialog';

export interface BodyCategory {
  name: string;
  items: ServiceItem[];
}

@Component({
  selector: 'app-smh-phone-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './smh-phone-preview.html',
  styleUrl: './smh-phone-preview.scss',
})
export class SmhPhonePreview {
  readonly renderData = input<SmhUiRenderJson | null>(null);
  readonly themeData = input<SmhThemeDataJson | null>(null);
  readonly translations = input<Record<string, string> | null>(null);

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

  readonly bodyCategories = computed((): BodyCategory[] => {
    const body = this.renderData()?.home?.body;
    if (!body) return [];
    return Object.entries(body).map(([name, items]) => ({ name, items }));
  });

  /** Risolve una chiave di traduzione: se presente in translations, restituisce il valore tradotto, altrimenti la stringa originale. */
  t(key: string | null | undefined): string {
    if (!key) return '';
    const dict = this.translations();
    return (dict && Object.prototype.hasOwnProperty.call(dict, key)) ? dict[key] : key;
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
