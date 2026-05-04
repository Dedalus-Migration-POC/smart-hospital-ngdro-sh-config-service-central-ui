import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';

import { toUserMessage } from '../../../../core/http/api-error';
import {
  ConfirmDialog,
  ConfirmDialogData,
} from '../../../../shared/dialogs/confirm-dialog/confirm-dialog';
import { Customer } from '../../models';
import { CustomerService } from '../../services/customers';

@Component({
  selector: 'app-customer-detail-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatDividerModule,
  ],
  templateUrl: './customer-detail-page.html',
  styleUrl: './customer-detail-page.scss',
})
export class CustomerDetailPage implements OnInit {
  /** Bound dal route param `:id` grazie a withComponentInputBinding nel router. */
  readonly id = input.required<string>();

  private readonly fb = inject(FormBuilder);
  private readonly customers = inject(CustomerService);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(MatSnackBar);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly customer = signal<Customer | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    active: [true],
  });

  constructor() {
    // Se l'utente naviga da /customers/A a /customers/B senza che il componente
    // venga distrutto, ricarico in base al nuovo id.
    effect(() => {
      const id = this.id();
      this.load(id);
    });
  }

  ngOnInit(): void {
    // L'effect del constructor copre già il primo load.
  }

  private load(id: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.customers.get(id).subscribe({
      next: (c) => {
        this.customer.set(c);
        this.form.reset({ name: c.name, active: c.active });
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.customer.set(null);
        this.loading.set(false);
        this.errorMessage.set(toUserMessage(err, 'Impossibile caricare il customer.'));
      },
    });
  }

  save(): void {
    const current = this.customer();
    if (!current || this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const value = this.form.getRawValue();
    this.customers.update(current.id, { name: value.name, active: value.active }).subscribe({
      next: (updated) => {
        this.customer.set(updated);
        this.form.reset({ name: updated.name, active: updated.active });
        this.saving.set(false);
        this.snackbar.open('Modifiche salvate.', 'OK', { duration: 3000 });
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.snackbar.open(
          toUserMessage(err, 'Impossibile salvare le modifiche.'),
          'OK',
          { duration: 6000 },
        );
      },
    });
  }

  confirmDelete(): void {
    const current = this.customer();
    if (!current) return;
    const data: ConfirmDialogData = {
      title: `Eliminare il customer "${current.name}"?`,
      message:
        'Il customer verrà disattivato (soft delete lato backend). Le installation collegate restano in archivio. Continuare?',
      confirmLabel: 'Elimina',
      destructive: true,
    };
    const ref = this.dialog.open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
      data,
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.delete(current.id, current.name);
      }
    });
  }

  private delete(id: string, name: string): void {
    this.deleting.set(true);
    this.customers.delete(id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.snackbar.open(`Customer "${name}" disattivato.`, 'OK', { duration: 4000 });
        void this.router.navigate(['/customers']);
      },
      error: (err: unknown) => {
        this.deleting.set(false);
        this.snackbar.open(
          toUserMessage(err, 'Impossibile eliminare il customer.'),
          'OK',
          { duration: 6000 },
        );
      },
    });
  }
}
