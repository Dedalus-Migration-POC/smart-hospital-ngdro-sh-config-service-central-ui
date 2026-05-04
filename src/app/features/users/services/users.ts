import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  User,
  UserCreateRequest,
  UserPasswordUpdateRequest,
  UserUpdateRequest,
} from '../models';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  list(activeOnly = true): Observable<User[]> {
    const params = new HttpParams().set('activeOnly', activeOnly);
    return this.http.get<User[]>(`${this.baseUrl}/users`, { params });
  }

  get(id: string): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/users/${id}`);
  }

  create(req: UserCreateRequest): Observable<User> {
    return this.http.post<User>(`${this.baseUrl}/users`, req);
  }

  update(id: string, req: UserUpdateRequest): Observable<User> {
    return this.http.put<User>(`${this.baseUrl}/users/${id}`, req);
  }

  changePassword(id: string, req: UserPasswordUpdateRequest): Observable<User> {
    return this.http.put<User>(`${this.baseUrl}/users/${id}/password`, req);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/users/${id}`);
  }
}
