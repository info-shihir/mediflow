import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {PharmacyStore} from '../../core/state/pharmacy-store';
import {BatchItem, FefoNotification} from '../../core/models/pharmacy.models';
import {MatIconModule} from '@angular/material/icon';

@Component({
  selector: 'app-pos',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:keydown)': 'handleKeyboardShortcuts($event)',
  },
  templateUrl: './pos.component.html',
  styleUrls: ['./pos.component.scss'],
})
export class Pos {
  readonly store = inject(PharmacyStore);
  readonly barcodeInputRef = viewChild<ElementRef<HTMLInputElement>>('barcodeInput');

  readonly posSearch = signal<string>('');
  readonly posCategory = signal<string>('all');
  readonly showReceiptModal = signal<boolean>(false);
  readonly fefoOnlyFilter = signal<boolean>(false);
  readonly dismissedBanner = signal<boolean>(false);

  readonly topFefoItem = computed(() => this.store.fefoNotifications()[0]);

  readonly fefoNotificationsMap = computed(() => {
    const map = new Map<string, FefoNotification>();
    for (const n of this.store.fefoNotifications()) {
      if (!map.has(n.sku)) {
        map.set(n.sku, n);
      }
    }
    return map;
  });

  readonly fefoProductSkuSet = computed(
    () => new Set(this.store.fefoNotifications().map((n) => n.sku)),
  );

  readonly nearExpiryProductCount = computed(
    () => this.fefoProductSkuSet().size,
  );

  readonly filteredProducts = computed(() => {
    const q = this.posSearch().toLowerCase();
    const cat = this.posCategory();
    const fefoOnly = this.fefoOnlyFilter();
    const fefoSkus = this.fefoProductSkuSet();

    const uniqueMap = new Map<string, BatchItem>();
    for (const b of this.store.batches()) {
      if (b.stock > 0 && !uniqueMap.has(b.sku)) {
        uniqueMap.set(b.sku, b);
      }
    }

    return Array.from(uniqueMap.values()).filter((p) => {
      if (fefoOnly && !fefoSkus.has(p.sku)) {
        return false;
      }
      const matchQuery =
        p.medicine.toLowerCase().includes(q) ||
        p.generic.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q);
      const matchCat = cat === 'all' || p.category === cat;
      return matchQuery && matchCat;
    });
  });

  getNearExpiryForSku(sku: string): FefoNotification | undefined {
    return this.fefoNotificationsMap().get(sku);
  }

  isBatchNearExpiry(batchId: number): boolean {
    return this.store.fefoNotifications().some((n) => n.batchId === batchId);
  }

  dispenseTopFefo() {
    const top = this.topFefoItem();
    if (!top) return;
    this.store.addToCart(top.sku);
    this.store.showToast(
      'FEFO Priority Dispense Loaded',
      `Loaded ${top.medicine} (Batch ${top.batch}) expiring in ${top.daysRemaining} days into current sale.`,
      'success',
    );
  }

  getStockForSku(sku: string): number {
    return this.store
      .batches()
      .filter((b) => b.sku === sku)
      .reduce((s, b) => s + b.stock, 0);
  }

  onBarcodeScan(code: string) {
    const val = code.trim().toLowerCase();
    if (!val) {
      this.store.showToast(
        'Scan code required',
        'Enter barcode or SKU (e.g. 8901001)',
        'warn',
      );
      return;
    }

    const match = this.store
      .batches()
      .find(
        (b) =>
          b.barcode.toLowerCase() === val ||
          b.sku.toLowerCase() === val ||
          b.batch.toLowerCase() === val,
      );

    if (!match) {
      this.store.showToast(
        'Product not found',
        `No medicine matches code '${code}'.`,
        'error',
      );
      return;
    }

    this.store.addToCart(match.sku);
  }

  onDiscountInput(e: Event) {
    const val = Number((e.target as HTMLInputElement).value) || 0;
    this.store.setDiscount(val);
  }

  handleKeyboardShortcuts(event: KeyboardEvent) {
    if (event.key === 'F2') {
      event.preventDefault();
      this.barcodeInputRef()?.nativeElement.focus();
    }
  }

  printReceipt() {
    window.print();
  }
}
