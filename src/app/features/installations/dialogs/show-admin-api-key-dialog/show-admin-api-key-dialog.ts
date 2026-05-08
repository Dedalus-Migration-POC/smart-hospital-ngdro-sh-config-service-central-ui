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
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { toUserMessage } from '../../../../core/http/api-error';
import { InstallationService } from '../../services/installations';

export interface ShowAdminApiKeyDialogData {
  installationId: string;
  installationName: string;
}

@Component({
  selector: 'app-show-admin-api-key-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, TranslatePipe,
  ],
  templateUrl: './show-admin-api-key-dialog.html',
  styleUrl: './show-admin-api-key-dialog.scss',
})
export class ShowAdminApiKeyDialog implements OnInit {
  readonly data = inject<ShowAdminApiKeyDialogData>(MAT_DIALOG_DATA);
  private readonly installations = inject(InstallationService);
  private readonly snackbar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly key = signal<string | null>(null);

  ngOnInit(): void {
    this.installations.getAdminApiKey(this.data.installationId).subscribe({
      next: (res) => {
        this.key.set(res.apiKey);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(
          toUserMessage(err, this.translate.instant('installation.showAdminKeyError')),
        );
      },
    });
  }

  async copyKey(): Promise<void> {
    const value = this.key();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      this.snackbar.open(this.translate.instant('common.copySuccess'), 'OK', { duration: 2500 });
    } catch {
      this.snackbar.open(this.translate.instant('common.copyError'), 'OK', { duration: 4000 });
    }
  }
}
