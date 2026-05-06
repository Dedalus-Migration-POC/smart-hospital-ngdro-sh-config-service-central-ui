import { SlicePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Cfg = Record<string, any>;

@Component({
  selector: 'app-web-page-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SlicePipe],
  templateUrl: './web-page-preview.html',
  styleUrl: './web-page-preview.scss',
})
export class WebPagePreview {
  // Partial form value — arrives as form.value so all fields are optional
  readonly config = input<Partial<Cfg> | null | undefined>(null);

  readonly colors = computed((): Record<string, string> => {
    const cfg = this.config() as Cfg | null;
    return (cfg?.['color_primary'] !== undefined)
      ? this.flatColors(cfg!)
      : ((cfg?.['theme']?.['colors'] as Record<string, string>) ?? {});
  });

  private flatColors(cfg: Cfg): Record<string, string> {
    return {
      primary:   cfg['color_primary']   ?? '#3823f5',
      secondary: cfg['color_secondary'] ?? '#6c757d',
      success:   cfg['color_success']   ?? '#198754',
      warning:   cfg['color_warning']   ?? '#ffc107',
      danger:    cfg['color_danger']    ?? '#dc3545',
      info:      cfg['color_info']      ?? '#0dcaf0',
      light:     cfg['color_light']     ?? '#f8f9fa',
      dark:      cfg['color_dark']      ?? '#212529',
    };
  }

  resolveColor(ref: string | undefined): string {
    if (!ref) return '';
    if (ref.startsWith('#') || ref.startsWith('rgb') || ref === 'transparent' || ref === 'unset') return ref;
    return this.colors()[ref] ?? ref;
  }

  svgUri(svg: string | null | undefined): string {
    if (!svg) return '';
    const t = svg.trimStart();
    if (t.startsWith('<') || t.startsWith('<?xml')) {
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    }
    return `data:image/svg+xml;base64,${svg}`;
  }

  get topbar(): Cfg { return (this.config() as Cfg)?.[`header`]?.['topbar'] ?? this.config() ?? {}; }
  get mainHeader(): Cfg { return (this.config() as Cfg)?.['header']?.['main'] ?? {}; }
  get bottombar(): Cfg { return (this.config() as Cfg)?.['header']?.['bottombar'] ?? {}; }
  get footerMain(): Cfg { return (this.config() as Cfg)?.['footer']?.['main'] ?? {}; }
  get footerBottom(): Cfg { return (this.config() as Cfg)?.['footer']?.['bottombar'] ?? {}; }

  // For the flat form model (when config comes from form.value)
  get topbarBg(): string    { return this.resolveColor((this.config() as Cfg)?.['topbar_background']     ?? this.topbar['background']); }
  get mainBg(): string      { return this.resolveColor((this.config() as Cfg)?.['main_background']       ?? this.mainHeader['background']); }
  get bottombarBg(): string { return this.resolveColor((this.config() as Cfg)?.['bottombar_background']  ?? this.bottombar['background']); }
  get fMainBg(): string     { return this.resolveColor((this.config() as Cfg)?.['footer_main_background']?? this.footerMain['background']); }
  get fBottomBg(): string   { return this.resolveColor((this.config() as Cfg)?.['footer_bottom_background'] ?? this.footerBottom['background']); }

  get logoSvg(): string    { return (this.config() as Cfg)?.['logo_svg']        ?? ''; }
  get logoUrl(): string    { return (this.config() as Cfg)?.['logo_url']        ?? '/'; }
  get topbarLinks(): Cfg[] { return (this.config() as Cfg)?.['topbar_links']    ?? []; }
  get btmLinks(): Cfg[]    { return (this.config() as Cfg)?.['bottombar_links'] ?? []; }
  get headerSocials(): Cfg[]{ return (this.config() as Cfg)?.['header_socials'] ?? []; }
  get appName(): string    { return (this.config() as Cfg)?.['name']            ?? ''; }
  get homeTitle(): string  { return (this.config() as Cfg)?.['home_title']      ?? ''; }
  get homeSub(): string    { return (this.config() as Cfg)?.['home_subtitle']   ?? ''; }
  get homeBg(): string     { return this.resolveColor((this.config() as Cfg)?.['home_background'] ?? ''); }
  get fDesc(): string      { return (this.config() as Cfg)?.['footer_description'] ?? ''; }
  get fLogoSvg(): string   { return (this.config() as Cfg)?.['footer_logo_svg']    ?? ''; }
  get fSocials(): Cfg[]    { return (this.config() as Cfg)?.['footer_socials']      ?? []; }
  get fBtmLinks(): Cfg[]   { return (this.config() as Cfg)?.['footer_bottom_links'] ?? []; }
  get showLang(): boolean  { return (this.config() as Cfg)?.['showLangSelector'] !== false; }
  get showUser(): boolean  { return (this.config() as Cfg)?.['showUserMenu']     !== false; }
  get primaryColor(): string { return this.resolveColor('primary'); }
}
