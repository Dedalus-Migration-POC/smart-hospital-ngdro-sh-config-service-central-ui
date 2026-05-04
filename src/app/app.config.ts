import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { APP_INITIALIZER, ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { TranslateLoader, TranslateService, provideTranslateService } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { authInterceptor } from './core/auth/auth-interceptor';
import { routes } from './app.routes';

function createTranslateLoader(http: HttpClient): TranslateHttpLoader {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

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

function initLanguage(translate: TranslateService): () => Promise<void> {
  return () => {
    translate.setDefaultLang('it');
    const lang = detectLang();
    return firstValueFrom(translate.use(lang)) as Promise<void>;
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimationsAsync(),
    provideTranslateService({
      defaultLanguage: 'it',
      loader: {
        provide: TranslateLoader,
        useFactory: createTranslateLoader,
        deps: [HttpClient],
      },
    }),
    {
      provide: APP_INITIALIZER,
      useFactory: initLanguage,
      deps: [TranslateService],
      multi: true,
    },
  ],
};
