import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';

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

export interface SmhThemeDataJson {
  primaryColor?: string;
  primarySwatch?: string;
  scaffoldBackgroundColor?: string;
  colorScheme?: SmhColorScheme;
  textTheme?: SmhTextTheme;
  tabBarTheme?: SmhTabBarTheme;
  cardTheme?: SmhCardTheme;
  sduiExtension?: SmhSduiExtension;
}

export interface SmhThemeDataEditorDialogData {
  value: SmhThemeDataJson;
}

const FONT_WEIGHTS = ['thin', 'w100', 'w200', 'w300', 'w400', 'normal', 'w500', 'w600', 'w700', 'bold', 'w800', 'w900'];

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
    MatTabsModule,
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

  // Campi sconosciuti (non gestiti dalla UI) preservati al salvataggio.
  private readonly topExtra = extractExtra(this.data.value, [
    'primaryColor', 'primarySwatch', 'scaffoldBackgroundColor', 'colorScheme', 'textTheme', 'tabBarTheme', 'cardTheme',
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
    };
    const result = reorderKeys(merged, this.topOrder) as unknown as SmhThemeDataJson;
    this.dialogRef.close(result);
  }
}
