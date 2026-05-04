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

import { toUserMessage } from '../../../../core/http/api-error';
import {
  InstallationCreateDialog,
  InstallationCreateDialogData,
  InstallationCreateDialogResult,
} from '../../dialogs/installation-create-dialog/installation-create-dialog';
import { Installation } from '../../models';
import { InstallationService } from '../../services/installations';

@Component({
  selector: 'app-customer-installations-section',
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
  ],
  templateUrl: './customer-installations-section.html',
  styleUrl: './customer-installations-section.scss',
})
export class CustomerInstallationsSection {
  readonly customerId = input.required<string>();
  readonly customerName = input.required<string>();

  private readonly installations = inject(InstallationService);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(MatSnackBar);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly showInactive = signal(false);
  readonly rows = signal<Installation[]>([]);
  /** Card di alert temporanea con la master key generata dal central per una nuova installation. */
  readonly newKeyAlert = signal<{ installationName: string; key: string } | null>(null);

  readonly displayedColumns = ['name', 'baseUrl', 'security', 'sync', 'active', 'actions'] as const;

  constructor() {
    effect(() => {
      const id = this.customerId();
      this.load(id, this.showInactive());
    });
  }

  reload(): void {
    this.load(this.customerId(), this.showInactive());
  }

  toggleInactive(value: boolean): void {
    this.showInactive.set(value);
    this.load(this.customerId(), value);
  }

  private load(customerId: string, showInactive: boolean): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.installations.listByCustomer(customerId, !showInactive).subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(toUserMessage(err, 'Impossibile caricare le installation.'));
      },
    });
  }

  openCreate(): void {
    const data: InstallationCreateDialogData = {
      customerId: this.customerId(),
      customerName: this.customerName(),
    };
    const ref = this.dialog.open<
      InstallationCreateDialog,
      InstallationCreateDialogData,
      InstallationCreateDialogResult | undefined
    >(InstallationCreateDialog, { data, autoFocus: 'first-tabbable' });

    ref.afterClosed().subscribe((result) => {
      if (!result) return;
      this.snackbar.open(
        `Installation "${result.installation.name}" creata.`,
        'OK',
        { duration: 4000 },
      );
      if (result.generatedPayloadMasterKey) {
        this.newKeyAlert.set({
          installationName: result.installation.name,
          key: result.generatedPayloadMasterKey,
        });
      }
      this.reload();
    });
  }

  openInstallation(inst: Installation): void {
    void this.router.navigate(['/installations', inst.id]);
  }

  async copyAlertKey(): Promise<void> {
    const alert = this.newKeyAlert();
    if (!alert) return;
    try {
      await navigator.clipboard.writeText(alert.key);
      this.snackbar.open('Chiave copiata negli appunti.', 'OK', { duration: 2500 });
    } catch {
      this.snackbar.open('Copia non riuscita: copia manualmente il valore.', 'OK', {
        duration: 4000,
      });
    }
  }

  dismissAlert(): void {
    this.newKeyAlert.set(null);
  }
}
