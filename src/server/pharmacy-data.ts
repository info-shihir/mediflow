export interface Batch {
  id: number;
  medicine: string;
  generic: string;
  sku: string;
  barcode: string;
  batch: string;
  branch: string;
  expiry: string;
  stock: number;
  reorder: number;
  price: number;
  cost: number;
  category: string;
  supplier: string;
  emoji: string;
}

export interface Prescription {
  id: string;
  patient: string;
  doctor: string;
  date: string;
  items: number;
  status: 'Pending review' | 'Reviewed' | 'Dispensed' | 'On hold';
  notes: string;
  checks: {
    identity: boolean;
    legibility: boolean;
    allergy: boolean;
    appropriateness: boolean;
  };
  medicines: string;
}

export interface SaleItem {
  name: string;
  sku: string;
  qty: number;
  price: number;
  alloc: {
    batchId: number;
    batch: string;
    qty: number;
    expiry: string;
    branch: string;
  }[];
}

export interface SaleRecord {
  id: string;
  date: string;
  customer: string;
  payment: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
}

export interface PurchaseOrder {
  id: string;
  supplier: string;
  branch: string;
  items: number;
  lines?: {
    sku: string;
    name: string;
    qty: number;
    cost: number;
    supplier: string;
  }[];
  total: number;
  status: 'Draft' | 'Submitted' | 'Received';
}

export interface StockTransfer {
  id: string;
  medicine: string;
  from: string;
  to: string;
  qty: number;
  status: 'In transit' | 'Received';
  batchId: number;
  notes?: string;
}

export interface ReturnRecord {
  id: string;
  sale: string;
  customer: string;
  item: string;
  amount: number;
  reason: string;
  status: 'Pending approval' | 'Refunded' | 'Rejected';
  notes?: string;
}

export interface AuditRecord {
  time: string;
  user: string;
  role: string;
  event: string;
  entity: string;
  details: string;
}

export const INITIAL_BATCHES: Batch[] = [
  {
    id: 1,
    medicine: 'Napa 500mg',
    generic: 'Paracetamol',
    sku: 'MED-001',
    barcode: '8901001',
    batch: 'NP2608',
    branch: 'Dhanmondi',
    expiry: '2027-08-30',
    stock: 156,
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
    id: 3,
    medicine: 'Seclo 20mg',
    generic: 'Omeprazole',
    sku: 'MED-003',
    barcode: '8901003',
    batch: 'SC2611',
    branch: 'Dhanmondi',
    expiry: '2027-11-10',
    stock: 74,
    reorder: 25,
    price: 6.0,
    cost: 4.2,
    category: 'Gastrointestinal',
    supplier: 'MedSupply Ltd.',
    emoji: '🧴',
  },
  {
    id: 4,
    medicine: 'Vitamin C 500mg',
    generic: 'Ascorbic acid',
    sku: 'MED-004',
    barcode: '8901004',
    batch: 'VC2601',
    branch: 'Dhanmondi',
    expiry: '2027-01-25',
    stock: 12,
    reorder: 25,
    price: 5.0,
    cost: 3.2,
    category: 'Vitamin',
    supplier: 'HealthCare Distributors',
    emoji: '🍊',
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
    id: 6,
    medicine: 'ORS Sachet',
    generic: 'Oral rehydration salts',
    sku: 'MED-006',
    barcode: '8901006',
    batch: 'OR2602',
    branch: 'Dhanmondi',
    expiry: '2027-02-28',
    stock: 92,
    reorder: 30,
    price: 8.0,
    cost: 5.5,
    category: 'Rehydration',
    supplier: 'HealthCare Distributors',
    emoji: '🧃',
  },
  {
    id: 7,
    medicine: 'Napa 500mg',
    generic: 'Paracetamol',
    sku: 'MED-001',
    barcode: '8901001',
    batch: 'NP2602',
    branch: 'Dhanmondi',
    expiry: '2026-12-30',
    stock: 34,
    reorder: 30,
    price: 2.0,
    cost: 1.3,
    category: 'Analgesic',
    supplier: 'MedSupply Ltd.',
    emoji: '💊',
  },
  {
    id: 8,
    medicine: 'Vitamin C 500mg',
    generic: 'Ascorbic acid',
    sku: 'MED-004',
    barcode: '8901004',
    batch: 'VC2604',
    branch: 'Uttara',
    expiry: '2028-04-15',
    stock: 80,
    reorder: 25,
    price: 5.0,
    cost: 3.1,
    category: 'Vitamin',
    supplier: 'HealthCare Distributors',
    emoji: '🍊',
  },
  {
    id: 9,
    medicine: 'Seclo 20mg',
    generic: 'Omeprazole',
    sku: 'MED-003',
    barcode: '8901003',
    batch: 'SC2606',
    branch: 'Mirpur',
    expiry: '2027-06-01',
    stock: 20,
    reorder: 25,
    price: 6.0,
    cost: 4.1,
    category: 'Gastrointestinal',
    supplier: 'MedSupply Ltd.',
    emoji: '🧴',
  },
  {
    id: 10,
    medicine: 'ORS Sachet',
    generic: 'Oral rehydration salts',
    sku: 'MED-006',
    barcode: '8901006',
    batch: 'OR2608',
    branch: 'Uttara',
    expiry: '2028-08-10',
    stock: 44,
    reorder: 30,
    price: 8.0,
    cost: 5.4,
    category: 'Rehydration',
    supplier: 'HealthCare Distributors',
    emoji: '🧃',
  },
  {
    id: 11,
    medicine: 'Amoxicillin 500mg',
    generic: 'Amoxicillin Trihydrate',
    sku: 'MED-007',
    barcode: '8901007',
    batch: 'AM2611',
    branch: 'Dhanmondi',
    expiry: '2026-11-12',
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
    expiry: '2026-12-05',
    stock: 26,
    reorder: 12,
    price: 22.0,
    cost: 15.0,
    category: 'Antibiotic',
    supplier: 'Square Pharmaceuticals Ltd.',
    emoji: '💊',
  },
];

export const INITIAL_PRESCRIPTIONS: Prescription[] = [
  {
    id: 'RX-2048',
    patient: 'Farhana Rahman',
    doctor: 'Dr. S. Ahmed',
    date: '2026-10-12',
    items: 3,
    status: 'Pending review',
    notes: 'Prescription image not independently verified.',
    checks: {
      identity: false,
      legibility: false,
      allergy: false,
      appropriateness: false,
    },
    medicines: 'Paracetamol 500mg; Omeprazole 20mg',
  },
  {
    id: 'RX-2047',
    patient: 'Imran Hossain',
    doctor: 'Dr. N. Karim',
    date: '2026-10-12',
    items: 2,
    status: 'Reviewed',
    notes: 'Clinical verification checks completed by pharmacist.',
    checks: {
      identity: true,
      legibility: true,
      allergy: true,
      appropriateness: true,
    },
    medicines: 'ORS Sachet; Vitamin C 500mg',
  },
  {
    id: 'RX-2046',
    patient: 'Nusrat Jahan',
    doctor: 'Dr. T. Islam',
    date: '2026-10-11',
    items: 4,
    status: 'On hold',
    notes: 'Clarification required with prescriber regarding dosage interval.',
    checks: {
      identity: true,
      legibility: false,
      allergy: true,
      appropriateness: false,
    },
    medicines: 'Multiple antibiotics and analgesics',
  },
];

export const INITIAL_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 'PO-1024',
    supplier: 'MedSupply Ltd.',
    branch: 'Dhanmondi',
    items: 24,
    total: 18450,
    status: 'Submitted',
  },
];

export const INITIAL_TRANSFERS: StockTransfer[] = [
  {
    id: 'TR-0051',
    medicine: 'Vitamin C 500mg · VC2604',
    from: 'Uttara',
    to: 'Mirpur',
    qty: 10,
    status: 'In transit',
    batchId: 8,
  },
];

export const INITIAL_RETURNS: ReturnRecord[] = [
  {
    id: 'RT-0101',
    sale: 'SL-1081',
    customer: 'Walk-in customer',
    item: 'ORS Sachet',
    amount: 16,
    reason: 'Damaged packaging discovered',
    status: 'Pending approval',
  },
];

export const INITIAL_AUDIT: AuditRecord[] = [
  {
    time: new Date().toLocaleString(),
    user: 'Alex Smith',
    role: 'Administrator',
    event: 'Security',
    entity: 'Session Initialized',
    details: 'MediFlow Enterprise Pharmacy operational session started',
  },
  {
    time: new Date(Date.now() - 300000).toLocaleString(),
    user: 'Samira Ahmed',
    role: 'Pharmacist',
    event: 'Prescription',
    entity: 'RX-2047',
    details: 'Pharmacist verified clinical checks for Imran Hossain',
  },
  {
    time: new Date(Date.now() - 900000).toLocaleString(),
    user: 'Rafi Hasan',
    role: 'Cashier',
    event: 'Sale',
    entity: 'SL-1086',
    details: 'Sale completed ৳ 240.00 via Cash',
  },
];
