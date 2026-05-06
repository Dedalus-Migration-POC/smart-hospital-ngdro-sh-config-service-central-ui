import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { SmhUiRenderJson, ServiceItem } from '../../dialogs/smh-ui-render-editor-dialog/smh-ui-render-editor-dialog';

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
  readonly bodyCategories = computed((): BodyCategory[] => {
    const body = this.renderData()?.home?.body;
    if (!body) return [];
    return Object.entries(body).map(([name, items]) => ({ name, items }));
  });

  svgUri(svg: string | null | undefined): string {
    if (!svg) return '';
    const t = svg.trimStart();
    if (t.startsWith('<') || t.startsWith('<?xml')) {
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    }
    return `data:image/svg+xml;base64,${svg}`;
  }
}
