import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {RouterLink} from '@angular/router';
import {PharmacyStore} from '../../core/state/pharmacy-store';
import {MatIconModule} from '@angular/material/icon';

@Component({

  selector: 'app-purchases',
  imports: [RouterLink, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './purchases.html',

  styleUrls: ['./purchases.scss'],
})
export class Purchases {
  readonly store = inject(PharmacyStore);

  readonly selectedFileName = signal<string>('No file selected (Built-in sample ready)');
  readonly ocrExtracted = signal<boolean>(false);

  readonly ocrLines = signal<
    {medicine: string; sku: string; batch: string; qty: number; expiry: string}[]
  >([
    {
      medicine: 'Napa 500mg',
      sku: 'MED-001',
      batch: 'NP2610',
      qty: 100,
      expiry: '2028-10-31',
    },
    {
      medicine: 'Vitamin C 500mg',
      sku: 'MED-004',
      batch: 'VC2610',
      qty: 60,
      expiry: '2028-09-30',
    },
  ]);

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFileName.set(input.files[0].name);
      this.store.showToast('Document Attached', input.files[0].name);
    }
  }

  simulateExtraction() {
    this.ocrExtracted.set(true);
    this.store.showToast(
      'OCR Extraction Finished',
      'Invoice INV-2026-1048 extracted: 2 lines parsed.',
      'success',
    );
  }

  stageStockReceipt(supplier: string, invoice: string, branch: string) {
    let addedCount = 0;
    for (const line of this.ocrLines()) {
      const existing = this.store
        .batches()
        .find(
          (b) =>
            b.medicine === line.medicine &&
            b.batch === line.batch &&
            b.branch === branch,
        );

      if (existing) {
        this.store.updateBatch(existing.id, {
          stock: existing.stock + line.qty,
        });
      } else {
        const base = this.store.batches().find((b) => b.medicine === line.medicine);
        this.store.addBatch({
          medicine: line.medicine,
          generic: base?.generic || '',
          sku: line.sku,
          barcode: base?.barcode || '8901099',
          batch: line.batch,
          branch,
          expiry: line.expiry,
          stock: line.qty,
          reorder: base?.reorder || 25,
          price: base?.price || 5,
          cost: base?.cost || 3,
          category: base?.category || 'General',
          supplier: supplier || 'MedSupply Ltd.',
          emoji: base?.emoji || '💊',
        });
      }
      addedCount++;
    }

    this.store.showToast(
      'Stock Receipt Staged',
      `Staged ${addedCount} batch line items into ${branch} branch inventory from invoice ${invoice}.`,
      'success',
    );
  }
}
