import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  Installation,
  InstallationApiKeyUpdateRequest,
  InstallationCreateRequest,
  InstallationHealth,
  InstallationPayloadMasterKeyResponse,
  InstallationPayloadMasterKeyUpdateRequest,
  InstallationStats,
  InstallationUpdateRequest,
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

  create(customerId: string, req: InstallationCreateRequest): Observable<Installation> {
    return this.http.post<Installation>(
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

  /** DELETE /installations/{id} — soft-delete (active=false). */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/installations/${id}`);
  }
}
