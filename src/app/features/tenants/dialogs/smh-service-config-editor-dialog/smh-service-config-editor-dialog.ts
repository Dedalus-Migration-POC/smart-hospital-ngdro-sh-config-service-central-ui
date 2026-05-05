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

export interface ServiceItem {
  id: string;
  routeName?: string;
  link?: string;
  hidden: boolean;
  disabled: boolean;
}

export interface SmhServiceConfigJson {
  services: ServiceItem[];
}

export interface SmhServiceConfigEditorDialogData {
  value: SmhServiceConfigJson | ServiceItem[] | unknown;
}

@Component({
  selector: 'app-smh-service-config-editor-dialog',
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
    TranslatePipe,
  ],
  templateUrl: './smh-service-config-editor-dialog.html',
  styleUrl: './smh-service-config-editor-dialog.scss',
})
export class SmhServiceConfigEditorDialog {
  private readonly fb = inject(FormBuilder);
  readonly dialogRef = inject<MatDialogRef<SmhServiceConfigEditorDialog, SmhServiceConfigJson>>(MatDialogRef);
  readonly data = inject<SmhServiceConfigEditorDialogData>(MAT_DIALOG_DATA);

  readonly servicesArray: FormArray = this.fb.array(this.parseServices().map((s) => this.makeGroup(s)));

  private parseServices(): ServiceItem[] {
    const v = this.data.value;
    if (Array.isArray(v)) return v as ServiceItem[];
    if (v && typeof v === 'object' && 'services' in (v as object)) {
      return ((v as SmhServiceConfigJson).services ?? []);
    }
    return [];
  }

  private makeGroup(item?: Partial<ServiceItem>): FormGroup {
    return this.fb.nonNullable.group({
      id:        [item?.id        ?? '', Validators.required],
      routeName: [item?.routeName ?? ''],
      link:      [item?.link      ?? ''],
      hidden:    [item?.hidden    ?? false],
      disabled:  [item?.disabled  ?? false],
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
    const raw = this.servicesArray.getRawValue() as ServiceItem[];
    const services: ServiceItem[] = raw.map((s) => {
      const out: ServiceItem = { id: s.id, hidden: s.hidden, disabled: s.disabled };
      if (s.routeName?.trim()) out.routeName = s.routeName.trim();
      if (s.link?.trim()) out.link = s.link.trim();
      return out;
    });
    this.dialogRef.close({ services });
  }
}
