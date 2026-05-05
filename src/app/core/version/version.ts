import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class VersionService {
  private readonly http = inject(HttpClient);

  getBackendVersion(): Observable<string> {
    return this.http
      .get<{ version: string }>(`${environment.apiBaseUrl}/version`)
      .pipe(
        map((r) => r.version),
        catchError(() => of('–')),
      );
  }
}
