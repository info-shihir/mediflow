# MediFlow Enterprise — Production Pharmacy Operations Platform

A production-grade, enterprise pharmacy operations and clinical inventory management platform built with Angular 21, Tailwind CSS, NgRx SignalStore, and an Express RESTful backend with Google Gemini AI integration.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The architectural directions for state management, backend synchronization, and the AI copilot were confirmed in Phase 1:
>
> - **State Management**: **NgRx SignalStore** (`@ngrx/signals`) for modern, signal-native reactive state with computed properties, granular immutability, and zero boilerplate.
> - **RESTful API Backend**: **Express REST API** integrated directly into `server.ts` with live endpoints (`/api/batches`, `/api/sales`, `/api/prescriptions`, `/api/purchases`, `/api/transfers`, `/api/returns`, `/api/audit`, `/api/copilot`) and client HTTP synchronization.
> - **AI Pharmacy Copilot**: **Server-side Gemini AI (`gemini-3.8-flash`)** via `@google/genai` providing clinical drug checks, inventory forecasting, batch expiry analysis, and grounded operational queries.
> - **Architecture & Testing**: SOLID principles, lazy-loaded feature modules, modular standalone components, strict TypeScript models, and comprehensive Vitest unit tests.

---

## 1. Overview & Core Concept

### What It Does
MediFlow Enterprise is an end-to-end pharmacy operations platform designed for retail, hospital, and multi-branch pharmacies. It unifies:
1. **Batch & Expiry Management**: FEFO (First Expiry, First Out) batch tracking across multiple branches with automated stock decrementing and near-expiry watchlist.
2. **High-Speed Point of Sale (POS)**: Barcode/SKU scanning (keyboard F2 shortcut), multi-batch split allocation, instant receipt preview/print, and cart discounts.
3. **Prescription Safety Review**: Multi-factor clinical verification (identity, legibility, allergy, dosage appropriateness) with safety gating prior to dispensing.
4. **Smart Reordering & Purchasing**: Automated lead-time and reorder-point calculations, draft PO generation, and invoice OCR intake staging.
5. **Multi-Branch Transfers & Returns**: Inter-branch stock reservations and receipts, plus returns registration with approval workflows.
6. **AI Pharmacy Copilot**: Real-time Gemini 3.8 Flash operational assistant grounded in current inventory, prescription queues, and financial metrics.
7. **Role-Based Access Control (RBAC)**: Role switching (Admin, Pharmacist, Cashier, Inventory Manager, Branch Manager) with UI route guards and action authorization.

### Target Audience & Personas
- **Pharmacists**: Verify prescriptions, review safety warnings, inspect batch expirations, and dispense verified orders.
- **Cashiers & POS Operators**: Rapid checkout, barcode lookup, receipt generation, and customer payment reconciliation.
- **Inventory & Branch Managers**: Multi-branch stock allocation, batch intake via supplier invoices, and transfer management.
- **Pharmacy Administrators**: Full visibility into revenue, compliance audit logs, and global operational settings.

### Key Value
Eliminates dispensing errors through strict FEFO allocation and safety gating, reduces stock obsolescence through proactive expiry alerting, and accelerates everyday pharmacy workflows with high-density enterprise UX.

---

## 2. User Experience & Visual Design

Following the **Universal Frontend Design Constitution** and **SaaS & Dashboard Guidelines (`3_saas_dashboard.md`)**:

### Visual Identity & Palette
- **Canvas & Surface Palette (60-30-10 Rule)**:
  - Canvas (60%): Clean clinic neutral background (`#F4F7FB` / dark slate `#0F172A`).
  - Structural Panels (30%): Pure white (`#FFFFFF`) with 1px crisp borders (`#E2E8F0`), flat elevation, and hairline dividers.
  - Accent Budget (10%): Deep Medical Teal (`#127461`) and vibrant mint highlight (`#1EB594`) for primary actions, focus rings, and active routes.
  - Semantic Status (Strictly unboxed text + dot, no pill cliches):
    - Normal / In Stock: `#16A34A` (Emerald)
    - Low Stock / Nearing Expiry: `#D97706` (Amber)
    - Out of Stock / Rejected / Alert: `#DC2626` (Crimson)
    - In Review / Staged: `#2563EB` (Royal Blue)

### Typography & Tabular Discipline
- **Display & Section Headers**: `Plus Jakarta Sans` / `Outfit` (clean geometric clarity, balanced measure).
- **Body & Prose**: `Plus Jakarta Sans` / `DM Sans` (13px–14px, optimized for enterprise density).
- **Numerical & Financial Data**: Monospace tabular numerals (`font-mono tabular-nums`, `JetBrains Mono`) for all SKU codes, batch numbers, stock units, prices (BDT ৳), and timestamps to prevent layout shifting.
- **Zero-Pill Restraint**: Metadata rendered as clean inline text with subtle dot separators (`MED-001 · Batch NP2608 · Expires 30 Aug 2027`).

### Key User Flows
1. **POS Fast Checkout**: Cashier presses `F2` -> Focus lands in barcode scanner -> Types `8901001` or scans -> System automatically binds the earliest-expiring batch via FEFO -> Adjusts quantity -> Completes sale with simulated modal receipt.
2. **Prescription Verification**: Pharmacist reviews pending RX -> Inspects drug items -> Executes 4 mandatory verification checkpoints -> Outcome unlocks the "Dispense" button -> State syncs to server.
3. **Smart Reorder to PO**: System highlights batches where stock ≤ reorder level -> User adjusts suggested quantities -> Clicks "Create Selected PO" -> Server generates PO records by supplier.
4. **AI Copilot Consultation**: Pharmacist or manager asks natural language questions -> Copilot combines current inventory context with Gemini 3.8 Flash to provide structured operational recommendations.

---

## 3. Key Product Decisions & Trade-Offs

| Decision | Chosen Approach | Rationale | Alternatives Considered |
| :--- | :--- | :--- | :--- |
| **State Management** | **NgRx SignalStore** (`@ngrx/signals`) | Native Angular 21 Signals compatibility, minimal boilerplate, fine-grained reactivity, and easy method/computed extension. | NgRx Store (too verbose with actions/reducers for dashboard); BehaviorSubject services (lacks structured dev conventions). |
| **Backend Integration** | **Express REST API in `server.ts`** | Angular 21 SSR already uses `src/server.ts`. Hosting REST endpoints directly in Express provides real server-side CRUD and SSR compatibility without extra microservices. | Pure client-side mock (fails RESTful backend requirement); External DB (requires external cloud provisioning). |
| **AI Copilot** | **Server-side `@google/genai` (Gemini 3.8 Flash)** | Fast latency, high clinical and analytical reasoning, secure API key handling on Express backend, and context grounding from server state. | Client-side SDK (insecure API key exposure prohibited); Static regex rules (lacks semantic intelligence). |
| **FEFO Allocation** | **Deterministic Server & Client Algorithm** | Automatically picks batches with the earliest expiry date first, gracefully splitting lines if one batch has insufficient stock. | Manual batch selection (high operator error rate in high-volume retail). |
| **Code Structure** | **SOLID & Modular Feature Architecture** | Single-responsibility services (`InventoryService`, `PosService`, `PrescriptionService`, `CopilotService`), explicit interfaces, and isolated standalone components. | Monolithic component (unmaintainable). |

---

## 4. Technical Architecture & Data Strategy

### System & Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       MediFlow Angular 21 Application                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐   ┌────────────────────────────────────────────────────┐  │
│  │   Sidebar    │   │                  Top Navigation                    │  │
│  │  Navigation  │   │  [Wordmark] ── [Global Search] ── [Role/User Menu] │  │
│  └──────┬───────┘   └─────────────────────────┬──────────────────────────┘  │
│         │                                     │                             │
│         ▼                                     ▼                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                          Router Outlet                                │  │
│  │  ┌──────────────┬──────────────┬──────────────┬────────────────────┐  │  │
│  │  │  Dashboard   │  Smart POS   │  Inventory   │   Prescriptions    │  │  │
│  │  ├──────────────┼──────────────┼──────────────┼────────────────────┤  │  │
│  │  │  Purchases   │  Reordering  │  Transfers   │    AI Copilot      │  │  │
│  │  └──────────────┴──────────────┴──────────────┴────────────────────┘  │  │
│  └──────────────────────────────────┬────────────────────────────────────┘  │
│                                     │                                       │
│                                     ▼                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      NgRx SignalStore Layer                           │  │
│  │    • InventoryStore  • PosStore  • RxStore  • AppRoleStore  • POStore │  │
│  └──────────────────────────────────┬────────────────────────────────────┘  │
│                                     │                                       │
│                                     ▼                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      Angular HTTP Client Services                     │  │
│  │      (InventoryService, PosService, RxService, CopilotService)        │  │
│  └──────────────────────────────────┬────────────────────────────────────┘  │
└─────────────────────────────────────┼───────────────────────────────────────┘
                                      │ HTTP REST API
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Express Server Backend (`server.ts`)                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────┬───────────────────┬───────────────────────────────┐  │
│  │  /api/batches     │  /api/sales       │  /api/prescriptions           │  │
│  ├───────────────────┼───────────────────┼───────────────────────────────┤  │
│  │  /api/purchases   │  /api/transfers   │  /api/returns & audit         │  │
│  └───────────────────┴───────────────────┴───────────────────────────────┘  │
│                                     │                                       │
│                                     ▼                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │          Gemini 3.8 Flash AI Integration (`@google/genai`)             │  │
│  │                   Endpoint: `POST /api/copilot/chat`                  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Core Entities & Data Models
- **Batch**: `id`, `medicine`, `generic`, `sku`, `barcode`, `batch`, `branch`, `expiry`, `stock`, `reorder`, `price`, `cost`, `category`, `supplier`, `emoji`
- **Sale & Line Item**: `id`, `date`, `customer`, `payment`, `items` (with FEFO batch allocation references), `subtotal`, `discount`, `total`
- **Prescription**: `id`, `patient`, `doctor`, `date`, `items`, `status` (`'Pending review'` | `'Reviewed'` | `'Dispensed'` | `'On hold'`), `checks` (identity, legibility, allergy, appropriateness), `notes`, `medicines`
- **Purchase Order**: `id`, `supplier`, `branch`, `items`, `lines`, `total`, `status` (`'Draft'` | `'Submitted'` | `'Received'`)
- **Stock Transfer**: `id`, `medicine`, `from`, `to`, `qty`, `batchId`, `status` (`'In transit'` | `'Received'`)
- **Return Record**: `id`, `sale`, `customer`, `item`, `amount`, `reason`, `status` (`'Pending approval'` | `'Refunded'` | `'Rejected'`)
- **Audit Event**: `time`, `user`, `role`, `event`, `entity`, `details`

### State Transitions & Working Handlers
- **FEFO Allocation**: When adding items to cart or checkout, dynamically query batch records matching SKU sorted by `expiry ASC`, reserving quantities across multiple batches if necessary.
- **Prescription Safety Verification**: Checkbox toggles mutate review state; only when all 4 checks pass and status is "Reviewed" does the "Dispense" action enable.
- **Stock Depletion & Receipt**: Checkout decrements batch quantities; receiving POs or OCR receipts increments/creates batch records and triggers audit logging.
- **Real-Time AI Grounding**: `POST /api/copilot/chat` supplies a compact JSON digest of current inventory, low-stock items, and pending RXs into Gemini 3.8 Flash's system prompt, producing clinical and operational guidance.

---

## 5. Verification & Testing Strategy

1. **Unit Testing (`vitest`)**:
   - `inventory-store.spec.ts`: Test FEFO sorting, low-stock identification, and quantity decrements.
   - `pos-store.spec.ts`: Test multi-batch allocation, cart calculation, and discount bounds.
   - `rx-safety.spec.ts`: Test safety checklist gating for dispensing approval.
2. **Compilation & Linting**:
   - Run `compile_applet` to verify TypeScript compilation and Angular AOT build.
   - Run `lint_applet` to ensure zero syntax or lint violations.
3. **Visual & Responsive Verification**:
   - Verify layout on 1440px desktop baseline, tablet (1024px), and mobile (375px).
   - Test keyboard navigation (`F2` POS hotkey, modal escape, Enter to scan).
