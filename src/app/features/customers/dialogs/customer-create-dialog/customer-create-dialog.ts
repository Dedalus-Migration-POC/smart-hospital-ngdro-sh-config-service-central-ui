import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { toUserMessage } from '../../../../core/http/api-error';
import { Customer, CUSTOMER_SLUG_PATTERN } from '../../models';
import { CustomerService } from '../../services/customers';

@Component({
  selector: 'app-customer-create-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    TranslatePipe,
  ],
  templateUrl: './customer-create-dialog.html',
  styleUrl: './customer-create-dialog.scss',
})
export class CustomerCreateDialog {
  private readonly fb = inject(FormBuilder);
  private readonly customers = inject(CustomerService);
  private readonly ref = inject<MatDialogRef<CustomerCreateDialog, Customer | undefined>>(MatDialogRef);
  private readonly translate = inject(TranslateService);

  readonly form = this.fb.nonNullable.group({
    slug: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(CUSTOMER_SLUG_PATTERN)]],
    name: ['', [Validators.required, Validators.maxLength(255)]],
  });

  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.errorMessage.set(null);

    this.customers.create(this.form.getRawValue()).subscribe({
      next: (created) => {
        this.saving.set(false);
        this.ref.close(created);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.errorMessage.set(toUserMessage(err, this.translate.instant('customer.createError')));
      },
    });
  }
}
