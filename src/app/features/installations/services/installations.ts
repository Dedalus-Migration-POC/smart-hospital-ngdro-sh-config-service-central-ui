import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  Installation,
  InstallationApiKeyUpdateRequest,
  InstallationCreateRequest,
  InstallationCreateResponse,
  InstallationHealth,
  InstallationPayloadMasterKeyResponse,
  InstallationPayloadMasterKeyUpdateRequest,
  InstallationReadApiKeyResponse,
  InstallationReprovisionResponse,
  InstallationStats,
  InstallationUpdateRequest,
  FactoryResetResponse,
  ReadPackage,
  ResyncAllResponse,
} from '../models';

@Injectable({ providedIn: 'root' })
export class InstallationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  /** GET /customers/{customerId}/installations?activeOnly=... — non c'è un endpoint globale. */
  listByCustomer(customerId: string, activeOnly = true): Observable<Installation[]> {
    const params = new HttpParams().set('activeOnly', activeOnly);
    return this.http.get<Installation[]>(
      `${this.baseUrl}/customers/${customerId}/installations`,
      { params },
    );
  }

  get(id: string): Observable<Installation> {
    return this.http.get<Installation>(`${this.baseUrl}/installations/${id}`);
  }

  create(customerId: string, req: InstallationCreateRequest): Observable<InstallationCreateResponse> {
    return this.http.post<InstallationCreateResponse>(
      `${this.baseUrl}/customers/${customerId}/installations`,
      req,
    );
  }

  update(id: string, req: InstallationUpdateRequest): Observable<Installation> {
    return this.http.put<Installation>(`${this.baseUrl}/installations/${id}`, req);
  }

  rotateApiKey(id: string, req: InstallationApiKeyUpdateRequest): Observable<Installation> {
    return this.http.put<Installation>(
      `${this.baseUrl}/installations/${id}/api-key`,
      req,
    );
  }

  revealApiKeyToLog(id: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/installations/${id}/api-key/reveal-to-log`, null);
  }

  /** Recupera la ADMIN key (usata dal central per push) in chiaro. */
  getAdminApiKey(id: string): Observable<{ installationId: string; apiKey: string }> {
    return this.http.get<{ installationId: string; apiKey: string }>(
      `${this.baseUrl}/installations/${id}/api-key/reveal`,
    );
  }

  /** Recupera la READ key (da usare dai client mobile/web/totem) in chiaro. */
  getReadApiKey(id: string): Observable<InstallationReadApiKeyResponse> {
    return this.http.get<InstallationReadApiKeyResponse>(
      `${this.baseUrl}/installations/${id}/read-api-key/reveal`,
    );
  }

  /** Re-provisiona la READ key sull'on-prem senza rigenerarla. */
  provisionReadApiKey(id: string): Observable<InstallationReadApiKeyResponse> {
    return this.http.post<InstallationReadApiKeyResponse>(
      `${this.baseUrl}/installations/${id}/read-api-key/provision`,
      null,
    );
  }

  /** Ruota la READ key: genera una nuova e la provisiona sull'on-prem. */
  rotateReadApiKey(id: string): Observable<InstallationReadApiKeyResponse> {
    return this.http.post<InstallationReadApiKeyResponse>(
      `${this.baseUrl}/installations/${id}/read-api-key/rotate`,
      null,
    );
  }

  /**
   * Ruota la payload master key. Se `req.payloadMasterKey` è null/undefined, il central
   * genera una chiave random; in entrambi i casi la chiave viene restituita in chiaro
   * perché va copiata nell'on-prem.
   */
  rotatePayloadMasterKey(
    id: string,
    req: InstallationPayloadMasterKeyUpdateRequest = {},
  ): Observable<InstallationPayloadMasterKeyResponse> {
    return this.http.put<InstallationPayloadMasterKeyResponse>(
      `${this.baseUrl}/installations/${id}/payload-master-key`,
      req,
    );
  }

  /** Recupera la payload master key in chiaro. Da usare con cautela (è una credenziale). */
  getPayloadMasterKey(id: string): Observable<InstallationPayloadMasterKeyResponse> {
    return this.http.get<InstallationPayloadMasterKeyResponse>(
      `${this.baseUrl}/installations/${id}/payload-master-key`,
    );
  }

  /** GET /installations/{id}/health — ADMIN only. */
  checkHealth(id: string): Observable<InstallationHealth> {
    return this.http.get<InstallationHealth>(`${this.baseUrl}/installations/${id}/health`);
  }

  /** GET /installations/{id}/stats — ADMIN only, pull on-demand dall'on-prem. */
  getStats(id: string): Observable<InstallationStats> {
    return this.http.get<InstallationStats>(`${this.baseUrl}/installations/${id}/stats`);
  }

  /** GET /installations/{id}/read-package — ADMIN only. Credenziali per letture browser-direct dall'on-prem. */
  getReadPackage(id: string): Observable<ReadPackage> {
    return this.http.get<ReadPackage>(`${this.baseUrl}/installations/${id}/read-package`);
  }

  /** Ri-provisiona entrambe le chiavi (ADMIN + READ) sull'on-prem. */
  reprovision(id: string): Observable<InstallationReprovisionResponse> {
    return this.http.post<InstallationReprovisionResponse>(
      `${this.baseUrl}/installations/${id}/provision`,
      {},
    );
  }

  /** Ri-pusha tutte le config attive dell'installazione verso l'on-prem. */
  resyncAll(id: string): Observable<ResyncAllResponse> {
    return this.http.post<ResyncAllResponse>(
      `${this.baseUrl}/installations/${id}/resync-all`,
      {},
    );
  }

  /** DELETE /installations/{id} — soft-delete (active=false). */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/installations/${id}`);
  }

  /** POST /installations/{id}/factory-reset — ADMIN only. */
  factoryReset(id: string, resetPassword: string): Observable<FactoryResetResponse> {
    return this.http.post<FactoryResetResponse>(
      `${this.baseUrl}/installations/${id}/factory-reset`,
      { resetPassword },
    );
  }
}
