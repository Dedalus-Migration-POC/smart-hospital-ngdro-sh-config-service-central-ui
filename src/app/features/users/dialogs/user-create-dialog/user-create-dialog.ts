import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
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
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { Customer } from '../../../customers/models';
import { CustomerService } from '../../../customers/services/customers';
import { toUserMessage } from '../../../../core/http/api-error';
import { AVAILABLE_ROLES, User } from '../../models';
import { UserService } from '../../services/users';

export type UserCreateDialogData = Record<string, never>;

@Component({
  selector: 'app-user-create-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    TranslatePipe,
  ],
  templateUrl: './user-create-dialog.html',
})
export class UserCreateDialog implements OnInit {
  readonly data = inject<UserCreateDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<UserCreateDialog, User>);
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly customerService = inject(CustomerService);
  private readonly translate = inject(TranslateService);

  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly showPassword = signal(false);
  readonly customers = signal<Customer[]>([]);
  readonly availableRoles = AVAILABLE_ROLES;

  readonly form = this.fb.nonNullable.group({
    username: [
      '',
      [Validators.required, Validators.maxLength(254), Validators.email],
    ],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
    role: ['ADMIN', [Validators.required]],
    customerId: [null as string | null],
    deliveryCustomerIds: [[] as string[]],
  });

  ngOnInit(): void {
    this.customerService.list(true).subscribe({
      next: (list) => this.customers.set(list),
      error: () => {},
    });

    this.form.controls.role.valueChanges.subscribe((role) => {
      const customerCtrl = this.form.controls.customerId;
      if (role === 'CUSTOMER') {
        customerCtrl.setValidators([Validators.required]);
      } else {
        customerCtrl.clearValidators();
        customerCtrl.setValue(null);
      }
      customerCtrl.updateValueAndValidity();

      const deliveryCtrl = this.form.controls.deliveryCustomerIds;
      if (role === 'DELIVERY') {
        deliveryCtrl.setValidators([Validators.required, Validators.minLength(1)]);
      } else {
        deliveryCtrl.clearValidators();
        deliveryCtrl.setValue([]);
      }
      deliveryCtrl.updateValueAndValidity();
    });
  }

  get isCustomerRole(): boolean {
    return this.form.controls.role.value === 'CUSTOMER';
  }

  get isDeliveryRole(): boolean {
    return this.form.controls.role.value === 'DELIVERY';
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) return;

    this.saving.set(true);
    this.errorMessage.set(null);
    const v = this.form.getRawValue();

    this.userService.create({
      username: v.username,
      password: v.password,
      role: v.role,
      customerId: v.role === 'CUSTOMER' ? v.customerId : null,
      deliveryCustomerIds: v.role === 'DELIVERY' ? v.deliveryCustomerIds : [],
    }).subscribe({
      next: (user) => {
        this.saving.set(false);
        this.ref.close(user);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.errorMessage.set(toUserMessage(err, this.translate.instant('user.createError')));
      },
    });
  }

  cancel(): void {
    this.ref.close();
  }
}
