import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

import { NotificationLog } from '../../../users/models';

export type NotificationDetailDialogData = NotificationLog;

@Component({
  selector: 'app-notification-detail-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    TranslatePipe,
    MatDialogModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    MatDividerModule,
  ],
  templateUrl: './notification-detail-dialog.html',
  styleUrl: './notification-detail-dialog.scss',
})
export class NotificationDetailDialog {
  readonly data = inject<NotificationDetailDialogData>(MAT_DIALOG_DATA);
}
