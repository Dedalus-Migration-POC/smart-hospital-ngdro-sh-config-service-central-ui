import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';

import { SvgUploadField } from '../../../../shared/components/svg-upload-field/svg-upload-field';
import { WebPagePreview } from '../../components/web-page-preview/web-page-preview';
import { WebAppConfigJson, WebEditorModel } from './web-app-config-types';
import {
  extractModel,
  patchToJson,
} from './web-app-config-patch';

export type { WebAppConfigJson } from './web-app-config-types';

export interface WebAppConfigEditorDialogData {
  value: WebAppConfigJson;
}

@Component({
  selector: 'app-web-app-config-editor-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatTabsModule,
    MatTooltipModule,
    MatCheckboxModule,
    TranslatePipe,
    SvgUploadField,
    WebPagePreview,
  ],
  templateUrl: './web-app-config-editor-dialog.html',
  styleUrl: './web-app-config-editor-dialog.scss',
})
export class WebAppConfigEditorDialog {
  private readonly fb = inject(FormBuilder);
  readonly dialogRef = inject<MatDialogRef<WebAppConfigEditorDialog, WebAppConfigJson>>(MatDialogRef);
  readonly data = inject<WebAppConfigEditorDialogData>(MAT_DIALOG_DATA);

  private readonly originalJson: WebAppConfigJson = this.data.value;
  private readonly initialModel: WebEditorModel = extractModel(this.data.value as Record<string, unknown>);

  readonly form = this.buildForm(this.initialModel);

  readonly colorFields: Array<{ key: string; label: string }> = [
    { key: 'color_primary',   label: 'Primary'   },
    { key: 'color_secondary', label: 'Secondary' },
    { key: 'color_success',   label: 'Success'   },
    { key: 'color_warning',   label: 'Warning'   },
    { key: 'color_danger',    label: 'Danger'    },
    { key: 'color_info',      label: 'Info'      },
    { key: 'color_light',     label: 'Light'     },
    { key: 'color_dark',      label: 'Dark'      },
  ];

  get topbarLinksArray(): FormArray { return this.form.get('topbar_links') as FormArray; }
  get headerSocialsArray(): FormArray { return this.form.get('header_socials') as FormArray; }
  get bottombarLinksArray(): FormArray { return this.form.get('bottombar_links') as FormArray; }
  get footerSocialsArray(): FormArray { return this.form.get('footer_socials') as FormArray; }
  get footerBottomLinksArray(): FormArray { return this.form.get('footer_bottom_links') as FormArray; }

  asFormGroup(ctrl: unknown): FormGroup { return ctrl as FormGroup; }

  private buildForm(m: WebEditorModel): FormGroup {
    return this.fb.nonNullable.group({
      name:              [m.name],
      favicon:           [m.favicon],
      color_primary:     [m.color_primary],
      color_secondary:   [m.color_secondary],
      color_success:     [m.color_success],
      color_warning:     [m.color_warning],
      color_danger:      [m.color_danger],
      color_info:        [m.color_info],
      color_light:       [m.color_light],
      color_dark:        [m.color_dark],
      fontFamily:        [m.fontFamily],
      defaultLanguage:   [m.defaultLanguage],
      topbar_height:     [m.topbar_height],
      topbar_background: [m.topbar_background],
      topbar_links:      this.fb.array(m.topbar_links.map(l => this.makeLinkGroup(l))),
      showLangSelector:  [m.showLangSelector],
      showUserMenu:      [m.showUserMenu],
      main_height:       [m.main_height],
      main_background:   [m.main_background],
      logo_svg:          [m.logo_svg],
      logo_url:          [m.logo_url],
      header_socials:    this.fb.array(m.header_socials.map(s => this.makeSocialGroup(s))),
      bottombar_height:     [m.bottombar_height],
      bottombar_background: [m.bottombar_background],
      bottombar_links:      this.fb.array(m.bottombar_links.map(l => this.makeLinkGroup(l))),
      footer_main_height:     [m.footer_main_height],
      footer_main_background: [m.footer_main_background],
      footer_description:     [m.footer_description],
      footer_logo_svg:        [m.footer_logo_svg],
      footer_socials:         this.fb.array(m.footer_socials.map(s => this.makeSocialGroup(s))),
      footer_bottom_height:     [m.footer_bottom_height],
      footer_bottom_background: [m.footer_bottom_background],
      footer_bottom_links:      this.fb.array(m.footer_bottom_links.map(l => this.makeLinkGroup(l))),
      login_title:      [m.login_title],
      login_subtitle:   [m.login_subtitle],
      login_background: [m.login_background],
      home_title:       [m.home_title],
      home_subtitle:    [m.home_subtitle],
      home_background:  [m.home_background],
    });
  }

  private makeLinkGroup(l?: { text_it?: string; url?: string }): FormGroup {
    return this.fb.nonNullable.group({
      text_it: [l?.text_it ?? '', Validators.required],
      url:     [l?.url     ?? '', Validators.required],
    });
  }

  private makeSocialGroup(s?: { id?: string; url?: string }): FormGroup {
    return this.fb.nonNullable.group({
      id:  [s?.id  ?? '', Validators.required],
      url: [s?.url ?? ''],
    });
  }

  addTopbarLink():          void { this.topbarLinksArray.push(this.makeLinkGroup()); }
  removeTopbarLink(i: number):  void { this.topbarLinksArray.removeAt(i); }
  addHeaderSocial():        void { this.headerSocialsArray.push(this.makeSocialGroup()); }
  removeHeaderSocial(i: number): void { this.headerSocialsArray.removeAt(i); }
  addBottombarLink():       void { this.bottombarLinksArray.push(this.makeLinkGroup()); }
  removeBottombarLink(i: number): void { this.bottombarLinksArray.removeAt(i); }
  addFooterSocial():        void { this.footerSocialsArray.push(this.makeSocialGroup()); }
  removeFooterSocial(i: number): void { this.footerSocialsArray.removeAt(i); }
  addFooterBottomLink():    void { this.footerBottomLinksArray.push(this.makeLinkGroup()); }
  removeFooterBottomLink(i: number): void { this.footerBottomLinksArray.removeAt(i); }

  setColor(name: string, event: Event): void {
    this.form.get(name)?.setValue((event.target as HTMLInputElement).value);
  }

  confirm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const model = this.form.getRawValue() as WebEditorModel;
    const result = patchToJson(this.originalJson as Record<string, unknown>, model);
    this.dialogRef.close(result as WebAppConfigJson);
  }
}
