import {computed, inject} from '@angular/core';
import {forkJoin} from 'rxjs';
import {signalStore, withState, withComputed, withMethods, patchState} from '@ngrx/signals';
import {PharmacyApi} from '../services/pharmacy-api';
import {
  BatchItem,
  PrescriptionItem,
  SaleRecord,
  PurchaseOrderRecord,
  StockTransferRecord,
  ReturnItemRecord,
  AuditItemRecord,
  CartItem,
  CartAllocation,
  UserRole,
  RoleConfig,
  UserProfile,
  FefoNotification,
  FefoUrgency,
  StorageZone,
  ZoneBatchItem,
  HeatmapDensityLevel,
  FefoBatchSuggestion,
  PrescriptionLineRequirement,
  PrescriptionLineFulfillment,
  PrescriptionFulfillmentPlan,
} from '../models/pharmacy.models';

export interface ToastMessage {
  id: number;
  title: string;
  detail?: string;
  type?: 'info' | 'success' | 'warn' | 'error';
}

export interface CopilotMessage {
  sender: 'user' | 'assistant';
  text: string;
  source?: string;
  time: string;
}

export interface PharmacySettings {
  name: string;
  phone: string;
  address: string;
  currency: string;
  lowStockAlerts: boolean;
  expiryAlerts: boolean;
  rxVerificationRequired: boolean;
}

export interface PharmacyState {
  /**
   * Authentication state – true after a successful login.
   */
  isAuthenticated: boolean;
  /**
   * Username from the backend (lower‑case email).
   */
  authUsername: string;
  /**
   * Raw list of roles returned by the backend (e.g. ['ADMIN']).
   */
  authRoles: string[];
  /**
   * Raw list of permissions returned by the backend (e.g. ['sale','inventory']).
   */
  authPermissions: string[];

  batches: BatchItem[];
  prescriptions: PrescriptionItem[];
  sales: SaleRecord[];
  purchaseOrders: PurchaseOrderRecord[];
  transfers: StockTransferRecord[];
  returns: ReturnItemRecord[];
  auditLog: AuditItemRecord[];
  cart: CartItem[];
  isLoading: boolean;
  currentRole: UserRole;
  fefoEnabled: boolean;
  acknowledgedFefoBatchIds: number[];
  toasts: ToastMessage[];
  lastReceipt: SaleRecord | null;
  jwtToken: string;
  copilotMessages: CopilotMessage[];
  settings: PharmacySettings;
  userProfiles: Record<UserRole, UserProfile>;
  discount: number;
}

const ROLES_MAP: Record<UserRole, RoleConfig> = {
  Admin: {
    role: 'Admin',
    label: 'Administrator',
    name: 'Alex Smith',
    initials: 'AS',
    pages: [
      'dashboard',
      'pos',
      'inventory',
      'prescriptions',
      'purchases',
      'reorder',
      'returns',
      'copilot',
      'branches',
      'audit',
      'access',
      'reports',
      'settings',
      'profile',
    ],
    actions: [
      'sale',
      'inventory',
      'prescription',
      'purchase',
      'reorder',
      'return',
      'branch',
      'settings',
    ],
  },
  Pharmacist: {
    role: 'Pharmacist',
    label: 'Pharmacist',
    name: 'Samira Ahmed',
    initials: 'SA',
    pages: [
      'dashboard',
      'pos',
      'inventory',
      'prescriptions',
      'copilot',
      'returns',
      'reports',
      'profile',
    ],
    actions: ['sale', 'prescription', 'return'],
  },
  Cashier: {
    role: 'Cashier',
    label: 'Cashier',
    name: 'Rafi Hasan',
    initials: 'RH',
    pages: ['dashboard', 'pos', 'returns', 'profile'],
    actions: ['sale', 'return'],
  },
  Inventory: {
    role: 'Inventory',
    label: 'Inventory manager',
    name: 'Nabila Karim',
    initials: 'NK',
    pages: ['dashboard', 'inventory', 'purchases', 'reorder', 'branches', 'reports', 'profile'],
    actions: ['inventory', 'purchase', 'reorder', 'branch'],
  },
  BranchManager: {
    role: 'BranchManager',
    label: 'Branch manager',
    name: 'Mahmud Hasan',
    initials: 'MH',
    pages: [
      'dashboard',
      'pos',
      'inventory',
      'purchases',
      'reorder',
      'returns',
      'branches',
      'reports',
      'profile',
    ],
    actions: ['sale', 'inventory', 'purchase', 'reorder', 'return', 'branch'],
  },
};

const initialState: PharmacyState = {
  batches: [],
  prescriptions: [],
  sales: [],
  purchaseOrders: [],
  transfers: [],
  returns: [],
  auditLog: [],
  cart: [],
  discount: 0,
  isLoading: false,
  currentRole: 'Admin',
  fefoEnabled: true,
  acknowledgedFefoBatchIds: [],
  toasts: [],
  jwtToken: '',
  lastReceipt: null,
  isAuthenticated: false,
  authUsername: '',
  authRoles: [],
  authPermissions: [],
  copilotMessages: [
    {
      sender: 'assistant',
      text: 'Hi! I am your AI Pharmacy Copilot. Grounded in your inventory, batch expirations, and prescription queues, I can answer operational queries, check drug safety notes, and advise on reorder prioritization. What would you like to know?',
      time: 'Ready',
      source: 'gemini-3.8-flash',
    },
  ],
  settings: {
    name: 'MediFlow Pharmacy',
    phone: '+880 1XXX-XXXXXX',
    address: 'Dhanmondi, Dhaka, Bangladesh',
    currency: 'BDT (৳)',
    lowStockAlerts: true,
    expiryAlerts: true,
    rxVerificationRequired: true,
  },
  userProfiles: {
    Admin: {
      name: 'Alex Smith',
      email: 'admin@mediflow.io',
      phone: '+880 1711-234567',
      licenseNumber: 'DGDA-ADMIN-2024-001',
      branch: 'Dhanmondi (HQ)',
      shift: 'Executive Operations (08:00 - 18:00)',
      pin: '9420',
      twoFactorEnabled: true,
      avatarBg: '#D6F599',
      bio: 'Principal Pharmacy Operations Director overseeing multi-branch FEFO logistics, clinical compliance, and financial audits.',
      joinedDate: 'Jan 15, 2024',
    },
    Pharmacist: {
      name: 'Samira Ahmed',
      email: 'pharmacist@mediflow.io',
      phone: '+880 1712-345678',
      licenseNumber: 'PCB-REG-94820-DH',
      branch: 'Dhanmondi (HQ)',
      shift: 'Morning Clinical Safety (08:00 - 16:00)',
      pin: '1122',
      twoFactorEnabled: true,
      avatarBg: '#9DE8D7',
      bio: 'Licensed Clinical Pharmacist specializing in prescription review, drug interaction safety screening, and dosage appropriateness.',
      joinedDate: 'Mar 10, 2024',
    },
    Cashier: {
      name: 'Rafi Hasan',
      email: 'cashier@mediflow.io',
      phone: '+880 1713-456789',
      licenseNumber: 'POS-OP-084',
      branch: 'Dhanmondi (HQ)',
      shift: 'Retail POS Terminal 1 (09:00 - 17:00)',
      pin: '4455',
      twoFactorEnabled: false,
      avatarBg: '#FED7AA',
      bio: 'Certified POS Operator skilled in high-velocity barcode checkout, split payment processing, and customer billing reconciliation.',
      joinedDate: 'Jun 01, 2024',
    },
    Inventory: {
      name: 'Nabila Karim',
      email: 'inventory@mediflow.io',
      phone: '+880 1714-567890',
      licenseNumber: 'INV-MGR-012',
      branch: 'Uttara Hub',
      shift: 'Supply Chain & Stock Intake (07:00 - 15:00)',
      pin: '7788',
      twoFactorEnabled: true,
      avatarBg: '#BBF7D0',
      bio: 'Warehouse and inventory specialist managing FEFO lot rotation, purchase intake staging, and inter-branch stock transfers.',
      joinedDate: 'Feb 20, 2024',
    },
    BranchManager: {
      name: 'Mahmud Hasan',
      email: 'branch@mediflow.io',
      phone: '+880 1715-678901',
      licenseNumber: 'BM-MIRPUR-003',
      branch: 'Mirpur Outlet',
      shift: 'Branch Operations General (09:00 - 18:00)',
      pin: '3344',
      twoFactorEnabled: true,
      avatarBg: '#B4B8FB',
      bio: 'Regional Branch Manager tracking revenue targets, staff shift allocations, and local medication inventory availability.',
      joinedDate: 'Aug 12, 2024',
    },
  },
};

let toastCounter = 1;

export const PharmacyStore = signalStore(
  {providedIn: 'root'},
  withState(initialState),
  withComputed((store) => {
    const roleConfig = computed(() => ROLES_MAP[store.currentRole()]);

    const lowStockBatches = computed(() =>
      store.batches().filter((b) => b.stock <= b.reorder),
    );

    const nearExpiryBatches = computed(() => {
      const today = new Date('2026-10-13').getTime();
      return store.batches().filter((b) => {
        const exp = new Date(b.expiry).getTime();
        const days = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
        return days <= 90;
      });
    });

    const attentionCount = computed(
      () =>
        new Set([
          ...lowStockBatches().map((b) => b.id),
          ...nearExpiryBatches().map((b) => b.id),
        ]).size,
    );

    const pendingRxCount = computed(
      () =>
        store
          .prescriptions()
          .filter(
            (p) => p.status === 'Pending review' || p.status === 'On hold',
          ).length,
    );

    const cartCount = computed(() =>
      store.cart().reduce((sum, item) => sum + item.qty, 0),
    );

    const cartSubtotal = computed(() =>
      store.cart().reduce((sum, item) => sum + item.qty * item.price, 0),
    );

    const cartTotal = computed(() =>
      Math.max(0, cartSubtotal() - store.discount()),
    );

    const todayRevenue = computed(() => {
      const fresh = store.sales().reduce((sum, s) => sum + s.total, 0);
      return 24580 + fresh;
    });

    const todaySales = computed(() => 86 + store.sales().length);

    const currentProfile = computed(
      () => store.userProfiles()[store.currentRole()],
    );

    const fefoNotifications = computed<FefoNotification[]>(() => {
      const today = new Date('2026-10-13').getTime();
      const batchesWithStock = store.batches().filter((b) => b.stock > 0);

      // Sort by expiry date ascending (FEFO order)
      const sorted = [...batchesWithStock].sort((a, b) =>
        a.expiry.localeCompare(b.expiry),
      );

      // Track the earliest batch for each SKU
      const earliestSkuMap = new Map<string, number>();
      for (const b of sorted) {
        if (!earliestSkuMap.has(b.sku)) {
          earliestSkuMap.set(b.sku, b.id);
        }
      }

      // Filter to batches nearing expiry within 90 days
      const nearExp = sorted.filter((b) => {
        const exp = new Date(b.expiry).getTime();
        const days = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
        return days <= 90;
      });

      return nearExp.map((b, index) => {
        const exp = new Date(b.expiry).getTime();
        const daysRemaining = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
        let urgency: FefoUrgency = 'attention';
        let urgencyLabel = `Approaching (${daysRemaining}d)`;

        if (daysRemaining <= 30) {
          urgency = 'critical';
          urgencyLabel = `Critical (${daysRemaining}d)`;
        } else if (daysRemaining <= 60) {
          urgency = 'warning';
          urgencyLabel = `Warning (${daysRemaining}d)`;
        }

        return {
          id: `fefo-batch-${b.id}`,
          batchId: b.id,
          medicine: b.medicine,
          generic: b.generic,
          sku: b.sku,
          barcode: b.barcode,
          batch: b.batch,
          branch: b.branch,
          expiry: b.expiry,
          stock: b.stock,
          reorder: b.reorder,
          price: b.price,
          cost: b.cost,
          category: b.category,
          supplier: b.supplier,
          emoji: b.emoji,
          daysRemaining,
          urgency,
          urgencyLabel,
          atRiskValue: Math.round(b.stock * b.price * 100) / 100,
          fefoRank: index + 1,
          isEarliestForSku: earliestSkuMap.get(b.sku) === b.id,
          acknowledged: store.acknowledgedFefoBatchIds().includes(b.id),
        };
      });
    });

    const unacknowledgedFefoCount = computed(
      () => fefoNotifications().filter((n) => !n.acknowledged).length,
    );

    const criticalFefoCount = computed(
      () =>
        fefoNotifications().filter(
          (n) => n.urgency === 'critical' && !n.acknowledged,
        ).length,
    );

    const warningFefoCount = computed(
      () =>
        fefoNotifications().filter(
          (n) => n.urgency === 'warning' && !n.acknowledged,
        ).length,
    );

    const fefoAtRiskTotal = computed(() =>
      fefoNotifications().reduce((sum, n) => sum + n.atRiskValue, 0),
    );

    const storageZones = computed<StorageZone[]>(() => {
      const today = new Date('2026-10-13').getTime();
      const allBatches = store.batches();

      const zoneDefs = [
        {
          id: 'zone-a',
          code: 'Zone A',
          name: 'Cold-Chain Biologicals & Vaccines',
          shortDescription: 'Temperature-controlled medical refrigerator units (2°C - 8°C)',
          temperature: '2°C - 8°C (Cold Storage)',
          icon: 'ac_unit',
          shelves: ['Shelf A1 (Biologics)', 'Shelf A2 (Insulin Racks)', 'Shelf A3 (Vaccines)'],
          matchesCategory: (cat: string) =>
            cat.toLowerCase().includes('cold') ||
            cat.toLowerCase().includes('vaccine') ||
            cat.toLowerCase().includes('biologic'),
          gridArea: 'col-span-1',
        },
        {
          id: 'zone-b',
          code: 'Zone B',
          name: 'Fast-Move Counter Dispensing Bay',
          shortDescription: 'High-frequency OTC analgesics, antipyretics & acute pain relief',
          temperature: '15°C - 25°C (Controlled Room)',
          icon: 'speed',
          shelves: ['Shelf B1 (Fast-Turn)', 'Shelf B2 (Paracetamol)', 'Shelf B3 (Topical)'],
          matchesCategory: (cat: string) => cat.toLowerCase().includes('analgesic'),
          gridArea: 'col-span-1 md:col-span-2',
        },
        {
          id: 'zone-c',
          code: 'Zone C',
          name: 'Central Rx Prescription Core',
          shortDescription: 'Prescription antibiotics, quinolones, GI therapeutics & capsules',
          temperature: '15°C - 25°C (Controlled Room)',
          icon: 'medication',
          shelves: ['Shelf C1 (Antibiotics)', 'Shelf C2 (Quinolones)', 'Shelf C3 (GI Omeprazole)', 'Shelf C4 (Chronic)'],
          matchesCategory: (cat: string) =>
            cat.toLowerCase().includes('antibiotic') ||
            cat.toLowerCase().includes('gastro'),
          gridArea: 'col-span-1 md:col-span-2',
        },
        {
          id: 'zone-d',
          code: 'Zone D',
          name: 'Controlled Substances Safe Vault',
          shortDescription: 'High-security biometric safe for Schedule II-IV regulated agents',
          temperature: '15°C - 25°C (Secure Vault)',
          icon: 'lock',
          shelves: ['Vault Shelf D1 (Schedule II)', 'Vault Shelf D2 (Sedatives)'],
          matchesCategory: (cat: string) =>
            cat.toLowerCase().includes('controlled') ||
            cat.toLowerCase().includes('narcotic'),
          gridArea: 'col-span-1',
        },
        {
          id: 'zone-e',
          code: 'Zone E',
          name: 'Bulk Pallet Racking & Logistics',
          shortDescription: 'Floor racking for cartons, oral rehydration salts & vitamin cases',
          temperature: '15°C - 28°C (Bulk Warehouse)',
          icon: 'inventory_2',
          shelves: ['Pallet E1 (ORS)', 'Pallet E2 (Vitamins)', 'Rack E3 (Bulk Syrups)'],
          matchesCategory: (cat: string) =>
            cat.toLowerCase().includes('rehydration') ||
            cat.toLowerCase().includes('vitamin') ||
            cat.toLowerCase().includes('other'),
          gridArea: 'col-span-1 md:col-span-2',
        },
        {
          id: 'zone-f',
          code: 'Zone F',
          name: 'Near-Expiry Quarantine & Staging Bay',
          shortDescription: 'Dedicated quarantine rack for markdown clearance and vendor returns',
          temperature: '15°C - 22°C (Staging Bay)',
          icon: 'warning',
          shelves: ['Staging Shelf F1 (Markdown)', 'Staging Shelf F2 (Return/Disposal)'],
          matchesCategory: () => false,
          gridArea: 'col-span-1',
        },
      ];

      return zoneDefs.map((def) => {
        const matched = allBatches.filter((b) => def.matchesCategory(b.category));

        const zoneBatchItems: ZoneBatchItem[] = matched.map((b, idx) => {
          const exp = new Date(b.expiry).getTime();
          const daysRemaining = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
          const shelf = def.shelves[idx % def.shelves.length];
          const isNearExpiry = daysRemaining <= 90 && b.stock > 0;
          const atRiskValue = isNearExpiry ? Math.round(b.stock * b.price * 100) / 100 : 0;

          return {
            ...b,
            shelf,
            daysRemaining,
            isNearExpiry,
            atRiskValue,
          };
        });

        const totalBatches = zoneBatchItems.length;
        const totalUnits = zoneBatchItems.reduce((sum, b) => sum + b.stock, 0);
        const nearExpiryBatches = zoneBatchItems.filter((b) => b.isNearExpiry).length;
        const nearExpiryUnits = zoneBatchItems
          .filter((b) => b.isNearExpiry)
          .reduce((sum, b) => sum + b.stock, 0);
        const criticalUnits = zoneBatchItems
          .filter((b) => b.daysRemaining <= 30 && b.stock > 0)
          .reduce((sum, b) => sum + b.stock, 0);
        const atRiskCapital = zoneBatchItems.reduce((sum, b) => sum + b.atRiskValue, 0);

        const densityPercent =
          totalUnits > 0 ? Math.round((nearExpiryUnits / totalUnits) * 1000) / 10 : 0;

        let densityLevel: HeatmapDensityLevel = 'safe';
        let statusLabel = 'Safe Expiry Window';

        if (densityPercent >= 35 || criticalUnits > 20) {
          densityLevel = 'critical';
          statusLabel = 'Critical Expiry Hotspot';
        } else if (densityPercent >= 15 || nearExpiryUnits > 15) {
          densityLevel = 'elevated';
          statusLabel = 'Elevated Risk Density';
        } else if (densityPercent > 0) {
          densityLevel = 'moderate';
          statusLabel = 'Moderate Expiry Density';
        }

        return {
          id: def.id,
          code: def.code,
          name: def.name,
          shortDescription: def.shortDescription,
          temperature: def.temperature,
          icon: def.icon,
          shelves: def.shelves,
          totalBatches,
          totalUnits,
          nearExpiryBatches,
          nearExpiryUnits,
          criticalUnits,
          densityPercent,
          atRiskCapital,
          densityLevel,
          statusLabel,
          batches: zoneBatchItems,
          branch: 'Dhanmondi (HQ)',
          gridArea: def.gridArea,
        };
      });
    });

    const hotZonesCount = computed(
      () =>
        storageZones().filter(
          (z) => z.densityLevel === 'critical' || z.densityLevel === 'elevated',
        ).length,
    );

    const highestDensityZone = computed(() => {
      const sorted = [...storageZones()].sort(
        (a, b) => b.densityPercent - a.densityPercent,
      );
      return sorted[0];
    });

    const totalHotZoneCapital = computed(() =>
      storageZones()
        .filter(
          (z) => z.densityLevel === 'critical' || z.densityLevel === 'elevated',
        )
        .reduce((sum, z) => sum + z.atRiskCapital, 0),
    );

    return {
      roleConfig,
      currentProfile,
      lowStockBatches,
      nearExpiryBatches,
      fefoNotifications,
      unacknowledgedFefoCount,
      criticalFefoCount,
      warningFefoCount,
      fefoAtRiskTotal,
      storageZones,
      hotZonesCount,
      highestDensityZone,
      totalHotZoneCapital,
      attentionCount,
      pendingRxCount,
      cartCount,
      cartSubtotal,
      cartTotal,
      todayRevenue,
      todaySales,
    };
  }),
  withMethods((store, api = inject(PharmacyApi)) => {
    function showToast(
      title: string,
      detail?: string,
      type: ToastMessage['type'] = 'info',
    ) {
      const newToast: ToastMessage = {
        id: toastCounter++,
        title,
        detail,
        type,
      };
      patchState(store, {toasts: [...store.toasts(), newToast]});
      setTimeout(() => {
        patchState(store, {
          toasts: store.toasts().filter((t) => t.id !== newToast.id),
        });
      }, 3500);
    }

    function canPerform(action: string): boolean {
      const allowedByRole = store.roleConfig().actions.includes(action);
      const allowedByPermission = store.authPermissions().includes(action);
      const allowed = allowedByRole || allowedByPermission;
      if (!allowed) {
        showToast(
          'Permission denied',
          `${store.roleConfig().label} cannot perform "${action}".`,
          'warn',
        );
      }
      return allowed;
    }

    function canAccessPage(page: string): boolean {
      return store.roleConfig().pages.includes(page);
    }

    function hasPermission(permission: string): boolean {
      const allowed = store.authPermissions().includes(permission);
      if (!allowed) {
        showToast(
          'Permission denied',
          `${store.roleConfig().label} lacks permission "${permission}".`,
          'warn',
        );
      }
      return allowed;
    }

    function setToken(token: string) {
      patchState(store, { jwtToken: token });
    }

    function allocateFEFO(sku: string, qty: number): CartAllocation[] | null {
      const matchingBatches = store
        .batches()
        .filter((b) => b.sku === sku && b.stock > 0)
        .sort((a, b) => a.expiry.localeCompare(b.expiry));

      const totalAvail = matchingBatches.reduce((s, b) => s + b.stock, 0);
      if (totalAvail < qty) return null;

      let remaining = qty;
      const alloc: CartAllocation[] = [];
      for (const b of matchingBatches) {
        if (remaining <= 0) break;
        const take = Math.min(b.stock, remaining);
        alloc.push({
          batchId: b.id,
          batch: b.batch,
          qty: take,
          expiry: b.expiry,
          branch: b.branch,
        });
        remaining -= take;
      }
      return alloc;
    }

    function parsePrescriptionRequirements(rx: PrescriptionItem): PrescriptionLineRequirement[] {
      if (!rx.medicines || rx.medicines.trim().length === 0) {
        return [
          {
            rawText: 'Standard Rx Dispense',
            medicineName: 'Standard Rx Dispense',
            requestedQty: Math.max(1, rx.items || 1),
          },
        ];
      }

      const parts = rx.medicines.includes(';')
        ? rx.medicines.split(';')
        : rx.medicines.includes('\n')
          ? rx.medicines.split('\n')
          : rx.medicines.split(',');

      const cleanedParts = parts.map((p) => p.trim()).filter((p) => p.length > 0);
      if (cleanedParts.length === 0) {
        return [
          {
            rawText: rx.medicines,
            medicineName: rx.medicines,
            requestedQty: Math.max(1, rx.items || 1),
          },
        ];
      }

      const totalItems = Math.max(cleanedParts.length, rx.items || cleanedParts.length);
      const baseQty = Math.max(1, Math.floor(totalItems / cleanedParts.length));
      let remainder = totalItems - baseQty * cleanedParts.length;

      return cleanedParts.map((part) => {
        let requestedQty = baseQty;
        if (remainder > 0) {
          requestedQty += 1;
          remainder--;
        }

        const qtyMatch = part.match(
          /(?:x\s*|qty[:\s]*|[-–]\s*|\()(\d+)(?:\s*(?:tabs?|caps?|units?|pills?|sachets?|bottles?))?/i,
        );
        if (qtyMatch && qtyMatch[1]) {
          const parsed = parseInt(qtyMatch[1], 10);
          if (parsed > 0) requestedQty = parsed;
        }

        let cleanName = part
          .replace(
            /(?:x\s*|qty[:\s]*|[-–]\s*|\()(\d+)(?:\s*(?:tabs?|caps?|units?|pills?|sachets?|bottles?))?\)?/gi,
            '',
          )
          .trim();
        if (!cleanName) cleanName = part;

        return {
          rawText: part,
          medicineName: cleanName,
          requestedQty,
        };
      });
    }

    function findMatchingBatchesForQuery(
      query: string,
      allBatches: BatchItem[],
      targetBranch?: string,
    ): BatchItem[] {
      const q = query.toLowerCase().trim();
      if (!q) return [];

      const strippedQ = q
        .replace(/\b(\d+mg|\d+ml|\d+g|tabs?|caps?)\b/gi, '')
        .trim();

      // 1. Exact SKU or exact name/generic
      let matches = allBatches.filter((b) => {
        return (
          b.sku.toLowerCase() === q ||
          b.medicine.toLowerCase() === q ||
          b.generic.toLowerCase() === q
        );
      });

      // 2. Substring match
      if (matches.length === 0) {
        matches = allBatches.filter((b) => {
          const bMed = b.medicine.toLowerCase();
          const bGen = b.generic.toLowerCase();
          return (
            bMed.includes(q) ||
            bGen.includes(q) ||
            (strippedQ.length > 2 &&
              (bMed.includes(strippedQ) || bGen.includes(strippedQ)))
          );
        });
      }

      // 3. Token match
      if (matches.length === 0 && strippedQ.length > 2) {
        const tokens = strippedQ.split(/\s+/).filter((t) => t.length > 2);
        matches = allBatches.filter((b) => {
          const combined = `${b.medicine} ${b.generic} ${b.sku}`.toLowerCase();
          return tokens.some((t) => combined.includes(t));
        });
      }

      // Filter only positive stock
      let available = matches.filter((b) => b.stock > 0);

      // Prioritize targeted branch if requested
      if (targetBranch) {
        const branchBatches = available.filter(
          (b) => b.branch.toLowerCase() === targetBranch.toLowerCase(),
        );
        if (branchBatches.length > 0) {
          available = branchBatches;
        }
      }

      // FEFO Sort: strictly earliest expiry first
      return available.sort((a, b) => {
        const expDiff = a.expiry.localeCompare(b.expiry);
        if (expDiff !== 0) return expDiff;
        return a.stock - b.stock;
      });
    }

    function allocateMedicineLineFEFO(
      req: PrescriptionLineRequirement,
      allBatches: BatchItem[],
      targetBranch?: string,
      usedBatchQuantities: Record<number, number> = {},
    ): PrescriptionLineFulfillment {
      const candidateBatches = findMatchingBatchesForQuery(
        req.medicineName,
        allBatches,
        targetBranch,
      );
      const allocatedBatches: FefoBatchSuggestion[] = [];
      let remainingToAllocate = req.requestedQty;
      const today = new Date();

      for (let i = 0; i < candidateBatches.length; i++) {
        if (remainingToAllocate <= 0) break;
        const b = candidateBatches[i];
        const alreadyAllocated = usedBatchQuantities[b.id] || 0;
        const availableStock = Math.max(0, b.stock - alreadyAllocated);
        if (availableStock <= 0) continue;

        const take = Math.min(availableStock, remainingToAllocate);
        usedBatchQuantities[b.id] = alreadyAllocated + take;

        const expDate = new Date(b.expiry);
        const diffMs = expDate.getTime() - today.getTime();
        const daysToExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const urgency: FefoUrgency =
          daysToExpiry <= 30
            ? 'critical'
            : daysToExpiry <= 90
              ? 'warning'
              : 'attention';

        let shelfLocation: string | undefined;
        try {
          const zone = store
            .storageZones()
            .find((z) => z.batches.some((item) => item.id === b.id));
          shelfLocation =
            zone?.batches.find((item) => item.id === b.id)?.shelf ||
            (zone ? `${zone.code}-A` : undefined);
        } catch {
          shelfLocation = undefined;
        }

        allocatedBatches.push({
          batchId: b.id,
          batchNumber: b.batch,
          sku: b.sku,
          medicineName: b.medicine,
          generic: b.generic,
          branch: b.branch,
          expiryDate: b.expiry,
          daysToExpiry,
          urgency,
          currentStock: b.stock,
          allocatedQty: take,
          remainingStockAfter: b.stock - usedBatchQuantities[b.id],
          unitPrice: b.price,
          cost: b.cost,
          shelfLocation,
          isEarliestExpiry: i === 0,
        });

        remainingToAllocate -= take;
      }

      const totalAllocated = req.requestedQty - remainingToAllocate;
      let status: PrescriptionLineFulfillment['status'];
      if (candidateBatches.length === 0) {
        status = 'unmatched';
      } else if (totalAllocated === 0) {
        status = 'out_of_stock';
      } else if (remainingToAllocate > 0) {
        status = 'partially_allocated';
      } else {
        status = 'fully_allocated';
      }

      return {
        requirement: {
          ...req,
          matchedSku: allocatedBatches[0]?.sku || candidateBatches[0]?.sku,
        },
        allocatedBatches,
        totalAllocated,
        isFullyAllocated: remainingToAllocate === 0,
        shortageQty: remainingToAllocate,
        status,
        earliestExpiryDate: allocatedBatches[0]?.expiryDate,
      };
    }

    function buildPrescriptionFulfillmentPlan(
      rx: PrescriptionItem,
      allBatches: BatchItem[],
      targetBranch?: string,
      customLines?: PrescriptionLineRequirement[],
    ): PrescriptionFulfillmentPlan {
      const requirements =
        customLines && customLines.length > 0
          ? customLines
          : parsePrescriptionRequirements(rx);

      const usedBatchQuantities: Record<number, number> = {};
      const lines: PrescriptionLineFulfillment[] = [];
      const warnings: string[] = [];

      let totalUnitsAllocated = 0;
      let totalCost = 0;
      let totalPrice = 0;
      let criticalBatchesCount = 0;
      let hasNearExpiryBatches = false;

      for (const req of requirements) {
        const line = allocateMedicineLineFEFO(
          req,
          allBatches,
          targetBranch,
          usedBatchQuantities,
        );
        lines.push(line);
        totalUnitsAllocated += line.totalAllocated;

        for (const alloc of line.allocatedBatches) {
          totalCost += alloc.cost * alloc.allocatedQty;
          totalPrice += alloc.unitPrice * alloc.allocatedQty;
          if (alloc.daysToExpiry <= 90) {
            hasNearExpiryBatches = true;
          }
          if (alloc.urgency === 'critical') {
            criticalBatchesCount++;
            warnings.push(
              `Batch ${alloc.batchNumber} for ${alloc.medicineName} expires in ${alloc.daysToExpiry} days (Critical FEFO Priority).`,
            );
          }
        }

        if (line.shortageQty > 0) {
          warnings.push(
            `Inventory shortage: "${req.medicineName}" requested ${req.requestedQty} units, but only ${line.totalAllocated} units could be allocated via FEFO.`,
          );
        } else if (line.status === 'unmatched') {
          warnings.push(
            `No matching inventory records found for prescribed item: "${req.medicineName}".`,
          );
        }
      }

      const allLinesFulfilled = lines.every((l) => l.isFullyAllocated);

      return {
        prescriptionId: rx.id,
        patient: rx.patient,
        doctor: rx.doctor,
        date: rx.date,
        lines,
        allLinesFulfilled,
        totalUnitsAllocated,
        totalCost: Math.round(totalCost * 100) / 100,
        totalPrice: Math.round(totalPrice * 100) / 100,
        hasNearExpiryBatches,
        criticalBatchesCount,
        warnings,
      };
    }

    return {
      showToast,
      canPerform,
      canAccessPage,
      hasPermission,
      setToken,

      setRole(role: UserRole) {
        patchState(store, {currentRole: role});
        showToast(
          'Active role switched',
          `Viewing with ${ROLES_MAP[role].label} permissions profile.`,
          'info',
        );
      },

      updateUserProfile(data: Partial<UserProfile>) {
        const role = store.currentRole();
        const current = store.userProfiles()[role];
        const updated = {...current, ...data};
        patchState(store, {
          userProfiles: {
            ...store.userProfiles(),
            [role]: updated,
          },
        });
        showToast(
          'Profile updated',
          'User profile information updated successfully.',
          'success',
        );
      },

      setBatches(batches: BatchItem[]) {
        patchState(store, {batches});
      },

      toggleFEFO() {
        const next = !store.fefoEnabled();
        patchState(store, {fefoEnabled: next});
        showToast(
          'FEFO Sorting',
          next
            ? 'First Expiry, First Out sorting is active.'
            : 'Default catalog sequence active.',
        );
      },

      setDiscount(discount: number) {
        patchState(store, {discount: Math.max(0, discount)});
      },

      acknowledgeFefoNotification(batchId: number) {
        if (!store.acknowledgedFefoBatchIds().includes(batchId)) {
          patchState(store, {
            acknowledgedFefoBatchIds: [...store.acknowledgedFefoBatchIds(), batchId],
          });
          showToast(
            'Batch Acknowledged',
            'Batch reviewed and flagged for FEFO dispensing protocol.',
            'info',
          );
        }
      },

      unacknowledgeFefoNotification(batchId: number) {
        patchState(store, {
          acknowledgedFefoBatchIds: store
            .acknowledgedFefoBatchIds()
            .filter((id) => id !== batchId),
        });
      },

      acknowledgeAllFefoNotifications() {
        const allIds = store.fefoNotifications().map((n) => n.batchId);
        patchState(store, {acknowledgedFefoBatchIds: allIds});
        showToast(
          'All Expiry Alerts Acknowledged',
          `${allIds.length} near-expiry batch alerts marked as acknowledged for this shift.`,
          'success',
        );
      },

      applyClearanceDiscount(batchId: number, discountPercent: number) {
        const batch = store.batches().find((b) => b.id === batchId);
        if (!batch) return;
        const newPrice = Math.max(
          1,
          Math.round(batch.price * (1 - discountPercent / 100) * 100) / 100,
        );
        const updatedBatches = store.batches().map((b) =>
          b.id === batchId ? {...b, price: newPrice} : b,
        );
        patchState(store, {batches: updatedBatches});
        showToast(
          'Clearance Markdown Applied',
          `${batch.medicine} (Batch ${batch.batch}) price updated to ৳${newPrice.toFixed(2)} (${discountPercent}% off) to accelerate FEFO dispensing.`,
          'success',
        );
      },

      applyZoneClearanceDiscount(zoneId: string, discountPercent: number) {
        const zone = store.storageZones().find((z) => z.id === zoneId);
        if (!zone) return;

        const nearExpiryBatchIds = new Set(
          zone.batches.filter((b) => b.isNearExpiry).map((b) => b.id),
        );

        if (nearExpiryBatchIds.size === 0) {
          showToast(
            'No near-expiry lots',
            'All batches in this zone are currently within safe expiry windows.',
            'info',
          );
          return;
        }

        const updatedBatches = store.batches().map((b) => {
          if (nearExpiryBatchIds.has(b.id)) {
            const newPrice = Math.max(
              1,
              Math.round(b.price * (1 - discountPercent / 100) * 100) / 100,
            );
            return {...b, price: newPrice};
          }
          return b;
        });

        patchState(store, {batches: updatedBatches});
        showToast(
          'Zone Markdown Applied',
          `${zone.name} (${nearExpiryBatchIds.size} near-expiry lots) discounted by ${discountPercent}% to accelerate physical clearance.`,
          'success',
        );
      },

      loadInitialData() {
        patchState(store, {isLoading: true});
        api.getBatches().subscribe((batches) => {
          patchState(store, {batches});
        });
        api.getPrescriptions().subscribe((prescriptions) => {
          patchState(store, {prescriptions});
        });
        api.getSales().subscribe((sales) => {
          patchState(store, {sales});
        });
        api.getPurchaseOrders().subscribe((purchaseOrders) => {
          patchState(store, {purchaseOrders});
        });
        api.getTransfers().subscribe((transfers) => {
          patchState(store, {transfers});
        });
        api.getReturns().subscribe((returns) => {
          patchState(store, {returns});
        });
        api.getAuditLog().subscribe((auditLog) => {
          patchState(store, {auditLog, isLoading: false});
        });
      },

      addToCart(sku: string) {
        if (!canPerform('sale')) return;

        const availableBatches = store
          .batches()
          .filter((b) => b.sku === sku && b.stock > 0);
        if (!availableBatches.length) {
          showToast(
            'Out of stock',
            'No available batches on hand for this medicine.',
            'warn',
          );
          return;
        }

        const med = availableBatches[0];
        const existing = store.cart().find((i) => i.sku === sku);

        if (existing) {
          const newQty = existing.qty + 1;
          const alloc = allocateFEFO(sku, newQty);
          if (!alloc) {
            showToast(
              'Stock limit reached',
              `Cannot add more than available on hand.`,
              'warn',
            );
            return;
          }
          const updatedCart = store.cart().map((item) =>
            item.sku === sku ? {...item, qty: newQty, alloc} : item,
          );
          patchState(store, {cart: updatedCart});
        } else {
          const alloc = allocateFEFO(sku, 1);
          if (!alloc) {
            showToast('Stock unavailable', undefined, 'warn');
            return;
          }
          const newItem: CartItem = {
            sku,
            name: med.medicine,
            price: med.price,
            qty: 1,
            alloc,
          };
          patchState(store, {cart: [...store.cart(), newItem]});
        }

        const allocDetails = store.cart().find((i) => i.sku === sku)?.alloc[0];
        showToast(
          'Added to POS sale',
          `${med.medicine} · FEFO batch ${allocDetails?.batch}`,
          'success',
        );
      },

      updateCartQty(sku: string, delta: number) {
        if (!canPerform('sale')) return;

        const existing = store.cart().find((i) => i.sku === sku);
        if (!existing) return;

        const nextQty = existing.qty + delta;
        if (nextQty <= 0) {
          patchState(store, {
            cart: store.cart().filter((i) => i.sku !== sku),
          });
          showToast('Item removed from cart');
        } else {
          const alloc = allocateFEFO(sku, nextQty);
          if (!alloc) {
            showToast(
              'Insufficient stock',
              'Available inventory batches cannot fulfill this quantity.',
              'warn',
            );
            return;
          }
          patchState(store, {
            cart: store
              .cart()
              .map((i) => (i.sku === sku ? {...i, qty: nextQty, alloc} : i)),
          });
        }
      },

      clearCart() {
        patchState(store, {cart: [], discount: 0});
        showToast('Cart cleared', 'All items removed.');
      },

      completeCheckout(customer: string, payment: string) {
        if (!canPerform('sale')) return;
        if (store.cart().length === 0) {
          showToast(
            'Cart is empty',
            'Scan or select at least one item before checkout.',
            'warn',
          );
          return;
        }

        api
          .completeSale(
            customer,
            payment,
            store.cart(),
            store.discount(),
            store.roleConfig().name,
            store.roleConfig().label,
          )
          .subscribe((sale) => {
            if (sale) {
              patchState(store, {
                sales: [sale, ...store.sales()],
                cart: [],
                discount: 0,
  isLoading: false,
                lastReceipt: sale,
              });
              // Refresh batches to keep stock accurate
              api.getBatches().subscribe((batches) => {
                patchState(store, {batches});
              });
              api.getAuditLog().subscribe((auditLog) => {
                patchState(store, {auditLog});
              });
              showToast(
                'Sale completed successfully',
                `${sale.id} · ৳ ${sale.total.toFixed(2)} via ${payment}`,
                'success',
              );
            } else {
              showToast(
                'Checkout error',
                'Unable to process sale on server.',
                'error',
              );
            }
          });
      },

      addBatch(batch: Partial<BatchItem>) {
        if (!canPerform('inventory')) return;

        api
          .createBatch(
            batch,
            store.roleConfig().name,
            store.roleConfig().label,
          )
          .subscribe((created) => {
            if (created) {
              patchState(store, {batches: [...store.batches(), created]});
              api.getAuditLog().subscribe((auditLog) => {
                patchState(store, {auditLog});
              });
              showToast(
                'Batch created',
                `${created.medicine} (${created.batch}) added to ${created.branch}.`,
                'success',
              );
            }
          });
      },

      updateBatch(id: number, data: Partial<BatchItem>) {
        if (!canPerform('inventory')) return;

        // Immediate optimistic UI update
        patchState(store, {
          batches: store.batches().map((b) => (b.id === id ? {...b, ...data} : b)),
        });

        api
          .updateBatch(
            id,
            data,
            store.roleConfig().name,
            store.roleConfig().label,
          )
          .subscribe((updated) => {
            if (updated) {
              patchState(store, {
                batches: store
                  .batches()
                  .map((b) => (b.id === id ? updated : b)),
              });
              api.getAuditLog().subscribe((auditLog) => {
                patchState(store, {auditLog});
              });
              showToast(
                'Batch updated',
                `Parameters updated for batch ${updated.batch}.`,
                'success',
              );
            }
          });
      },

      addPrescription(rx: Partial<PrescriptionItem>) {
        if (!canPerform('prescription')) return;

        // Optimistically add prescription to store to support offline usage and unit tests
        // Cast to PrescriptionItem assuming caller provides complete fields needed for downstream logic.
        patchState(store, {
          prescriptions: [(rx as PrescriptionItem), ...store.prescriptions()],
        });

        api
          .createPrescription(
            rx,
            store.roleConfig().name,
            store.roleConfig().label,
          )
          .subscribe((created) => {
            if (created) {
              // Replace optimistic entry with server-provided record if they differ (by ID).
              patchState(store, {
                prescriptions: store.prescriptions().map((p) => (p.id === created.id ? created : p)),
              });
              api.getAuditLog().subscribe((auditLog) => {
                patchState(store, {auditLog});
              });
              showToast(
                'Prescription registered',
                `${created.id} queued for clinical review.`,
                'info',
              );
            }
          });
      },

      reviewPrescription(
        id: string,
        checks: PrescriptionItem['checks'],
        notes: string,
        outcome: string,
      ) {
        if (!canPerform('prescription')) return;

        // Immediate optimistic UI update
        patchState(store, {
          prescriptions: store.prescriptions().map((p) =>
            p.id === id
              ? {
                  ...p,
                  checks: {...checks},
                  notes: notes || p.notes,
                  status: outcome as PrescriptionItem['status'],
                }
              : p,
          ),
        });

        api
          .reviewPrescription(
            id,
            checks,
            notes,
            outcome,
            store.roleConfig().name,
            store.roleConfig().label,
          )
          .subscribe((updated) => {
            if (updated) {
              patchState(store, {
                prescriptions: store
                  .prescriptions()
                  .map((p) => (p.id === id ? updated : p)),
              });
              api.getAuditLog().subscribe((auditLog) => {
                patchState(store, {auditLog});
              });
              showToast(
                'Review saved',
                `${updated.id} status is now ${updated.status}.`,
                'success',
              );
            }
          });
      },

      dispensePrescription(id: string) {
        if (!canPerform('prescription')) return;

        api
          .dispensePrescription(
            id,
            store.roleConfig().name,
            store.roleConfig().label,
          )
          .subscribe((updated) => {
            if (updated) {
              patchState(store, {
                prescriptions: store
                  .prescriptions()
                  .map((p) => (p.id === id ? updated : p)),
              });
              api.getAuditLog().subscribe((auditLog) => {
                patchState(store, {auditLog});
              });
              showToast(
                'Prescription dispensed',
                `${updated.id} marked dispensed after full verification.`,
                'success',
              );
            } else {
              showToast(
                'Dispensing blocked',
                'Prescription has not satisfied all 4 clinical checks.',
                'error',
              );
            }
          });
      },

      suggestFefoBatchesForPrescription(
        prescriptionOrId: PrescriptionItem | string,
        targetBranch?: string,
      ): PrescriptionFulfillmentPlan | null {
        const rx =
          typeof prescriptionOrId === 'string'
            ? store.prescriptions().find((p) => p.id === prescriptionOrId)
            : prescriptionOrId;
        if (!rx) return null;
        return buildPrescriptionFulfillmentPlan(
          rx,
          store.batches(),
          targetBranch,
        );
      },

      allocatePrescriptionLinesFEFO(
        lines: {medicineName: string; requestedQty: number; sku?: string}[],
        targetBranch?: string,
      ): PrescriptionFulfillmentPlan {
        const dummyRx: PrescriptionItem = {
          id: 'AD-HOC-RX',
          patient: 'Prescription Dispense Request',
          doctor: store.roleConfig().name,
          date: new Date().toISOString().slice(0, 10),
          items: lines.reduce((s, l) => s + l.requestedQty, 0),
          status: 'Reviewed',
          notes: 'Automated FEFO lot allocation suggestion',
          checks: {
            identity: true,
            legibility: true,
            allergy: true,
            appropriateness: true,
          },
          medicines: lines
            .map((l) => `${l.medicineName} (${l.requestedQty}x)`)
            .join('; '),
        };
        const requirements: PrescriptionLineRequirement[] = lines.map((l) => ({
          rawText: `${l.medicineName} (${l.requestedQty}x)`,
          medicineName: l.medicineName,
          requestedQty: Math.max(1, l.requestedQty),
          matchedSku: l.sku,
        }));
        return buildPrescriptionFulfillmentPlan(
          dummyRx,
          store.batches(),
          targetBranch,
          requirements,
        );
      },

      suggestBatchAllocation(
        medicineQuery: string,
        requestedQty: number,
        targetBranch?: string,
      ): PrescriptionLineFulfillment {
        const req: PrescriptionLineRequirement = {
          rawText: `${medicineQuery} (${requestedQty} units)`,
          medicineName: medicineQuery,
          requestedQty: Math.max(1, requestedQty),
        };
        return allocateMedicineLineFEFO(req, store.batches(), targetBranch);
      },

      fulfillPrescriptionWithFefo(id: string, targetBranch?: string): boolean {
        if (!canPerform('prescription')) return false;

        const rx = store.prescriptions().find((p) => p.id === id);
        if (!rx) {
          showToast(
            'Prescription Not Found',
            `Record ${id} does not exist in active database.`,
            'error',
          );
          return false;
        }

        const plan = buildPrescriptionFulfillmentPlan(
          rx,
          store.batches(),
          targetBranch,
        );
        if (plan.lines.length === 0 || plan.totalUnitsAllocated === 0) {
          showToast(
            'FEFO Allocation Blocked',
            'No matching inventory stock available to allocate for this prescription.',
            'error',
          );
          return false;
        }

        // Deduct allocated batch quantities
        const updatedBatches = [...store.batches()];
        const deductions: Record<number, number> = {};

        for (const line of plan.lines) {
          for (const alloc of line.allocatedBatches) {
            deductions[alloc.batchId] =
              (deductions[alloc.batchId] || 0) + alloc.allocatedQty;
          }
        }

        for (let i = 0; i < updatedBatches.length; i++) {
          const b = updatedBatches[i];
          if (deductions[b.id]) {
            const newStock = Math.max(0, b.stock - deductions[b.id]);
            updatedBatches[i] = {...b, stock: newStock};
            api
              .updateBatch(
                b.id,
                {stock: newStock},
                store.roleConfig().name,
                store.roleConfig().label,
              )
              .subscribe();
          }
        }

        const distinctLots = Array.from(
          new Set(
            plan.lines.flatMap((l) =>
              l.allocatedBatches.map((b) => b.batchNumber),
            ),
          ),
        ).join(', ');

        const updatedRx: PrescriptionItem = {
          ...rx,
          status: 'Dispensed',
          checks: {
            identity: true,
            legibility: true,
            allergy: true,
            appropriateness: true,
          },
          notes: rx.notes
            ? `${rx.notes} | FEFO Dispensed: ${plan.totalUnitsAllocated} units allocated from lots: ${distinctLots}`
            : `FEFO Dispensed: ${plan.totalUnitsAllocated} units allocated from lots: ${distinctLots}`,
        };

        patchState(store, {
          batches: updatedBatches,
          prescriptions: store
            .prescriptions()
            .map((p) => (p.id === id ? updatedRx : p)),
        });

        // Ensure review checks are certified before dispensing
        api
          .reviewPrescription(
            id,
            {
              identity: true,
              legibility: true,
              allergy: true,
              appropriateness: true,
            },
            updatedRx.notes,
            'Reviewed',
            store.roleConfig().name,
            store.roleConfig().label,
          )
          .subscribe(() => {
            api
              .dispensePrescription(
                id,
                store.roleConfig().name,
                store.roleConfig().label,
              )
              .subscribe(() => {
                api.getAuditLog().subscribe((auditLog) => {
                  patchState(store, {auditLog});
                });
              });
          });

        showToast(
          'Prescription Fulfilled via FEFO',
          `${id} successfully dispensed: ${plan.totalUnitsAllocated} units automatically allocated from lots (${distinctLots}).`,
          'success',
        );

        return true;
      },


      createPurchaseOrder(po: Partial<PurchaseOrderRecord>) {
        if (!canPerform('reorder') && !canPerform('purchase')) return;

        api
          .createPurchaseOrder(
            po,
            store.roleConfig().name,
            store.roleConfig().label,
          )
          .subscribe((created) => {
            if (created) {
              patchState(store, {
                purchaseOrders: [created, ...store.purchaseOrders()],
              });
              api.getAuditLog().subscribe((auditLog) => {
                patchState(store, {auditLog});
              });
              showToast(
                'Purchase order created',
                `${created.id} staged for ${created.supplier}.`,
                'success',
              );
            }
          });
      },

      receivePurchaseOrder(id: string) {
        if (!canPerform('purchase')) return;

        api
          .receivePurchaseOrder(
            id,
            store.roleConfig().name,
            store.roleConfig().label,
          )
          .subscribe((updated) => {
            if (updated) {
              patchState(store, {
                purchaseOrders: store
                  .purchaseOrders()
                  .map((p) => (p.id === id ? updated : p)),
              });
              api.getAuditLog().subscribe((auditLog) => {
                patchState(store, {auditLog});
              });
              showToast(
                'PO marked received',
                `${updated.id} goods received at destination.`,
                'success',
              );
            }
          });
      },

      createTransfer(transferData: {
        sku: string;
        batch: string;
        from: string;
        to: string;
        qty: number;
        notes?: string;
      }) {
        if (!canPerform('branch')) return;

        api
          .createTransfer(
            transferData,
            store.roleConfig().name,
            store.roleConfig().label,
          )
          .subscribe((created) => {
            if (created) {
              patchState(store, {
                transfers: [created, ...store.transfers()],
              });
              api.getBatches().subscribe((batches) => {
                patchState(store, {batches});
              });
              api.getAuditLog().subscribe((auditLog) => {
                patchState(store, {auditLog});
              });
              showToast(
                'Transfer dispatched',
                `${created.id}: ${created.qty} units reserved from ${created.from}.`,
                'success',
              );
            }
          });
      },

      receiveTransfer(id: string) {
        if (!canPerform('branch')) return;

        api
          .receiveTransfer(
            id,
            store.roleConfig().name,
            store.roleConfig().label,
          )
          .subscribe((updated) => {
            if (updated) {
              patchState(store, {
                transfers: store
                  .transfers()
                  .map((t) => (t.id === id ? updated : t)),
              });
              api.getBatches().subscribe((batches) => {
                patchState(store, {batches});
              });
              api.getAuditLog().subscribe((auditLog) => {
                patchState(store, {auditLog});
              });
              showToast(
                'Transfer received',
                `${updated.id}: stock added to ${updated.to}.`,
                'success',
              );
            }
          });
      },

      createReturn(returnData: Partial<ReturnItemRecord>) {
        if (!canPerform('return')) return;

        api
          .createReturn(
            returnData,
            store.roleConfig().name,
            store.roleConfig().label,
          )
          .subscribe((created) => {
            if (created) {
              patchState(store, {returns: [created, ...store.returns()]});
              api.getAuditLog().subscribe((auditLog) => {
                patchState(store, {auditLog});
              });
              showToast(
                'Return recorded',
                `${created.id} submitted for supervisor review.`,
                'info',
              );
            }
          });
      },

      updateReturnStatus(id: string, status: 'Refunded' | 'Rejected') {
        if (!canPerform('return')) return;

        api
          .updateReturnStatus(
            id,
            status,
            store.roleConfig().name,
            store.roleConfig().label,
          )
          .subscribe((updated) => {
            if (updated) {
              patchState(store, {
                returns: store
                  .returns()
                  .map((r) => (r.id === id ? updated : r)),
              });
              api.getAuditLog().subscribe((auditLog) => {
                patchState(store, {auditLog});
              });
              showToast('Return updated', `${updated.id} set to ${status}.`);
            }
          });
      },

      sendCopilotMessage(prompt: string) {
        const userMsg: CopilotMessage = {
          sender: 'user',
          text: prompt,
          time: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        };

        patchState(store, {
          copilotMessages: [...store.copilotMessages(), userMsg],
        });

        api.queryCopilot(prompt).subscribe((res) => {
          const aiMsg: CopilotMessage = {
            sender: 'assistant',
            text: res.reply,
            source: res.source,
            time: res.timestamp,
          };
          patchState(store, {
            copilotMessages: [...store.copilotMessages(), aiMsg],
          });
        });
      },

      saveSettings(settings: PharmacySettings) {
        if (!canPerform('settings')) return;
        patchState(store, {settings});
        showToast('Settings saved', 'Pharmacy profile updated.');
      },
    };
  }),
);
