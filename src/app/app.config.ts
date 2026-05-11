import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { APP_INITIALIZER, ApplicationConfig, inject, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { TranslateService, provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { firstValueFrom } from 'rxjs';

import { authInterceptor } from './core/auth/auth-interceptor';
import { AuthConfigService } from './core/auth/auth-config';
import { routes } from './app.routes';

const SUPPORTED_LANGS = ['it', 'en'] as const;
type SupportedLang = (typeof SUPPORTED_LANGS)[number];

function detectLang(): SupportedLang {
  const saved = localStorage.getItem('sh.cs.lang');
  if (saved && SUPPORTED_LANGS.includes(saved as SupportedLang)) {
    return saved as SupportedLang;
  }
  const browserLang = navigator.language?.split('-')[0] ?? 'it';
  return SUPPORTED_LANGS.includes(browserLang as SupportedLang) ? (browserLang as SupportedLang) : 'en';
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimationsAsync(),
    { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { subscriptSizing: 'dynamic' } },
    provideTranslateService({ fallbackLang: 'it' }),
    ...provideTranslateHttpLoader(),
    {
      provide: APP_INITIALIZER,
      useFactory: (authConfig: AuthConfigService) => () => firstValueFrom(authConfig.load()),
      deps: [AuthConfigService],
      multi: true,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: () => {
        const translate = inject(TranslateService);
        return async () => {
          translate.setDefaultLang('it');
          const lang = detectLang();
          try {
            await firstValueFrom(translate.use(lang));
          } catch {
            // fallback silenzioso
          }
        };
      },
      multi: true,
    },
  ],
};
