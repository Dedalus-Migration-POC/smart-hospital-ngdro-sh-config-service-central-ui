import { HttpErrorResponse } from '@angular/common/http';
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
import { BrowserProvisionService } from '../../../../core/provision/browser-provision';
import { Tenant, TENANT_SLUG_PATTERN, TenantCloneResponse } from '../../models';
import { TenantService } from '../../services/tenants';

export interface TenantCloneDialogData {
  sourceTenant: Tenant;
}

export type TenantCloneDialogResult = Omit<TenantCloneResponse, 'tenant'> & { tenant: Tenant };

@Component({
  selector: 'app-tenant-clone-dialog',
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
  templateUrl: './tenant-clone-dialog.html',
})
export class TenantCloneDialog {
  readonly data = inject<TenantCloneDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<TenantCloneDialog, TenantCloneDialogResult>);
  private readonly fb = inject(FormBuilder);
  private readonly tenants = inject(TenantService);
  private readonly translate = inject(TranslateService);
  private readonly browserProvision = inject(BrowserProvisionService);

  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  // true quando l'ultimo tentativo ha fallito per slug già esistente: mostra l'opzione "sovrascrivi"
  readonly conflict = signal(false);

  readonly form = this.fb.nonNullable.group({
    slug: [
      `${this.data.sourceTenant.slug}-copia`,
      [
        Validators.required,
        Validators.maxLength(100),
        Validators.pattern(TENANT_SLUG_PATTERN),
      ],
    ],
    name: [
      `${this.data.sourceTenant.name} (copia)`,
      [Validators.required, Validators.maxLength(255)],
    ],
  });

  constructor() {
    this.form.controls.slug.valueChanges.subscribe(() => {
      this.conflict.set(false);
      this.errorMessage.set(null);
    });
  }

  submit(overwrite = false): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) return;

    this.saving.set(true);
    this.errorMessage.set(null);
    this.conflict.set(false);
    const v = this.form.getRawValue();

    this.tenants.clone(this.data.sourceTenant.id, { slug: v.slug, name: v.name, overwrite }).subscribe({
      next: async (result) => {
        this.saving.set(false);
        if (result.tenant.provisionPackage) {
          await this.browserProvision.provision(result.tenant.provisionPackage);
        }
        this.ref.close({ ...result, tenant: { ...result.tenant, provisionPackage: undefined } });
      },
      error: (err: unknown) => {
        this.saving.set(false);
        if (err instanceof HttpErrorResponse && err.status === 409 && !overwrite) {
          this.conflict.set(true);
          this.errorMessage.set(toUserMessage(err, this.translate.instant('product.cloneError')));
        } else {
          this.errorMessage.set(toUserMessage(err, this.translate.instant('product.cloneError')));
        }
      },
    });
  }

  confirmOverwrite(): void {
    this.submit(true);
  }

  cancel(): void {
    this.ref.close();
  }
}
