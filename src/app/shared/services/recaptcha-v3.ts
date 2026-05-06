import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

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
  private readonly siteKey = environment.recaptchaSiteKey;
  private scriptLoaded = false;

  execute(action: string): Promise<string> {
    return this.ensureLoaded().then(
      () =>
        new Promise((resolve, reject) => {
          window.grecaptcha.enterprise.ready(() => {
            window.grecaptcha.enterprise.execute(this.siteKey, { action }).then(resolve).catch(reject);
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
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/enterprise.js?render=${this.siteKey}`;
      script.onload = () => {
        this.scriptLoaded = true;
        resolve();
      };
      script.onerror = () => reject(new Error('Impossibile caricare reCAPTCHA Enterprise'));
      document.head.appendChild(script);
    });
  }
}
