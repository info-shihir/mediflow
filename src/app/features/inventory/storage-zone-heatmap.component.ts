import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {Router} from '@angular/router';
import {PharmacyStore} from '../../core/state/pharmacy-store';
import {
  StorageZone,
  ZoneBatchItem,
} from '../../core/models/pharmacy.models';
import {MatIconModule} from '@angular/material/icon';

type HeatmapLayout = 'floorplan' | 'grid';
type TimeHorizonFilter = '30' | '60' | '90' | '180';
type MetricFocus = 'ratio' | 'units' | 'capital';

@Component({
  selector: 'app-storage-zone-heatmap',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './storage-zone-heatmap.component.html',
})
export class StorageZoneHeatmap {
  readonly store = inject(PharmacyStore);
  private readonly router = inject(Router);

  readonly Math = Math;

  readonly layoutMode = signal<HeatmapLayout>('floorplan');
  readonly timeHorizon = signal<TimeHorizonFilter>('90');
  readonly metricFocus = signal<MetricFocus>('ratio');
  readonly selectedZone = signal<StorageZone | null>(null);

  readonly facilityTotalUnits = computed(() =>
    this.store.batches().reduce((sum, b) => sum + b.stock, 0),
  );

  readonly facilitySafeUnits = computed(() => {
    const nearIds = new Set(this.store.fefoNotifications().map((n) => n.batchId));
    return this.store
      .batches()
      .filter((b) => !nearIds.has(b.id))
      .reduce((sum, b) => sum + b.stock, 0);
  });

  readonly facilityStabilityPercent = computed(() => {
    const total = this.facilityTotalUnits();
    if (total === 0) return 100;
    return Math.round((this.facilitySafeUnits() / total) * 1000) / 10;
  });

  getBatchesForShelf(zone: StorageZone, shelf: string): ZoneBatchItem[] {
    return zone.batches.filter((b) => b.shelf === shelf);
  }

  hasNearExpiryOnShelf(batches: ZoneBatchItem[]): boolean {
    return batches.some((b) => b.isNearExpiry);
  }

  dispenseInPOS(sku: string) {
    this.store.addToCart(sku);
    this.selectedZone.set(null);
    this.router.navigate(['/pos']);
  }

  applyBatchMarkdown(batchId: number, percent: number) {
    this.store.applyClearanceDiscount(batchId, percent);
  }

  applyZoneMarkdown(zoneId: string, percent: number) {
    this.store.applyZoneClearanceDiscount(zoneId, percent);
  }
}
