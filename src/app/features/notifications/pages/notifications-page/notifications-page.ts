import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { toUserMessage } from '../../../../core/http/api-error';
import { NotificationLog } from '../../../users/models';
import {
  NotificationDetailDialog,
  NotificationDetailDialogData,
} from '../../dialogs/notification-detail-dialog/notification-detail-dialog';
import { NotificationsService } from '../../services/notifications';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    TranslatePipe,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatChipsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './notifications-page.html',
  styleUrl: './notifications-page.scss',
})
export class NotificationsPage {
  private readonly service = inject(NotificationsService);
  private readonly translate = inject(TranslateService);
  private readonly dialog = inject(MatDialog);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly rows = signal<NotificationLog[]>([]);
  readonly totalElements = signal(0);
  readonly currentPage = signal(0);
  readonly activeFilter = signal<'ALL' | 'SENT' | 'FAILED' | 'DRY_RUN'>('ALL');

  readonly pageSize = 20;
  readonly columns = ['status', 'installationName', 'createdAt', 'actions'];

  constructor() {
    this.load(0);
  }

  setFilter(f: 'ALL' | 'SENT' | 'FAILED' | 'DRY_RUN'): void {
    this.activeFilter.set(f);
    this.load(0);
  }

  onPage(event: PageEvent): void {
    this.load(event.pageIndex);
  }

  openDetail(row: NotificationLog): void {
    this.dialog.open<NotificationDetailDialog, NotificationDetailDialogData>(
      NotificationDetailDialog,
      { data: row, width: '640px' }
    );
  }

  private load(page: number): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.currentPage.set(page);
    const f = this.activeFilter();
    this.service.getMyNotifications(page, this.pageSize, f === 'ALL' ? undefined : f).subscribe({
      next: (res) => {
        this.rows.set(res.content);
        this.totalElements.set(res.totalElements);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(toUserMessage(err, this.translate.instant('notifications.loadError')));
        this.loading.set(false);
      },
    });
  }
}
