import {
  ChangeDetectionStrategy,
  Component,
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
import { from, of, switchMap } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth';
import { AuthConfigService } from '../../../../core/auth/auth-config';
import { toUserMessage } from '../../../../core/http/api-error';
import { RecaptchaV3Service } from '../../../../shared/services/recaptcha-v3';

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
  ],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly translate = inject(TranslateService);
  private readonly recaptcha = inject(RecaptchaV3Service);
  private readonly authConfig = inject(AuthConfigService);

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  submit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMessage.set(null);

    const { username, password } = this.form.getRawValue();

    const token$ = this.authConfig.captchaEnabled()
      ? from(this.recaptcha.execute('login'))
      : of('dev-bypass');

    token$
      .pipe(switchMap((captchaToken) => this.auth.login({ username, password, captchaToken })))
      .subscribe({
        next: () => {
          this.loading.set(false);
          const raw = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
          // protezione open redirect: accetta solo path interni (inizia con '/' ma non '//')
          const returnUrl = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
          void this.router.navigateByUrl(returnUrl);
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.errorMessage.set(toUserMessage(err, this.translate.instant('auth.loginError')));
        },
      });
  }
}
