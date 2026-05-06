import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

declare global {
  interface Window {
    grecaptcha: {
      ready(cb: () => void): void;
      execute(siteKey: string, options: { action: string }): Promise<string>;
    };
  }
}

@Injectable({ providedIn: 'root' })
export class RecaptchaV3Service {
  private readonly siteKey = environment.recaptchaSiteKey;
  private scriptLoaded = false;

  execute(action: string): Promise<string> {
    return this.ensureLoaded().then(
      () =>
        new Promise((resolve, reject) => {
          window.grecaptcha.ready(() => {
            window.grecaptcha.execute(this.siteKey, { action }).then(resolve).catch(reject);
          });
        }),
    );
  }

  private ensureLoaded(): Promise<void> {
    if (this.scriptLoaded || typeof window.grecaptcha !== 'undefined') {
      this.scriptLoaded = true;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?render=${this.siteKey}`;
      script.onload = () => {
        this.scriptLoaded = true;
        resolve();
      };
      document.head.appendChild(script);
    });
  }
}
