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
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AuthService } from '../../../../core/auth/auth';
import { toUserMessage } from '../../../../core/http/api-error';
import { PushNotificationService } from '../../../../core/push/push-notification';
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
import {
  NotificationDetailDialog,
  NotificationDetailDialogData,
} from '../../../notifications/dialogs/notification-detail-dialog/notification-detail-dialog';
import { AVAILABLE_ROLES, NotificationLog, User } from '../../models';
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
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
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
  readonly push = inject(PushNotificationService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly savingNotifications = signal(false);
  readonly pushLoading = signal(false);
  readonly deleting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly user = signal<User | null>(null);
  readonly customers = signal<Customer[]>([]);
  readonly pushSubscribed = signal(false);

  readonly notifLogs = signal<NotificationLog[]>([]);
  readonly notifLogsTotal = signal(0);
  readonly notifLogsLoading = signal(false);
  readonly notifLogsPage = signal(0);

  readonly availableRoles = AVAILABLE_ROLES;
  readonly notifColumns = ['type', 'status', 'installationName', 'createdAt', 'actions'];

  readonly isSelf = computed(() => {
    const u = this.user();
    const current = this.auth.currentUser();
    return !!u && !!current && u.username === current.username;
  });

  /** True se l'utente corrente è CUSTOMER che sta guardando se stesso: la UI è in sola lettura. */
  readonly isReadonlySelf = computed(() => this.isSelf() && this.auth.currentUser()?.role === 'CUSTOMER');

  readonly isCustomerRole = computed(() => this.form.controls.role.value === 'CUSTOMER');
  readonly isDeliveryRole = computed(() => this.form.controls.role.value === 'DELIVERY');
  readonly isUserAdmin = computed(() => this.user()?.role === 'ADMIN');

  readonly form = this.fb.nonNullable.group({
    role: ['ADMIN', [Validators.required]],
    active: [true],
    customerId: [null as string | null],
    deliveryCustomerIds: [[] as string[]],
  });

  readonly notificationForm = this.fb.nonNullable.group({
    notificationsEnabled: [false],
    notificationCustomerIds: [[] as string[]],
    pollIntervalMinutes: [30, [Validators.required, Validators.min(5), Validators.max(1440)]],
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

    if (this.push.isSupported) {
      void this.push.isCurrentBrowserSubscribed().then((s) => this.pushSubscribed.set(s));
    }

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
          deliveryCustomerIds: user.deliveryCustomerIds ?? [],
        });
        this.notificationForm.reset({
          notificationsEnabled: user.notificationsEnabled,
          notificationCustomerIds: user.notificationCustomerIds ?? [],
          pollIntervalMinutes: user.notificationPollIntervalMinutes ?? 30,
        });
        // imposta validator customerId/deliveryCustomerIds in base al ruolo caricato
        if (user.role === 'CUSTOMER') {
          this.form.controls.customerId.setValidators([Validators.required]);
          this.form.controls.customerId.updateValueAndValidity();
        } else if (user.role === 'DELIVERY') {
          this.form.controls.deliveryCustomerIds.setValidators([Validators.required, Validators.minLength(1)]);
          this.form.controls.deliveryCustomerIds.updateValueAndValidity();
        }
        this.loading.set(false);
        this.loadNotificationHistory();
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
      deliveryCustomerIds: v.role === 'DELIVERY' ? v.deliveryCustomerIds : [],
    }).subscribe({
      next: (updated) => {
        this.user.set(updated);
        this.form.reset({
          role: updated.role,
          active: updated.active,
          customerId: updated.customerId ?? null,
          deliveryCustomerIds: updated.deliveryCustomerIds ?? [],
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

  async togglePush(): Promise<void> {
    this.pushLoading.set(true);
    try {
      if (this.pushSubscribed()) {
        await this.push.unsubscribe();
        this.pushSubscribed.set(false);
        this.snackbar.open(this.translate.instant('user.pushUnsubscribed'), 'OK', { duration: 3000 });
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          this.snackbar.open(this.translate.instant('user.pushDenied'), 'OK', { duration: 5000 });
          return;
        }
        await this.push.subscribe();
        this.pushSubscribed.set(true);
        this.snackbar.open(this.translate.instant('user.pushSubscribed'), 'OK', { duration: 3000 });
      }
    } catch {
      this.snackbar.open(this.translate.instant('user.pushError'), 'OK', { duration: 6000 });
    } finally {
      this.pushLoading.set(false);
    }
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
      pollIntervalMinutes: v.pollIntervalMinutes,
    }).subscribe({
      next: (updated) => {
        this.user.set(updated);
        this.notificationForm.reset({
          notificationsEnabled: updated.notificationsEnabled,
          notificationCustomerIds: updated.notificationCustomerIds ?? [],
          pollIntervalMinutes: updated.notificationPollIntervalMinutes ?? 30,
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

  confirmDelete(): void {    const u = this.user();
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

  loadNotificationHistory(page = 0): void {
    const u = this.user();
    if (!u) return;
    this.notifLogsLoading.set(true);
    this.notifLogsPage.set(page);
    this.userService.getNotificationHistory(u.id, page, 20).subscribe({
      next: (res) => {
        this.notifLogs.set(res.content);
        this.notifLogsTotal.set(res.totalElements);
        this.notifLogsLoading.set(false);
      },
      error: () => this.notifLogsLoading.set(false),
    });
  }

  openNotifDetail(row: NotificationLog): void {
    this.dialog.open<NotificationDetailDialog, NotificationDetailDialogData>(
      NotificationDetailDialog, { data: row, width: '640px' }
    );
  }
}
