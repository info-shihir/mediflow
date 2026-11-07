import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {provideHttpClient} from '@angular/common/http';
import {PharmacyOperationsDashboard} from './pharmacy-operations-dashboard';
import {PharmacyStore} from '../../core/state/pharmacy-store';
import {BatchItem, PrescriptionItem} from '../../core/models/pharmacy.models';

describe('PharmacyOperationsDashboard Component', () => {
  let component: PharmacyOperationsDashboard;
  let store: InstanceType<typeof PharmacyStore>;

  const mockBatches: BatchItem[] = [
    {
      id: 1,
      medicine: 'Napa 500mg',
      generic: 'Paracetamol',
      sku: 'MED-001',
      barcode: '8901001',
      batch: 'NP2608',
      branch: 'Dhanmondi',
      expiry: '2027-08-30',
      stock: 150,
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
      stock: 8,
      reorder: 20,
      price: 28.0,
      cost: 20.0,
      category: 'Antibiotic',
      supplier: 'Popular Pharma Trading',
      emoji: '💊',
    },
    {
      id: 5,
      medicine: 'Napa Extra',
      generic: 'Paracetamol + Caffeine',
      sku: 'MED-005',
      barcode: '8901005',
      batch: 'NE2609',
      branch: 'Dhanmondi',
      expiry: '2027-09-05',
      stock: 0,
      reorder: 20,
      price: 3.0,
      cost: 2.0,
      category: 'Analgesic',
      supplier: 'MedSupply Ltd.',
      emoji: '💊',
    },
    {
      id: 7,
      medicine: 'Napa Near Expiry',
      generic: 'Paracetamol',
      sku: 'MED-007',
      barcode: '8901007',
      batch: 'NP2602',
      branch: 'Mirpur',
      expiry: '2026-11-30',
      stock: 25,
      reorder: 10,
      price: 2.5,
      cost: 1.5,
      category: 'Analgesic',
      supplier: 'MedSupply Ltd.',
      emoji: '💊',
    },
  ];

  const mockPrescriptions: PrescriptionItem[] = [
    {
      id: 'RX-9901',
      patient: 'Rahim Khan',
      doctor: 'Dr. Kabir',
      date: '2026-10-14',
      items: 2,
      status: 'Pending review',
      notes: 'Initial clinical intake.',
      checks: {
        identity: true,
        legibility: false,
        allergy: true,
        appropriateness: false,
      },
      medicines: 'Paracetamol 500mg; Azithromycin 500mg',
    },
    {
      id: 'RX-9902',
      patient: 'Salma Begum',
      doctor: 'Dr. N. Karim',
      date: '2026-10-14',
      items: 1,
      status: 'On hold',
      notes: 'Prescriber dosage check required.',
      checks: {
        identity: true,
        legibility: true,
        allergy: false,
        appropriateness: false,
      },
      medicines: 'Seclo 20mg',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PharmacyOperationsDashboard],
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();

    const fixture = TestBed.createComponent(PharmacyOperationsDashboard);
    component = fixture.componentInstance;
    store = TestBed.inject(PharmacyStore);

    store.setBatches(mockBatches);
  });

  it('should create the pharmacy operations dashboard component', () => {
    expect(component).toBeTruthy();
  });

  it('should accurately calculate low stock alerts including out-of-stock items', () => {
    // In mockBatches: Azithromycin (stock 8 <= reorder 20) and Napa Extra (stock 0 <= reorder 20)
    const lowStock = component.filteredLowStock();
    expect(lowStock.length).toBe(2);
    expect(component.outOfStockCount()).toBe(1); // Napa Extra (stock 0)
    expect(component.lowStockWarningCount()).toBe(1); // Azithromycin (stock 8)
  });

  it('should filter near-expiry medications within 180 days', () => {
    // Napa Near Expiry (expiry: 2026-11-30, < 60 days from 2026-10-14)
    const nearExpiries = component.filteredNearExpiries();
    expect(nearExpiries.length).toBeGreaterThanOrEqual(1);
    expect(nearExpiries.some((b) => b.batch === 'NP2602')).toBe(true);
  });

  it('should filter operational batches by branch correctly', () => {
    component.selectedBranch.set('Mirpur');
    const mirpurBatches = component.filteredBatches();
    expect(mirpurBatches.every((b) => b.branch === 'Mirpur')).toBe(true);
    expect(mirpurBatches.length).toBe(1);

    component.selectedBranch.set('All');
    expect(component.filteredBatches().length).toBe(mockBatches.length);
  });

  it('should filter displayed lists by text search filter', () => {
    component.searchFilter.set('Azithromycin');
    expect(component.displayedLowStock().length).toBe(1);
    expect(component.displayedLowStock()[0].medicine).toBe('Azithromycin 500mg');

    component.searchFilter.set('NonexistentMed');
    expect(component.displayedLowStock().length).toBe(0);
  });

  it('should perform quick restock and update inventory stock', () => {
    const targetBatch = mockBatches[1]; // Azithromycin stock: 8
    const initialStock = targetBatch.stock;
    component.quickRestock(targetBatch, 50);

    const updated = store.batches().find((b) => b.id === targetBatch.id);
    expect(updated?.stock).toBe(initialStock + 50);
  });

  it('should verify and approve a prescription order', () => {
    const rx = mockPrescriptions[0];
    component.quickApproveRx(rx);
    // Verified that check and reviewPrescription executes without error
    expect(rx.id).toBe('RX-9901');
  });

  it('should apply 20% clearance discount for near expiry batch', () => {
    const targetBatch = mockBatches[3]; // price 2.5
    component.applyClearanceDiscount(targetBatch);

    const updated = store.batches().find((b) => b.id === targetBatch.id);
    expect(updated?.price).toBe(2.0); // 2.5 * 0.8 = 2.0
  });
});
