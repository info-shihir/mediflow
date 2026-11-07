import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import {PharmacyStore} from '../../core/state/pharmacy-store';
import {MatIconModule} from '@angular/material/icon';

@Component({

  selector: 'app-reports',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reports.component.html',

  styleUrls: ['./reports.component.scss'],
})
export class Reports {
  readonly store = inject(PharmacyStore);

  downloadSalesSummary() {
    const headers = ['Sale ID', 'Date', 'Customer', 'Payment', 'Total (BDT)'];
    const rows = this.store.sales().map((s) => [
      s.id,
      `"${s.date}"`,
      `"${s.customer}"`,
      s.payment,
      s.total.toFixed(2),
    ]);
    this.saveCsv('mediflow-sales-summary.csv', headers, rows);
  }

  downloadValuationReport() {
    const headers = [
      'Medicine',
      'SKU',
      'Batch',
      'Branch',
      'Stock',
      'Cost Unit',
      'Total Cost',
      'Retail Unit',
      'Total Retail',
    ];
    const rows = this.store.batches().map((b) => [
      `"${b.medicine}"`,
      b.sku,
      b.batch,
      b.branch,
      b.stock,
      b.cost.toFixed(2),
      (b.stock * b.cost).toFixed(2),
      b.price.toFixed(2),
      (b.stock * b.price).toFixed(2),
    ]);
    this.saveCsv('mediflow-inventory-valuation.csv', headers, rows);
  }

  downloadExpiryReport() {
    const headers = ['Medicine', 'SKU', 'Batch', 'Branch', 'Expiry', 'Stock'];
    const rows = this.store.nearExpiryBatches().map((b) => [
      `"${b.medicine}"`,
      b.sku,
      b.batch,
      b.branch,
      b.expiry,
      b.stock,
    ]);
    this.saveCsv('mediflow-near-expiry-report.csv', headers, rows);
  }

  downloadReturnReport() {
    const headers = ['Return ID', 'Sale ID', 'Customer', 'Item', 'Amount', 'Reason', 'Status'];
    const rows = this.store.returns().map((r) => [
      r.id,
      r.sale,
      `"${r.customer}"`,
      `"${r.item}"`,
      r.amount.toFixed(2),
      `"${r.reason}"`,
      r.status,
    ]);
    this.saveCsv('mediflow-returns-register.csv', headers, rows);
  }

  exportAllReports() {
    this.downloadValuationReport();
    this.store.showToast('Master Report Exported', 'Downloaded comprehensive inventory valuation.');
  }

  private saveCsv(filename: string, headers: string[], rows: (string | number)[][]) {
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], {type: 'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    this.store.showToast('Report Downloaded', filename);
  }
}
