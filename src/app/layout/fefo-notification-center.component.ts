import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import {Router} from '@angular/router';
import {PharmacyStore} from '../core/state/pharmacy-store';
import {FefoNotification, FefoUrgency} from '../core/models/pharmacy.models';
import {MatIconModule} from '@angular/material/icon';

@Component({

  selector: 'app-fefo-notification-center',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:keydown.escape)': 'dismissDrawer.emit()',
  },
  templateUrl: './fefo-notification-center.component.html',

  styleUrls: ['./fefo-notification-center.component.scss'],
})
export class FefoNotificationCenter {
  readonly store = inject(PharmacyStore);
  private readonly router = inject(Router);

  readonly dismissDrawer = output<void>();

  readonly activeUrgencyTab = signal<
    'all' | 'critical' | 'warning' | 'attention' | 'acknowledged'
  >('all');
  readonly selectedBranch = signal<string>('all');
  readonly searchQuery = signal<string>('');
  readonly selectedClearanceBatchId = signal<number | null>(null);

  readonly filteredNotifications = computed<FefoNotification[]>(() => {
    const list = this.store.fefoNotifications();
    const tab = this.activeUrgencyTab();
    const branch = this.selectedBranch();
    const query = this.searchQuery().trim().toLowerCase();

    return list.filter((n) => {
      // Tab filter
      if (tab === 'acknowledged') {
        if (!n.acknowledged) return false;
      } else if (tab === 'critical') {
        if (n.urgency !== 'critical') return false;
      } else if (tab === 'warning') {
        if (n.urgency !== 'warning') return false;
      } else if (tab === 'attention') {
        if (n.urgency !== 'attention') return false;
      }

      // Branch filter
      if (branch !== 'all' && n.branch !== branch) {
        return false;
      }

      // Query filter
      if (query) {
        const matchesName = n.medicine.toLowerCase().includes(query);
        const matchesGeneric = n.generic.toLowerCase().includes(query);
        const matchesBatch = n.batch.toLowerCase().includes(query);
        const matchesSku = n.sku.toLowerCase().includes(query);
        if (!matchesName && !matchesGeneric && !matchesBatch && !matchesSku) {
          return false;
        }
      }

      return true;
    });
  });

  countByUrgency(urgency: FefoUrgency): number {
    return this.store
      .fefoNotifications()
      .filter((n) => n.urgency === urgency && !n.acknowledged).length;
  }

  countAcknowledged(): number {
    return this.store
      .fefoNotifications()
      .filter((n) => n.acknowledged).length;
  }

  toggleAcknowledge(batchId: number, currentlyAcknowledged: boolean) {
    if (currentlyAcknowledged) {
      this.store.unacknowledgeFefoNotification(batchId);
    } else {
      this.store.acknowledgeFefoNotification(batchId);
    }
  }

  dispenseInPOS(sku: string, medicine: string, batch: string) {
    this.store.addToCart(sku);
    this.store.showToast(
      'FEFO Dispensing Priority Loaded',
      `${medicine} · Batch ${batch} automatically allocated as earliest expiring stock.`,
      'success',
    );
    this.dismissDrawer.emit();
    this.router.navigate(['/pos']);
  }

  viewInInventory(sku: string) {
    this.dismissDrawer.emit();
    this.router.navigate(['/inventory'], {queryParams: {q: sku}});
  }

  goToPOS() {
    this.dismissDrawer.emit();
    this.router.navigate(['/pos']);
  }

  goToHeatmap() {
    this.dismissDrawer.emit();
    this.router.navigate(['/inventory'], {queryParams: {view: 'heatmap'}});
  }

  applyMarkdown(batchId: number, percent: number) {
    this.store.applyClearanceDiscount(batchId, percent);
    this.selectedClearanceBatchId.set(null);
  }
}
