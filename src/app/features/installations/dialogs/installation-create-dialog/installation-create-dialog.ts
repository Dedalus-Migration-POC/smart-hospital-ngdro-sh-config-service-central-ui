import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { toUserMessage } from '../../../../core/http/api-error';
import { Installation, INSTALLATION_BASE_URL_PATTERN } from '../../models';
import { InstallationService } from '../../services/installations';

export interface InstallationCreateDialogData {
  customerId: string;
  customerName: string;
}

/** Risultato del dialog: l'installation creata + (eventuale) chiave generata dal central. */
export interface InstallationCreateDialogResult {
  installation: Installation;
  /** Valorizzata se l'admin non ha fornito una propria payloadMasterKey: il central l'ha generata. */
  generatedPayloadMasterKey: string | null;
}

@Component({
  selector: 'app-installation-create-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './installation-create-dialog.html',
  styleUrl: './installation-create-dialog.scss',
})
export class InstallationCreateDialog {
  readonly data = inject<InstallationCreateDialogData>(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);
  private readonly installations = inject(InstallationService);
  private readonly ref = inject<
    MatDialogRef<InstallationCreateDialog, InstallationCreateDialogResult | undefined>
  >(MatDialogRef);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    baseUrl: [
      '',
      [Validators.required, Validators.maxLength(500), Validators.pattern(INSTALLATION_BASE_URL_PATTERN)],
    ],
    apiKey: ['', [Validators.required]],
    payloadMasterKey: [''],
  });

  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly showApiKey = signal(false);
  readonly showMasterKey = signal(false);

  toggleApiKey(): void {
    this.showApiKey.update((v) => !v);
  }

  toggleMasterKey(): void {
    this.showMasterKey.update((v) => !v);
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.errorMessage.set(null);

    const v = this.form.getRawValue();
    const ownMasterKey = v.payloadMasterKey.trim();
    const body = {
      name: v.name,
      baseUrl: v.baseUrl,
      apiKey: v.apiKey,
      ...(ownMasterKey ? { payloadMasterKey: ownMasterKey } : {}),
    };

    this.installations.create(this.data.customerId, body).subscribe({
      next: (created) => {
        this.saving.set(false);
        // Se l'utente non ha fornito la master key, il central ne ha generata una.
        // La recupero subito per poterla restituire al chiamante e mostrarla.
        if (!ownMasterKey) {
          this.installations.getPayloadMasterKey(created.id).subscribe({
            next: (res) => {
              this.ref.close({
                installation: created,
                generatedPayloadMasterKey: res.payloadMasterKey,
              });
            },
            error: () => {
              // L'installation è stata creata; recupero chiave fallito → chiudo lo stesso.
              this.ref.close({ installation: created, generatedPayloadMasterKey: null });
            },
          });
        } else {
          this.ref.close({ installation: created, generatedPayloadMasterKey: null });
        }
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.errorMessage.set(toUserMessage(err, 'Impossibile creare la installation.'));
      },
    });
  }
}
