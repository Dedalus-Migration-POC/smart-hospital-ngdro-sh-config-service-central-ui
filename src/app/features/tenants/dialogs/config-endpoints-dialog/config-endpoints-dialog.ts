import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';

import { InstallationService } from '../../../installations/services/installations';
import { ChannelId } from '../../models';
import { TenantService } from '../../services/tenants';

export interface ConfigEndpointsDialogData {
  tenantId: string;
  tenantSlug: string;
  installationId: string;
  channelId: ChannelId;
  channelLabel: string;
}

interface EndpointRow {
  entity: string;
  url: string;
}

@Component({
  selector: 'app-config-endpoints-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    TranslatePipe,
  ],
  templateUrl: './config-endpoints-dialog.html',
  styleUrl: './config-endpoints-dialog.scss',
})
export class ConfigEndpointsDialog {
  readonly data = inject<ConfigEndpointsDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<ConfigEndpointsDialog>);
  private readonly tenantService = inject(TenantService);
  private readonly installationService = inject(InstallationService);
  private readonly snackbar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly baseUrl = signal<string>('');
  readonly endpoints = signal<EndpointRow[]>([]);

  constructor() {
    forkJoin({
      installation: this.installationService.get(this.getInstallationId()),
      entities: this.tenantService.getEntities(this.data.tenantId, this.data.channelId),
    }).subscribe({
      next: ({ installation, entities }) => {
        const base = installation.baseUrl.replace(/\/$/, '');
        this.baseUrl.set(base);
        const entityNames = entities.length ? entities.map((e) => e.entity) : ['base'];
        const rows = entityNames.map((e) => ({
          entity: e,
          url: `${base}/v1/config/${this.data.tenantSlug}/${this.data.channelId}?entity=${e}`,
        }));
        this.endpoints.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(this.translate.instant('config.endpointsLoadError'));
        this.loading.set(false);
      },
    });
  }

  private getInstallationId(): string {
    return this.data.installationId;
  }

  copy(url: string): void {
    navigator.clipboard.writeText(url).then(
      () => this.snackbar.open(this.translate.instant('config.endpointsCopied'), 'OK', { duration: 2500 }),
      () => this.snackbar.open(this.translate.instant('config.endpointsCopyError'), 'OK', { duration: 4000 }),
    );
  }

  close(): void {
    this.ref.close();
  }
}
