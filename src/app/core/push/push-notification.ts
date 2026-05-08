import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';

export type PushPermission = 'default' | 'granted' | 'denied' | 'unsupported';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  readonly permission = signal<PushPermission>(this.currentPermission());
  readonly subscriptionCount = signal<number>(0);

  readonly isSupported = 'serviceWorker' in navigator && 'PushManager' in window;

  private currentPermission(): PushPermission {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission as PushPermission;
  }

  async loadSubscriptionCount(): Promise<void> {
    if (!this.isSupported) return;
    try {
      const res = await firstValueFrom(
        this.http.get<{ count: number }>(`${this.baseUrl}/push/subscriptions`)
      );
      this.subscriptionCount.set(res.count);
    } catch {
      this.subscriptionCount.set(0);
    }
  }

  async subscribe(): Promise<void> {
    if (!this.isSupported) throw new Error('Push non supportato da questo browser');

    const keyRes = await firstValueFrom(
      this.http.get<{ publicKey: string }>(`${this.baseUrl}/push/vapid-public-key`)
    );
    const applicationServerKey = this.urlBase64ToUint8Array(keyRes.publicKey);

    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;

    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
    const subJson = sub.toJSON() as {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    };

    await firstValueFrom(this.http.post(`${this.baseUrl}/push/subscribe`, {
      endpoint: subJson.endpoint,
      keys: subJson.keys,
    }));

    this.permission.set('granted');
    this.subscriptionCount.set(this.subscriptionCount() + 1);
  }

  async unsubscribe(): Promise<void> {
    if (!this.isSupported) return;
    const reg = await navigator.serviceWorker.getRegistration('/');
    if (!reg) return;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;

    const subJson = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
    await sub.unsubscribe();
    await firstValueFrom(
      this.http.delete(`${this.baseUrl}/push/subscribe`, {
        body: { endpoint: subJson.endpoint, keys: subJson.keys },
      })
    );
    this.subscriptionCount.set(Math.max(0, this.subscriptionCount() - 1));
  }

  async isCurrentBrowserSubscribed(): Promise<boolean> {
    if (!this.isSupported) return false;
    const reg = await navigator.serviceWorker.getRegistration('/');
    if (!reg) return false;
    const sub = await reg.pushManager.getSubscription();
    return sub !== null;
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
  }
}
