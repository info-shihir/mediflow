import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import {PharmacyStore} from '../../core/state/pharmacy-store';
import {UserRole} from '../../core/models/pharmacy.models';
import {MatIconModule} from '@angular/material/icon';

@Component({

  selector: 'app-access',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './access.html',

  styleUrls: ['./access.scss'],
})
export class Access {
  readonly store = inject(PharmacyStore);

  readonly allRoles: UserRole[] = [
    'Admin',
    'Pharmacist',
    'Cashier',
    'Inventory',
    'BranchManager',
  ];

  readonly capabilities = [
    {name: 'View Overview & Analytics', key: 'dashboard'},
    {name: 'Execute POS Register Sales', key: 'sale'},
    {name: 'Create & Edit Inventory Lots', key: 'inventory'},
    {name: 'Clinical Prescription Verification & Dispensing', key: 'prescription'},
    {name: 'Supplier Invoice OCR Intake', key: 'purchase'},
    {name: 'Create Reorder Purchase Orders', key: 'reorder'},
    {name: 'Approve & Reject Customer Refunds', key: 'return'},
    {name: 'Coordinate Branch Transfers', key: 'branch'},
    {name: 'View Compliance Audit Trail', key: 'audit'},
    {name: 'Modify Pharmacy Profile & Workspace Settings', key: 'settings'},
  ];

  isAllowed(role: UserRole, key: string): boolean {
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
