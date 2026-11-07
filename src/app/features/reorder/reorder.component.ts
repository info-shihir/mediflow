import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {PharmacyStore} from '../../core/state/pharmacy-store';
import {MatIconModule} from '@angular/material/icon';

interface ReorderProposal {
  sku: string;
  medicine: string;
  currentStock: number;
  reorderPoint: number;
  suggestedQty: number;
  supplier: string;
  unitCost: number;
  included: boolean;
}

@Component({

  selector: 'app-reorder',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reorder.html',

  styleUrls: ['./reorder.scss'],
})
export class Reorder {
  readonly store = inject(PharmacyStore);
  readonly selectedBranch = signal<string>('Dhanmondi');

  readonly proposals = signal<Map<string, ReorderProposal>>(new Map());

  constructor() {
    this.initProposals();
  }

  initProposals() {
    const map = new Map<string, ReorderProposal>();
    const branch = this.selectedBranch();

    for (const b of this.store.batches()) {
      if (b.branch === branch && !map.has(b.sku)) {
        const branchBatches = this.store
          .batches()
          .filter((x) => x.sku === b.sku && x.branch === branch);
        const curStock = branchBatches.reduce((s, x) => s + x.stock, 0);
        const reorder = branchBatches.reduce((s, x) => s + x.reorder, 0);
        const suggested = Math.max(reorder * 2 - curStock, 0);

        map.set(b.sku, {
          sku: b.sku,
          medicine: b.medicine,
          currentStock: curStock,
          reorderPoint: reorder,
          suggestedQty: suggested > 0 ? suggested : 20,
          supplier: b.supplier,
          unitCost: b.cost,
          included: curStock <= reorder,
        });
      }
    }
    this.proposals.set(map);
  }

  readonly proposalList = computed(() => {
    return Array.from(this.proposals().values());
  });

  readonly selectedCount = computed(() => {
    return this.proposalList().filter((p) => p.included && p.suggestedQty > 0)
      .length;
  });

  readonly estimatedOrderValue = computed(() => {
    return this.proposalList()
      .filter((p) => p.included)
      .reduce((s, p) => s + p.suggestedQty * p.unitCost, 0);
  });

  readonly openPOCount = computed(() => {
    return this.store
      .purchaseOrders()
      .filter((p) => p.status !== 'Received').length;
  });

  updateQty(sku: string, qty: number) {
    const cur = this.proposals();
    const item = cur.get(sku);
    if (item) {
      item.suggestedQty = Math.max(0, qty);
      this.proposals.set(new Map(cur));
    }
  }

  toggleInclude(sku: string, inc: boolean) {
    const cur = this.proposals();
    const item = cur.get(sku);
    if (item) {
      item.included = inc;
      this.proposals.set(new Map(cur));
    }
  }

  createSelectedPOs() {
    const chosen = this.proposalList().filter(
      (p) => p.included && p.suggestedQty > 0,
    );
    if (!chosen.length) {
      this.store.showToast(
        'Nothing selected',
        'Check at least one item with a quantity above zero.',
        'warn',
      );
      return;
    }

    const bySupplier: Record<string, ReorderProposal[]> = {};
    for (const item of chosen) {
      if (!bySupplier[item.supplier]) bySupplier[item.supplier] = [];
      bySupplier[item.supplier].push(item);
    }

    for (const [supplier, items] of Object.entries(bySupplier)) {
      const totalUnits = items.reduce((s, i) => s + i.suggestedQty, 0);
      const totalCost = items.reduce(
        (s, i) => s + i.suggestedQty * i.unitCost,
        0,
      );

      this.store.createPurchaseOrder({
        supplier,
        branch: this.selectedBranch(),
        items: totalUnits,
        total: totalCost,
        lines: items.map((i) => ({
          sku: i.sku,
          name: i.medicine,
          qty: i.suggestedQty,
          cost: i.unitCost,
          supplier,
        })),
      });
    }
  }

  exportReorderCSV() {
    const headers = [
      'SKU',
      'Medicine',
      'Branch',
      'Stock',
      'Reorder Level',
      'Suggested Qty',
      'Supplier',
      'Unit Cost',
      'Estimated Total',
    ];
    const rows = this.proposalList().map((p) => [
      p.sku,
      `"${p.medicine}"`,
      this.selectedBranch(),
      p.currentStock,
      p.reorderPoint,
      p.suggestedQty,
      `"${p.supplier}"`,
      p.unitCost,
      p.suggestedQty * p.unitCost,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], {type: 'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mediflow-reorder-proposals.csv';
    a.click();
    URL.revokeObjectURL(url);
    this.store.showToast('Proposals Exported', 'Downloaded reorder proposals.');
  }
}
