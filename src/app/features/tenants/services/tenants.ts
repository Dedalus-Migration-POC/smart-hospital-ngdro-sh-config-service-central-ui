import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  AppConfigActive,
  AppConfigVersion,
  Tenant,
  TenantCreateRequest,
  TenantUpdateRequest,
} from '../models';

@Injectable({ providedIn: 'root' })
export class TenantService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  listByInstallation(installationId: string, activeOnly = true): Observable<Tenant[]> {
    const params = new HttpParams().set('activeOnly', activeOnly);
    return this.http.get<Tenant[]>(`${this.baseUrl}/installations/${installationId}/tenants`, {
      params,
    });
  }

  get(id: string): Observable<Tenant> {
    return this.http.get<Tenant>(`${this.baseUrl}/tenants/${id}`);
  }

  create(installationId: string, req: TenantCreateRequest): Observable<Tenant> {
    return this.http.post<Tenant>(
      `${this.baseUrl}/installations/${installationId}/tenants`,
      req,
    );
  }

  update(id: string, req: TenantUpdateRequest): Observable<Tenant> {
    return this.http.put<Tenant>(`${this.baseUrl}/tenants/${id}`, req);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/tenants/${id}`);
  }

  getConfig(tenantId: string, channelId: string, source: 'local' | 'remote' = 'local'): Observable<AppConfigActive> {
    const params = new HttpParams().set('source', source);
    return this.http.get<AppConfigActive>(
      `${this.baseUrl}/tenants/${tenantId}/configs/${channelId}`,
      { params },
    );
  }

  putConfig(tenantId: string, channelId: string, configJson: unknown): Observable<AppConfigVersion> {
    return this.http.put<AppConfigVersion>(
      `${this.baseUrl}/tenants/${tenantId}/configs/${channelId}`,
      { configJson },
    );
  }

  getHistory(tenantId: string, channelId: string): Observable<AppConfigVersion[]> {
    return this.http.get<AppConfigVersion[]>(
      `${this.baseUrl}/tenants/${tenantId}/configs/${channelId}/history`,
    );
  }

  rollback(tenantId: string, channelId: string, version: number): Observable<AppConfigVersion> {
    return this.http.post<AppConfigVersion>(
      `${this.baseUrl}/tenants/${tenantId}/configs/${channelId}/rollback/${version}`,
      {},
    );
  }

  resync(tenantId: string, channelId: string): Observable<AppConfigVersion> {
    return this.http.post<AppConfigVersion>(
      `${this.baseUrl}/tenants/${tenantId}/configs/${channelId}/resync`,
      {},
    );
  }
}
