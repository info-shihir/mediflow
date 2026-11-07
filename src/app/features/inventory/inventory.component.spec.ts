import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {provideHttpClient} from '@angular/common/http';
import {Inventory} from './inventory.component';
import {PharmacyStore} from '../../core/state/pharmacy-store';
import {BatchItem} from '../../core/models/pharmacy.models';

describe('Inventory Component FEFO Batch Tracking', () => {
  let component: Inventory;
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
      expiry: '2028-08-30', // > 180d, safe
      stock: 50,
      reorder: 30,
      price: 2.0, // Lot value: 100 (< 150), unit price < 15 -> Not high value
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
      expiry: '2027-03-15', // ~152 days left -> Warning tier
      stock: 58,
      reorder: 20,
      price: 28.0, // High unit price >= 15 AND lot value 1624 -> High value!
      cost: 20.0,
      category: 'Antibiotic',
      supplier: 'Popular Pharma Trading',
      emoji: '💊',
    },
    {
      id: 7,
      medicine: 'Napa 500mg Near Expiry',
      generic: 'Paracetamol',
      sku: 'MED-001',
      barcode: '8901001',
      batch: 'NP2602',
      branch: 'Dhanmondi',
      expiry: '2026-12-30', // 77 days left -> Critical tier (<= 90d)
      stock: 34,
      reorder: 30,
      price: 2.0,
      cost: 1.3,
      category: 'Analgesic',
      supplier: 'MedSupply Ltd.',
      emoji: '💊',
    },
    {
      id: 10,
      medicine: 'ORS Sachet High Capital',
      generic: 'Oral rehydration salts',
      sku: 'MED-006',
      barcode: '8901006',
      batch: 'OR2602',
      branch: 'Uttara',
      expiry: '2027-02-28', // ~137 days left -> Warning tier
      stock: 92,
      reorder: 30,
      price: 8.0, // Lot value 92 * 8 = 736 (>= 150) -> High value!
      cost: 5.4,
      category: 'Rehydration',
      supplier: 'HealthCare Distributors',
      emoji: '🧃',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Inventory],
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();

    const fixture = TestBed.createComponent(Inventory);
    component = fixture.componentInstance;
    store = TestBed.inject(PharmacyStore);

    store.setBatches(mockBatches);
  });

  it('should create the inventory component with default FEFO visualizer mode', () => {
    expect(component).toBeTruthy();
    expect(component.activeViewMode()).toBe('fefo');
  });

  it('should identify high-value medication stocks by lot capital and unit price', () => {
    // Azithromycin: price 28 >= 15 and value 1624 >= 150 -> true
    expect(component.isHighValueBatch(mockBatches[1])).toBe(true);
    // ORS Sachet: value 736 >= 150 -> true
    expect(component.isHighValueBatch(mockBatches[3])).toBe(true);
    // Napa regular: value 100 < 150 and price 2 < 15 -> false
    expect(component.isHighValueBatch(mockBatches[0])).toBe(false);
  });

  it('should calculate color-coded progress bar parameters accurately based on expiry days', () => {
    // Critical: <= 90 days (2026-12-30 is 77 days from 2026-10-14)
    const crit = component.getShelflifeProgress('2026-12-30');
    expect(crit.tier).toBe('critical');
    expect(crit.barClass).toContain('from-rose-500');

    // Warning: 91 - 180 days (2027-03-15 is ~152 days from 2026-10-14)
    const warn = component.getShelflifeProgress('2027-03-15');
    expect(warn.tier).toBe('warning');
    expect(warn.barClass).toContain('from-amber-400');

    // Safe: > 180 days (2028-08-30 is > 600 days)
    const safe = component.getShelflifeProgress('2028-08-30');
    expect(safe.tier).toBe('safe');
    expect(safe.barClass).toContain('from-teal-400');
  });

  it('should enforce strict FEFO sequence sorting (earliest expiry first)', () => {
    component.highValueOnly.set(false);
    const sorted = component.filteredBatches();
    expect(sorted.length).toBe(4);
    expect(sorted[0].batch).toBe('NP2602'); // 2026-12-30 (earliest)
    expect(sorted[1].batch).toBe('OR2602'); // 2027-02-28
    expect(sorted[2].batch).toBe('AZ2603'); // 2027-03-15
    expect(sorted[3].batch).toBe('NP2608'); // 2028-08-30 (latest)
  });

  it('should filter only high-value stocks when highValueOnly is active', () => {
    component.highValueOnly.set(true);
    const highValBatches = component.filteredBatches();
    expect(highValBatches.every((b) => component.isHighValueBatch(b))).toBe(true);
    expect(highValBatches.some((b) => b.sku === 'MED-002')).toBe(true);
    expect(highValBatches.some((b) => b.sku === 'MED-006')).toBe(true);
  });

  it('should toggle between FEFO visualizer and tabular ledger view modes', () => {
    component.activeViewMode.set('ledger');
    expect(component.activeViewMode()).toBe('ledger');
    component.activeViewMode.set('fefo');
    expect(component.activeViewMode()).toBe('fefo');
  });

  it('should apply 15% promotional FEFO clearance markdown', () => {
    const target = mockBatches[1]; // Azithromycin price 28.0
    component.applyFefoDiscount(target);

    const updated = store.batches().find((b) => b.id === target.id);
    expect(updated?.price).toBe(23.8); // 28 * 0.85 = 23.8
  });
});
