import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth';
import { InstallationService } from '../../../installations/services/installations';
import { TenantService } from '../../../tenants/services/tenants';
import { Installation } from '../../../installations/models';
import { DraftConfigSummary } from '../../../tenants/models';

@Component({
  selector: 'app-customer-home-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    RouterLink,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
    TranslatePipe,
  ],
  templateUrl: './customer-home-page.html',
  styleUrl: './customer-home-page.scss',
})
export class CustomerHomePage {
  private readonly auth = inject(AuthService);
  private readonly installationService = inject(InstallationService);
  private readonly tenantService = inject(TenantService);

  readonly currentUser = this.auth.currentUser;
  readonly today = new Date();

  readonly loading = signal(true);
  readonly installations = signal<Installation[]>([]);
  readonly draftConfigs = signal<DraftConfigSummary[]>([]);

  readonly healthStatus = signal<Record<string, 'checking' | 'up' | 'down'>>({});

  readonly activeInstallations = computed(() => this.installations().filter(i => i.active).length);
  readonly onPremTotal = signal(0);
  readonly onPremOnline = signal(0);
  readonly onPremChecked = signal(0);
  readonly onPremHealthLoading = computed(() => this.onPremChecked() < this.onPremTotal());

  readonly draftColumns = ['tenant', 'channel', 'entity', 'version', 'error', 'go'] as const;
  readonly installationColumns = ['name', 'baseUrl', 'health', 'status'] as const;

  constructor() {
    const customerId = this.currentUser()?.customerId;
    if (customerId) {
      this.loadData(customerId);
    } else {
      this.loading.set(false);
    }
  }

  private loadData(customerId: string): void {
    forkJoin({
      installations: this.installationService.listByCustomer(customerId, false)
        .pipe(catchError(() => of([] as Installation[]))),
      drafts: this.tenantService.getDraftConfigs()
        .pipe(catchError(() => of([] as DraftConfigSummary[]))),
    }).subscribe(({ installations, drafts }) => {
      this.installations.set(installations);
      this.draftConfigs.set(drafts);
      this.loading.set(false);
      this.fireHealthChecks(installations.filter(i => i.active));
    });
  }

  private fireHealthChecks(active: Installation[]): void {
    this.onPremTotal.set(active.length);
    const init: Record<string, 'checking' | 'up' | 'down'> = {};
    active.forEach(i => (init[i.id] = 'checking'));
    this.healthStatus.set(init);
    active.forEach(inst => {
      fetch(`${inst.baseUrl}/actuator/health`, {
        mode: 'no-cors',
        signal: AbortSignal.timeout(5000),
      })
        .then(() => {
          this.onPremOnline.update(n => n + 1);
          this.onPremChecked.update(n => n + 1);
          this.healthStatus.update(m => ({ ...m, [inst.id]: 'up' }));
        })
        .catch(() => {
          this.onPremChecked.update(n => n + 1);
          this.healthStatus.update(m => ({ ...m, [inst.id]: 'down' }));
        });
    });
  }
}
