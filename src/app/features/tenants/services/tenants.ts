import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, defer } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import {
  AppConfigActive,
  AppConfigVersion,
  DraftConfigSummary,
  EntityInfo,
  PushNotificationConfig,
  PushNotificationConfigRequest,
  PushSendRequest,
  PushSendResult,
  Tenant,
  TenantCloneRequest,
  TenantCloneResponse,
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

  clone(sourceTenantId: string, req: TenantCloneRequest): Observable<TenantCloneResponse> {
    return this.http.post<TenantCloneResponse>(
      `${this.baseUrl}/tenants/${sourceTenantId}/clone`,
      req,
    );
  }

  update(id: string, req: TenantUpdateRequest): Observable<Tenant> {
    return this.http.put<Tenant>(`${this.baseUrl}/tenants/${id}`, req);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/tenants/${id}`);
  }

  getEntities(tenantId: string, channelId: string): Observable<EntityInfo[]> {
    return this.http.get<EntityInfo[]>(
      `${this.baseUrl}/tenants/${tenantId}/configs/${channelId}/entities`,
    );
  }

  disableEntity(tenantId: string, channelId: string, entity: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/tenants/${tenantId}/configs/${channelId}/entities/${entity}`,
    );
  }

  enableEntity(tenantId: string, channelId: string, entity: string): Observable<void> {
    return this.http.put<void>(
      `${this.baseUrl}/tenants/${tenantId}/configs/${channelId}/entities/${entity}/enable`,
      {},
    );
  }

  getConfig(
    tenantId: string,
    channelId: string,
    source: 'local' | 'remote' = 'local',
    entity = 'base',
  ): Observable<AppConfigActive> {
    const params = new HttpParams().set('source', source).set('entity', entity);
    return this.http.get<AppConfigActive>(
      `${this.baseUrl}/tenants/${tenantId}/configs/${channelId}`,
      { params },
    );
  }

  putConfig(
    tenantId: string,
    channelId: string,
    entity: string,
    configJson: unknown,
  ): Observable<AppConfigVersion> {
    return defer(() => TenantService.compressJsonBody({ configJson })).pipe(
      switchMap(({ body, gzip }) =>
        this.http.put<AppConfigVersion>(
          `${this.baseUrl}/tenants/${tenantId}/configs/${channelId}`,
          body,
          {
            params: new HttpParams().set('entity', entity),
            headers: gzip ? new HttpHeaders({ 'Content-Encoding': 'gzip' }) : undefined,
          },
        ),
      ),
    );
  }

  /**
   * Comprime il body in gzip quando il browser supporta {@link CompressionStream} (Chrome/Edge
   * 80+, Firefox 113+, Safari 16.4+): riduce sensibilmente il tempo di upload delle config più
   * grandi (es. temi con SVG/base64 embedded). Fallback silenzioso al JSON non compresso altrimenti.
   */
  private static async compressJsonBody(payload: unknown): Promise<{ body: Blob; gzip: boolean }> {
    const json = JSON.stringify(payload);
    if (typeof CompressionStream === 'undefined') {
      return { body: new Blob([json], { type: 'application/json' }), gzip: false };
    }
    const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'));
    const buffer = await new Response(stream).arrayBuffer();
    return { body: new Blob([buffer], { type: 'application/json' }), gzip: true };
  }

  getHistory(tenantId: string, channelId: string, entity = 'base'): Observable<AppConfigVersion[]> {
    const params = new HttpParams().set('entity', entity);
    return this.http.get<AppConfigVersion[]>(
      `${this.baseUrl}/tenants/${tenantId}/configs/${channelId}/history`,
      { params },
    );
  }

  rollback(
    tenantId: string,
    channelId: string,
    entity: string,
    version: number,
  ): Observable<AppConfigVersion> {
    return this.http.post<AppConfigVersion>(
      `${this.baseUrl}/tenants/${tenantId}/configs/${channelId}/rollback/${version}`,
      {},
      { params: new HttpParams().set('entity', entity) },
    );
  }

  resync(tenantId: string, channelId: string, entity = 'base'): Observable<AppConfigVersion> {
    return this.http.post<AppConfigVersion>(
      `${this.baseUrl}/tenants/${tenantId}/configs/${channelId}/resync`,
      {},
      { params: new HttpParams().set('entity', entity) },
    );
  }

  dismissConfig(tenantId: string, channelId: string, entity = 'base'): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/tenants/${tenantId}/configs/${channelId}/dismiss`,
      {},
      { params: new HttpParams().set('entity', entity) },
    );
  }

  getDraftConfigs(): Observable<DraftConfigSummary[]> {
    return this.http.get<DraftConfigSummary[]>(`${this.baseUrl}/configs/draft`);
  }

  pushConfirm(
    tenantId: string,
    channelId: string,
    entity: string,
    success: boolean,
    remoteVersion: number | null,
    errorMessage: string | null,
  ): Observable<AppConfigVersion> {
    return this.http.post<AppConfigVersion>(
      `${this.baseUrl}/tenants/${tenantId}/configs/${channelId}/push-confirm`,
      { success, remoteVersion, errorMessage },
      { params: new HttpParams().set('entity', entity) },
    );
  }

  getPushConfig(tenantId: string): Observable<PushNotificationConfig> {
    return this.http.get<PushNotificationConfig>(`${this.baseUrl}/tenants/${tenantId}/push-config`);
  }

  savePushConfig(tenantId: string, req: PushNotificationConfigRequest): Observable<PushNotificationConfig> {
    return this.http.put<PushNotificationConfig>(`${this.baseUrl}/tenants/${tenantId}/push-config`, req);
  }

  sendPushAll(tenantId: string, req: PushSendRequest): Observable<PushSendResult> {
    return this.http.post<PushSendResult>(`${this.baseUrl}/tenants/${tenantId}/push/send-all`, req);
  }
}
