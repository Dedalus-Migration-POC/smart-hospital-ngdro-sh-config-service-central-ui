import { DatePipe, JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';

import { AuditLog } from '../../models';

@Component({
  selector: 'app-audit-detail-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, JsonPipe, MatDialogModule, MatButtonModule, MatIconModule, MatDividerModule],
  templateUrl: './audit-detail-dialog.html',
  styleUrl: './audit-detail-dialog.scss',
})
export class AuditDetailDialog {
  readonly log = inject<AuditLog>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<AuditDetailDialog>);

  close(): void {
    this.ref.close();
  }
}
