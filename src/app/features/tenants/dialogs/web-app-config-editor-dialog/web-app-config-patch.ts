import { ImageType, WebEditorModel } from './web-app-config-types';

// ── Extractors ────────────────────────────────────────────────────────────────

function extractLinks(items: Record<string, unknown>[]): Array<{ text_it: string; url: string }> {
  return items
    .filter(i => i['type'] === 'LINK')
    .map(i => {
      const props = i['props'] as Record<string, unknown> | undefined;
      const text = props?.['text'] as Record<string, unknown> | undefined;
      return { text_it: (text?.['it'] as string) ?? '', url: (props?.['url'] as string) ?? '' };
    });
}

function extractSocials(items: Record<string, unknown>[]): Array<{ id: string; url: string }> {
  const block = items.find(i => i['type'] === 'SOCIAL') as Record<string, unknown> | undefined;
  const props = block?.['props'] as Record<string, unknown> | undefined;
  const list = (props?.['socials'] ?? []) as Record<string, unknown>[];
  return list.map(s => ({ id: (s['id'] as string) ?? '', url: (s['url'] as string) ?? '' }));
}

function getEnabled(items: Record<string, unknown>[], type: string): boolean {
  const item = items.find(i => i['type'] === type);
  return item ? item['enabled'] !== false : true;
}

function extractImage(items: Record<string, unknown>[]): { type: string; value: string } {
  const img = items.find(i => i['type'] === 'IMAGE_BLOCK') as Record<string, unknown> | undefined;
  const props = img?.['props'] as Record<string, unknown> | undefined;
  const image = props?.['image'] as Record<string, unknown> | undefined;
  return {
    type: (image?.['type'] as string) ?? 'inlineSvg',
    value: (image?.['value'] as string) ?? '',
  };
}

function extractImageUrl(items: Record<string, unknown>[]): string {
  const img = items.find(i => i['type'] === 'IMAGE_BLOCK') as Record<string, unknown> | undefined;
  const props = img?.['props'] as Record<string, unknown> | undefined;
  const action = props?.['action'] as Record<string, unknown> | undefined;
  return (action?.['url'] as string) ?? '';
}

function extractFirstTextIt(items: Record<string, unknown>[]): string {
  const item = items.find(i => i['type'] === 'TEXT') as Record<string, unknown> | undefined;
  const props = item?.['props'] as Record<string, unknown> | undefined;
  const text = props?.['text'] as Record<string, unknown> | undefined;
  return (text?.['it'] as string) ?? '';
}

function extractSecondTextIt(items: Record<string, unknown>[]): string {
  const texts = items.filter(i => i['type'] === 'TEXT') as Record<string, unknown>[];
  const item = texts[1];
  const props = item?.['props'] as Record<string, unknown> | undefined;
  const text = props?.['text'] as Record<string, unknown> | undefined;
  return (text?.['it'] as string) ?? '';
}

function areaItems(section: Record<string, unknown>, slot: 'start' | 'center' | 'end'): Record<string, unknown>[] {
  const areas = section['areas'] as Record<string, unknown> | undefined;
  const slotObj = areas?.[slot] as Record<string, unknown> | undefined;
  return (slotObj?.['items'] as Record<string, unknown>[]) ?? [];
}

function findPage(pages: Record<string, unknown>[], id: string): Record<string, unknown> | undefined {
  return pages.find(p => p['id'] === id) as Record<string, unknown> | undefined;
}

export function extractModel(v: Record<string, unknown>): WebEditorModel {
  const header = (v['header'] as Record<string, unknown>) ?? {};
  const footer = (v['footer'] as Record<string, unknown>) ?? {};
  const topbar = (header['topbar'] as Record<string, unknown>) ?? {};
  const main   = (header['main']   as Record<string, unknown>) ?? {};
  const btmbar = (header['bottombar'] as Record<string, unknown>) ?? {};
  const fMain  = (footer['main']      as Record<string, unknown>) ?? {};
  const fBtm   = (footer['bottombar'] as Record<string, unknown>) ?? {};
  const theme  = (v['theme']  as Record<string, unknown>) ?? {};
  const colors = (theme['colors'] as Record<string, unknown>) ?? {};
  const typo   = (theme['typography'] as Record<string, unknown>) ?? {};
  const trans  = (v['translate'] as Record<string, unknown>) ?? {};
  const i18n   = (trans['i18n'] as Record<string, unknown>) ?? {};
  const pages  = (v['pages'] as Record<string, unknown>[]) ?? [];

  const topbarEndItems    = areaItems(topbar, 'end');
  const mainEndItems      = areaItems(main, 'end');
  const fMainEndItems     = areaItems(fMain, 'end');
  const fBtmStartItems    = areaItems(fBtm, 'start');
  const topbarStartItems  = areaItems(topbar, 'start');
  const mainStartItems    = areaItems(main, 'start');
  const btmEndItems       = areaItems(btmbar, 'end');
  const fMainStartItems   = areaItems(fMain, 'start');

  const loginPage = findPage(pages, '/login');
  const homePage  = findPage(pages, '/');
  const loginPageData = (loginPage?.['page'] as Record<string, unknown>) ?? {};
  const homePageData  = (homePage?.['page']  as Record<string, unknown>) ?? {};
  const loginStartItems = areaItems(loginPageData, 'start');
  const homeStartItems  = areaItems(homePageData,  'start');

  return {
    name:    (v['name']    as string) ?? '',
    favicon: (v['favicon'] as string) ?? '',

    color_primary:   (colors['primary']   as string) ?? '#3823f5',
    color_secondary: (colors['secondary'] as string) ?? '#6c757d',
    color_success:   (colors['success']   as string) ?? '#198754',
    color_warning:   (colors['warning']   as string) ?? '#ffc107',
    color_danger:    (colors['danger']    as string) ?? '#dc3545',
    color_info:      (colors['info']      as string) ?? '#0dcaf0',
    color_light:     (colors['light']     as string) ?? '#f8f9fa',
    color_dark:      (colors['dark']      as string) ?? '#212529',

    fontFamily:      (typo['fontFamily'] as string) ?? 'Inter, sans-serif',
    defaultLanguage: (i18n['defaultLanguage'] as string) ?? 'it',

    topbar_height:     (topbar['height']     as string) ?? '48px',
    topbar_background: (topbar['background'] as string) ?? 'primary',
    topbar_links:   extractLinks(topbarStartItems),
    showLangSelector: getEnabled(topbarEndItems, 'SELECT_LANG'),
    showUserMenu:     getEnabled(topbarEndItems, 'USER_DROPDOWN_MENU'),

    main_height:     (main['height']     as string) ?? '88px',
    main_background: (main['background'] as string) ?? 'primary',
    logo_type:  extractImage(mainStartItems).type as ImageType,
    logo_value: extractImage(mainStartItems).value,
    logo_url: extractImageUrl(mainStartItems),
    header_socials: extractSocials(mainEndItems),

    bottombar_height:     (btmbar['height']     as string) ?? '48px',
    bottombar_background: (btmbar['background'] as string) ?? 'light',
    bottombar_links: extractLinks(btmEndItems),

    footer_main_height:     (fMain['height']     as string) ?? '150px',
    footer_main_background: (fMain['background'] as string) ?? 'primary',
    footer_description: extractFirstTextIt(fMainStartItems),
    footer_logo_type:  extractImage(fMainStartItems).type as ImageType,
    footer_logo_value: extractImage(fMainStartItems).value,
    footer_socials:     extractSocials(fMainEndItems),

    footer_bottom_height:     (fBtm['height']     as string) ?? '48px',
    footer_bottom_background: (fBtm['background'] as string) ?? 'info',
    footer_bottom_links: extractLinks(fBtmStartItems),

    login_title:      extractFirstTextIt(loginStartItems),
    login_subtitle:   extractSecondTextIt(loginStartItems),
    login_background: (loginPageData['backgroundImage'] as string) ?? '',

    home_title:      extractFirstTextIt(homeStartItems),
    home_subtitle:   extractSecondTextIt(homeStartItems),
    home_background: (homePageData['backgroundColor'] as string) ?? '',
  };
}

// ── Patchers ──────────────────────────────────────────────────────────────────

function ensureAreas(section: Record<string, unknown>): void {
  if (!section['areas']) section['areas'] = {};
  const areas = section['areas'] as Record<string, unknown>;
  for (const slot of ['start', 'center', 'end'] as const) {
    if (!areas[slot]) areas[slot] = { items: [] };
    const s = areas[slot] as Record<string, unknown>;
    if (!s['items']) s['items'] = [];
  }
}

function patchLinksInItems(
  items: Record<string, unknown>[],
  links: Array<{ text_it: string; url: string }>,
): Record<string, unknown>[] {
  const nonLinks = items.filter(i => i['type'] !== 'LINK');
  const newLinks = links.map((l, i) => ({
    id: `link-${i + 1}`,
    type: 'LINK',
    enabled: true,
    props: {
      text: { it: l.text_it, en: l.text_it },
      url: l.url,
      external: !l.url.startsWith('/'),
      disabled: false,
      style: { color: 'primary', textDecoration: 'none', font: 'md', fontWeight: 'semibold' },
    },
  }));
  return [...nonLinks, ...newLinks];
}

function patchSocialsInItems(
  items: Record<string, unknown>[],
  socials: Array<{ id: string; url: string }>,
): Record<string, unknown>[] {
  const block = items.find(i => i['type'] === 'SOCIAL');
  if (!block) {
    if (socials.length === 0) return items;
    return [
      ...items,
      {
        id: 'socials',
        type: 'SOCIAL',
        enabled: true,
        props: {
          layout: { direction: 'row', gap: 'gap-2', align: 'center' },
          socials: socials.map(s => ({
            id: s.id,
            showLabel: false,
            label: { it: s.id, en: s.id },
            icon: { type: 'font', value: `fa-brands fa-${s.id}` },
            url: s.url,
            target: '_blank',
            disabled: false,
          })),
        },
      },
    ];
  }
  return items.map(item => {
    if (item['type'] !== 'SOCIAL') return item;
    const props = (item['props'] as Record<string, unknown>) ?? {};
    const existing = (props['socials'] as Record<string, unknown>[]) ?? [];
    const patched = socials.map(s => {
      const orig = existing.find(e => e['id'] === s.id) ?? {};
      return { ...orig, id: s.id, url: s.url };
    });
    return { ...item, props: { ...props, socials: patched } };
  });
}

function setEnabledInItems(
  items: Record<string, unknown>[],
  type: string,
  enabled: boolean,
): Record<string, unknown>[] {
  if (!items.some(i => i['type'] === type)) return items;
  return items.map(i => i['type'] === type ? { ...i, enabled } : i);
}

function patchImageInItems(
  items: Record<string, unknown>[],
  imgType: string,
  imgValue: string,
  actionUrl: string,
): Record<string, unknown>[] {
  if (!items.some(i => i['type'] === 'IMAGE_BLOCK')) {
    if (!imgValue) return items;
    return [
      ...items,
      {
        id: 'logo',
        type: 'IMAGE_BLOCK',
        enabled: true,
        props: {
          id: 'logo',
          image: { type: imgType, value: imgValue, decorative: false, alt: { it: 'Logo', en: 'Logo' } },
          clickable: !!actionUrl,
          action: actionUrl ? { type: 'externalLink', url: actionUrl, target: '_self' } : undefined,
        },
      },
    ];
  }
  // Aggiorna solo il PRIMO IMAGE_BLOCK; gli altri (loghi istituzionali file-based) rimangono intatti
  let first = true;
  return items.map(item => {
    if (item['type'] !== 'IMAGE_BLOCK' || !first) return item;
    first = false;
    const props = (item['props'] as Record<string, unknown>) ?? {};
    const image = (props['image'] as Record<string, unknown>) ?? {};
    const action = (props['action'] as Record<string, unknown>) ?? {};
    return {
      ...item,
      props: {
        ...props,
        image: { ...image, type: imgType, value: imgValue || image['value'] },
        action: { ...action, url: actionUrl || action['url'] },
      },
    };
  });
}

function patchFirstTextInItems(
  items: Record<string, unknown>[],
  textIt: string,
): Record<string, unknown>[] {
  if (!items.some(i => i['type'] === 'TEXT')) {
    if (!textIt) return items;
    return [
      {
        id: 'text-1',
        type: 'TEXT',
        enabled: true,
        props: { text: { it: textIt, en: textIt }, fontSize: 'md', fontWeight: 'normal', color: 'white' },
      },
      ...items,
    ];
  }
  let first = true;
  return items.map(item => {
    if (item['type'] !== 'TEXT' || !first) return item;
    first = false;
    const props = (item['props'] as Record<string, unknown>) ?? {};
    const text = (props['text'] as Record<string, unknown>) ?? {};
    return { ...item, props: { ...props, text: { ...text, it: textIt } } };
  });
}

function patchPage(
  pages: Record<string, unknown>[],
  id: string,
  title: string,
  subtitle: string,
  bgKey: string,
  bgValue: string,
): void {
  let page = findPage(pages, id);
  if (!page) {
    page = {
      id,
      name: { it: title, en: title },
      route: id,
      page: { [bgKey]: bgValue, areas: { layout: {}, start: { items: [] }, end: { items: [] } } },
    };
    pages.push(page);
  }
  const pageData = page['page'] as Record<string, unknown>;
  if (bgValue) pageData[bgKey] = bgValue;

  if (!pageData['areas']) pageData['areas'] = {};
  const areas = pageData['areas'] as Record<string, unknown>;
  if (!areas['start']) areas['start'] = { items: [] };
  const startSlot = areas['start'] as Record<string, unknown>;
  if (!startSlot['items']) startSlot['items'] = [];
  const startItems = startSlot['items'] as Record<string, unknown>[];

  const texts = startItems.filter(i => i['type'] === 'TEXT');
  if (texts.length === 0) {
    startItems.unshift(
      { id: 'subtitle', type: 'TEXT', enabled: true, props: { text: { it: subtitle, en: subtitle }, fontSize: 'md', fontWeight: 'normal', color: 'black' } },
      { id: 'title',    type: 'TEXT', enabled: true, props: { text: { it: title,    en: title    }, fontSize: 'xxl', fontWeight: 'semibold', color: 'primary' } },
    );
  } else {
    const props0 = (texts[0]?.['props'] as Record<string, unknown>) ?? {};
    const text0  = (props0['text'] as Record<string, unknown>) ?? {};
    (texts[0]!['props'] as Record<string, unknown>)['text'] = { ...text0, it: title };
    if (texts[1]) {
      const props1 = (texts[1]['props'] as Record<string, unknown>) ?? {};
      const text1  = (props1['text'] as Record<string, unknown>) ?? {};
      (texts[1]['props'] as Record<string, unknown>)['text'] = { ...text1, it: subtitle };
    }
  }
}

export function patchToJson(
  original: Record<string, unknown>,
  model: WebEditorModel,
): Record<string, unknown> {
  // Deep-clone so we don't mutate the original
  const result = JSON.parse(JSON.stringify(original)) as Record<string, unknown>;

  result['name']    = model.name;
  result['favicon'] = model.favicon;

  // Theme
  if (!result['theme']) result['theme'] = {};
  const theme = result['theme'] as Record<string, unknown>;
  if (!theme['colors']) theme['colors'] = {};
  const colors = theme['colors'] as Record<string, unknown>;
  colors['primary']   = model.color_primary;
  colors['secondary'] = model.color_secondary;
  colors['success']   = model.color_success;
  colors['warning']   = model.color_warning;
  colors['danger']    = model.color_danger;
  colors['info']      = model.color_info;
  colors['light']     = model.color_light;
  colors['dark']      = model.color_dark;
  if (!theme['typography']) theme['typography'] = {};
  (theme['typography'] as Record<string, unknown>)['fontFamily'] = model.fontFamily;

  // i18n
  if (!result['translate']) result['translate'] = {};
  const trans = result['translate'] as Record<string, unknown>;
  if (!trans['i18n']) trans['i18n'] = {};
  (trans['i18n'] as Record<string, unknown>)['defaultLanguage'] = model.defaultLanguage;

  // Header
  if (!result['header']) result['header'] = {};
  const header = result['header'] as Record<string, unknown>;

  // topbar
  if (!header['topbar']) header['topbar'] = {};
  const topbar = header['topbar'] as Record<string, unknown>;
  topbar['height']     = model.topbar_height;
  topbar['background'] = model.topbar_background;
  ensureAreas(topbar);
  const topbarAreas = topbar['areas'] as Record<string, unknown>;
  const topbarStart = (topbarAreas['start'] as Record<string, unknown>);
  topbarStart['items'] = patchLinksInItems(
    (topbarStart['items'] as Record<string, unknown>[]) ?? [],
    model.topbar_links,
  );
  const topbarEnd = (topbarAreas['end'] as Record<string, unknown>);
  topbarEnd['items'] = setEnabledInItems(
    setEnabledInItems(
      (topbarEnd['items'] as Record<string, unknown>[]) ?? [],
      'SELECT_LANG', model.showLangSelector,
    ),
    'USER_DROPDOWN_MENU', model.showUserMenu,
  );

  // main
  if (!header['main']) header['main'] = {};
  const main = header['main'] as Record<string, unknown>;
  main['height']     = model.main_height;
  main['background'] = model.main_background;
  ensureAreas(main);
  const mainAreas = main['areas'] as Record<string, unknown>;
  const mainStart = (mainAreas['start'] as Record<string, unknown>);
  mainStart['items'] = patchImageInItems(
    (mainStart['items'] as Record<string, unknown>[]) ?? [],
    model.logo_type,
    model.logo_value,
    model.logo_url,
  );
  const mainEnd = (mainAreas['end'] as Record<string, unknown>);
  mainEnd['items'] = patchSocialsInItems(
    (mainEnd['items'] as Record<string, unknown>[]) ?? [],
    model.header_socials,
  );

  // bottombar
  if (!header['bottombar']) header['bottombar'] = {};
  const btmbar = header['bottombar'] as Record<string, unknown>;
  btmbar['height']     = model.bottombar_height;
  btmbar['background'] = model.bottombar_background;
  ensureAreas(btmbar);
  const btmAreas = btmbar['areas'] as Record<string, unknown>;
  const btmEnd = (btmAreas['end'] as Record<string, unknown>);
  btmEnd['items'] = patchLinksInItems(
    (btmEnd['items'] as Record<string, unknown>[]) ?? [],
    model.bottombar_links,
  );

  // Footer
  if (!result['footer']) result['footer'] = {};
  const footer = result['footer'] as Record<string, unknown>;

  // footer main
  if (!footer['main']) footer['main'] = {};
  const fMain = footer['main'] as Record<string, unknown>;
  fMain['height']     = model.footer_main_height;
  fMain['background'] = model.footer_main_background;
  ensureAreas(fMain);
  const fMainAreas = fMain['areas'] as Record<string, unknown>;
  const fMainStart = (fMainAreas['start'] as Record<string, unknown>);
  fMainStart['items'] = patchFirstTextInItems(
    patchImageInItems(
      (fMainStart['items'] as Record<string, unknown>[]) ?? [],
      model.footer_logo_type,
      model.footer_logo_value,
      '',
    ),
    model.footer_description,
  );
  const fMainEnd = (fMainAreas['end'] as Record<string, unknown>);
  fMainEnd['items'] = patchSocialsInItems(
    (fMainEnd['items'] as Record<string, unknown>[]) ?? [],
    model.footer_socials,
  );

  // footer bottombar
  if (!footer['bottombar']) footer['bottombar'] = {};
  const fBtm = footer['bottombar'] as Record<string, unknown>;
  fBtm['height']     = model.footer_bottom_height;
  fBtm['background'] = model.footer_bottom_background;
  ensureAreas(fBtm);
  const fBtmAreas = fBtm['areas'] as Record<string, unknown>;
  const fBtmStart = (fBtmAreas['start'] as Record<string, unknown>);
  fBtmStart['items'] = patchLinksInItems(
    (fBtmStart['items'] as Record<string, unknown>[]) ?? [],
    model.footer_bottom_links,
  );

  // Pages
  if (!Array.isArray(result['pages'])) result['pages'] = [];
  const pages = result['pages'] as Record<string, unknown>[];
  patchPage(pages, '/login', model.login_title, model.login_subtitle, 'backgroundImage', model.login_background);
  patchPage(pages, '/',      model.home_title,  model.home_subtitle,  'backgroundColor', model.home_background);

  return result;
}
