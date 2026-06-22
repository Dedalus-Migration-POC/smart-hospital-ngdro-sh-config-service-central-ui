import { BreakpointObserver } from '@angular/cdk/layout';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs/operators';

import { AuthService } from '../../core/auth/auth';
import pkg from '../../../../package.json';

interface NavItem {
  icon: string;
  labelKey: string;
  path?: string;
  requiredRole?: 'ADMIN';
  customerOnly?: boolean;
}

const MOBILE_QUERY = '(max-width: 959px)';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    MatMenuModule,
    MatDividerModule,
    TranslatePipe,
  ],
  templateUrl: './admin-shell.html',
  styleUrl: './admin-shell.scss',
})
export class AdminShell {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly translate = inject(TranslateService);

  readonly currentUser = this.auth.currentUser;
  readonly currentLang = signal<string>(this.translate.currentLang ?? localStorage.getItem('sh.cs.lang') ?? 'it');
  readonly feVersion = pkg.version;

  readonly isMobile = toSignal(
    this.breakpointObserver.observe(MOBILE_QUERY).pipe(map((r) => r.matches)),
    { initialValue: false },
  );

  readonly sidenavMode = computed<'side' | 'over'>(() => (this.isMobile() ? 'over' : 'side'));
  readonly sidenavOpened = signal(true);

  private readonly navItems: readonly NavItem[] = [
    { icon: 'dashboard', labelKey: 'nav.dashboard', path: '/' },
    { icon: 'business', labelKey: 'nav.customers', path: '/customers' },
    { icon: 'notifications', labelKey: 'nav.notifications', path: '/notifications' },
    { icon: 'people', labelKey: 'nav.users', path: '/users', requiredRole: 'ADMIN' },
    { icon: 'receipt_long', labelKey: 'nav.auditLog', path: '/audit', requiredRole: 'ADMIN' },
    { icon: 'settings', labelKey: 'nav.settings', path: '/settings', requiredRole: 'ADMIN' },
  ];

  readonly visibleNavItems = computed(() => {
    const user = this.currentUser();
    const role = user?.role ?? null;

    if (role === 'CUSTOMER') {
      return [
        { icon: 'dashboard', labelKey: 'nav.dashboard', path: '/my-dashboard' } as NavItem,
        { icon: 'tune', labelKey: 'nav.myConfigurations', path: user?.customerId ? `/customers/${user.customerId}` : undefined } as NavItem,
        { icon: 'notifications', labelKey: 'nav.notifications', path: '/notifications' } as NavItem,
      ];
    }

    return this.navItems.filter((item) => !item.requiredRole || item.requiredRole === role);
  });

  constructor() {
    effect(() => {
      this.sidenavOpened.set(!this.isMobile());
    });

    effect(() => {
      const user = this.currentUser();
      if (user?.role === 'CUSTOMER') {
        const url = this.router.url;
        if (url === '/' || url === '') {
          void this.router.navigateByUrl('/my-dashboard');
        }
      }
    });
  }

  toggleSidenav(): void {
    this.sidenavOpened.update((open) => !open);
  }

  onNavClick(): void {
    if (this.isMobile()) {
      this.sidenavOpened.set(false);
    }
  }

  logout(): void {
    this.auth.logout();
  }

  toggleLanguage(): void {
    const next = this.currentLang() === 'it' ? 'en' : 'it';
    this.translate.use(next);
    this.currentLang.set(next);
    localStorage.setItem('sh.cs.lang', next);
  }
}
