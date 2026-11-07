import {ChangeDetectionStrategy, Component, inject, output, signal} from '@angular/core';
import {Router, NavigationEnd, RouterLink} from '@angular/router';
import {filter} from 'rxjs/operators';
import {PharmacyStore} from '../core/state/pharmacy-store';
import {MatIconModule} from '@angular/material/icon';
import {FefoNotificationCenter} from './fefo-notification-center.component';

@Component({

  selector: 'app-topbar',
  imports: [RouterLink, MatIconModule, FefoNotificationCenter],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './topbar.component.html',

  styleUrls: ['./topbar.component.scss'],
})
export class Topbar {
  readonly store = inject(PharmacyStore);
  private readonly router = inject(Router);
  readonly toggleMenu = output<void>();

  readonly currentTitle = signal<string>('Overview');
  readonly showNotificationCenter = signal<boolean>(false);

  constructor() {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        const url = this.router.url.split('?')[0].replace('/', '');
        const map: Record<string, string> = {
          dashboard: 'Overview',
          pos: 'Smart POS',
          inventory: 'Batch Inventory',
          prescriptions: 'Prescription Safety',
          purchases: 'Purchasing & OCR',
          reorder: 'Smart Reordering',
          returns: 'Returns & Refunds',
          copilot: 'AI Pharmacy Copilot',
          branches: 'Branches & Transfers',
          audit: 'Audit History',
          access: 'Roles & Permissions',
          reports: 'Reports & Analytics',
          settings: 'Settings',
        };
        this.currentTitle.set(map[url] || 'Pharmacy Overview');
      });
  }

  onSearch(query: string) {
    if (!query.trim()) return;
    this.router.navigate(['/inventory'], {queryParams: {q: query.trim()}});
  }

  toggleNotifications() {
    this.showNotificationCenter.set(!this.showNotificationCenter());
  }
}
