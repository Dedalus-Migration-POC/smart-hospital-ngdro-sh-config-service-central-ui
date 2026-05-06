import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  input,
  output,
} from '@angular/core';

declare global {
  interface Window {
    hcaptcha: {
      render(container: HTMLElement, options: HCaptchaOptions): string;
      reset(widgetId?: string): void;
      getResponse(widgetId?: string): string;
    };
  }
}

interface HCaptchaOptions {
  sitekey: string;
  callback?: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: () => void;
  theme?: 'light' | 'dark';
}

@Component({
  selector: 'app-hcaptcha',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<div #container></div>',
})
export class HCaptchaComponent implements AfterViewInit, OnDestroy {
  @ViewChild('container') private containerRef!: ElementRef<HTMLDivElement>;

  readonly sitekey = input.required<string>();
  readonly verified = output<string>();
  readonly expired = output<void>();

  private widgetId: string | null = null;

  ngAfterViewInit(): void {
    this.waitForHCaptcha().then(() => {
      this.widgetId = window.hcaptcha.render(this.containerRef.nativeElement, {
        sitekey: this.sitekey(),
        callback: (token: string) => this.verified.emit(token),
        'expired-callback': () => this.expired.emit(),
        'error-callback': () => this.expired.emit(),
      });
    });
  }

  reset(): void {
    if (this.widgetId !== null) {
      window.hcaptcha.reset(this.widgetId);
    }
  }

  ngOnDestroy(): void { /* noop */ }

  private waitForHCaptcha(): Promise<void> {
    return new Promise((resolve) => {
      const poll = () => {
        if (typeof window.hcaptcha !== 'undefined') {
          resolve();
        } else {
          setTimeout(poll, 100);
        }
      };
      poll();
    });
  }
}
