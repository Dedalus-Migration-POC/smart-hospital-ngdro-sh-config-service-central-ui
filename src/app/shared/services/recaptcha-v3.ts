import { Injectable, inject } from '@angular/core';
import { AuthConfigService } from '../../core/auth/auth-config';

declare global {
  interface Window {
    grecaptcha: {
      enterprise: {
        ready(cb: () => void): void;
        execute(siteKey: string, options: { action: string }): Promise<string>;
      };
    };
  }
}

@Injectable({ providedIn: 'root' })
export class RecaptchaV3Service {
  private readonly authConfig = inject(AuthConfigService);
  private scriptLoaded = false;

  execute(action: string): Promise<string> {
    return this.ensureLoaded().then(
      () =>
        new Promise((resolve, reject) => {
          const siteKey = this.authConfig.siteKey();
          window.grecaptcha.enterprise.ready(() => {
            window.grecaptcha.enterprise.execute(siteKey, { action }).then(resolve).catch(reject);
          });
        }),
    );
  }

  private ensureLoaded(): Promise<void> {
    if (this.scriptLoaded || typeof window.grecaptcha?.enterprise !== 'undefined') {
      this.scriptLoaded = true;
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const siteKey = this.authConfig.siteKey();
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/enterprise.js?render=${siteKey}`;
      script.onload = () => {
        this.scriptLoaded = true;
        resolve();
      };
      script.onerror = () => reject(new Error('Impossibile caricare reCAPTCHA Enterprise'));
      document.head.appendChild(script);
    });
  }
}
