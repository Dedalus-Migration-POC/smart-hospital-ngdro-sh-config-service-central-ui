import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';

import { TranslatePipe } from '@ngx-translate/core';

export interface NewsItem {
  title: string;
  url: string;
}

export type SmhNewsJson = NewsItem[];

export interface SmhNewsEditorDialogData {
  value: SmhNewsJson;
}

@Component({
  selector: 'app-smh-news-editor-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatTooltipModule,
    DragDropModule,
    TranslatePipe,
  ],
  templateUrl: './smh-news-editor-dialog.html',
  styleUrl: './smh-news-editor-dialog.scss',
})
export class SmhNewsEditorDialog {
  private readonly fb = inject(FormBuilder);
  readonly dialogRef = inject<MatDialogRef<SmhNewsEditorDialog, SmhNewsJson>>(MatDialogRef);
  readonly data = inject<SmhNewsEditorDialogData>(MAT_DIALOG_DATA);

  readonly newsArray: FormArray = this.fb.array(
    (this.data.value ?? []).map((item) => this.makeGroup(item)),
  );

  private makeGroup(item?: Partial<NewsItem>): FormGroup {
    return this.fb.nonNullable.group({
      title: [item?.title ?? '', Validators.required],
      url:   [item?.url   ?? '', Validators.required],
    });
  }

  asFormGroup(ctrl: unknown): FormGroup { return ctrl as FormGroup; }

  add(): void {
    this.newsArray.push(this.makeGroup());
  }

  remove(i: number): void {
    this.newsArray.removeAt(i);
  }

  drop(event: CdkDragDrop<FormGroup[]>): void {
    const ctrl = this.newsArray.at(event.previousIndex);
    this.newsArray.removeAt(event.previousIndex, { emitEvent: false });
    this.newsArray.insert(event.currentIndex, ctrl, { emitEvent: false });
    this.newsArray.updateValueAndValidity();
  }

  confirm(): void {
    if (this.newsArray.invalid) {
      this.newsArray.markAllAsTouched();
      return;
    }
    this.dialogRef.close(this.newsArray.getRawValue() as SmhNewsJson);
  }
}
