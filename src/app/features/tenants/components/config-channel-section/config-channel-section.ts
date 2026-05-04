import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormControl,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { toUserMessage } from '../../../../core/http/api-error';
import {
  ConfirmDialog,
  ConfirmDialogData,
} from '../../../../shared/dialogs/confirm-dialog/confirm-dialog';
import { AppConfigVersion, ChannelId } from '../../models';
import { TenantService } from '../../services/tenants';

function jsonValidator(): ValidatorFn {
  return (control: AbstractControl) => {
    const v = control.value as string;
    if (!v?.trim()) return null;
    try {
      JSON.parse(v);
      return null;
    } catch {
      return { invalidJson: true };
    }
  };
}

@Component({
  selector: 'app-config-channel-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatExpansionModule,
    MatTooltipModule,
  ],
  templateUrl: './config-channel-section.html',
  styleUrl: './config-channel-section.scss',
})
export class ConfigChannelSection {
  readonly tenantId = input.required<string>();
  readonly channelId = input.required<ChannelId>();

  private readonly tenantService = inject(TenantService);
  private readonly snackbar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly resyncing = signal(false);
  readonly historyLoading = signal(false);
  readonly rollingBack = signal<number | null>(null);

  readonly activeVersion = signal<AppConfigVersion | null>(null);
  readonly history = signal<AppConfigVersion[]>([]);
  readonly errorMessage = signal<string | null>(null);

  readonly configControl = new FormControl('', [Validators.required, jsonValidator()]);

  constructor() {
    effect(() => {
      const tenantId = this.tenantId();
      const channelId = this.channelId();
      this.loadConfig(tenantId, channelId);
    });
  }

  private loadConfig(tenantId: string, channelId: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.tenantService.getConfig(tenantId, channelId, 'local').subscribe({
      next: (active) => {
        const pretty = active.configJson != null
          ? JSON.stringify(active.configJson, null, 2)
          : '';
        this.configControl.reset(pretty);
        this.loading.set(false);
        this.loadHistory(tenantId, channelId);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        const msg = toUserMessage(err, 'Impossibile caricare la configurazione.');
        if ((err as { status?: number })?.status === 404) {
          this.configControl.reset('{}');
          this.activeVersion.set(null);
          this.loadHistory(tenantId, channelId);
        } else {
          this.errorMessage.set(msg);
        }
      },
    });
  }

  private loadHistory(tenantId: string, channelId: string): void {
    this.historyLoading.set(true);
    this.tenantService.getHistory(tenantId, channelId).subscribe({
      next: (versions) => {
        this.history.set(versions);
        const active = versions.find((v) => v.active) ?? null;
        this.activeVersion.set(active);
        this.historyLoading.set(false);
      },
      error: () => {
        this.historyLoading.set(false);
      },
    });
  }

  save(): void {
    this.configControl.markAsTouched();
    if (this.configControl.invalid || this.saving()) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(this.configControl.value ?? '{}');
    } catch {
      return;
    }

    this.saving.set(true);
    this.tenantService.putConfig(this.tenantId(), this.channelId(), parsed).subscribe({
      next: (version) => {
        this.saving.set(false);
        this.activeVersion.set(version);
        const pretty = JSON.stringify(version.configJson, null, 2);
        this.configControl.reset(pretty);
        this.snackbar.open(
          version.syncStatus === 'SYNCED'
            ? 'Configurazione salvata e pushata.'
            : 'Configurazione salvata. Push fallito — riprova con Risincronizza.',
          'OK',
          { duration: version.syncStatus === 'SYNCED' ? 3000 : 6000 },
        );
        this.loadHistory(this.tenantId(), this.channelId());
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.snackbar.open(
          toUserMessage(err, 'Impossibile salvare la configurazione.'),
          'OK',
          { duration: 6000 },
        );
      },
    });
  }

  resync(): void {
    if (this.resyncing()) return;
    this.resyncing.set(true);
    this.tenantService.resync(this.tenantId(), this.channelId()).subscribe({
      next: (version) => {
        this.resyncing.set(false);
        this.activeVersion.set(version);
        this.snackbar.open(
          version.syncStatus === 'SYNCED'
            ? 'Risincronizzazione completata.'
            : 'Risincronizzazione fallita — l\'errore è stato aggiornato.',
          'OK',
          { duration: version.syncStatus === 'SYNCED' ? 3000 : 6000 },
        );
        this.loadHistory(this.tenantId(), this.channelId());
      },
      error: (err: unknown) => {
        this.resyncing.set(false);
        this.snackbar.open(
          toUserMessage(err, 'Risincronizzazione non riuscita.'),
          'OK',
          { duration: 6000 },
        );
      },
    });
  }

  confirmRollback(version: AppConfigVersion): void {
    const data: ConfirmDialogData = {
      title: `Rollback alla versione ${version.version}?`,
      message:
        `Verrà creata una nuova versione attiva con il contenuto della v${version.version} e pushata all'on-prem. Continuare?`,
      confirmLabel: 'Rollback',
      destructive: false,
    };
    const ref = this.dialog.open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
      data,
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) this.doRollback(version.version);
    });
  }

  private doRollback(version: number): void {
    this.rollingBack.set(version);
    this.tenantService.rollback(this.tenantId(), this.channelId(), version).subscribe({
      next: (newVersion) => {
        this.rollingBack.set(null);
        this.activeVersion.set(newVersion);
        const pretty = JSON.stringify(newVersion.configJson, null, 2);
        this.configControl.reset(pretty);
        this.snackbar.open(
          newVersion.syncStatus === 'SYNCED'
            ? `Rollback alla v${version} completato.`
            : `Rollback alla v${version} salvato. Push fallito — risincronizza.`,
          'OK',
          { duration: newVersion.syncStatus === 'SYNCED' ? 3000 : 6000 },
        );
        this.loadHistory(this.tenantId(), this.channelId());
      },
      error: (err: unknown) => {
        this.rollingBack.set(null);
        this.snackbar.open(
          toUserMessage(err, 'Rollback non riuscito.'),
          'OK',
          { duration: 6000 },
        );
      },
    });
  }
}
