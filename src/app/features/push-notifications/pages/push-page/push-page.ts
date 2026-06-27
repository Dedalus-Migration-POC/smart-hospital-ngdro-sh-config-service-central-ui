import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
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
export class PushPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly customerService = inject(CustomerService);
  private readonly installationService = inject(InstallationService);
  private readonly tenantService = inject(TenantService);
  private readonly snackbar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  private readonly currentUser = this.auth.currentUser;

  /** True se l'utente è ADMIN o OPERATOR (può vedere tutti i customer). */
  readonly isAdmin = computed(() => this.currentUser()?.role === 'ADMIN');

  /** Se il ruolo è CUSTOMER, mostra solo le sue installazioni (nessun selettore customer). */
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

  readonly noTenants = computed(
    () => !this.loadingTenants() && this.tenants().length === 0 && !!this.selectedInstallationId(),
  );

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(255)]],
    message: ['', [Validators.required, Validators.maxLength(1000)]],
    noticeType: ['INFO' as 'INFO' | 'WARNING' | 'ERROR', Validators.required],
  });

  constructor() {
    const user = this.currentUser();

    if (user?.role === 'CUSTOMER' && user.customerId) {
      // Utente customer: carica direttamente le installazioni del suo customer
      this.selectedCustomerId.set(user.customerId);
      this.loadInstallations(user.customerId);
    } else {
      // Admin/Operator: carica lista completa customer
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

  send(): void {
    const tenantId = this.selectedTenantId();
    if (!tenantId || this.form.invalid || this.sending()) {
      this.form.markAllAsTouched();
      return;
    }
    this.sending.set(true);
    const v = this.form.getRawValue();
    this.tenantService.sendPushAll(tenantId, {
      title: v.title,
      message: v.message,
      noticeType: v.noticeType,
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
        this.form.reset({ title: '', message: '', noticeType: 'INFO' });
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
