import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { SettingsService } from '../../services/settings';
import { SystemSetting, SystemSettingUpdate } from '../../models';
import { toUserMessage } from '../../../../core/http/api-error';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TranslateModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatTooltipModule, MatSlideToggleModule, MatChipsModule,
  ],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.scss',
})
export class SettingsPage implements OnInit {
  private readonly service = inject(SettingsService);
  private readonly snack = inject(MatSnackBar);
  private readonly t = inject(TranslateService);

  smtpSettings = signal<SystemSetting[]>([]);
  emailSettings = signal<SystemSetting[]>([]);
  onpremSettings = signal<SystemSetting[]>([]);
  securitySettings = signal<SystemSetting[]>([]);
  notificationsSettings = signal<SystemSetting[]>([]);

  smtpForm: Record<string, string> = {};
  emailForm: Record<string, string> = {};
  onpremForm: Record<string, string> = {};
  securityForm: Record<string, string> = {};
  notificationsForm: Record<string, string> = {};

  smtpLoading = signal(false);
  emailLoading = signal(false);
  onpremLoading = signal(false);
  securityLoading = signal(false);
  notificationsLoading = signal(false);

  secretVisible: Record<string, boolean> = {};
  private readonly revealedValues: Record<string, string> = {};

  private getForm(key: string): Record<string, string> {
    const cat = key.split('.')[0];
    if (cat === 'smtp') return this.smtpForm;
    if (cat === 'email') return this.emailForm;
    if (cat === 'onprem') return this.onpremForm;
    if (cat === 'security') return this.securityForm;
    return this.notificationsForm;
  }

  ngOnInit() {
    this.service.list().subscribe(all => {
      const smtp = all.filter(s => s.category === 'smtp');
      const email = all.filter(s => s.category === 'email');
      const onprem = all.filter(s => s.category === 'onprem');
      const security = all.filter(s => s.category === 'security');
      const notifications = all.filter(s => s.category === 'notifications');

      this.smtpSettings.set(smtp);
      this.emailSettings.set(email);
      this.onpremSettings.set(onprem);
      this.securitySettings.set(security);
      this.notificationsSettings.set(notifications);

      smtp.forEach(s => { this.smtpForm[s.key] = s.value ?? ''; });
      email.forEach(s => { this.emailForm[s.key] = s.value ?? ''; });
      onprem.forEach(s => { this.onpremForm[s.key] = s.value ?? ''; });
      security.forEach(s => { this.securityForm[s.key] = s.value ?? ''; });
      notifications.forEach(s => { this.notificationsForm[s.key] = s.value ?? ''; });
    });
  }

  saveSmtp() {
    this.smtpLoading.set(true);
    const updates: SystemSettingUpdate[] = this.smtpSettings().map(s => ({
      key: s.key,
      value: s.secret && !this.smtpForm[s.key] ? null : this.smtpForm[s.key],
    }));
    this.service.updateAll(updates).subscribe({
      next: () => {
        this.smtpLoading.set(false);
        this.snack.open(this.t.instant('settings.smtp.saved'), 'OK', { duration: 3000 });
      },
      error: err => {
        this.smtpLoading.set(false);
        this.snack.open(toUserMessage(err, this.t.instant('common.saveError')), 'OK', { duration: 6000 });
      },
    });
  }

  saveEmail() {
    this.emailLoading.set(true);
    const updates: SystemSettingUpdate[] = this.emailSettings().map(s => ({
      key: s.key,
      value: this.emailForm[s.key],
    }));
    this.service.updateAll(updates).subscribe({
      next: () => {
        this.emailLoading.set(false);
        this.snack.open(this.t.instant('settings.email.saved'), 'OK', { duration: 3000 });
      },
      error: err => {
        this.emailLoading.set(false);
        this.snack.open(toUserMessage(err, this.t.instant('common.saveError')), 'OK', { duration: 6000 });
      },
    });
  }

  saveOnprem() {
    this.onpremLoading.set(true);
    const updates: SystemSettingUpdate[] = this.onpremSettings().map(s => ({
      key: s.key,
      value: s.secret && !this.onpremForm[s.key] ? null : this.onpremForm[s.key],
    }));
    this.service.updateAll(updates).subscribe({
      next: () => {
        this.onpremLoading.set(false);
        this.snack.open(this.t.instant('settings.onprem.saved'), 'OK', { duration: 3000 });
      },
      error: err => {
        this.onpremLoading.set(false);
        this.snack.open(toUserMessage(err, this.t.instant('common.saveError')), 'OK', { duration: 6000 });
      },
    });
  }

  saveSecurity() {
    this.securityLoading.set(true);
    const updates: SystemSettingUpdate[] = this.securitySettings().map(s => ({
      key: s.key,
      value: this.securityForm[s.key],
    }));
    this.service.updateAll(updates).subscribe({
      next: () => {
        this.securityLoading.set(false);
        this.snack.open(this.t.instant('settings.security.saved'), 'OK', { duration: 3000 });
      },
      error: err => {
        this.securityLoading.set(false);
        this.snack.open(toUserMessage(err, this.t.instant('common.saveError')), 'OK', { duration: 6000 });
      },
    });
  }

  saveNotifications() {
    this.notificationsLoading.set(true);
    const updates: SystemSettingUpdate[] = this.notificationsSettings().map(s => ({
      key: s.key,
      value: this.notificationsForm[s.key],
    }));
    this.service.updateAll(updates).subscribe({
      next: () => {
        this.notificationsLoading.set(false);
        this.snack.open(this.t.instant('settings.notifications.saved'), 'OK', { duration: 3000 });
      },
      error: err => {
        this.notificationsLoading.set(false);
        this.snack.open(toUserMessage(err, this.t.instant('common.saveError')), 'OK', { duration: 6000 });
      },
    });
  }

  toggleSecretVisibility(key: string) {
    if (!this.secretVisible[key]) {
      // Prima rivelazione: chiama il backend
      if (this.revealedValues[key] !== undefined) {
        this.getForm(key)[key] = this.revealedValues[key];
        this.secretVisible[key] = true;
      } else {
        this.service.reveal(key).subscribe({
          next: ({ value }) => {
            this.revealedValues[key] = value;
            this.getForm(key)[key] = value;
            this.secretVisible[key] = true;
          },
          error: err => this.snack.open(toUserMessage(err, this.t.instant('common.loadError')), 'OK', { duration: 6000 }),
        });
      }
    } else {
      this.secretVisible[key] = false;
    }
  }

  /** Converte una chiave setting (es. email.dev-whitelist) nella chiave i18n del label */
  settingLabel(key: string): string {
    return key.replace(/-/g, '_');
  }

  /** Converte una chiave setting nella chiave i18n dell'hint */
  settingHint(key: string): string {
    return key.replace(/-/g, '_') + '_hint';
  }

  isEmailEnabled(): boolean {
    return this.emailForm['email.enabled'] === 'true';
  }

  setEmailEnabled(val: boolean) {
    this.emailForm['email.enabled'] = String(val);
  }

  isSslEnabled(): boolean {
    return this.smtpForm['smtp.ssl'] === 'true';
  }

  setSslEnabled(val: boolean) {
    this.smtpForm['smtp.ssl'] = String(val);
    this.smtpForm['smtp.port'] = val ? '465' : '587';
  }

  isBooleanOnprem(key: string): boolean {
    return this.onpremForm[key] === 'true';
  }

  setBooleanOnprem(key: string, val: boolean) {
    this.onpremForm[key] = String(val);
  }

  isBoolean(s: SystemSetting): boolean {
    return s.value === 'true' || s.value === 'false';
  }

  isNumber(s: SystemSetting): boolean {
    return s.value !== null && s.value !== '' && !isNaN(Number(s.value));
  }

  readonly String = String;
}
