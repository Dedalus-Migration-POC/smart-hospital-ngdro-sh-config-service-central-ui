import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
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
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AuthService } from '../../../../core/auth/auth';
import { toUserMessage } from '../../../../core/http/api-error';
import { ConfirmDialog, ConfirmDialogData } from '../../../../shared/dialogs/confirm-dialog/confirm-dialog';
import { asciiEmojiValidator } from '../../../../shared/validators/ascii-emoji.validator';
import { Customer } from '../../../customers/models';
import { CustomerService } from '../../../customers/services/customers';
import { Installation } from '../../../installations/models';
import { InstallationService } from '../../../installations/services/installations';
import { Tenant } from '../../../tenants/models';
import { TenantService } from '../../../tenants/services/tenants';

@Component({
  selector: 'app-push-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    TranslatePipe,
  ],
  templateUrl: './push-page.html',
  styleUrl: './push-page.scss',
})
export class PushPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly customerService = inject(CustomerService);
  private readonly installationService = inject(InstallationService);
  private readonly tenantService = inject(TenantService);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  private readonly currentUser = this.auth.currentUser;

  readonly isCustomerRole = computed(() => this.currentUser()?.role === 'CUSTOMER');

  readonly customers = signal<Customer[]>([]);
  readonly installations = signal<Installation[]>([]);
  readonly tenants = signal<Tenant[]>([]);

  readonly loadingCustomers = signal(false);
  readonly loadingInstallations = signal(false);
  readonly loadingTenants = signal(false);
  readonly sending = signal(false);

  readonly selectedCustomerId = signal<string | null>(null);
  readonly selectedInstallationId = signal<string | null>(null);
  readonly selectedTenantId = signal<string | null>(null);

  readonly selectedTenant = computed(
    () => this.tenants().find((t) => t.id === this.selectedTenantId()) ?? null,
  );

  readonly noTenants = computed(
    () => !this.loadingTenants() && this.tenants().length === 0 && !!this.selectedInstallationId(),
  );

  /** Lista utenti parsata dal textarea — aggiornata via valueChanges (non computed: il FormGroup non è un signal). */
  readonly parsedUsers = signal<string[]>([]);

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(255), asciiEmojiValidator()]],
    message: ['', [Validators.required, Validators.maxLength(1000), asciiEmojiValidator()]],
    noticeType: ['INFO' as 'INFO' | 'WARNING' | 'ERROR', Validators.required],
    users: ['', Validators.required],
  });

  constructor() {
    const user = this.currentUser();

    if (user?.role === 'CUSTOMER' && user.customerId) {
      this.selectedCustomerId.set(user.customerId);
      this.loadInstallations(user.customerId);
    } else {
      this.loadingCustomers.set(true);
      this.customerService.list(true).subscribe({
        next: (list) => {
          this.customers.set(list);
          this.loadingCustomers.set(false);
        },
        error: () => this.loadingCustomers.set(false),
      });
    }
  }

  ngOnInit(): void {
    this.form.controls.users.valueChanges.subscribe((v) => {
      this.parsedUsers.set(
        (v ?? '').split('\n').map((l) => l.trim()).filter((l) => l.length > 0),
      );
    });
  }

  private loadInstallations(customerId: string): void {
    this.loadingInstallations.set(true);
    this.installationService.listByCustomer(customerId, true).subscribe({
      next: (list) => {
        this.installations.set(list);
        this.loadingInstallations.set(false);
      },
      error: () => this.loadingInstallations.set(false),
    });
  }

  onCustomerChange(customerId: string): void {
    this.selectedCustomerId.set(customerId);
    this.selectedInstallationId.set(null);
    this.selectedTenantId.set(null);
    this.installations.set([]);
    this.tenants.set([]);
    this.loadInstallations(customerId);
  }

  onInstallationChange(installationId: string): void {
    this.selectedInstallationId.set(installationId);
    this.selectedTenantId.set(null);
    this.tenants.set([]);
    this.loadingTenants.set(true);
    this.tenantService.listByInstallation(installationId, true).subscribe({
      next: (list) => {
        this.tenants.set(list);
        this.loadingTenants.set(false);
      },
      error: () => this.loadingTenants.set(false),
    });
  }

  onTenantChange(tenantId: string): void {
    this.selectedTenantId.set(tenantId);
  }

  openConfirm(): void {
    const tenantId = this.selectedTenantId();
    const tenant = this.selectedTenant();
    if (!tenantId || !tenant || this.form.invalid || this.sending()) {
      this.form.markAllAsTouched();
      return;
    }

    const users = this.parsedUsers();
    const v = this.form.getRawValue();

    const summary = [
      `${this.translate.instant('push.tenant')}: ${tenant.name} (${tenant.slug})`,
      `${this.translate.instant('push.noticeType')}: ${v.noticeType}`,
      `${this.translate.instant('push.titleField')}: ${v.title}`,
      `${this.translate.instant('push.messageField')}: ${v.message}`,
      `${this.translate.instant('push.usersCount')}: ${users.length}`,
    ].join('\n');

    const data: ConfirmDialogData = {
      title: this.translate.instant('push.confirmTitle'),
      message: summary,
      confirmLabel: this.translate.instant('push.sendButton'),
    };

    const ref = this.dialog.open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, { data });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) this.send(tenantId, users);
    });
  }

  private send(tenantId: string, users: string[]): void {
    this.sending.set(true);
    const v = this.form.getRawValue();
    this.tenantService.sendPushAll(tenantId, {
      title: v.title,
      message: v.message,
      noticeType: v.noticeType,
      users,
    }).subscribe({
      next: (result) => {
        this.sending.set(false);
        if (result.tokens === 0) {
          this.snackbar.open(this.translate.instant('push.sentNoDevices'), 'OK', { duration: 5000 });
        } else {
          this.snackbar.open(
            this.translate.instant('push.sentSuccess', { count: result.tokens }),
            'OK',
            { duration: 4000 },
          );
        }
        this.form.reset({ title: '', message: '', noticeType: 'INFO', users: '' });
        this.parsedUsers.set([]);
      },
      error: (err: unknown) => {
        this.sending.set(false);
        this.snackbar.open(
          toUserMessage(err, this.translate.instant('push.sendError')),
          'OK',
          { duration: 6000 },
        );
      },
    });
  }
}
