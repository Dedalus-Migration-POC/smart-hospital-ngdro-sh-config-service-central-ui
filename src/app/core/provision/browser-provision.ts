import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { ConfirmDialog, ConfirmDialogData } from '../../shared/dialogs/confirm-dialog/confirm-dialog';
import { ProvisionPackage } from '../../features/installations/models';

@Injectable({ providedIn: 'root' })
export class BrowserProvisionService {
  private snackbar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private translate = inject(TranslateService);

  /**
   * Esegue il provisioning diretto dal browser verso l'on-prem.
   * Gestisce:
   * - health check con rilevamento SSL self-signed (se HTTPS e fallisce → guida utente)
   * - dialog di conferma
   * - fetch di provisioning
   * - snackbar risultato
   */
  async provision(pkg: ProvisionPackage): Promise<void> {
    const baseUrl = pkg.targetUrl.split('/api/v1/')[0];
    const isHttps = baseUrl.startsWith('https://');

    this.snackbar.open(this.translate.instant('provision.browserFallbackChecking'), 'OK', { duration: 4000 });

    const reachable = await fetch(`${baseUrl}/api/actuator/health`, {
      mode: 'no-cors',
      signal: AbortSignal.timeout(5000),
    }).then(() => true).catch(() => false);

    if (!reachable) {
      if (isHttps) {
        await this.showSslCertDialog(baseUrl);
      } else {
        this.snackbar.open(this.translate.instant('provision.browserFallbackUnreachable'), 'OK', { duration: 8000 });
      }
      return;
    }

    const confirmed = await this.showConfirmDialog();
    if (!confirmed) return;

    await this.doProvision(pkg, isHttps);
  }

  private async doProvision(pkg: ProvisionPackage, isHttps: boolean): Promise<void> {
    this.snackbar.open(this.translate.instant('provision.browserFallbackInProgress'), undefined, { duration: 0 });

    let pushOk = false;
    let sslError = false;
    try {
      const res = await fetch(pkg.targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': pkg.adminApiKey },
        body: pkg.body,
        signal: AbortSignal.timeout(15000),
      });
      pushOk = res.ok;
    } catch {
      pushOk = false;
      sslError = isHttps;
    }

    if (!pushOk && sslError) {
      this.snackbar.open(this.translate.instant('provision.browserFallbackSslError'), 'OK', { duration: 8000 });
    } else {
      this.snackbar.open(
        this.translate.instant(pushOk ? 'provision.browserFallbackSynced' : 'provision.browserFallbackFailed'),
        'OK',
        { duration: pushOk ? 3000 : 6000 },
      );
    }
  }

  private showConfirmDialog(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const data: ConfirmDialogData = {
        title: this.translate.instant('provision.browserFallbackConfirmTitle'),
        message: this.translate.instant('provision.browserFallbackConfirmMessage'),
        confirmLabel: this.translate.instant('provision.browserFallbackConfirmButton'),
        destructive: false,
      };
      const ref = this.dialog.open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, { data });
      ref.afterClosed().subscribe((result) => resolve(result === true));
    });
  }

  private showSslCertDialog(baseUrl: string): Promise<void> {
    return new Promise<void>((resolve) => {
      const data: ConfirmDialogData = {
        title: this.translate.instant('provision.sslCertTitle'),
        message: this.translate.instant('provision.sslCertMessage', { url: baseUrl }),
        confirmLabel: this.translate.instant('provision.sslCertOpenButton'),
        cancelLabel: this.translate.instant('provision.sslCertClose'),
        destructive: false,
      };
      const ref = this.dialog.open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, { data });
      ref.afterClosed().subscribe((accepted) => {
        if (accepted) {
          window.open(baseUrl, '_blank');
        }
        resolve();
      });
    });
  }
}
