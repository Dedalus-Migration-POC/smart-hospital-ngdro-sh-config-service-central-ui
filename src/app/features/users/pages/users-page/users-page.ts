import { DatePipe } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';

import { toUserMessage } from '../../../../core/http/api-error';
import {
  UserCreateDialog,
  UserCreateDialogData,
} from '../../dialogs/user-create-dialog/user-create-dialog';
import { User } from '../../models';
import { UserService } from '../../services/users';

@Component({
  selector: 'app-users-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSlideToggleModule,
    MatTooltipModule,
  ],
  templateUrl: './users-page.html',
  styleUrl: './users-page.scss',
})
export class UsersPage implements AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private readonly userService = inject(UserService);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(MatSnackBar);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly showInactive = signal(false);

  readonly searchControl = new FormControl('');
  readonly dataSource = new MatTableDataSource<User>([]);
  readonly displayedColumns = ['username', 'role', 'active', 'createdAt', 'actions'] as const;

  constructor() {
    this.dataSource.filterPredicate = (row: User, filter: string) =>
      row.username.toLowerCase().includes(filter);
    this.searchControl.valueChanges.subscribe((v) => {
      this.dataSource.filter = (v ?? '').trim().toLowerCase();
    });
    this.load(false);
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  toggleInactive(value: boolean): void {
    this.showInactive.set(value);
    this.load(value);
  }

  reload(): void {
    this.load(this.showInactive());
  }

  private load(showInactive: boolean): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.userService.list(!showInactive).subscribe({
      next: (users) => {
        this.dataSource.data = users;
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(toUserMessage(err, 'Impossibile caricare gli utenti.'));
      },
    });
  }

  openCreate(): void {
    const data: UserCreateDialogData = {};
    const ref = this.dialog.open<UserCreateDialog, UserCreateDialogData, User | undefined>(
      UserCreateDialog,
      { data, autoFocus: 'first-tabbable', width: '480px' },
    );
    ref.afterClosed().subscribe((user) => {
      if (!user) return;
      this.snackbar.open(`Utente "${user.username}" creato.`, 'OK', { duration: 3000 });
      this.reload();
    });
  }

  openUser(user: User): void {
    void this.router.navigate(['/users', user.id]);
  }
}
