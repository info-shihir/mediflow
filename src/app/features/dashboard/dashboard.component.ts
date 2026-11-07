import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {RouterLink} from '@angular/router';
import {PharmacyStore} from '../../core/state/pharmacy-store';
import {UserRole} from '../../core/models/pharmacy.models';
import {MatIconModule} from '@angular/material/icon';

interface SalesRow {
  id: string;
  name: string;
  avatar: string;
  avatarBg: string;
  medicine: string;
  email: string;
  quantity: number;
  price: number;
  date: string;
  checked: boolean;
}

@Component({

  selector: 'app-dashboard',
  imports: [RouterLink, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',

  styleUrls: ['./dashboard.component.scss'],
})
export class Dashboard {
  readonly store = inject(PharmacyStore);
  readonly showRoleMenu = signal<boolean>(false);
  readonly tableSearch = signal<string>('');

  readonly salesRows = signal<SalesRow[]>([
    {
      id: '1',
      name: 'Susan Williams',
      avatar: '👩',
      avatarBg: '#FDE68A',
      medicine: 'Medicine Two',
      email: 'guest@avoherfiz.com',
      quantity: 1,
      price: 152.0,
      date: 'Apr 22, 2026 12:00 AM',
      checked: false,
    },
    {
      id: '2',
      name: 'Bentley Howard',
      avatar: '👨',
      avatarBg: '#FED7AA',
      medicine: 'Test Medicine',
      email: 'guest@avoherfiz.com',
      quantity: 1,
      price: 196.0,
      date: 'Apr 22, 2026 12:00 AM',
      checked: false,
    },
    {
      id: '3',
      name: 'Evelyn Johnson',
      avatar: '👩',
      avatarBg: '#BBF7D0',
      medicine: 'Medicine One',
      email: 'guest@avoherfiz.com',
      quantity: 1,
      price: 270.0,
      date: 'Apr 22, 2026 12:00 AM',
      checked: false,
    },
  ]);

  readonly filteredSalesRows = computed(() => {
    const q = this.tableSearch().toLowerCase();
    return this.salesRows().filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.medicine.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q),
    );
  });

  readonly todaySalesAmount = computed(() => {
    return '95.00';
  });

  toggleRoleDropdown() {
    this.showRoleMenu.update((v) => !v);
  }

  selectRole(role: UserRole) {
    this.store.setRole(role);
    this.showRoleMenu.set(false);
  }

  incrementQty(row: SalesRow) {
    row.quantity++;
    row.price += 40;
    this.salesRows.set([...this.salesRows()]);
  }

  decrementQty(row: SalesRow) {
    if (row.quantity > 1) {
      row.quantity--;
      row.price -= 40;
      this.salesRows.set([...this.salesRows()]);
    }
  }

  deleteRow(id: string) {
    this.salesRows.set(this.salesRows().filter((r) => r.id !== id));
    this.store.showToast('Item Removed', 'Sale row removed from recent list.');
  }
}
