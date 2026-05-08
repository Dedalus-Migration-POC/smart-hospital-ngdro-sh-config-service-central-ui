import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { NotificationLog, Page } from '../../users/models';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  getMyNotifications(
    page = 0,
    size = 20,
    status?: 'SENT' | 'FAILED' | 'DRY_RUN',
    type?: 'EMAIL' | 'PUSH'
  ): Observable<Page<NotificationLog>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (status) params = params.set('status', status);
    if (type) params = params.set('type', type);
    return this.http.get<Page<NotificationLog>>(`${this.baseUrl}/notifications/me`, { params });
  }
}
