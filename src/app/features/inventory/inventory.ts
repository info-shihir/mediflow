import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {PharmacyStore} from '../../core/state/pharmacy-store';
import {BatchItem} from '../../core/models/pharmacy.models';
import {MatIconModule} from '@angular/material/icon';
import {StorageZoneHeatmap} from './storage-zone-heatmap';

type InventoryViewMode = 'fefo' | 'heatmap' | 'ledger';
type ExpiryUrgencyFilter = 'all' | 'critical' | 'warning' | 'safe';

interface FefoProgressInfo {
  days: number;
  percent: number;
  tier: 'critical' | 'warning' | 'safe';
  label: string;
  badgeClass: string;
  barClass: string;
  borderClass: string;
}

@Component({
  selector: 'app-inventory',
  imports: [ReactiveFormsModule, MatIconModule, RouterLink, StorageZoneHeatmap],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.scss'],
})
export class Inventory {
  private readonly heatmapComponent = StorageZoneHeatmap; // reference to avoid NG8113 warning
  readonly store = inject(PharmacyStore);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly activeViewMode = signal<InventoryViewMode>('fefo');
  readonly highValueOnly = signal<boolean>(true);
  readonly searchQuery = signal<string>('');
  readonly branchFilter = signal<string>('all');
  readonly urgencyFilter = signal<ExpiryUrgencyFilter>('all');

  readonly showAddModal = signal<boolean>(false);
  readonly showEditModal = signal<boolean>(false);
  readonly selectedBatch = signal<BatchItem | null>(null);

  readonly addBatchForm = this.fb.group({
    medicine: ['', Validators.required],
    generic: [''],
    sku: ['', Validators.required],
    barcode: [''],
    batch: ['', Validators.required],
    branch: ['Dhanmondi', Validators.required],
    expiry: ['2027-12-31', Validators.required],
    stock: [50, [Validators.required, Validators.min(0)]],
    reorder: [20, [Validators.required, Validators.min(0)]],
    price: [15, [Validators.required, Validators.min(0.01)]],
    cost: [10, [Validators.required, Validators.min(0)]],
    category: ['Analgesic', Validators.required],
    supplier: ['MedSupply Ltd.'],
  });

  readonly editBatchForm = this.fb.group({
    branch: ['Dhanmondi', Validators.required],
    stock: [0, [Validators.required, Validators.min(0)]],
    reorder: [0, [Validators.required, Validators.min(0)]],
    expiry: ['', Validators.required],
    price: [0, [Validators.required, Validators.min(0.01)]],
    cost: [0, [Validators.required, Validators.min(0)]],
  });

  constructor() {
    this.route.queryParams.subscribe((params) => {
      if (params['q']) {
        this.searchQuery.set(params['q']);
      }
      if (params['view'] === 'ledger') {
        this.activeViewMode.set('ledger');
      } else if (params['view'] === 'fefo') {
        this.activeViewMode.set('fefo');
      } else if (params['view'] === 'heatmap') {
        this.activeViewMode.set('heatmap');
      }
      if (params['highValue'] === 'false') {
        this.highValueOnly.set(false);
      }
    });
  }

  isHighValueBatch(b: BatchItem): boolean {
    // High-value defined as lot capital >= ৳ 150 or unit price >= ৳ 15
    return b.stock * b.price >= 150 || b.price >= 15;
  }

  readonly filteredBatches = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const branch = this.branchFilter();
    const urgency = this.urgencyFilter();
    const highValOnly = this.highValueOnly();

    let arr = this.store.batches().filter((b) => {
      const matchQ =
        !q ||
        b.medicine.toLowerCase().includes(q) ||
        b.sku.toLowerCase().includes(q) ||
        b.batch.toLowerCase().includes(q) ||
        b.generic.toLowerCase().includes(q);

      const matchBranch = branch === 'all' || b.branch === branch;
      const matchHighValue = !highValOnly || this.isHighValueBatch(b);

      let matchUrgency = true;
      if (urgency !== 'all') {
        const days = this.getDaysUntilExpiry(b.expiry);
        if (urgency === 'critical') matchUrgency = days <= 90;
        else if (urgency === 'warning') matchUrgency = days > 90 && days <= 180;
        else if (urgency === 'safe') matchUrgency = days > 180;
      }

      return matchQ && matchBranch && matchHighValue && matchUrgency;
    });

    // FEFO Sorting: strictly sort by earliest expiry date first
    arr = [...arr].sort((a, b) => a.expiry.localeCompare(b.expiry));

    return arr;
  });

  readonly totalHighValueCapital = computed(() => {
    return this.store
      .batches()
      .filter((b) => this.isHighValueBatch(b))
      .reduce((sum, b) => sum + b.stock * b.price, 0);
  });

  readonly highValueBatchesCount = computed(() => {
    return this.store.batches().filter((b) => this.isHighValueBatch(b)).length;
  });

  readonly atRiskCapital = computed(() => {
    const today = new Date('2026-10-14').getTime();
    return this.store
      .batches()
      .filter((b) => {
        const exp = new Date(b.expiry).getTime();
        const days = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
        return days <= 180 && this.isHighValueBatch(b);
      })
      .reduce((sum, b) => sum + b.stock * b.price, 0);
  });

  readonly atRiskBatchesCount = computed(() => {
    const today = new Date('2026-10-14').getTime();
    return this.store.batches().filter((b) => {
      const exp = new Date(b.expiry).getTime();
      const days = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
      return days <= 180 && this.isHighValueBatch(b);
    }).length;
  });

  readonly earliestBatchDays = computed(() => {
    const list = this.filteredBatches();
    if (!list.length) return 0;
    return this.getDaysUntilExpiry(list[0].expiry);
  });

  readonly earliestBatchName = computed(() => {
    const list = this.filteredBatches();
    if (!list.length) return 'No active lots';
    return `${list[0].medicine} (${list[0].batch})`;
  });

  getDaysUntilExpiry(dateStr: string): number {
    const today = new Date('2026-10-14').getTime();
    const exp = new Date(dateStr).getTime();
    return Math.max(0, Math.ceil((exp - today) / (1000 * 60 * 60 * 24)));
  }

  getShelflifeProgress(dateStr: string): FefoProgressInfo {
    const days = this.getDaysUntilExpiry(dateStr);
    // Baseline max window of 730 days (2 years shelf life)
    const maxDays = 730;
    const percent = Math.max(6, Math.min(100, Math.round((days / maxDays) * 100)));

    if (days <= 90) {
      return {
        days,
        percent,
        tier: 'critical',
        label: 'Critical FEFO (< 90d)',
        badgeClass: 'bg-rose-100 text-rose-900 border border-rose-200',
        barClass: 'bg-gradient-to-r from-rose-500 to-red-600',
        borderClass: 'border-rose-200 bg-rose-50/20',
      };
    } else if (days <= 180) {
      return {
        days,
        percent,
        tier: 'warning',
        label: 'Approaching Expiry (91-180d)',
        badgeClass: 'bg-amber-100 text-amber-900 border border-amber-200',
        barClass: 'bg-gradient-to-r from-amber-400 to-amber-500',
        borderClass: 'border-amber-200 bg-amber-50/20',
      };
    } else {
      return {
        days,
        percent,
        tier: 'safe',
        label: 'Stable Shelf (> 180d)',
        badgeClass: 'bg-emerald-100 text-emerald-900 border border-emerald-200',
        barClass: 'bg-gradient-to-r from-teal-400 to-emerald-500',
        borderClass: 'border-slate-200 bg-white',
      };
    }
  }

  toggleHighValueFilter() {
    this.highValueOnly.update((v) => !v);
  }

  resetFilters() {
    this.searchQuery.set('');
    this.branchFilter.set('all');
    this.urgencyFilter.set('all');
    this.highValueOnly.set(false);
  }

  allocateInPOS(batch: BatchItem) {
    this.store.addToCart(batch.sku);
    this.store.showToast(
      'Added to POS Cart (FEFO Lot)',
      `${batch.medicine} Lot ${batch.batch} queued for checkout.`,
      'success',
    );
    this.router.navigate(['/pos']);
  }

  applyFefoDiscount(batch: BatchItem) {
    const discounted = Math.round(batch.price * 0.85 * 100) / 100;
    this.store.updateBatch(batch.id, {price: discounted});
    this.store.showToast(
      'FEFO Markdown Applied',
      `${batch.medicine} (${batch.batch}) retail price set to ৳ ${discounted.toFixed(2)} to accelerate outflow.`,
      'success',
    );
  }

  openAddModal() {
    this.addBatchForm.reset({
      medicine: '',
      generic: '',
      sku: 'MED-0' + (this.store.batches().length + 1),
      barcode: '89010' + (this.store.batches().length + 1),
      batch: 'LOT' + Math.floor(1000 + Math.random() * 9000),
      branch: 'Dhanmondi',
      expiry: '2028-06-30',
      stock: 50,
      reorder: 20,
      price: 15,
      cost: 10,
      category: 'Analgesic',
      supplier: 'MedSupply Ltd.',
    });
    this.showAddModal.set(true);
  }

  openEditModal(batch: BatchItem) {
    this.selectedBatch.set(batch);
    this.editBatchForm.patchValue({
      branch: batch.branch,
      stock: batch.stock,
      reorder: batch.reorder,
      expiry: batch.expiry,
      price: batch.price,
      cost: batch.cost,
    });
    this.showEditModal.set(true);
  }

  submitAddBatch() {
    if (this.addBatchForm.invalid) return;
    const val = this.addBatchForm.value;
    this.store.addBatch({
      medicine: val.medicine!,
      generic: val.generic || '',
      sku: val.sku!,
      barcode: val.barcode || '',
      batch: val.batch!,
      branch: val.branch!,
      expiry: val.expiry!,
      stock: Number(val.stock),
      reorder: Number(val.reorder),
      price: Number(val.price),
      cost: Number(val.cost),
      category: val.category!,
      supplier: val.supplier || 'MedSupply Ltd.',
      emoji: '💊',
    });
    this.showAddModal.set(false);
  }

  submitEditBatch() {
    const batch = this.selectedBatch();
    if (!batch || this.editBatchForm.invalid) return;
    const val = this.editBatchForm.value;
    this.store.updateBatch(batch.id, {
      branch: val.branch!,
      stock: Number(val.stock),
      reorder: Number(val.reorder),
      expiry: val.expiry!,
      price: Number(val.price),
      cost: Number(val.cost),
    });
    this.showEditModal.set(false);
  }

  exportInventoryCSV() {
    const headers = [
      'FEFO_Rank',
      'Medicine',
      'Generic',
      'SKU',
      'Batch',
      'Branch',
      'Expiry',
      'Days_Left',
      'FEFO_Tier',
      'Stock',
      'Reorder',
      'Price',
      'Lot_Value',
      'High_Value',
    ];
    const rows = this.filteredBatches().map((b, idx) => {
      const fefo = this.getShelflifeProgress(b.expiry);
      const isHighVal = this.isHighValueBatch(b) ? 'YES' : 'NO';
      const lotVal = (b.stock * b.price).toFixed(2);
      return [
        idx + 1,
        `"${b.medicine}"`,
        `"${b.generic}"`,
        b.sku,
        b.batch,
        b.branch,
        b.expiry,
        fefo.days,
        fefo.tier.toUpperCase(),
        b.stock,
        b.reorder,
        b.price,
        lotVal,
        isHighVal,
      ];
    });
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], {type: 'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mediflow-fefo-batch-ledger.csv';
    a.click();
    URL.revokeObjectURL(url);
    this.store.showToast('CSV Exported', 'Downloaded complete FEFO batch ledger.');
  }
}
