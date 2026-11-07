import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {PharmacyStore} from './pharmacy-store';
import {BatchItem, PrescriptionItem} from '../models/pharmacy.models';

describe('PharmacyStore NgRx SignalStore', () => {
  let store: InstanceType<typeof PharmacyStore>;

  const mockBatches: BatchItem[] = [
    {
      id: 1,
      medicine: 'Paracetamol 500mg',
      generic: 'Paracetamol',
      sku: 'MED-001',
      barcode: '8901001',
      batch: 'NP2608',
      branch: 'Dhanmondi',
      expiry: '2027-08-30',
      stock: 100,
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
      expiry: '2026-11-15',
      stock: 10,
      reorder: 20,
      price: 28.0,
      cost: 20.0,
      category: 'Antibiotic',
      supplier: 'Popular Pharma',
      emoji: '💊',
    },
    {
      id: 3,
      medicine: 'Zero Stock Medicine',
      generic: 'Test',
      sku: 'MED-003',
      barcode: '8901003',
      batch: 'ZS001',
      branch: 'Dhanmondi',
      expiry: '2028-01-01',
      stock: 0,
      reorder: 15,
      price: 5.0,
      cost: 3.0,
      category: 'Other',
      supplier: 'Supplier',
      emoji: '💊',
    },
    {
      id: 4,
      medicine: 'Paracetamol 500mg',
      generic: 'Paracetamol',
      sku: 'MED-001',
      barcode: '8901001',
      batch: 'NP2604',
      branch: 'Dhanmondi',
      expiry: '2027-04-10',
      stock: 15,
      reorder: 10,
      price: 2.0,
      cost: 1.35,
      category: 'Analgesic',
      supplier: 'MedSupply Ltd.',
      emoji: '💊',
    },
  ];

  const mockPrescriptions: PrescriptionItem[] = [
    {
      id: 'RX-TEST-01',
      patient: 'Farhana Rahman',
      doctor: 'Dr. S. Ahmed',
      date: '2026-10-14',
      items: 20,
      status: 'Pending review',
      notes: 'Initial clinical notes',
      checks: {
        identity: false,
        legibility: false,
        allergy: false,
        appropriateness: false,
      },
      medicines: 'Paracetamol 500mg (20 tabs)',
    },
    {
      id: 'RX-TEST-SHORTAGE',
      patient: 'Karim Ullah',
      doctor: 'Dr. M. Ali',
      date: '2026-10-14',
      items: 50,
      status: 'Pending review',
      notes: 'Antibiotic course',
      checks: {
        identity: true,
        legibility: true,
        allergy: true,
        appropriateness: true,
      },
      medicines: 'Azithromycin 500mg (50 tabs)',
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), PharmacyStore],
    });
    store = TestBed.inject(PharmacyStore);
    store.setBatches(mockBatches);
    // Add mock prescriptions
    for (const rx of mockPrescriptions) {
      store.addPrescription(rx);
    }
  });

  it('should initialize with default admin role', () => {
    expect(store.currentRole()).toBe('Admin');
    expect(store.roleConfig().label).toBe('Administrator');
  });

  it('should compute low-stock batches accurately', () => {
    const lowStock = store.lowStockBatches();
    expect(lowStock.length).toBe(2);
    expect(lowStock.some((b) => b.sku === 'MED-002')).toBe(true);
    expect(lowStock.some((b) => b.sku === 'MED-003')).toBe(true);
  });

  it('should compute near-expiry batches within 180 days', () => {
    const nearExpiry = store.nearExpiryBatches();
    expect(nearExpiry.length).toBe(1);
    expect(nearExpiry[0].sku).toBe('MED-002');
  });

  it('should allow role switching with permissions update', () => {
    store.setRole('Cashier');
    expect(store.currentRole()).toBe('Cashier');
    expect(store.canPerform('sale')).toBe(true);
    expect(store.canPerform('inventory')).toBe(false);
  });

  it('should correctly calculate cart totals and apply discounts', () => {
    store.addToCart('MED-001');
    expect(store.cartCount()).toBe(1);
    expect(store.cartSubtotal()).toBe(2.0);

    store.setDiscount(0.5);
    expect(store.discount()).toBe(0.5);
    expect(store.cartTotal()).toBe(1.5);
  });

  it('should handle clearing the cart', () => {
    store.addToCart('MED-001');
    expect(store.cart().length).toBe(1);
    store.clearCart();
    expect(store.cart().length).toBe(0);
    expect(store.cartTotal()).toBe(0);
  });

  describe('FEFO Batch Allocation Algorithm', () => {
    it('should allocate earliest expiring batch first (FEFO) with multi-lot split', () => {
      // Paracetamol has two batches:
      // NP2604: exp 2027-04-10, stock 15 (EARLIER EXPIRY)
      // NP2608: exp 2027-08-30, stock 100 (LATER EXPIRY)
      // RX-TEST-01 requests 20 tabs of Paracetamol
      const plan = store.suggestFefoBatchesForPrescription('RX-TEST-01');
      expect(plan).not.toBeNull();
      if (!plan) return;

      expect(plan.lines.length).toBe(1);
      const line = plan.lines[0];
      expect(line.requirement.medicineName).toBe('Paracetamol 500mg');
      expect(line.requirement.requestedQty).toBe(20);
      expect(line.isFullyAllocated).toBe(true);
      expect(line.allocatedBatches.length).toBe(2);

      // First allocated lot MUST be NP2604 (earlier expiry date)
      expect(line.allocatedBatches[0].batchNumber).toBe('NP2604');
      expect(line.allocatedBatches[0].expiryDate).toBe('2027-04-10');
      expect(line.allocatedBatches[0].allocatedQty).toBe(15);
      expect(line.allocatedBatches[0].isEarliestExpiry).toBe(true);

      // Second allocated lot must be NP2608 for the remaining 5 units
      expect(line.allocatedBatches[1].batchNumber).toBe('NP2608');
      expect(line.allocatedBatches[1].expiryDate).toBe('2027-08-30');
      expect(line.allocatedBatches[1].allocatedQty).toBe(5);
      expect(line.allocatedBatches[1].isEarliestExpiry).toBe(false);

      expect(plan.totalUnitsAllocated).toBe(20);
      expect(plan.allLinesFulfilled).toBe(true);
    });

    it('should identify inventory shortages when available stock is insufficient', () => {
      // Azithromycin only has 10 units in stock across all batches
      // RX-TEST-SHORTAGE requests 50 units
      const plan = store.suggestFefoBatchesForPrescription('RX-TEST-SHORTAGE');
      expect(plan).not.toBeNull();
      if (!plan) return;

      const line = plan.lines[0];
      expect(line.isFullyAllocated).toBe(false);
      expect(line.status).toBe('partially_allocated');
      expect(line.totalAllocated).toBe(10);
      expect(line.shortageQty).toBe(40);
      expect(plan.allLinesFulfilled).toBe(false);
      expect(plan.warnings.some((w) => w.includes('shortage'))).toBe(true);
    });

    it('should suggest batch allocation for ad-hoc queries', () => {
      const lineFulfillment = store.suggestBatchAllocation('Paracetamol 500mg', 10);
      expect(lineFulfillment.isFullyAllocated).toBe(true);
      expect(lineFulfillment.allocatedBatches.length).toBe(1);
      // Fits entirely inside NP2604 (15 available)
      expect(lineFulfillment.allocatedBatches[0].batchNumber).toBe('NP2604');
      expect(lineFulfillment.allocatedBatches[0].allocatedQty).toBe(10);
      expect(lineFulfillment.allocatedBatches[0].remainingStockAfter).toBe(5);
    });

    it('should fulfill prescription and deduct inventory from the exact FEFO allocated lots', () => {
      const batch4Before = store.batches().find((b) => b.id === 4)!.stock;
      const batch1Before = store.batches().find((b) => b.id === 1)!.stock;
      expect(batch4Before).toBe(15);
      expect(batch1Before).toBe(100);

      const success = store.fulfillPrescriptionWithFefo('RX-TEST-01');
      expect(success).toBe(true);

      // Verify stock deductions
      const batch4After = store.batches().find((b) => b.id === 4)!.stock;
      const batch1After = store.batches().find((b) => b.id === 1)!.stock;
      expect(batch4After).toBe(0); // 15 - 15 = 0
      expect(batch1After).toBe(95); // 100 - 5 = 95

      // Verify prescription status updated to Dispensed
      const updatedRx = store.prescriptions().find((p) => p.id === 'RX-TEST-01');
      expect(updatedRx?.status).toBe('Dispensed');
      expect(updatedRx?.checks.identity).toBe(true);
      expect(updatedRx?.checks.appropriateness).toBe(true);
      expect(updatedRx?.notes).toContain('FEFO Dispensed');
    });
  });
});
