import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AuthService } from '../../../../core/auth/auth';
import { toUserMessage } from '../../../../core/http/api-error';
import {
  ConfirmDialog,
  ConfirmDialogData,
} from '../../../../shared/dialogs/confirm-dialog/confirm-dialog';
import {
  ChangePasswordDialog,
  ChangePasswordDialogData,
} from '../../dialogs/change-password-dialog/change-password-dialog';
import { Customer } from '../../../customers/models';
import { CustomerService } from '../../../customers/services/customers';
import { AVAILABLE_ROLES, User } from '../../models';
import { UserService } from '../../services/users';
@Component({
  selector: 'app-user-detail-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    TranslatePipe,
  ],
  templateUrl: './user-detail-page.html',
  styleUrl: './user-detail-page.scss',
})
export class UserDetailPage implements OnInit {
  readonly id = input.required<string>();

  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly customerService = inject(CustomerService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly savingNotifications = signal(false);
  readonly deleting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly user = signal<User | null>(null);
  readonly customers = signal<Customer[]>([]);

  readonly availableRoles = AVAILABLE_ROLES;

  readonly isSelf = computed(() => {
    const u = this.user();
    const current = this.auth.currentUser();
    return !!u && !!current && u.username === current.username;
  });

  readonly isCustomerRole = computed(() => this.form.controls.role.value === 'CUSTOMER');
  readonly isUserAdmin = computed(() => this.user()?.role === 'ADMIN');

  readonly form = this.fb.nonNullable.group({
    role: ['ADMIN', [Validators.required]],
    active: [true],
    customerId: [null as string | null],
  });

  readonly notificationForm = this.fb.nonNullable.group({
    notificationsEnabled: [false],
    notificationCustomerIds: [[] as string[]],
  });

  constructor() {
    effect(() => {
      const id = this.id();
      this.load(id);
    });
  }

  ngOnInit(): void {
    this.customerService.list(true).subscribe({
      next: (list) => this.customers.set(list),
      error: () => {},
    });

    this.form.controls.role.valueChanges.subscribe((role) => {
      const ctrl = this.form.controls.customerId;
      if (role === 'CUSTOMER') {
        ctrl.setValidators([Validators.required]);
      } else {
        ctrl.clearValidators();
        ctrl.setValue(null);
      }
      ctrl.updateValueAndValidity();
    });
  }

  private load(id: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.userService.get(id).subscribe({
      next: (user) => {
        this.user.set(user);
        this.form.reset({
          role: user.role,
          active: user.active,
          customerId: user.customerId ?? null,
        });
        this.notificationForm.reset({
          notificationsEnabled: user.notificationsEnabled,
          notificationCustomerIds: user.notificationCustomerIds ?? [],
        });
        // imposta validator customerId in base al ruolo caricato
        if (user.role === 'CUSTOMER') {
          this.form.controls.customerId.setValidators([Validators.required]);
          this.form.controls.customerId.updateValueAndValidity();
        }
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.user.set(null);
        this.loading.set(false);
        this.errorMessage.set(toUserMessage(err, this.translate.instant('user.loadDetailError')));
      },
    });
  }

  save(): void {
    const u = this.user();
    if (!u || this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const v = this.form.getRawValue();
    this.userService.update(u.id, {
      role: v.role,
      active: v.active,
      customerId: v.role === 'CUSTOMER' ? v.customerId : null,
    }).subscribe({
      next: (updated) => {
        this.user.set(updated);
        this.form.reset({
          role: updated.role,
          active: updated.active,
          customerId: updated.customerId ?? null,
        });
        this.saving.set(false);
        this.snackbar.open(this.translate.instant('user.saveSuccess'), 'OK', { duration: 3000 });
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.snackbar.open(
          toUserMessage(err, this.translate.instant('user.saveError')),
          'OK',
          { duration: 6000 },
        );
      },
    });
  }

  openChangePassword(): void {
    const u = this.user();
    if (!u) return;
    const data: ChangePasswordDialogData = {
      userId: u.id,
      username: u.username,
      isSelf: this.isSelf(),
    };
    const ref = this.dialog.open<ChangePasswordDialog, ChangePasswordDialogData, boolean>(
      ChangePasswordDialog,
      { data, autoFocus: 'first-tabbable', width: '420px' },
    );
    ref.afterClosed().subscribe((changed) => {
      if (changed) {
        this.snackbar.open(this.translate.instant('user.changePasswordSuccess'), 'OK', { duration: 3000 });
      }
    });
  }

  saveNotifications(): void {
    const u = this.user();
    if (!u || this.savingNotifications()) return;
    this.savingNotifications.set(true);
    const v = this.notificationForm.getRawValue();
    this.userService.updateNotifications(u.id, {
      notificationsEnabled: v.notificationsEnabled,
      notificationCustomerIds: u.role === 'ADMIN' ? v.notificationCustomerIds : [],
    }).subscribe({
      next: (updated) => {
        this.user.set(updated);
        this.notificationForm.reset({
          notificationsEnabled: updated.notificationsEnabled,
          notificationCustomerIds: updated.notificationCustomerIds ?? [],
        });
        this.savingNotifications.set(false);
        this.snackbar.open(this.translate.instant('user.notificationsSaveSuccess'), 'OK', { duration: 3000 });
      },
      error: (err: unknown) => {
        this.savingNotifications.set(false);
        this.snackbar.open(
          toUserMessage(err, this.translate.instant('user.notificationsSaveError')),
          'OK',
          { duration: 6000 },
        );
      },
    });
  }

  confirmDelete(): void {
    const u = this.user();
    if (!u) return;
    const data: ConfirmDialogData = {
      title: this.translate.instant('user.deleteConfirmTitle', { username: u.username }),
      message: this.translate.instant('user.deleteConfirmMessage'),
      confirmLabel: this.translate.instant('user.deleteConfirmButton'),
      destructive: true,
    };
    const ref = this.dialog.open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
      data,
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) this.delete(u);
    });
  }

  private delete(u: User): void {
    this.deleting.set(true);
    this.userService.delete(u.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.snackbar.open(this.translate.instant('user.deleteSuccess', { username: u.username }), 'OK', { duration: 4000 });
        this.load(u.id);
      },
      error: (err: unknown) => {
        this.deleting.set(false);
        this.snackbar.open(
          toUserMessage(err, this.translate.instant('user.deleteError')),
          'OK',
          { duration: 6000 },
        );
      },
    });
  }
}
