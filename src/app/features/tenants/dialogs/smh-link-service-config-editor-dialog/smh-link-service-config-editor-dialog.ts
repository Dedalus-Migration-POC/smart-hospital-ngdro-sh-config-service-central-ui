import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { TranslatePipe } from '@ngx-translate/core';

import { SvgUploadField } from '../../../../shared/components/svg-upload-field/svg-upload-field';

export interface LinkServiceItem {
  id: string;
  title: string;
  description?: string;
  link?: string;
  web: boolean;
  mobile: boolean;
  hidden: boolean;
  disabled: boolean;
  svgWeb?: string | null;
  svgMobile?: string | null;
}

export interface SmhLinkServiceConfigJson {
  services: LinkServiceItem[];
}

export interface SmhLinkServiceConfigEditorDialogData {
  value: SmhLinkServiceConfigJson | LinkServiceItem[] | unknown;
}

@Component({
  selector: 'app-smh-link-service-config-editor-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSlideToggleModule,
    MatTooltipModule,
    DragDropModule,
    SvgUploadField,
    TranslatePipe,
  ],
  templateUrl: './smh-link-service-config-editor-dialog.html',
  styleUrl: './smh-link-service-config-editor-dialog.scss',
})
export class SmhLinkServiceConfigEditorDialog {
  private readonly fb = inject(FormBuilder);
  readonly dialogRef = inject<MatDialogRef<SmhLinkServiceConfigEditorDialog, SmhLinkServiceConfigJson>>(MatDialogRef);
  readonly data = inject<SmhLinkServiceConfigEditorDialogData>(MAT_DIALOG_DATA);

  readonly servicesArray: FormArray = this.fb.array(this.parseServices().map((s) => this.makeGroup(s)));

  private parseServices(): LinkServiceItem[] {
    const v = this.data.value;
    if (Array.isArray(v)) return v as LinkServiceItem[];
    if (v && typeof v === 'object' && 'services' in (v as object)) {
      return ((v as SmhLinkServiceConfigJson).services ?? []);
    }
    return [];
  }

  private makeGroup(item?: Partial<LinkServiceItem>): FormGroup {
    return this.fb.nonNullable.group({
      id:          [item?.id          ?? '', Validators.required],
      title:       [item?.title       ?? '', Validators.required],
      description: [item?.description ?? ''],
      link:        [item?.link        ?? ''],
      web:         [item?.web         ?? true],
      mobile:      [item?.mobile      ?? true],
      hidden:      [item?.hidden      ?? false],
      disabled:    [item?.disabled    ?? false],
      svgWeb:      [item?.svgWeb      ?? ''],
      svgMobile:   [item?.svgMobile   ?? ''],
    });
  }

  asFormGroup(ctrl: unknown): FormGroup { return ctrl as FormGroup; }

  add(): void {
    this.servicesArray.push(this.makeGroup());
  }

  remove(i: number): void {
    this.servicesArray.removeAt(i);
  }

  drop(event: CdkDragDrop<FormGroup[]>): void {
    const ctrl = this.servicesArray.at(event.previousIndex);
    this.servicesArray.removeAt(event.previousIndex, { emitEvent: false });
    this.servicesArray.insert(event.currentIndex, ctrl, { emitEvent: false });
    this.servicesArray.updateValueAndValidity();
  }

  confirm(): void {
    if (this.servicesArray.invalid) {
      this.servicesArray.markAllAsTouched();
      return;
    }
    const raw = this.servicesArray.getRawValue() as LinkServiceItem[];
    const services: LinkServiceItem[] = raw.map((s) => {
      const out: LinkServiceItem = {
        id: s.id,
        title: s.title,
        web: s.web,
        mobile: s.mobile,
        hidden: s.hidden,
        disabled: s.disabled,
      };
      if (s.description?.trim()) out.description = s.description.trim();
      if (s.link?.trim()) out.link = s.link.trim();
      out.svgWeb = s.svgWeb || null;
      out.svgMobile = s.svgMobile || null;
      return out;
    });
    this.dialogRef.close({ services });
  }
}
