import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AuthService } from '../../../../core/auth/auth';
import { toUserMessage } from '../../../../core/http/api-error';
import { environment } from '../../../../../environments/environment';
import { HCaptchaComponent } from '../../../../shared/components/hcaptcha/hcaptcha';

@Component({
  selector: 'app-login-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    TranslatePipe,
    HCaptchaComponent,
  ],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPage {
  @ViewChild(HCaptchaComponent) private captchaWidget?: HCaptchaComponent;

  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly translate = inject(TranslateService);

  readonly hcaptchaSiteKey = environment.hcaptchaSiteKey;

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly captchaToken = signal<string | null>(null);

  onCaptchaVerified(token: string): void {
    this.captchaToken.set(token);
  }

  onCaptchaExpired(): void {
    this.captchaToken.set(null);
  }

  submit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.captchaToken()) {
      this.errorMessage.set(this.translate.instant('auth.captchaRequired'));
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const { username, password } = this.form.getRawValue();
    this.auth.login({ username, password, captchaToken: this.captchaToken()! }).subscribe({
      next: () => {
        this.loading.set(false);
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
        void this.router.navigateByUrl(returnUrl);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.captchaToken.set(null);
        this.captchaWidget?.reset();
        this.errorMessage.set(toUserMessage(err, this.translate.instant('auth.loginError')));
      },
    });
  }
}
