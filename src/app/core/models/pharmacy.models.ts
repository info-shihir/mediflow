export interface BatchItem {
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

export interface PrescriptionItem {
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

export interface CartAllocation {
  batchId: number;
  batch: string;
  qty: number;
  expiry: string;
  branch: string;
}

export interface CartItem {
  sku: string;
  name: string;
  price: number;
  qty: number;
  alloc: CartAllocation[];
}

export interface SaleRecord {
  id: string;
  date: string;
  customer: string;
  payment: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
}

export interface PurchaseOrderRecord {
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

export interface StockTransferRecord {
  id: string;
  medicine: string;
  from: string;
  to: string;
  qty: number;
  status: 'In transit' | 'Received';
  batchId: number;
  notes?: string;
}

export interface ReturnItemRecord {
  id: string;
  sale: string;
  customer: string;
  item: string;
  amount: number;
  reason: string;
  status: 'Pending approval' | 'Refunded' | 'Rejected';
  notes?: string;
}

export interface AuditItemRecord {
  time: string;
  user: string;
  role: string;
  event: string;
  entity: string;
  details: string;
}

export type UserRole =
  | 'Admin'
  | 'Pharmacist'
  | 'Cashier'
  | 'Inventory'
  | 'BranchManager';

export interface RoleConfig {
  role: UserRole;
  label: string;
  name: string;
  initials: string;
  pages: string[];
  actions: string[];
}

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
  branch: string;
  shift: string;
  pin: string;
  twoFactorEnabled: boolean;
  avatarBg: string;
  bio?: string;
  joinedDate: string;
}

export type FefoUrgency = 'critical' | 'warning' | 'attention';

export interface FefoNotification {
  id: string;
  batchId: number;
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
  daysRemaining: number;
  urgency: FefoUrgency;
  urgencyLabel: string;
  atRiskValue: number;
  fefoRank: number;
  isEarliestForSku: boolean;
  acknowledged: boolean;
}

export type HeatmapDensityLevel = 'critical' | 'elevated' | 'moderate' | 'safe';

export interface ZoneBatchItem extends BatchItem {
  shelf: string;
  daysRemaining: number;
  isNearExpiry: boolean;
  atRiskValue: number;
}

export interface StorageZone {
  id: string;
  code: string;
  name: string;
  shortDescription: string;
  temperature: string;
  icon: string;
  shelves: string[];
  totalBatches: number;
  totalUnits: number;
  nearExpiryBatches: number;
  nearExpiryUnits: number;
  criticalUnits: number;
  densityPercent: number;
  atRiskCapital: number;
  densityLevel: HeatmapDensityLevel;
  statusLabel: string;
  batches: ZoneBatchItem[];
  branch: string;
  gridArea?: string;
}

export interface RoleView {
  id: number;
  name: string;
  permissions: string[];
}

export interface PermissionView {
  name: string;
  description?: string;
}

export interface FefoBatchSuggestion {
  batchNumber: string;
  sku: string;
  medicineName: string;
  generic: string;
  branch: string;
  expiryDate: string;
  daysToExpiry: number;
  urgency: FefoUrgency;
  currentStock: number;
  allocatedQty: number;
  remainingStockAfter: number;
  unitPrice: number;
  cost: number;
  shelfLocation?: string;
  batchId: number;
  isEarliestExpiry: boolean;
}

export interface PrescriptionLineRequirement {
  rawText: string;
  medicineName: string;
  dosage?: string;
  requestedQty: number;
  matchedSku?: string;
}

export interface PrescriptionLineFulfillment {
  requirement: PrescriptionLineRequirement;
  allocatedBatches: FefoBatchSuggestion[];
  totalAllocated: number;
  isFullyAllocated: boolean;
  shortageQty: number;
  status: 'fully_allocated' | 'partially_allocated' | 'out_of_stock' | 'unmatched';
  earliestExpiryDate?: string;
}

export interface PrescriptionFulfillmentPlan {
  prescriptionId: string;
  patient: string;
  doctor: string;
  date: string;
  lines: PrescriptionLineFulfillment[];
  allLinesFulfilled: boolean;
  totalUnitsAllocated: number;
  totalCost: number;
  totalPrice: number;
  hasNearExpiryBatches: boolean;
  criticalBatchesCount: number;
  warnings: string[];
}



