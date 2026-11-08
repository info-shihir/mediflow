import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { PharmacyApi } from '../../core/services/pharmacy-api';
import { UserRole } from '../../core/models/pharmacy.models';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PharmacyStore } from '../../core/state/pharmacy-store';

@Component({

  selector: 'app-access',
  imports: [CommonModule, MatIconModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './access.component.html',

  styleUrls: ['./access.component.scss'],
})
export class Access {
  private readonly api = inject(PharmacyApi);
  readonly store = inject(PharmacyStore);
  readonly roles$ = this.api.getRoles();

  readonly capabilities = [
    { name: 'Dashboard', key: 'dashboard' },
    { name: 'Sale', key: 'sale' },
    { name: 'Inventory', key: 'inventory' },
    { name: 'Prescription', key: 'prescription' },
    { name: 'Purchase', key: 'purchase' },
    { name: 'Reorder', key: 'reorder' },
    { name: 'Return', key: 'return' },
    { name: 'Branch', key: 'branch' },
    { name: 'Audit', key: 'audit' },
    { name: 'Settings', key: 'settings' },
    { name: 'Reports', key: 'reports' },
  ];
  newRoleName = '';
  newRolePerms = new Set<string>();

  togglePermission(key: string) {
    if (this.newRolePerms.has(key)) {
      this.newRolePerms.delete(key);
    } else {
      this.newRolePerms.add(key);
    }
  }

  createRole() {
    const name = this.newRoleName.trim();
    const perms = Array.from(this.newRolePerms);
    if (!name) {
      this.store.showToast('Error', 'Role name is required', 'error');
      return;
    }
    this.api.createRole({name, permissions: perms}).subscribe((role) => {
      this.store.showToast('Role Created', `Role "${role.name}" added.`, 'success');
      // Reset form
      this.newRoleName = '';
      this.newRolePerms.clear();
    });
  }

  readonly allRoles: UserRole[] = ['Admin','Pharmacist','Cashier','Inventory','BranchManager'];

  isAllowed(role: UserRole, key: string): boolean {
    // Prefer backend-provided permissions if available; otherwise fall back to static demo matrix.
    const backendPermissions = this.store.authPermissions();
    if (backendPermissions && backendPermissions.length > 0) {
      return backendPermissions.includes(key);
    }
    const roleMap: Record<UserRole, string[]> = {
      Admin: [
        'dashboard',
        'sale',
        'inventory',
        'prescription',
        'purchase',
        'reorder',
        'return',
        'branch',
        'audit',
        'settings',
      ],
      Pharmacist: ['dashboard', 'sale', 'inventory', 'prescription', 'return', 'reports'],
      Cashier: ['dashboard', 'sale', 'return'],
      Inventory: [
        'dashboard',
        'inventory',
        'purchase',
        'reorder',
        'branch',
        'reports',
      ],
      BranchManager: [
        'dashboard',
        'sale',
        'inventory',
        'purchase',
        'reorder',
        'return',
        'branch',
        'reports',
      ],
    };
    return roleMap[role]?.includes(key) || false;
  }

  onRoleChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value as UserRole;
    this.store.setRole(val);
  }
}
