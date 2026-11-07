import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {provideHttpClient} from '@angular/common/http';
import {StorageZoneHeatmap} from './storage-zone-heatmap';
import {PharmacyStore} from '../../core/state/pharmacy-store';
import {BatchItem} from '../../core/models/pharmacy.models';

describe('StorageZoneHeatmap Component', () => {
  let component: StorageZoneHeatmap;
  let store: InstanceType<typeof PharmacyStore>;

  const mockBatches: BatchItem[] = [
    {
      id: 1,
      medicine: 'Napa 500mg Regular',
      generic: 'Paracetamol',
      sku: 'MED-001',
      barcode: '8901001',
      batch: 'NP2608',
      branch: 'Dhanmondi',
      expiry: '2028-08-30',
      stock: 50,
      reorder: 30,
      price: 2.0,
      cost: 1.35,
      category: 'Analgesic',
      supplier: 'MedSupply Ltd.',
      emoji: '💊',
    },
    {
      id: 2,
      medicine: 'Azithromycin 500mg',
      generic: 'Azithromycin',
      sku: 'MED-002',
      barcode: '8901002',
      batch: 'AZ2603',
      branch: 'Dhanmondi',
      expiry: '2027-03-15',
      stock: 58,
      reorder: 20,
      price: 28.0,
      cost: 20.0,
      category: 'Antibiotic',
      supplier: 'Popular Pharma Trading',
      emoji: '💊',
    },
    {
      id: 11,
      medicine: 'Amoxicillin 500mg',
      generic: 'Amoxicillin Trihydrate',
      sku: 'MED-007',
      barcode: '8901007',
      batch: 'AM2611',
      branch: 'Dhanmondi',
      expiry: '2026-10-31',
      stock: 45,
      reorder: 25,
      price: 18.0,
      cost: 12.0,
      category: 'Antibiotic',
      supplier: 'Square Pharmaceuticals',
      emoji: '💊',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StorageZoneHeatmap],
      providers: [
        provideRouter([{path: 'pos', component: StorageZoneHeatmap}]),
        provideHttpClient(),
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(StorageZoneHeatmap);
    component = fixture.componentInstance;
    store = TestBed.inject(PharmacyStore);

    store.setBatches(mockBatches);
  });

  it('should create the StorageZoneHeatmap component', () => {
    expect(component).toBeTruthy();
    expect(component.layoutMode()).toBe('floorplan');
    expect(component.timeHorizon()).toBe('90');
    expect(component.metricFocus()).toBe('ratio');
    expect(component.selectedZone()).toBeNull();
  });

  it('should calculate facility total units and stability correctly', () => {
    const totalUnits = component.facilityTotalUnits();
    expect(totalUnits).toBe(153); // 50 + 58 + 45

    const safeUnits = component.facilitySafeUnits();
    expect(safeUnits).toBeGreaterThan(0);

    const stability = component.facilityStabilityPercent();
    expect(stability).toBeGreaterThanOrEqual(0);
    expect(stability).toBeLessThanOrEqual(100);
  });

  it('should toggle layout mode between floorplan and grid', () => {
    component.layoutMode.set('grid');
    expect(component.layoutMode()).toBe('grid');

    component.layoutMode.set('floorplan');
    expect(component.layoutMode()).toBe('floorplan');
  });

  it('should allow setting different time horizons', () => {
    component.timeHorizon.set('30');
    expect(component.timeHorizon()).toBe('30');

    component.timeHorizon.set('60');
    expect(component.timeHorizon()).toBe('60');

    component.timeHorizon.set('180');
    expect(component.timeHorizon()).toBe('180');
  });

  it('should open and close zone inspection details', () => {
    const zones = store.storageZones();
    expect(zones.length).toBeGreaterThan(0);

    const targetZone = zones[0];
    component.selectedZone.set(targetZone);
    expect(component.selectedZone()).toBe(targetZone);

    component.selectedZone.set(null);
    expect(component.selectedZone()).toBeNull();
  });

  it('should filter batches by shelf and detect near-expiry status', () => {
    const zones = store.storageZones();
    const zone = zones[0];
    const shelfBatches = component.getBatchesForShelf(zone, zone.shelves[0]);
    expect(Array.isArray(shelfBatches)).toBe(true);

    const hasNearExpiry = component.hasNearExpiryOnShelf(shelfBatches);
    expect(typeof hasNearExpiry).toBe('boolean');
  });

  it('should dispense near-expiry lot in POS', () => {
    const initialCartCount = store.cartCount();

    component.dispenseInPOS('MED-007');

    expect(store.cartCount()).toBe(initialCartCount + 1);
    expect(component.selectedZone()).toBeNull();
  });

  it('should apply clearance markdown to near-expiry batch', () => {
    const batchBefore = store.batches().find((b) => b.id === 11);
    const originalPrice = batchBefore?.price || 18.0;

    component.applyBatchMarkdown(11, 20);

    const batchAfter = store.batches().find((b) => b.id === 11);
    expect(batchAfter?.price).toBeCloseTo(originalPrice * 0.8, 1);
  });
});
