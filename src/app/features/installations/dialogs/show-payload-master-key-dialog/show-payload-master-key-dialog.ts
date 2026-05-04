import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';

import { toUserMessage } from '../../../../core/http/api-error';
import { InstallationService } from '../../services/installations';

export interface ShowPayloadMasterKeyDialogData {
  installationId: string;
  installationName: string;
}

@Component({
  selector: 'app-show-payload-master-key-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './show-payload-master-key-dialog.html',
  styleUrl: './show-payload-master-key-dialog.scss',
})
export class ShowPayloadMasterKeyDialog implements OnInit {
  readonly data = inject<ShowPayloadMasterKeyDialogData>(MAT_DIALOG_DATA);
  private readonly installations = inject(InstallationService);
  private readonly snackbar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly key = signal<string | null>(null);

  ngOnInit(): void {
    this.installations.getPayloadMasterKey(this.data.installationId).subscribe({
      next: (res) => {
        this.key.set(res.payloadMasterKey);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(
          toUserMessage(err, 'Impossibile recuperare la payload master key.'),
        );
      },
    });
  }

  async copyKey(): Promise<void> {
    const value = this.key();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      this.snackbar.open('Chiave copiata negli appunti.', 'OK', { duration: 2500 });
    } catch {
      this.snackbar.open('Copia non riuscita: copia manualmente il valore.', 'OK', {
        duration: 4000,
      });
    }
  }
}
