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
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs/operators';

import { AuthService } from '../../core/auth/auth';

interface NavItem {
  icon: string;
  label: string;
  /** Se assente, l'item è un placeholder non cliccabile (sezione non ancora implementata). */
  path?: string;
  /** Se valorizzato, l'item è visibile solo agli utenti con quel ruolo. */
  requiredRole?: 'ADMIN';
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
  ],
  templateUrl: './admin-shell.html',
  styleUrl: './admin-shell.scss',
})
export class AdminShell {
  private readonly auth = inject(AuthService);
  private readonly breakpointObserver = inject(BreakpointObserver);

  readonly currentUser = this.auth.currentUser;

  readonly isMobile = toSignal(
    this.breakpointObserver.observe(MOBILE_QUERY).pipe(map((r) => r.matches)),
    { initialValue: false },
  );

  readonly sidenavMode = computed<'side' | 'over'>(() => (this.isMobile() ? 'over' : 'side'));
  readonly sidenavOpened = signal(true);

  private readonly navItems: readonly NavItem[] = [
    { icon: 'dashboard', label: 'Dashboard', path: '/' },
    { icon: 'business', label: 'Customer', path: '/customers' },
    { icon: 'people', label: 'Utenti', path: '/users', requiredRole: 'ADMIN' },
    { icon: 'receipt_long', label: 'Audit log', path: '/audit', requiredRole: 'ADMIN' },
  ];

  readonly visibleNavItems = computed(() => {
    const role = this.currentUser()?.role ?? null;
    return this.navItems.filter((item) => !item.requiredRole || item.requiredRole === role);
  });

  constructor() {
    // Sincronizza l'apertura della sidenav col viewport: chiusa su mobile, aperta su desktop.
    // Resta sovrascrivibile dall'utente via hamburger / click su backdrop.
    effect(() => {
      this.sidenavOpened.set(!this.isMobile());
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
}
