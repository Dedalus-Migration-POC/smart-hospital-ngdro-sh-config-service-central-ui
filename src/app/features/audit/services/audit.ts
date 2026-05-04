import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AuditFilter, AuditLogPage } from '../models';

@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  list(filter: AuditFilter, page: number, size: number): Observable<AuditLogPage> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size);

    if (filter.actor)     params = params.set('actor', filter.actor);
    if (filter.action)    params = params.set('action', filter.action);
    if (filter.entityType) params = params.set('entityType', filter.entityType);
    if (filter.entityId)  params = params.set('entityId', filter.entityId);
    if (filter.outcome)   params = params.set('outcome', filter.outcome);
    if (filter.from)      params = params.set('from', filter.from);
    if (filter.to)        params = params.set('to', filter.to);

    return this.http.get<AuditLogPage>(`${this.baseUrl}/audit`, { params });
  }
}
