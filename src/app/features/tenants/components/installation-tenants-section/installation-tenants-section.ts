import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { toUserMessage } from '../../../../core/http/api-error';
import {
  TenantCreateDialog,
  TenantCreateDialogData,
} from '../../dialogs/tenant-create-dialog/tenant-create-dialog';
import { Tenant } from '../../models';
import { TenantService } from '../../services/tenants';

@Component({
  selector: 'app-installation-tenants-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSlideToggleModule,
    MatTooltipModule,
    TranslatePipe,
  ],
  templateUrl: './installation-tenants-section.html',
  styleUrl: './installation-tenants-section.scss',
})
export class InstallationTenantsSection {
  readonly installationId = input.required<string>();
  readonly installationName = input.required<string>();

  private readonly tenants = inject(TenantService);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly showInactive = signal(false);
  readonly rows = signal<Tenant[]>([]);

  readonly displayedColumns = ['name', 'slug', 'active', 'createdAt', 'actions'] as const;

  constructor() {
    effect(() => {
      const id = this.installationId();
      this.load(id, this.showInactive());
    });
  }

  reload(): void {
    this.load(this.installationId(), this.showInactive());
  }

  toggleInactive(value: boolean): void {
    this.showInactive.set(value);
    this.load(this.installationId(), value);
  }

  private load(installationId: string, showInactive: boolean): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.tenants.listByInstallation(installationId, !showInactive).subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(toUserMessage(err, this.translate.instant('product.loadError')));
      },
    });
  }

  openCreate(): void {
    const data: TenantCreateDialogData = {
      installationId: this.installationId(),
      installationName: this.installationName(),
    };
    const ref = this.dialog.open<TenantCreateDialog, TenantCreateDialogData, Tenant | undefined>(
      TenantCreateDialog,
      { data, autoFocus: 'first-tabbable' },
    );
    ref.afterClosed().subscribe((tenant) => {
      if (!tenant) return;
      this.snackbar.open(this.translate.instant('product.createSuccess', { name: tenant.name }), 'OK', { duration: 3000 });
      this.reload();
    });
  }

  openTenant(tenant: Tenant): void {
    void this.router.navigate(['/prodotti', tenant.id]);
  }
}
