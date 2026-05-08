import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { SettingsService } from '../../services/settings';
import { SystemSetting, SystemSettingUpdate } from '../../models';
import { toUserMessage } from '../../../../core/http/api-error';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TranslateModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatTooltipModule, MatSlideToggleModule,
  ],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.scss',
})
export class SettingsPage implements OnInit {
  private readonly service = inject(SettingsService);
  private readonly snack = inject(MatSnackBar);

  smtpSettings = signal<SystemSetting[]>([]);
  emailSettings = signal<SystemSetting[]>([]);
  smtpForm: Record<string, string> = {};
  emailForm: Record<string, string> = {};
  smtpLoading = signal(false);
  emailLoading = signal(false);
  secretVisible: Record<string, boolean> = {};

  ngOnInit() {
    this.service.list().subscribe(all => {
      const smtp = all.filter(s => s.category === 'smtp');
      const email = all.filter(s => s.category === 'email');
      this.smtpSettings.set(smtp);
      this.emailSettings.set(email);
      smtp.forEach(s => { this.smtpForm[s.key] = s.value ?? ''; });
      email.forEach(s => { this.emailForm[s.key] = s.value ?? ''; });
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
        this.snack.open('Configurazione SMTP salvata', 'OK', { duration: 3000 });
      },
      error: err => {
        this.smtpLoading.set(false);
        this.snack.open(toUserMessage(err, 'Errore nel salvataggio'), 'OK', { duration: 6000 });
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
        this.snack.open('Impostazioni email salvate', 'OK', { duration: 3000 });
      },
      error: err => {
        this.emailLoading.set(false);
        this.snack.open(toUserMessage(err, 'Errore nel salvataggio'), 'OK', { duration: 6000 });
      },
    });
  }

  toggleSecretVisibility(key: string) {
    this.secretVisible[key] = !this.secretVisible[key];
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
}
