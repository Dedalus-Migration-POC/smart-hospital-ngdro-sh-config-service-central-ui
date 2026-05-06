// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WebAppConfigJson = Record<string, any>;

export interface WebEditorModel {
  name: string;
  favicon: string;
  color_primary: string;
  color_secondary: string;
  color_success: string;
  color_warning: string;
  color_danger: string;
  color_info: string;
  color_light: string;
  color_dark: string;
  fontFamily: string;
  defaultLanguage: string;
  topbar_height: string;
  topbar_background: string;
  topbar_links: Array<{ text_it: string; url: string }>;
  showLangSelector: boolean;
  showUserMenu: boolean;
  main_height: string;
  main_background: string;
  logo_svg: string;
  logo_url: string;
  header_socials: Array<{ id: string; url: string }>;
  bottombar_height: string;
  bottombar_background: string;
  bottombar_links: Array<{ text_it: string; url: string }>;
  footer_main_height: string;
  footer_main_background: string;
  footer_description: string;
  footer_logo_svg: string;
  footer_socials: Array<{ id: string; url: string }>;
  footer_bottom_height: string;
  footer_bottom_background: string;
  footer_bottom_links: Array<{ text_it: string; url: string }>;
  login_title: string;
  login_subtitle: string;
  login_background: string;
  home_title: string;
  home_subtitle: string;
  home_background: string;
}
