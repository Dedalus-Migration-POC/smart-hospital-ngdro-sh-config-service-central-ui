import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TranslatePipe } from '@ngx-translate/core';

import { extractExtra, reorderKeys } from '../../../../shared/utils/json-extra';

export interface SmhColorScheme {
  primary: string;
  onPrimary: string;
  secondary: string;
  onSecondary: string;
  error: string;
  onError: string;
  brightness: 'light' | 'dark';
  surface: string;
  onSurface: string;
}

export interface SmhTextStyle {
  fontWeight: string;
  fontSize: number;
}

export interface SmhTextTheme {
  fontFamily: string;
  titleLarge: SmhTextStyle;
  bodyMedium: SmhTextStyle;
  bodySmall: SmhTextStyle;
  labelSmall: SmhTextStyle;
}

export interface SmhLabelStyle {
  fontSize: number;
  fontWeight: string;
  color: string;
}

export interface SmhTabBarTheme {
  dividerColor: string;
  labelStyle: SmhLabelStyle;
  unselectedLabelStyle: SmhLabelStyle;
}

export interface SmhCardShape {
  type: string;
  borderRadius: number;
}

export interface SmhCardTheme {
  elevation: number;
  color: string;
  shape: SmhCardShape;
}

export interface SmhSduiExtension {
  titleColor: string;
  chipBackground: string;
  pillTabsBackground: string;
  statusUsed: string;
  statusToBeUsed: string;
  secondaryTextColor: string;
  buttonRowWidthPercent: number | null;
  buttonRowGap: number;
  tabIndicatorMs: number;
  contentFadeMs: number;
  labelFadeMs: number;
  descriptionFontWeight: string;
}

export interface SmhFseDashboardTheme {
  scaffold_background_color?: string;
  background_pattern_visible?: boolean;
  background_pattern_svg?: string;
  card_background_color?: string;
  card_radius?: number;
  card_shadow_color?: string;
  card_shadow_opacity?: number;
  card_shadow_blur_radius?: number;
  card_shadow_spread_radius?: number;
  card_shadow_offset_y?: number;
  banner_border_color?: string;
  banner_border_width?: number;
  banner_shadow_color?: string;
  banner_shadow_opacity?: number;
  banner_shadow_blur_radius?: number;
  banner_shadow_spread_radius?: number;
  banner_shadow_offset_y?: number;
  icon_background_color?: string;
  icon_color?: string;
  icon_radius?: number;
  badge_border_color?: string;
  badge_text_color?: string;
  title_color?: string;
  subtitle_color?: string;
  cta_button_color?: string;
}

export interface SmhFseAppBarAction {
  id?: string;
  svg_icon?: string;
}

export interface SmhFseAppBarConfig {
  visible?: boolean;
  background_color?: string;
  height?: number;
  title_text?: string;
  title_text_color?: string;
  show_notification_bell?: boolean;
  show_profile_avatar?: boolean;
  profile_avatar_background_color?: string;
  profile_avatar_icon_color?: string;
  logos?: { svg_icon?: string }[];
  extra_actions?: SmhFseAppBarAction[];
}

export interface SmhFseDashboardConfig {
  servizi_principali_preview_count?: number;
  altri_servizi_preview_count?: number;
  theme?: SmhFseDashboardTheme;
  app_bar?: SmhFseAppBarConfig;
  welcome_heading?: { visible?: boolean };
}

export interface SmhThemeDataJson {
  primaryColor?: string;
  primarySwatch?: string;
  scaffoldBackgroundColor?: string;
  colorScheme?: SmhColorScheme;
  textTheme?: SmhTextTheme;
  tabBarTheme?: SmhTabBarTheme;
  cardTheme?: SmhCardTheme;
  sduiExtension?: SmhSduiExtension;
  /** Blocco additivo per la variante mobile "Fse Dashboard" (vedi sh-core/fse_theme.dart). */
  fse_dashboard?: SmhFseDashboardConfig;
}

export interface SmhThemeDataEditorDialogData {
  value: SmhThemeDataJson;
}

const FONT_WEIGHTS = ['thin', 'w100', 'w200', 'w300', 'w400', 'normal', 'w500', 'w600', 'w700', 'bold', 'w800', 'w900'];

const FSE_THEME_KEYS = [
  'scaffold_background_color', 'background_pattern_visible', 'background_pattern_svg',
  'card_background_color', 'card_radius', 'card_shadow_color', 'card_shadow_opacity',
  'card_shadow_blur_radius', 'card_shadow_spread_radius', 'card_shadow_offset_y',
  'banner_border_color', 'banner_border_width', 'banner_shadow_color', 'banner_shadow_opacity',
  'banner_shadow_blur_radius', 'banner_shadow_spread_radius', 'banner_shadow_offset_y',
  'icon_background_color', 'icon_color', 'icon_radius',
  'badge_border_color', 'badge_text_color', 'title_color', 'subtitle_color', 'cta_button_color',
];
const FSE_APP_BAR_KEYS = [
  'visible', 'background_color', 'height', 'title_text', 'title_text_color',
  'show_notification_bell', 'show_profile_avatar', 'profile_avatar_background_color',
  'profile_avatar_icon_color', 'logos', 'extra_actions',
];

/** Rimuove dall'oggetto le chiavi con valore '' o null: evitano di sovrascrivere
 * i fallback dell'engine (es. colore primario) con una stringa vuota persistita. */
function stripEmpty(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === '' || value === null) continue;
    result[key] = value;
  }
  return result;
}

@Component({
  selector: 'app-smh-theme-data-editor-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatTabsModule,
    MatTooltipModule,
    TranslatePipe,
  ],
  templateUrl: './smh-theme-data-editor-dialog.html',
  styleUrl: './smh-theme-data-editor-dialog.scss',
})
export class SmhThemeDataEditorDialog {
  private readonly fb = inject(FormBuilder);
  readonly dialogRef = inject<MatDialogRef<SmhThemeDataEditorDialog, SmhThemeDataJson>>(MatDialogRef);
  readonly data = inject<SmhThemeDataEditorDialogData>(MAT_DIALOG_DATA);

  readonly fontWeights = FONT_WEIGHTS;

  readonly fseThemeColorFields: { key: string; labelKey: string; hint?: string }[] = [
    { key: 'scaffold_background_color', labelKey: 'smhThemeData.fseScaffoldBg', hint: '#F0F3F8' },
    { key: 'card_background_color',     labelKey: 'smhThemeData.fseCardBg', hint: '#FFFFFF' },
    { key: 'card_shadow_color',         labelKey: 'smhThemeData.fseCardShadowColor', hint: '#1F2A44' },
    { key: 'banner_border_color',       labelKey: 'smhThemeData.fseBannerBorderColor', hint: 'colore primario' },
    { key: 'banner_shadow_color',       labelKey: 'smhThemeData.fseBannerShadowColor', hint: '#1F2A44' },
    { key: 'icon_background_color',     labelKey: 'smhThemeData.fseIconBg', hint: '#F1F2F4' },
    { key: 'icon_color',                labelKey: 'smhThemeData.fseIconColor', hint: '#1F2A44' },
    { key: 'badge_border_color',        labelKey: 'smhThemeData.fseBadgeBorderColor', hint: 'colore primario' },
    { key: 'badge_text_color',          labelKey: 'smhThemeData.fseBadgeTextColor', hint: 'colore primario' },
    { key: 'title_color',               labelKey: 'smhThemeData.fseTitleColor', hint: '#111827' },
    { key: 'subtitle_color',            labelKey: 'smhThemeData.fseSubtitleColor', hint: '#6B7280' },
    { key: 'cta_button_color',          labelKey: 'smhThemeData.fseCtaButtonColor', hint: 'colore primario' },
  ];

  // Campi sconosciuti (non gestiti dalla UI) preservati al salvataggio.
  private readonly topExtra = extractExtra(this.data.value, [
    'primaryColor', 'primarySwatch', 'scaffoldBackgroundColor', 'colorScheme', 'textTheme', 'tabBarTheme', 'cardTheme',
    'sduiExtension', 'fse_dashboard',
  ]);
  private readonly colorSchemeExtra = extractExtra(this.data.value?.colorScheme, [
    'brightness', 'primary', 'onPrimary', 'secondary', 'onSecondary', 'error', 'onError', 'surface', 'onSurface',
  ]);
  private readonly textThemeExtra = extractExtra(this.data.value?.textTheme, [
    'fontFamily', 'titleLarge', 'bodyMedium', 'bodySmall', 'labelSmall',
  ]);
  private readonly titleLargeExtra = extractExtra(this.data.value?.textTheme?.titleLarge, ['fontWeight', 'fontSize']);
  private readonly bodyMediumExtra = extractExtra(this.data.value?.textTheme?.bodyMedium, ['fontWeight', 'fontSize']);
  private readonly bodySmallExtra = extractExtra(this.data.value?.textTheme?.bodySmall, ['fontWeight', 'fontSize']);
  private readonly labelSmallExtra = extractExtra(this.data.value?.textTheme?.labelSmall, ['fontWeight', 'fontSize']);
  private readonly tabBarThemeExtra = extractExtra(this.data.value?.tabBarTheme, [
    'dividerColor', 'labelStyle', 'unselectedLabelStyle',
  ]);
  private readonly tabLabelStyleExtra = extractExtra(this.data.value?.tabBarTheme?.labelStyle, ['fontSize', 'fontWeight', 'color']);
  private readonly tabUnselectedLabelStyleExtra = extractExtra(
    this.data.value?.tabBarTheme?.unselectedLabelStyle, ['fontSize', 'fontWeight', 'color'],
  );
  private readonly cardThemeExtra = extractExtra(this.data.value?.cardTheme, ['elevation', 'color', 'shape']);
  private readonly cardShapeExtra = extractExtra(this.data.value?.cardTheme?.shape, ['type', 'borderRadius']);
  private readonly sduiExtensionExtra = extractExtra(this.data.value?.sduiExtension, [
    'titleColor', 'chipBackground', 'pillTabsBackground', 'statusUsed', 'statusToBeUsed', 'secondaryTextColor',
    'buttonRowWidthPercent', 'buttonRowGap', 'tabIndicatorMs', 'contentFadeMs', 'labelFadeMs', 'descriptionFontWeight',
  ]);
  private readonly fseDashboardExtra = extractExtra(this.data.value?.fse_dashboard, [
    'servizi_principali_preview_count', 'altri_servizi_preview_count', 'theme', 'app_bar', 'welcome_heading',
  ]);
  private readonly fseThemeExtra = extractExtra(this.data.value?.fse_dashboard?.theme, FSE_THEME_KEYS);
  private readonly fseAppBarExtra = extractExtra(this.data.value?.fse_dashboard?.app_bar, FSE_APP_BAR_KEYS);
  private readonly fseWelcomeExtra = extractExtra(this.data.value?.fse_dashboard?.welcome_heading, ['visible']);

  // Ordine originale delle chiavi di ciascun (sotto-)oggetto: serve a riposizionare
  // correttamente eventuali campi extra dopo il merge con i valori del form.
  private readonly topOrder = Object.keys(this.data.value ?? {});
  private readonly colorSchemeOrder = Object.keys(this.data.value?.colorScheme ?? {});
  private readonly textThemeOrder = Object.keys(this.data.value?.textTheme ?? {});
  private readonly titleLargeOrder = Object.keys(this.data.value?.textTheme?.titleLarge ?? {});
  private readonly bodyMediumOrder = Object.keys(this.data.value?.textTheme?.bodyMedium ?? {});
  private readonly bodySmallOrder = Object.keys(this.data.value?.textTheme?.bodySmall ?? {});
  private readonly labelSmallOrder = Object.keys(this.data.value?.textTheme?.labelSmall ?? {});
  private readonly tabBarThemeOrder = Object.keys(this.data.value?.tabBarTheme ?? {});
  private readonly tabLabelStyleOrder = Object.keys(this.data.value?.tabBarTheme?.labelStyle ?? {});
  private readonly tabUnselectedLabelStyleOrder = Object.keys(this.data.value?.tabBarTheme?.unselectedLabelStyle ?? {});
  private readonly cardThemeOrder = Object.keys(this.data.value?.cardTheme ?? {});
  private readonly cardShapeOrder = Object.keys(this.data.value?.cardTheme?.shape ?? {});
  private readonly sduiExtensionOrder = Object.keys(this.data.value?.sduiExtension ?? {});
  private readonly fseDashboardOrder = Object.keys(this.data.value?.fse_dashboard ?? {});
  private readonly fseThemeOrder = Object.keys(this.data.value?.fse_dashboard?.theme ?? {});
  private readonly fseAppBarOrder = Object.keys(this.data.value?.fse_dashboard?.app_bar ?? {});
  private readonly fseWelcomeOrder = Object.keys(this.data.value?.fse_dashboard?.welcome_heading ?? {});

  // Extra/ordine per ogni voce degli array logos/extra_actions dell'app bar FSE
  // (stesso pattern del FAQ editor: WeakMap tenuta per FormGroup istanza).
  private readonly fseArrayItemMeta = new WeakMap<FormGroup, { extra: Record<string, unknown>; order: string[] }>();

  private makeFseLogoGroup(item?: { svg_icon?: string }): FormGroup {
    const group = this.fb.nonNullable.group({ svg_icon: [item?.svg_icon ?? ''] });
    this.fseArrayItemMeta.set(group, { extra: extractExtra(item, ['svg_icon']), order: Object.keys(item ?? {}) });
    return group;
  }

  private makeFseActionGroup(item?: SmhFseAppBarAction): FormGroup {
    const group = this.fb.nonNullable.group({ id: [item?.id ?? ''], svg_icon: [item?.svg_icon ?? ''] });
    this.fseArrayItemMeta.set(group, { extra: extractExtra(item, ['id', 'svg_icon']), order: Object.keys(item ?? {}) });
    return group;
  }

  readonly fseLogosArray: FormArray = this.fb.array(
    (this.data.value?.fse_dashboard?.app_bar?.logos ?? []).map((l) => this.makeFseLogoGroup(l)),
  );
  readonly fseExtraActionsArray: FormArray = this.fb.array(
    (this.data.value?.fse_dashboard?.app_bar?.extra_actions ?? []).map((a) => this.makeFseActionGroup(a)),
  );

  addFseLogo(): void { this.fseLogosArray.push(this.makeFseLogoGroup()); }
  removeFseLogo(i: number): void { this.fseLogosArray.removeAt(i); }
  addFseExtraAction(): void { this.fseExtraActionsArray.push(this.makeFseActionGroup()); }
  removeFseExtraAction(i: number): void { this.fseExtraActionsArray.removeAt(i); }
  asFormGroup(ctrl: unknown): FormGroup { return ctrl as FormGroup; }


  readonly form: FormGroup = this.fb.nonNullable.group({
    primaryColor:             [this.data.value?.primaryColor ?? '#19509A'],
    primarySwatch:            [this.data.value?.primarySwatch ?? 'blue'],
    scaffoldBackgroundColor:  [this.data.value?.scaffoldBackgroundColor ?? '#E9F1FC'],
    colorScheme: this.fb.nonNullable.group({
      brightness:   [this.data.value?.colorScheme?.brightness ?? 'light'],
      primary:      [this.data.value?.colorScheme?.primary    ?? '#19509A'],
      onPrimary:    [this.data.value?.colorScheme?.onPrimary  ?? '#FFFFFF'],
      secondary:    [this.data.value?.colorScheme?.secondary  ?? '#065170'],
      onSecondary:  [this.data.value?.colorScheme?.onSecondary ?? '#FFFFFF'],
      error:        [this.data.value?.colorScheme?.error      ?? '#FF0000'],
      onError:      [this.data.value?.colorScheme?.onError    ?? '#FFFFFF'],
      surface:      [this.data.value?.colorScheme?.surface    ?? '#FFFFFF'],
      onSurface:    [this.data.value?.colorScheme?.onSurface  ?? '#000000'],
    }),
    textTheme: this.fb.nonNullable.group({
      fontFamily:  [this.data.value?.textTheme?.fontFamily ?? 'TitilliumWeb'],
      titleLarge: this.fb.nonNullable.group({
        fontWeight: [this.data.value?.textTheme?.titleLarge?.fontWeight ?? 'w600'],
        fontSize:   [this.data.value?.textTheme?.titleLarge?.fontSize   ?? 24],
      }),
      bodyMedium: this.fb.nonNullable.group({
        fontWeight: [this.data.value?.textTheme?.bodyMedium?.fontWeight ?? 'w600'],
        fontSize:   [this.data.value?.textTheme?.bodyMedium?.fontSize   ?? 18],
      }),
      bodySmall: this.fb.nonNullable.group({
        fontWeight: [this.data.value?.textTheme?.bodySmall?.fontWeight ?? 'normal'],
        fontSize:   [this.data.value?.textTheme?.bodySmall?.fontSize   ?? 16],
      }),
      labelSmall: this.fb.nonNullable.group({
        fontWeight: [this.data.value?.textTheme?.labelSmall?.fontWeight ?? 'w700'],
        fontSize:   [this.data.value?.textTheme?.labelSmall?.fontSize   ?? 16],
      }),
    }),
    tabBarTheme: this.fb.nonNullable.group({
      dividerColor: [this.data.value?.tabBarTheme?.dividerColor ?? '#1A1A1A'],
      labelStyle: this.fb.nonNullable.group({
        fontSize:   [this.data.value?.tabBarTheme?.labelStyle?.fontSize   ?? 16],
        fontWeight: [this.data.value?.tabBarTheme?.labelStyle?.fontWeight ?? 'w600'],
        color:      [this.data.value?.tabBarTheme?.labelStyle?.color      ?? '#19509A'],
      }),
      unselectedLabelStyle: this.fb.nonNullable.group({
        fontSize:   [this.data.value?.tabBarTheme?.unselectedLabelStyle?.fontSize   ?? 16],
        fontWeight: [this.data.value?.tabBarTheme?.unselectedLabelStyle?.fontWeight ?? 'w600'],
        color:      [this.data.value?.tabBarTheme?.unselectedLabelStyle?.color      ?? '#9E9E9E'],
      }),
    }),
    sduiExtension: this.fb.nonNullable.group({
      titleColor:          [this.data.value?.sduiExtension?.titleColor          ?? '#17233B'],
      chipBackground:      [this.data.value?.sduiExtension?.chipBackground      ?? '#EBEEF3'],
      pillTabsBackground:  [this.data.value?.sduiExtension?.pillTabsBackground  ?? '#EDF1F7'],
      statusUsed:          [this.data.value?.sduiExtension?.statusUsed          ?? '#2E7D32'],
      statusToBeUsed:      [this.data.value?.sduiExtension?.statusToBeUsed      ?? '#8A5A00'],
      secondaryTextColor:  [this.data.value?.sduiExtension?.secondaryTextColor  ?? '#757575'],
      buttonRowWidthPercent: [this.data.value?.sduiExtension?.buttonRowWidthPercent ?? null],
      buttonRowGap:        [this.data.value?.sduiExtension?.buttonRowGap        ?? 12],
      tabIndicatorMs:      [this.data.value?.sduiExtension?.tabIndicatorMs      ?? 250],
      contentFadeMs:       [this.data.value?.sduiExtension?.contentFadeMs       ?? 120],
      labelFadeMs:         [this.data.value?.sduiExtension?.labelFadeMs         ?? 150],
      descriptionFontWeight: [this.data.value?.sduiExtension?.descriptionFontWeight ?? 'normal'],
    }),
    cardTheme: this.fb.nonNullable.group({
      elevation: [this.data.value?.cardTheme?.elevation ?? 5],
      color:     [this.data.value?.cardTheme?.color     ?? '#FFFFFF'],
      shape: this.fb.nonNullable.group({
        type:         [this.data.value?.cardTheme?.shape?.type         ?? 'RoundedRectangleBorder'],
        borderRadius: [this.data.value?.cardTheme?.shape?.borderRadius ?? 5.0],
      }),
    }),
    fseDashboard: this.fb.nonNullable.group({
      servizi_principali_preview_count: [this.data.value?.fse_dashboard?.servizi_principali_preview_count ?? 4],
      altri_servizi_preview_count:      [this.data.value?.fse_dashboard?.altri_servizi_preview_count      ?? 2],
      welcome_heading: this.fb.nonNullable.group({
        visible: [this.data.value?.fse_dashboard?.welcome_heading?.visible ?? true],
      }),
      theme: this.fb.nonNullable.group({
        scaffold_background_color:  [this.data.value?.fse_dashboard?.theme?.scaffold_background_color  ?? ''],
        background_pattern_visible: [this.data.value?.fse_dashboard?.theme?.background_pattern_visible ?? true],
        background_pattern_svg:     [this.data.value?.fse_dashboard?.theme?.background_pattern_svg     ?? ''],
        card_background_color:      [this.data.value?.fse_dashboard?.theme?.card_background_color      ?? ''],
        card_radius:                 [this.data.value?.fse_dashboard?.theme?.card_radius                ?? 8],
        card_shadow_color:           [this.data.value?.fse_dashboard?.theme?.card_shadow_color           ?? ''],
        card_shadow_opacity:         [this.data.value?.fse_dashboard?.theme?.card_shadow_opacity         ?? 0.10],
        card_shadow_blur_radius:     [this.data.value?.fse_dashboard?.theme?.card_shadow_blur_radius     ?? 10],
        card_shadow_spread_radius:   [this.data.value?.fse_dashboard?.theme?.card_shadow_spread_radius   ?? 0],
        card_shadow_offset_y:        [this.data.value?.fse_dashboard?.theme?.card_shadow_offset_y        ?? 3],
        banner_border_color:         [this.data.value?.fse_dashboard?.theme?.banner_border_color         ?? ''],
        banner_border_width:         [this.data.value?.fse_dashboard?.theme?.banner_border_width         ?? 1.5],
        banner_shadow_color:         [this.data.value?.fse_dashboard?.theme?.banner_shadow_color         ?? ''],
        banner_shadow_opacity:       [this.data.value?.fse_dashboard?.theme?.banner_shadow_opacity       ?? 0.22],
        banner_shadow_blur_radius:   [this.data.value?.fse_dashboard?.theme?.banner_shadow_blur_radius   ?? 18],
        banner_shadow_spread_radius: [this.data.value?.fse_dashboard?.theme?.banner_shadow_spread_radius ?? 1],
        banner_shadow_offset_y:      [this.data.value?.fse_dashboard?.theme?.banner_shadow_offset_y      ?? 6],
        icon_background_color:      [this.data.value?.fse_dashboard?.theme?.icon_background_color      ?? ''],
        icon_color:                  [this.data.value?.fse_dashboard?.theme?.icon_color                  ?? ''],
        icon_radius:                 [this.data.value?.fse_dashboard?.theme?.icon_radius                 ?? 999],
        badge_border_color:          [this.data.value?.fse_dashboard?.theme?.badge_border_color          ?? ''],
        badge_text_color:            [this.data.value?.fse_dashboard?.theme?.badge_text_color            ?? ''],
        title_color:                  [this.data.value?.fse_dashboard?.theme?.title_color                  ?? ''],
        subtitle_color:              [this.data.value?.fse_dashboard?.theme?.subtitle_color              ?? ''],
        cta_button_color:            [this.data.value?.fse_dashboard?.theme?.cta_button_color            ?? ''],
      }),
      app_bar: this.fb.nonNullable.group({
        visible:                             [this.data.value?.fse_dashboard?.app_bar?.visible                             ?? true],
        background_color:                    [this.data.value?.fse_dashboard?.app_bar?.background_color                    ?? ''],
        height:                               [this.data.value?.fse_dashboard?.app_bar?.height                               ?? 56],
        title_text:                           [this.data.value?.fse_dashboard?.app_bar?.title_text                           ?? ''],
        title_text_color:                     [this.data.value?.fse_dashboard?.app_bar?.title_text_color                     ?? ''],
        show_notification_bell:              [this.data.value?.fse_dashboard?.app_bar?.show_notification_bell              ?? true],
        show_profile_avatar:                 [this.data.value?.fse_dashboard?.app_bar?.show_profile_avatar                 ?? true],
        profile_avatar_background_color:     [this.data.value?.fse_dashboard?.app_bar?.profile_avatar_background_color     ?? ''],
        profile_avatar_icon_color:            [this.data.value?.fse_dashboard?.app_bar?.profile_avatar_icon_color            ?? ''],
      }),
    }),
  });

  constructor() {
    // Il colore primario è duplicato in due punti del JSON (colori generali e
    // schema colori): li teniamo sincronizzati in entrambe le direzioni.
    this.linkControls('primaryColor', 'colorScheme.primary');
  }

  private linkControls(pathA: string, pathB: string): void {
    const ctrlA = this.form.get(pathA)!;
    const ctrlB = this.form.get(pathB)!;
    ctrlA.valueChanges.subscribe((value) => {
      if (ctrlB.value !== value) ctrlB.setValue(value, { emitEvent: false });
    });
    ctrlB.valueChanges.subscribe((value) => {
      if (ctrlA.value !== value) ctrlA.setValue(value, { emitEvent: false });
    });
  }

  patchColor(path: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.form.get(path)?.setValue(value);
    this.form.markAsDirty();
  }

  getColor(path: string): string {
    return (this.form.get(path)?.value as string) ?? '#000000';
  }

  confirm(): void {
    const raw = this.form.getRawValue();
    const merged: Record<string, unknown> = {
      ...this.topExtra,
      primaryColor: raw.primaryColor,
      primarySwatch: raw.primarySwatch,
      scaffoldBackgroundColor: raw.scaffoldBackgroundColor,
      colorScheme: reorderKeys(
        { ...this.colorSchemeExtra, ...raw.colorScheme },
        this.colorSchemeOrder,
      ),
      textTheme: reorderKeys({
        ...this.textThemeExtra,
        fontFamily: raw.textTheme.fontFamily,
        titleLarge: reorderKeys({ ...this.titleLargeExtra, ...raw.textTheme.titleLarge }, this.titleLargeOrder),
        bodyMedium: reorderKeys({ ...this.bodyMediumExtra, ...raw.textTheme.bodyMedium }, this.bodyMediumOrder),
        bodySmall: reorderKeys({ ...this.bodySmallExtra, ...raw.textTheme.bodySmall }, this.bodySmallOrder),
        labelSmall: reorderKeys({ ...this.labelSmallExtra, ...raw.textTheme.labelSmall }, this.labelSmallOrder),
      }, this.textThemeOrder),
      sduiExtension: reorderKeys(
        { ...this.sduiExtensionExtra, ...raw.sduiExtension },
        this.sduiExtensionOrder,
      ),
      tabBarTheme: reorderKeys({
        ...this.tabBarThemeExtra,
        dividerColor: raw.tabBarTheme.dividerColor,
        labelStyle: reorderKeys(
          { ...this.tabLabelStyleExtra, ...raw.tabBarTheme.labelStyle }, this.tabLabelStyleOrder,
        ),
        unselectedLabelStyle: reorderKeys(
          { ...this.tabUnselectedLabelStyleExtra, ...raw.tabBarTheme.unselectedLabelStyle },
          this.tabUnselectedLabelStyleOrder,
        ),
      }, this.tabBarThemeOrder),
      cardTheme: reorderKeys({
        ...this.cardThemeExtra,
        elevation: raw.cardTheme.elevation,
        color: raw.cardTheme.color,
        shape: reorderKeys({ ...this.cardShapeExtra, ...raw.cardTheme.shape }, this.cardShapeOrder),
      }, this.cardThemeOrder),
      fse_dashboard: reorderKeys({
        ...this.fseDashboardExtra,
        servizi_principali_preview_count: raw.fseDashboard.servizi_principali_preview_count,
        altri_servizi_preview_count: raw.fseDashboard.altri_servizi_preview_count,
        welcome_heading: reorderKeys(
          { ...this.fseWelcomeExtra, ...raw.fseDashboard.welcome_heading }, this.fseWelcomeOrder,
        ),
        theme: reorderKeys(
          stripEmpty({ ...this.fseThemeExtra, ...raw.fseDashboard.theme }), this.fseThemeOrder,
        ),
        app_bar: reorderKeys(
          stripEmpty({
            ...this.fseAppBarExtra,
            ...raw.fseDashboard.app_bar,
            logos: this.fseLogosArray.controls.map((ctrl) => this.mergeFseArrayItem(ctrl as FormGroup)),
            extra_actions: this.fseExtraActionsArray.controls.map((ctrl) => this.mergeFseArrayItem(ctrl as FormGroup)),
          }),
          this.fseAppBarOrder,
        ),
      }, this.fseDashboardOrder),
    };
    const result = reorderKeys(merged, this.topOrder) as unknown as SmhThemeDataJson;
    this.dialogRef.close(result);
  }

  private mergeFseArrayItem(group: FormGroup): Record<string, unknown> {
    const meta = this.fseArrayItemMeta.get(group);
    const merged = stripEmpty({ ...(meta?.extra ?? {}), ...group.getRawValue() });
    return reorderKeys(merged, meta?.order ?? []);
  }
}
