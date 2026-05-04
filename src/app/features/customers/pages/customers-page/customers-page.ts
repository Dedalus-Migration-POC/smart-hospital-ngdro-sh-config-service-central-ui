import { DatePipe } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
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

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { toUserMessage } from '../../../../core/http/api-error';
import { CustomerCreateDialog } from '../../dialogs/customer-create-dialog/customer-create-dialog';
import { Customer } from '../../models';
import { CustomerService } from '../../services/customers';

@Component({
  selector: 'app-customers-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressBarModule,
    MatSlideToggleModule,
    MatTooltipModule,
    TranslatePipe,
  ],
  templateUrl: './customers-page.html',
  styleUrl: './customers-page.scss',
})
export class CustomersPage implements OnInit, AfterViewInit {
  private readonly customers = inject(CustomerService);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly showInactive = signal(false);

  readonly displayedColumns = ['slug', 'name', 'active', 'createdAt', 'actions'] as const;
  readonly dataSource = new MatTableDataSource<Customer>([]);

  @ViewChild(MatPaginator) private paginator!: MatPaginator;
  @ViewChild(MatSort) private sort!: MatSort;

  ngOnInit(): void {
    this.dataSource.filterPredicate = (data, filter) => {
      const needle = filter.trim().toLowerCase();
      if (!needle) return true;
      return data.slug.toLowerCase().includes(needle) || data.name.toLowerCase().includes(needle);
    };
    this.reload();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  reload(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.customers.list(!this.showInactive()).subscribe({
      next: (rows) => {
        this.dataSource.data = rows;
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(toUserMessage(err, this.translate.instant('customer.loadDetailError')));
      },
    });
  }

  applyFilter(value: string): void {
    this.dataSource.filter = value;
  }

  toggleInactive(value: boolean): void {
    this.showInactive.set(value);
    this.reload();
  }

  openCreate(): void {
    const ref = this.dialog.open<CustomerCreateDialog, void, Customer | undefined>(
      CustomerCreateDialog,
      { width: '480px', autoFocus: 'first-tabbable' },
    );
    ref.afterClosed().subscribe((created) => {
      if (created) {
        this.snackbar.open(this.translate.instant('customer.createSuccess', { name: created.name }), 'OK', { duration: 4000 });
        this.reload();
      }
    });
  }

  openDetail(customer: Customer): void {
    void this.router.navigate(['/customers', customer.id]);
  }
}
