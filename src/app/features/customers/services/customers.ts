import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { Customer, CustomerCreateRequest, CustomerUpdateRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/customers`;

  /** GET /customers?activeOnly=… — il backend filtra i soft-deleted con activeOnly=true (default). */
  list(activeOnly = true): Observable<Customer[]> {
    const params = new HttpParams().set('activeOnly', activeOnly);
    return this.http.get<Customer[]>(this.base, { params });
  }

  get(id: string): Observable<Customer> {
    return this.http.get<Customer>(`${this.base}/${id}`);
  }

  create(req: CustomerCreateRequest): Observable<Customer> {
    return this.http.post<Customer>(this.base, req);
  }

  update(id: string, req: CustomerUpdateRequest): Observable<Customer> {
    return this.http.put<Customer>(`${this.base}/${id}`, req);
  }

  /** DELETE /customers/{id} — soft-delete lato backend (active=false). */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
