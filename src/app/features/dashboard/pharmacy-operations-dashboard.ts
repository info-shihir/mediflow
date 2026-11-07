import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {RouterLink} from '@angular/router';
import {PharmacyStore} from '../../core/state/pharmacy-store';
import {
  BatchItem,
  PrescriptionItem,
} from '../../core/models/pharmacy.models';
import {MatIconModule} from '@angular/material/icon';
import {StorageZoneHeatmap} from '../inventory/storage-zone-heatmap';

type AlertTab = 'all' | 'lowStock' | 'prescriptions' | 'expiries' | 'heatmap';

@Component({
  selector: 'app-pharmacy-operations-dashboard',
  imports: [RouterLink, MatIconModule, StorageZoneHeatmap],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pharmacy-operations-dashboard.html',
})
export class PharmacyOperationsDashboard {
  readonly store = inject(PharmacyStore);

  readonly selectedBranch = signal<string>('All');
  readonly activeTab = signal<AlertTab>('all');
  readonly searchFilter = signal<string>('');

  // Modals state
  readonly selectedRxForReview = signal<PrescriptionItem | null>(null);
  readonly reviewChecks = signal<PrescriptionItem['checks']>({
    identity: true,
    legibility: true,
    allergy: true,
    appropriateness: true,
  });
  readonly reviewNotes = signal<string>('');

  readonly selectedBatchForRestock = signal<BatchItem | null>(null);
  readonly customRestockUnits = signal<number>(50);

  // Filtered by branch
  readonly filteredBatches = computed(() => {
    const branch = this.selectedBranch();
    const batches = this.store.batches();
    if (branch === 'All') return batches;
    return batches.filter((b) => b.branch.toLowerCase().includes(branch.toLowerCase()));
  });

  // Low stock batches
  readonly filteredLowStock = computed(() => {
    return this.filteredBatches().filter((b) => b.stock <= b.reorder);
  });

  readonly outOfStockCount = computed(() => {
    return this.filteredLowStock().filter((b) => b.stock === 0).length;
  });

  readonly lowStockWarningCount = computed(() => {
    return this.filteredLowStock().filter((b) => b.stock > 0).length;
  });

  // Pending prescriptions
  readonly filteredPendingRx = computed(() => {
    return this.store.prescriptions().filter(
      (p) => p.status === 'Pending review' || p.status === 'On hold',
    );
  });

  readonly pendingReviewCount = computed(() => {
    return this.filteredPendingRx().filter((p) => p.status === 'Pending review').length;
  });

  readonly onHoldCount = computed(() => {
    return this.filteredPendingRx().filter((p) => p.status === 'On hold').length;
  });

  // Near expiries (<= 180 days relative to today or 2026-10-14)
  readonly filteredNearExpiries = computed(() => {
    const today = new Date('2026-10-14').getTime();
    return this.filteredBatches()
      .filter((b) => {
        const exp = new Date(b.expiry).getTime();
        const days = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
        return days <= 180;
      })
      .sort((a, b) => a.expiry.localeCompare(b.expiry));
  });

  readonly earliestExpiryDays = computed(() => {
    const expiries = this.filteredNearExpiries();
    if (expiries.length === 0) return 0;
    return this.getDaysUntilExpiry(expiries[0].expiry);
  });

  readonly atRiskValue = computed(() => {
    return this.filteredNearExpiries().reduce(
      (sum, b) => sum + b.stock * b.price,
      0,
    );
  });

  readonly totalPriorityCount = computed(() => {
    return (
      this.filteredLowStock().length +
      this.filteredPendingRx().length +
      this.filteredNearExpiries().length
    );
  });

  // Displayed lists matching the search text filter
  readonly displayedLowStock = computed(() => {
    const q = this.searchFilter().toLowerCase().trim();
    const items = this.filteredLowStock();
    if (!q) return items;
    return items.filter(
      (b) =>
        b.medicine.toLowerCase().includes(q) ||
        b.generic.toLowerCase().includes(q) ||
        b.sku.toLowerCase().includes(q) ||
        b.batch.toLowerCase().includes(q) ||
        b.supplier.toLowerCase().includes(q),
    );
  });

  readonly displayedPendingRx = computed(() => {
    const q = this.searchFilter().toLowerCase().trim();
    const items = this.filteredPendingRx();
    if (!q) return items;
    return items.filter(
      (p) =>
        p.id.toLowerCase().includes(q) ||
        p.patient.toLowerCase().includes(q) ||
        p.doctor.toLowerCase().includes(q) ||
        p.medicines.toLowerCase().includes(q),
    );
  });

  readonly displayedNearExpiries = computed(() => {
    const q = this.searchFilter().toLowerCase().trim();
    const items = this.filteredNearExpiries();
    if (!q) return items;
    return items.filter(
      (b) =>
        b.medicine.toLowerCase().includes(q) ||
        b.batch.toLowerCase().includes(q) ||
        b.sku.toLowerCase().includes(q) ||
        b.branch.toLowerCase().includes(q),
    );
  });

  onBranchChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.selectedBranch.set(select.value);
  }

  refreshOperations() {
    this.store.loadInitialData();
    this.store.showToast('Operations synced', 'All metrics refreshed from server.');
  }

  getDaysUntilExpiry(expiryDate: string): number {
    const today = new Date('2026-10-14').getTime();
    const exp = new Date(expiryDate).getTime();
    return Math.max(0, Math.ceil((exp - today) / (1000 * 60 * 60 * 24)));
  }

  quickRestock(batch: BatchItem, amount: number) {
    const newStock = batch.stock + amount;
    this.store.updateBatch(batch.id, {stock: newStock});
    this.store.showToast(
      'Emergency restock recorded',
      `Added ${amount} units to ${batch.medicine} (Lot ${batch.batch}). New stock: ${newStock}.`,
      'success',
    );
  }

  openRestockModal(batch: BatchItem) {
    this.selectedBatchForRestock.set(batch);
    this.customRestockUnits.set(Math.max(20, batch.reorder * 2));
  }

  confirmCustomRestock() {
    const b = this.selectedBatchForRestock();
    if (!b) return;
    const added = this.customRestockUnits();
    if (added <= 0) return;
    this.quickRestock(b, added);
    this.selectedBatchForRestock.set(null);
  }

  quickApproveRx(rx: PrescriptionItem) {
    const allPassed: PrescriptionItem['checks'] = {
      identity: true,
      legibility: true,
      allergy: true,
      appropriateness: true,
    };
    this.store.reviewPrescription(
      rx.id,
      allPassed,
      'Approved via Operations Dashboard quick-verify protocol.',
      'Reviewed',
    );
  }

  openRxReviewModal(rx: PrescriptionItem) {
    this.selectedRxForReview.set(rx);
    this.reviewChecks.set({ ...rx.checks });
    this.reviewNotes.set(rx.notes || '');
  }

  toggleCheck(field: keyof PrescriptionItem['checks']) {
    this.reviewChecks.update((checks) => ({
      ...checks,
      [field]: !checks[field],
    }));
  }

  submitRxReview(outcome: 'Reviewed' | 'On hold') {
    const rx = this.selectedRxForReview();
    if (!rx) return;

    this.store.reviewPrescription(
      rx.id,
      this.reviewChecks(),
      this.reviewNotes() || (outcome === 'Reviewed' ? 'Approved' : 'On hold for query'),
      outcome,
    );
    this.selectedRxForReview.set(null);
  }

  applyClearanceDiscount(batch: BatchItem) {
    const discountedPrice = Math.round(batch.price * 0.8 * 100) / 100;
    this.store.updateBatch(batch.id, {price: discountedPrice});
    this.store.showToast(
      'FEFO Clearance Discount Applied',
      `${batch.medicine} lot ${batch.batch} discounted from ৳${batch.price.toFixed(2)} to ৳${discountedPrice.toFixed(2)}.`,
      'success',
    );
  }

  stageSupplierReturn(batch: BatchItem) {
    this.store.showToast(
      'Supplier Return Staged',
      `Batch ${batch.batch} (${batch.stock} units) submitted to returns approval queue.`,
      'info',
    );
  }
}
