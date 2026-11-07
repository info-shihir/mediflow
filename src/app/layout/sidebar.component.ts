import {ChangeDetectionStrategy, Component, computed, inject, input, output} from '@angular/core';
import {Router, RouterLink, RouterLinkActive} from '@angular/router';
import {PharmacyStore} from '../core/state/pharmacy-store';
import {UserRole} from '../core/models/pharmacy.models';
import {MatIconModule} from '@angular/material/icon';

@Component({

  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sidebar.component.html',

  styleUrls: ['./sidebar.component.scss'],
})
export class Sidebar {
  readonly store = inject(PharmacyStore);
  private readonly router = inject(Router);
  readonly isOpen = input<boolean>(false);
  readonly closeSidebar = output<void>();

  readonly userEmail = computed(() => {
    const role = this.store.currentRole();
    switch (role) {
      case 'Admin': return 'admin@mediflow.io';
      case 'Pharmacist': return 'pharmacist@mediflow.io';
      case 'Cashier': return 'cashier@mediflow.io';
      case 'Inventory': return 'inventory@mediflow.io';
      case 'BranchManager': return 'branch@mediflow.io';
      default: return 'staff@mediflow.io';
    }
  });

  onRoleChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value as UserRole;
    this.store.setRole(val);
    if (!this.store.canAccessPage(this.router.url.replace('/', ''))) {
      this.router.navigate(['/dashboard']);
    }
  }

  onNavigate() {
    this.closeSidebar.emit();
  }
}
