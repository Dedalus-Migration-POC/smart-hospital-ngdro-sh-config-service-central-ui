import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { SystemSetting, SystemSettingUpdate } from '../models';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/settings`;

  list(category?: string): Observable<SystemSetting[]> {
    let params = new HttpParams();
    if (category) params = params.set('category', category);
    return this.http.get<SystemSetting[]>(this.base, { params });
  }

  updateAll(updates: SystemSettingUpdate[]): Observable<void> {
    return this.http.put<void>(this.base, updates);
  }

  reveal(key: string): Observable<{ value: string }> {
    return this.http.get<{ value: string }>(`${this.base}/${encodeURIComponent(key)}/reveal`);
  }
}
