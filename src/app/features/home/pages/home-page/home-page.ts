import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { Chart, registerables } from 'chart.js';

import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth';
import { CustomerService } from '../../../customers/services/customers';
import { UserService } from '../../../users/services/users';
import { AuditService } from '../../../audit/services/audit';
import { InstallationService } from '../../../installations/services/installations';
import { Customer } from '../../../customers/models';
import { AuditLog } from '../../../audit/models';
import { User } from '../../../users/models';
import { Installation } from '../../../installations/models';

Chart.register(...registerables);

interface KpiData {
  customers: Customer[];
  users: User[];
  recentAudit: AuditLog[];
  auditTotal: number;
}

@Component({
  selector: 'app-home-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe,
  ],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage implements AfterViewInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly customerService = inject(CustomerService);
  private readonly userService = inject(UserService);
  private readonly auditService = inject(AuditService);
  private readonly installationService = inject(InstallationService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  readonly currentUser = this.auth.currentUser;
  readonly isAdmin = computed(() => this.currentUser()?.role === 'ADMIN');
  readonly today = new Date();

  readonly loading = signal(true);
  readonly kpi = signal<KpiData | null>(null);

  readonly onPremTotal = signal(0);
  readonly onPremOnline = signal(0);
  readonly onPremChecked = signal(0);
  readonly onPremHealthLoading = computed(() => this.onPremChecked() < this.onPremTotal());

  // KPI computed values
  readonly activeCustomers = computed(() => this.kpi()?.customers.filter(c => c.active).length ?? 0);
  readonly inactiveCustomers = computed(() => this.kpi()?.customers.filter(c => !c.active).length ?? 0);
  readonly totalCustomers = computed(() => this.kpi()?.customers.length ?? 0);
  readonly activeUsers = computed(() => this.kpi()?.users.filter(u => u.active).length ?? 0);
  readonly totalUsers = computed(() => this.kpi()?.users.length ?? 0);
  readonly auditTotal = computed(() => this.kpi()?.auditTotal ?? 0);
  readonly todayActions = computed(() => {
    const today = new Date().toISOString().slice(0, 10);
    return this.kpi()?.recentAudit.filter(e => e.at.startsWith(today)).length ?? 0;
  });
  readonly successRate = computed(() => {
    const entries = this.kpi()?.recentAudit ?? [];
    if (!entries.length) return 100;
    const ok = entries.filter(e => e.outcome === 'SUCCESS').length;
    return Math.round((ok / entries.length) * 100);
  });

  @ViewChild('activityChart') activityChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('statusChart') statusChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('actionChart') actionChartRef!: ElementRef<HTMLCanvasElement>;

  private charts: Chart[] = [];

  ngAfterViewInit(): void {
    if (!this.isAdmin()) return;
    this.loadData();
  }

  private loadData(): void {
    const from30d = new Date();
    from30d.setDate(from30d.getDate() - 29);
    const fromStr = from30d.toISOString().slice(0, 10) + 'T00:00:00';

    forkJoin({
      customers: this.customerService.list(false),
      users: this.userService.list(false),
      audit: this.auditService.list({ from: fromStr }, 0, 200),
    }).subscribe({
      next: ({ customers, users, audit }) => {
        this.loading.set(false);
        this.kpi.set({
          customers,
          users,
          recentAudit: audit.content,
          auditTotal: audit.totalElements,
        });
        setTimeout(() => this.buildCharts(customers, users, audit.content), 0);
        this.loadOnPremHealth(customers.filter(c => c.active).map(c => c.id));
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  private loadOnPremHealth(customerIds: string[]): void {
    if (!customerIds.length) return;
    this.onPremTotal.set(0);
    this.onPremOnline.set(0);
    this.onPremChecked.set(0);

    forkJoin(
      customerIds.map(id =>
        this.installationService.listByCustomer(id, true)
          .pipe(catchError(() => of([] as Installation[])))
      )
    ).subscribe(results => {
      const installations = results.flat();
      this.onPremTotal.set(installations.length);
      if (!installations.length) return;
      installations.forEach(inst => {
        this.installationService.checkHealth(inst.id)
          .pipe(catchError(() => of({ installationId: inst.id, reachable: false })))
          .subscribe(res => {
            if (res.reachable) this.onPremOnline.update(n => n + 1);
            this.onPremChecked.update(n => n + 1);
          });
      });
    });
  }

  private buildCharts(customers: Customer[], _users: User[], auditEntries: AuditLog[]): void {
    this.destroyCharts();

    const primary = getComputedStyle(document.documentElement)
      .getPropertyValue('--mat-sys-primary').trim() || '#0066CC';
    const secondary = getComputedStyle(document.documentElement)
      .getPropertyValue('--mat-sys-secondary').trim() || '#4CAF50';
    const error = getComputedStyle(document.documentElement)
      .getPropertyValue('--mat-sys-error').trim() || '#B00020';
    const surfaceVariant = getComputedStyle(document.documentElement)
      .getPropertyValue('--mat-sys-surface-container-high').trim() || '#E0E0E0';

    // ── Chart 1: Attività giornaliera (line) ──
    const days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return d.toISOString().slice(0, 10);
    });
    const countByDay = Object.fromEntries(days.map(d => [d, 0]));
    for (const e of auditEntries) {
      const day = e.at.slice(0, 10);
      if (day in countByDay) countByDay[day]++;
    }

    this.charts.push(new Chart(this.activityChartRef.nativeElement, {
      type: 'line',
      data: {
        labels: days.map(d => d.slice(5)), // MM-DD
        datasets: [{
          label: this.translate.instant('home.chartActivity'),
          data: days.map(d => countByDay[d]),
          borderColor: primary,
          backgroundColor: primary + '22',
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointHoverRadius: 5,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } },
          x: { ticks: { maxTicksLimit: 10, maxRotation: 0 } },
        },
      },
    }));

    // ── Chart 2: Stato clienti (doughnut) ──
    const active = customers.filter(c => c.active).length;
    const inactive = customers.filter(c => !c.active).length;
    this.charts.push(new Chart(this.statusChartRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: [
          this.translate.instant('home.chartActive'),
          this.translate.instant('home.chartInactive'),
        ],
        datasets: [{
          data: [active, inactive],
          backgroundColor: [secondary, surfaceVariant],
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 11 } } },
        },
        cutout: '65%',
      },
    }));

    // ── Chart 3: Azioni per tipo (bar orizzontale) ──
    const actionCounts: Record<string, number> = {};
    for (const e of auditEntries) {
      actionCounts[e.action] = (actionCounts[e.action] ?? 0) + 1;
    }
    const sortedActions = Object.entries(actionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    this.charts.push(new Chart(this.actionChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: sortedActions.map(([action]) => action),
        datasets: [{
          label: this.translate.instant('home.chartActionCount'),
          data: sortedActions.map(([, count]) => count),
          backgroundColor: primary + 'BB',
          borderColor: primary,
          borderWidth: 1,
          borderRadius: 4,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, ticks: { precision: 0 } },
        },
      },
    }));
  }

  private destroyCharts(): void {
    for (const c of this.charts) c.destroy();
    this.charts = [];
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }
}
