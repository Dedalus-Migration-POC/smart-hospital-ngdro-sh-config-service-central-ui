import { DatePipe, SlicePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { toUserMessage } from '../../../../core/http/api-error';
import {
  AuditDetailDialog,
} from '../../dialogs/audit-detail-dialog/audit-detail-dialog';
import { AuditFilter, AuditLog, AuditLogPage } from '../../models';
import { AuditService } from '../../services/audit';

@Component({
  selector: 'app-audit-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    SlicePipe,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatCardModule,
    MatTooltipModule,
  ],
  templateUrl: './audit-page.html',
  styleUrl: './audit-page.scss',
})
export class AuditPage {
  private readonly auditService = inject(AuditService);
  private readonly dialog = inject(MatDialog);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly result = signal<AuditLogPage | null>(null);

  readonly pageSize = signal(50);
  readonly pageIndex = signal(0);

  readonly filterForm = this.fb.nonNullable.group({
    actor: [''],
    action: [''],
    entityType: [''],
    entityId: [''],
    outcome: [''],
    from: [''],
    to: [''],
  });

  readonly displayedColumns = ['at', 'actor', 'action', 'entityType', 'outcome', 'detail'] as const;

  constructor() {
    this.load();
  }

  applyFilters(): void {
    this.pageIndex.set(0);
    this.load();
  }

  resetFilters(): void {
    this.filterForm.reset();
    this.pageIndex.set(0);
    this.load();
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.load();
  }

  openDetail(row: AuditLog): void {
    this.dialog.open<AuditDetailDialog, AuditLog>(AuditDetailDialog, {
      data: row,
      maxWidth: '680px',
      width: '100%',
    });
  }

  private load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    const v = this.filterForm.getRawValue();

    const filter: AuditFilter = {
      actor: v.actor || undefined,
      action: v.action || undefined,
      entityType: v.entityType || undefined,
      entityId: v.entityId || undefined,
      outcome: v.outcome || undefined,
      from: v.from ? new Date(v.from).toISOString() : undefined,
      to: v.to ? new Date(v.to + 'T23:59:59').toISOString() : undefined,
    };

    this.auditService.list(filter, this.pageIndex(), this.pageSize()).subscribe({
      next: (page) => {
        this.result.set(page);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(toUserMessage(err, 'Impossibile caricare il log di audit.'));
      },
    });
  }
}
