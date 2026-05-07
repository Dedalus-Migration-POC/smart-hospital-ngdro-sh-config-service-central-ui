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

export interface SmhThemeDataJson {
  primaryColor?: string;
  primarySwatch?: string;
  scaffoldBackgroundColor?: string;
  colorScheme?: SmhColorScheme;
  textTheme?: SmhTextTheme;
  tabBarTheme?: SmhTabBarTheme;
  cardTheme?: SmhCardTheme;
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
    cardTheme: this.fb.nonNullable.group({
      elevation: [this.data.value?.cardTheme?.elevation ?? 5],
      color:     [this.data.value?.cardTheme?.color     ?? '#FFFFFF'],
      shape: this.fb.nonNullable.group({
        type:         [this.data.value?.cardTheme?.shape?.type         ?? 'RoundedRectangleBorder'],
        borderRadius: [this.data.value?.cardTheme?.shape?.borderRadius ?? 5.0],
      }),
    }),
  });

  patchColor(path: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.form.get(path)?.setValue(value);
    this.form.markAsDirty();
  }

  getColor(path: string): string {
    return (this.form.get(path)?.value as string) ?? '#000000';
  }

  confirm(): void {
    this.dialogRef.close(this.form.getRawValue() as SmhThemeDataJson);
  }
}
