import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { toUserMessage } from '../../../../core/http/api-error';
import { Tenant, TENANT_SLUG_PATTERN } from '../../models';
import { TenantService } from '../../services/tenants';

export interface TenantCreateDialogData {
  installationId: string;
  installationName: string;
}

@Component({
  selector: 'app-tenant-create-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    TranslatePipe,
  ],
  templateUrl: './tenant-create-dialog.html',
})
export class TenantCreateDialog {
  readonly data = inject<TenantCreateDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<TenantCreateDialog, Tenant>);
  private readonly fb = inject(FormBuilder);
  private readonly tenants = inject(TenantService);
  private readonly translate = inject(TranslateService);

  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    slug: [
      '',
      [
        Validators.required,
        Validators.maxLength(100),
        Validators.pattern(TENANT_SLUG_PATTERN),
      ],
    ],
    name: ['', [Validators.required, Validators.maxLength(255)]],
  });

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) return;

    this.saving.set(true);
    this.errorMessage.set(null);
    const v = this.form.getRawValue();

    this.tenants.create(this.data.installationId, { slug: v.slug, name: v.name }).subscribe({
      next: (tenant) => {
        this.saving.set(false);
        this.ref.close(tenant);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.errorMessage.set(toUserMessage(err, this.translate.instant('product.createError')));
      },
    });
  }

  cancel(): void {
    this.ref.close();
  }
}
