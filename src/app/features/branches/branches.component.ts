import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {PharmacyStore} from '../../core/state/pharmacy-store';
import {MatIconModule} from '@angular/material/icon';

@Component({
  selector: 'app-branches',
  imports: [ReactiveFormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './branches.component.html',
  styleUrls: ['./branches.component.scss'],
})
export class Branches {
  readonly store = inject(PharmacyStore);
  private readonly fb = inject(FormBuilder);

  readonly showTransferModal = signal<boolean>(false);

  readonly transferForm = this.fb.group({
    sku: ['MED-004', Validators.required],
    from: ['Uttara', Validators.required],
    to: ['Mirpur', Validators.required],
    batch: ['VC2604', Validators.required],
    qty: [10, [Validators.required, Validators.min(1)]],
    notes: [''],
  });

  readonly pendingTransfersCount = computed(() => {
    return this.store.transfers().filter((t) => t.status !== 'Received').length;
  });

  readonly branchSummary = computed(() => {
    const branches = [
      {name: 'Dhanmondi', manager: 'Alex Smith'},
      {name: 'Uttara', manager: 'Nabila Karim'},
      {name: 'Mirpur', manager: 'Mahmud Hasan'},
    ];

    return branches.map((b) => {
      const items = this.store.batches().filter((x) => x.branch === b.name);
      return {
        name: b.name,
        manager: b.manager,
        batchCount: items.length,
        totalStock: items.reduce((s, x) => s + x.stock, 0),
        lowStockCount: items.filter((x) => x.stock <= x.reorder).length,
      };
    });
  });

  readonly availableSkus = computed(() => {
    return Array.from(new Set(this.store.batches().map((b) => b.sku)));
  });

  getMedNameForSku(sku: string): string {
    return this.store.batches().find((b) => b.sku === sku)?.medicine || sku;
  }

  onSkuChange() {
    const sku = this.transferForm.value.sku;
    const origin = this.transferForm.value.from;
    const match = this.store
      .batches()
      .find((b) => b.sku === sku && b.branch === origin && b.stock > 0);
    if (match) {
      this.transferForm.patchValue({batch: match.batch});
    }
  }

  onOriginChange() {
    this.onSkuChange();
  }

  openTransferModal() {
    this.showTransferModal.set(true);
    this.onSkuChange();
  }

  submitTransfer() {
    if (this.transferForm.invalid) return;
    const val = this.transferForm.value;
    if (val.from === val.to) {
      this.store.showToast(
        'Invalid transfer route',
        'Source and destination branches must differ.',
        'warn',
      );
      return;
    }

    this.store.createTransfer({
      sku: val.sku!,
      from: val.from!,
      to: val.to!,
      batch: val.batch!,
      qty: Number(val.qty),
      notes: val.notes || '',
    });
    this.showTransferModal.set(false);
  }
}
