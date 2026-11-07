# MediFlow Enterprise — Pharmacy Operations Platform

MediFlow Enterprise is an enterprise pharmacy operations and clinical inventory management platform built with **Angular 21**, **Tailwind CSS**, **NgRx SignalStore**, and an **Express RESTful backend with Google Gemini AI integration**.

---

## 1. Architectural Highlights & SOLID Principles

- **Single Responsibility (SRP)**: Each domain capability is segregated into dedicated, focused feature components (`Dashboard`, `Pos`, `Inventory`, `Prescriptions`, `Purchases`, `Reorder`, `Returns`, `Branches`, `Copilot`, `Audit`, `Access`, `Reports`, `Settings`), supported by a unified API client (`PharmacyApi`) and NgRx reactive store (`PharmacyStore`).
- **Open/Closed (OCP)**: Role configuration and capability matrices (`ROLES_MAP`) and operational API routes are open to extension for new branches or compliance requirements without modifying core checkout mechanisms.
- **Liskov Substitution (LSP)**: State stores and service contracts enforce strict TypeScript interfaces (`BatchItem`, `PrescriptionItem`, `SaleRecord`, `PurchaseOrderRecord`, `StockTransferRecord`).
- **Interface Segregation (ISP)**: Granular interfaces isolate POS cart allocations, clinical safety checks, and audit records.
- **Dependency Inversion (DIP)**: Components inject abstract signals and reactive methods from `PharmacyStore` rather than directly binding to server endpoints.

---

## 2. Key Features

### 1. Smart Point of Sale (POS) & Barcode Scanner
- **Barcode & SKU Scanning**: Press `F2` from anywhere to immediately focus the scanner input. Type or scan codes (e.g. `8901001`, `8901002`) and press `Enter`.
- **Automatic FEFO Allocation**: The system calculates stock availability across lot batches, automatically reserving items from the earliest-expiring batch first.
- **Instant Thermal Receipt**: Generates a receipt with full batch tracking breakdown, printable thermal slip preview, and discount adjustments.

### 2. Batch Inventory Ledger (FEFO)
- Track stock by product, SKU, batch lot, expiration date, branch location, retail price, and acquisition cost.
- Dynamic **FEFO Sort** toggle prioritizes earliest-expiring stock.
- Real-time countdown tags for lots nearing expiry (≤ 180 days).
- Add new batch and edit batch lot modal dialogs.
- One-click CSV export of the full ledger.

### 3. Four-Factor Prescription Safety Review
- Dispensing is safety-gated until a licensed pharmacist performs 4 verification checks:
  1. Patient Identity Confirmed
  2. Prescription Legible & Complete
  3. Allergy / Contraindication Check
  4. Clinical Dosage & Safety Appropriate
- Saves review decisions (`Reviewed`, `On hold`, `Pending review`) and dispenses upon full verification.

### 4. Smart Reordering & Purchasing
- Suggests replenishment quantities based on current stock, reorder thresholds, and safety buffers.
- Groups selected items into draft purchase orders by supplier (`PO-1024`, etc.).
- Mark POs received upon warehouse delivery.

### 5. Supplier Invoice OCR Intake
- Drag & drop supplier delivery slips or invoices (PDF/image).
- Simulates automated OCR field extraction (Supplier, Invoice Number, Date, Receiving Branch, Line Items).
- Directly stages received stock into the warehouse batch ledger upon review.

### 6. AI Pharmacy Copilot (`gemini-3.8-flash`)
- Server-side Gemini 3.8 Flash model integrated via `@google/genai` on Express backend (`/api/copilot/chat`).
- Grounded in real-time operational context: low-stock count, near-expiry lots, pending prescriptions, and daily revenue.
- Resilient local operational fallback if offline.

### 7. Branches & Inter-Branch Transfers
- Monitor stock across branches: **Dhanmondi (Central)**, **Uttara**, and **Mirpur**.
- Stage inter-branch transfers (`TR-0051`) with immediate stock reservation at origin and receiving at destination.

### 8. Returns & Refunds Register
- Register medicine returns against original sales with quarantine notices.
- Supervisor approval and rejection workflows (`Refunded` vs `Rejected`).

### 9. Role-Based Access Control (RBAC)
- Switch roles in the top bar: **Administrator**, **Pharmacist**, **Cashier**, **Inventory Manager**, **Branch Manager**.
- Automatically guards navigation pages and action capabilities based on permissions.

### 10. Reports & Analytics
- Monthly run-rate, gross profit margin (24.8%), and average transaction metrics.
- One-click exports: Sales Summary CSV, Batch Valuation CSV, Expiry Watchlist CSV, and Return Register CSV.

---

## 3. Technology Stack

- **Frontend**: Angular 21 (Zoneless, Standalone Components, Signal-based reactivity, OnPush change detection)
- **State Management**: NgRx SignalStore (`@ngrx/signals`)
- **Styling**: Tailwind CSS 4 with custom medical palette and responsive breakpoints
- **Backend**: Node.js Express 5 with RESTful endpoints (`/api/*`)
- **AI Model**: Google Gemini 3.8 Flash via `@google/genai` TypeScript SDK
- **Testing**: Vitest (`vitest`) unit tests

---

## 4. Running the Application

### Development Server
```bash
npm run dev
```
Binds to `http://0.0.0.0:3000`.

### Production Build & SSR
```bash
npm run build
npm run serve:ssr:app
```

### Running Unit Tests
```bash
npm test
```
