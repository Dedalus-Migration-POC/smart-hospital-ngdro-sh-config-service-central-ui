import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

interface AuthConfigResponse {
  recaptchaSiteKey: string;
  captchaEnabled: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthConfigService {
  private readonly http = inject(HttpClient);

  readonly siteKey = signal<string>('');
  readonly captchaEnabled = signal<boolean>(true);

  load(): Observable<void> {
    return this.http
      .get<AuthConfigResponse>(`${environment.apiBaseUrl}/auth/config`)
      .pipe(
        tap((cfg) => {
          this.siteKey.set(cfg.recaptchaSiteKey);
          this.captchaEnabled.set(cfg.captchaEnabled);
        }),
        map(() => void 0),
        catchError(() => of(void 0)),
      );
  }
}
