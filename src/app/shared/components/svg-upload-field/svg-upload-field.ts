import { ChangeDetectionStrategy, Component, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-svg-upload-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, MatTooltipModule, TranslatePipe],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SvgUploadField), multi: true }],
  templateUrl: './svg-upload-field.html',
  styleUrl: './svg-upload-field.scss',
})
export class SvgUploadField implements ControlValueAccessor {
  readonly value = signal<string>('');
  readonly isDisabled = signal(false);

  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  get previewSrc(): string {
    const v = this.value();
    return v ? `data:image/svg+xml;base64,${v}` : '';
  }

  writeValue(v: string | null): void { this.value.set(v ?? ''); }
  registerOnChange(fn: (v: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(d: boolean): void { this.isDisabled.set(d); }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1] ?? '';
      this.value.set(base64);
      this.onChange(base64);
      this.onTouched();
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  clear(): void {
    this.value.set('');
    this.onChange('');
    this.onTouched();
  }
}
