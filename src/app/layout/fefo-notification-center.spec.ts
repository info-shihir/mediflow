import {TestBed} from '@angular/core/testing';
import {provideRouter, Router} from '@angular/router';
import {provideHttpClient} from '@angular/common/http';
import {FefoNotificationCenter} from './fefo-notification-center.component';
import {PharmacyStore} from '../core/state/pharmacy-store';
import {BatchItem} from '../core/models/pharmacy.models';

describe('FefoNotificationCenter Component & FEFO Dispensing Prioritization', () => {
  let component: FefoNotificationCenter;
  let store: InstanceType<typeof PharmacyStore>;
  let router: Router;

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
      stock: 100,
      reorder: 30,
      price: 2.0,
      cost: 1.35,
      category: 'Analgesic',
      supplier: 'MedSupply Ltd.',
      emoji: '💊',
    },
    {
      id: 7,
      medicine: 'Napa 500mg',
      generic: 'Paracetamol',
      sku: 'MED-001',
      barcode: '8901001',
      batch: 'NP2602',
      branch: 'Dhanmondi',
      expiry: '2026-12-30', // ~78 days from 2026-10-13, approaching
      stock: 34,
      reorder: 20,
      price: 2.0,
      cost: 1.3,
      category: 'Analgesic',
      supplier: 'MedSupply Ltd.',
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
      expiry: '2026-11-05', // ~23 days from 2026-10-13, critical
      stock: 45,
      reorder: 15,
      price: 14.0,
      cost: 9.5,
      category: 'Antibiotic',
      supplier: 'Beximco Pharma Trading',
      emoji: '💊',
    },
    {
      id: 12,
      medicine: 'Ciprofloxacin 500mg',
      generic: 'Ciprofloxacin',
      sku: 'MED-008',
      barcode: '8901008',
      batch: 'CP2612',
      branch: 'Dhanmondi',
      expiry: '2026-11-25', // ~43 days from 2026-10-13, warning
      stock: 26,
      reorder: 12,
      price: 22.0,
      cost: 15.0,
      category: 'Antibiotic',
      supplier: 'Square Pharmaceuticals Ltd.',
      emoji: '💊',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), PharmacyStore, FefoNotificationCenter],
    }).compileComponents();

    store = TestBed.inject(PharmacyStore);
    router = TestBed.inject(Router);
    store.setBatches(mockBatches);

    const fixture = TestBed.createComponent(FefoNotificationCenter);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize and prioritize batches by earliest expiry (FEFO rank)', () => {
    const notifications = store.fefoNotifications();
    expect(notifications.length).toBe(3);

    // Rank 1 must be earliest expiring (Amoxicillin Nov 5)
    expect(notifications[0].batch).toBe('AM2611');
    expect(notifications[0].fefoRank).toBe(1);
    expect(notifications[0].urgency).toBe('critical');

    // Rank 2 must be Ciprofloxacin (Nov 25)
    expect(notifications[1].batch).toBe('CP2612');
    expect(notifications[1].fefoRank).toBe(2);
    expect(notifications[1].urgency).toBe('warning');

    // Rank 3 must be Napa 500mg (Dec 30)
    expect(notifications[2].batch).toBe('NP2602');
    expect(notifications[2].fefoRank).toBe(3);
    expect(notifications[2].urgency).toBe('attention');
  });

  it('should correctly identify the earliest batch for a multi-batch SKU', () => {
    const notifications = store.fefoNotifications();
    const napaAlert = notifications.find((n) => n.sku === 'MED-001');

    expect(napaAlert).toBeDefined();
    expect(napaAlert?.batch).toBe('NP2602');
    expect(napaAlert?.isEarliestForSku).toBe(true);
  });

  it('should filter notifications by urgency tab and branch', () => {
    component.activeUrgencyTab.set('critical');
    const criticalList = component.filteredNotifications();
    expect(criticalList.length).toBe(1);
    expect(criticalList[0].batch).toBe('AM2611');

    component.activeUrgencyTab.set('warning');
    const warningList = component.filteredNotifications();
    expect(warningList.length).toBe(1);
    expect(warningList[0].batch).toBe('CP2612');

    component.activeUrgencyTab.set('all');
    component.selectedBranch.set('Mirpur');
    const mirpurList = component.filteredNotifications();
    expect(mirpurList.length).toBe(0); // all mock batches are Dhanmondi
  });

  it('should allow acknowledging and unacknowledging a FEFO alert', () => {
    expect(store.unacknowledgedFefoCount()).toBe(3);

    component.toggleAcknowledge(11, false);
    expect(store.acknowledgedFefoBatchIds()).toContain(11);
    expect(store.unacknowledgedFefoCount()).toBe(2);

    component.toggleAcknowledge(11, true);
    expect(store.acknowledgedFefoBatchIds()).not.toContain(11);
    expect(store.unacknowledgedFefoCount()).toBe(3);
  });

  it('should allocate batch for priority dispensing in POS and navigate', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    const dismissSpy = vi.fn();
    component.dismissDrawer.subscribe(dismissSpy);

    component.dispenseInPOS('MED-007', 'Amoxicillin 500mg', 'AM2611');

    expect(store.cartCount()).toBe(1);
    const cartItem = store.cart().find((i) => i.sku === 'MED-007');
    expect(cartItem).toBeDefined();
    expect(cartItem?.alloc[0].batch).toBe('AM2611');
    expect(dismissSpy).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/pos']);
  });

  it('should apply clearance markdown to accelerate near-expiry batch dispensing', () => {
    component.applyMarkdown(11, 20); // 20% off 14.00 = 11.20
    const updated = store.batches().find((b) => b.id === 11);
    expect(updated?.price).toBe(11.2);
  });
});
