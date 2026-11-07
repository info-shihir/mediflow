import {Router, Request, Response} from 'express';
import {GoogleGenAI} from '@google/genai';
import {
  INITIAL_BATCHES,
  INITIAL_PRESCRIPTIONS,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_TRANSFERS,
  INITIAL_RETURNS,
  INITIAL_AUDIT,
  Batch,
  Prescription,
  SaleRecord,
  PurchaseOrder,
  StockTransfer,
  ReturnRecord,
  AuditRecord,
} from './pharmacy-data';

export const apiRouter = Router();

// In-memory state store
const batches: Batch[] = JSON.parse(JSON.stringify(INITIAL_BATCHES));
const prescriptions: Prescription[] = JSON.parse(
  JSON.stringify(INITIAL_PRESCRIPTIONS),
);
const sales: SaleRecord[] = [];
const purchaseOrders: PurchaseOrder[] = JSON.parse(
  JSON.stringify(INITIAL_PURCHASE_ORDERS),
);
const transfers: StockTransfer[] = JSON.parse(
  JSON.stringify(INITIAL_TRANSFERS),
);
const returns: ReturnRecord[] = JSON.parse(JSON.stringify(INITIAL_RETURNS));
const auditLog: AuditRecord[] = JSON.parse(JSON.stringify(INITIAL_AUDIT));

let nextBatchId = 11;
let nextSaleSeq = 1087;
let nextRxId = 2049;
let nextPOId = 1025;
let nextTransferId = 52;
let nextReturnId = 102;

function logAudit(
  user: string,
  role: string,
  event: string,
  entity: string,
  details: string,
) {
  auditLog.unshift({
    time: new Date().toLocaleString(),
    user: user || 'Alex Smith',
    role: role || 'Administrator',
    event,
    entity,
    details,
  });
}

// ----------------------------------------------------
// BATCHES ENDPOINTS
// ----------------------------------------------------
apiRouter.get('/batches', (_req: Request, res: Response) => {
  res.json({success: true, data: batches});
});

apiRouter.post('/batches', (req: Request, res: Response) => {
  const body = req.body;
  if (!body.medicine || !body.sku || !body.batch) {
    res.status(400).json({
      success: false,
      message: 'Medicine name, SKU, and batch number are required',
    });
    return;
  }

  const newBatch: Batch = {
    id: nextBatchId++,
    medicine: String(body.medicine).trim(),
    generic: String(body.generic || '').trim(),
    sku: String(body.sku).trim(),
    barcode: String(body.barcode || '').trim(),
    batch: String(body.batch).trim(),
    branch: String(body.branch || 'Dhanmondi'),
    expiry: String(body.expiry || '2028-01-01'),
    stock: Math.max(0, Number(body.stock) || 0),
    reorder: Math.max(0, Number(body.reorder) || 20),
    price: Math.max(0, Number(body.price) || 0),
    cost: Math.max(0, Number(body.cost) || 0),
    category: String(body.category || 'General'),
    supplier: String(body.supplier || 'MedSupply Ltd.'),
    emoji: body.emoji || '💊',
  };

  batches.push(newBatch);
  logAudit(
    req.body.user,
    req.body.role,
    'Inventory',
    `Batch ${newBatch.batch}`,
    `Added ${newBatch.medicine} (${newBatch.stock} units at ${newBatch.branch})`,
  );

  res.status(201).json({success: true, data: newBatch});
});

apiRouter.put('/batches/:id', (req: Request, res: Response) => {
  const id = Number(req.params['id']);
  const batch = batches.find((b) => b.id === id);
  if (!batch) {
    res.status(404).json({success: false, message: 'Batch not found'});
    return;
  }

  const {branch, stock, reorder, price, cost, expiry} = req.body;
  if (branch !== undefined) batch.branch = branch;
  if (stock !== undefined) batch.stock = Math.max(0, Number(stock));
  if (reorder !== undefined) batch.reorder = Math.max(0, Number(reorder));
  if (price !== undefined) batch.price = Math.max(0, Number(price));
  if (cost !== undefined) batch.cost = Math.max(0, Number(cost));
  if (expiry !== undefined) batch.expiry = expiry;

  logAudit(
    req.body.user,
    req.body.role,
    'Inventory',
    `Batch ${batch.batch}`,
    `Updated inventory parameters (Stock: ${batch.stock}, Price: ৳${batch.price})`,
  );

  res.json({success: true, data: batch});
});

// ----------------------------------------------------
// POS / SALES ENDPOINTS
// ----------------------------------------------------
apiRouter.get('/sales', (_req: Request, res: Response) => {
  res.json({success: true, data: sales});
});

apiRouter.post('/sales', (req: Request, res: Response) => {
  const {customer, payment, items, discount = 0, user, role} = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    res
      .status(400)
      .json({success: false, message: 'Cart items cannot be empty'});
    return;
  }

  // Verify stock and allocate via FEFO
  const allocatedItems = [];
  for (const item of items) {
    let requiredQty = Number(item.qty) || 1;
    // Find batches for this SKU sorted by earliest expiry
    const matchingBatches = batches
      .filter((b) => b.sku === item.sku && b.stock > 0)
      .sort((a, b) => a.expiry.localeCompare(b.expiry));

    const totalAvailable = matchingBatches.reduce((s, b) => s + b.stock, 0);
    if (totalAvailable < requiredQty) {
      res.status(400).json({
        success: false,
        message: `Insufficient stock for ${item.name || item.sku}. Available: ${totalAvailable}, Requested: ${requiredQty}`,
      });
      return;
    }

    const allocList = [];
    for (const b of matchingBatches) {
      if (requiredQty <= 0) break;
      const take = Math.min(b.stock, requiredQty);
      b.stock -= take;
      allocList.push({
        batchId: b.id,
        batch: b.batch,
        qty: take,
        expiry: b.expiry,
        branch: b.branch,
      });
      requiredQty -= take;
    }

    allocatedItems.push({
      name: item.name,
      sku: item.sku,
      qty: item.qty,
      price: item.price,
      alloc: allocList,
    });
  }

  const subtotal = allocatedItems.reduce((s, i) => s + i.qty * i.price, 0);
  const discountNum = Math.max(0, Number(discount) || 0);
  const total = Math.max(0, subtotal - discountNum);

  const saleRecord: SaleRecord = {
    id: `SL-${nextSaleSeq++}`,
    date: new Date().toLocaleString(),
    customer: customer || 'Walk-in customer',
    payment: payment || 'Cash',
    items: allocatedItems,
    subtotal,
    discount: discountNum,
    total,
  };

  sales.unshift(saleRecord);
  logAudit(
    user,
    role,
    'Sale',
    saleRecord.id,
    `${allocatedItems.length} items total ৳ ${total.toFixed(2)} (${saleRecord.payment})`,
  );

  res.status(201).json({success: true, data: saleRecord});
});

// ----------------------------------------------------
// PRESCRIPTIONS ENDPOINTS
// ----------------------------------------------------
apiRouter.get('/prescriptions', (_req: Request, res: Response) => {
  res.json({success: true, data: prescriptions});
});

apiRouter.post('/prescriptions', (req: Request, res: Response) => {
  const {patient, doctor, date, items, medicines, user, role} = req.body;
  if (!patient || !doctor) {
    res.status(400).json({
      success: false,
      message: 'Patient and doctor names are required',
    });
    return;
  }

  const newRx: Prescription = {
    id: `RX-${nextRxId++}`,
    patient: String(patient).trim(),
    doctor: String(doctor).trim(),
    date: date || new Date().toISOString().slice(0, 10),
    items: Math.max(1, Number(items) || 1),
    status: 'Pending review',
    notes: req.body.notes || 'Awaiting initial pharmacist verification',
    checks: {
      identity: false,
      legibility: false,
      allergy: false,
      appropriateness: false,
    },
    medicines: medicines || '',
  };

  prescriptions.unshift(newRx);
  logAudit(
    user,
    role,
    'Prescription',
    newRx.id,
    `Registered prescription for ${newRx.patient}`,
  );

  res.status(201).json({success: true, data: newRx});
});

apiRouter.put('/prescriptions/:id/review', (req: Request, res: Response) => {
  const rx = prescriptions.find((p) => p.id === req.params['id']);
  if (!rx) {
    res.status(404).json({success: false, message: 'Prescription not found'});
    return;
  }

  const {checks, notes, outcome, user, role} = req.body;
  if (checks) {
    rx.checks = {
      identity: Boolean(checks.identity),
      legibility: Boolean(checks.legibility),
      allergy: Boolean(checks.allergy),
      appropriateness: Boolean(checks.appropriateness),
    };
  }
  if (notes !== undefined) rx.notes = notes;

  const allPassed = Object.values(rx.checks).every(Boolean);
  if (outcome === 'Reviewed') {
    if (!allPassed) {
      res.status(400).json({
        success: false,
        message: 'All 4 verification checks must pass before marking Reviewed',
      });
      return;
    }
    rx.status = 'Reviewed';
  } else if (outcome === 'On hold') {
    rx.status = 'On hold';
  } else if (outcome === 'Pending review') {
    rx.status = 'Pending review';
  }

  logAudit(
    user,
    role,
    'Prescription',
    rx.id,
    `Review updated: status set to ${rx.status}`,
  );

  res.json({success: true, data: rx});
});

apiRouter.put('/prescriptions/:id/dispense', (req: Request, res: Response) => {
  const rx = prescriptions.find((p) => p.id === req.params['id']);
  if (!rx) {
    res.status(404).json({success: false, message: 'Prescription not found'});
    return;
  }

  if (
    rx.status !== 'Reviewed' ||
    !Object.values(rx.checks).every(Boolean)
  ) {
    res.status(400).json({
      success: false,
      message:
        'Cannot dispense: prescription has not completed all clinical checks',
    });
    return;
  }

  rx.status = 'Dispensed';
  logAudit(
    req.body.user,
    req.body.role,
    'Prescription',
    rx.id,
    `Dispensed to patient ${rx.patient}`,
  );

  res.json({success: true, data: rx});
});

// ----------------------------------------------------
// PURCHASING & REORDERING ENDPOINTS
// ----------------------------------------------------
apiRouter.get('/purchase-orders', (_req: Request, res: Response) => {
  res.json({success: true, data: purchaseOrders});
});

apiRouter.post('/purchase-orders', (req: Request, res: Response) => {
  const {supplier, branch, items, lines, total, user, role} = req.body;
  if (!supplier) {
    res.status(400).json({success: false, message: 'Supplier is required'});
    return;
  }

  const newPO: PurchaseOrder = {
    id: `PO-${nextPOId++}`,
    supplier,
    branch: branch || 'Dhanmondi',
    items: Math.max(1, Number(items) || 1),
    lines: lines || [],
    total: Math.max(0, Number(total) || 0),
    status: 'Draft',
  };

  purchaseOrders.unshift(newPO);
  logAudit(
    user,
    role,
    'Purchasing',
    newPO.id,
    `Created draft PO for ${newPO.supplier} (৳ ${newPO.total.toFixed(2)})`,
  );

  res.status(201).json({success: true, data: newPO});
});

apiRouter.put('/purchase-orders/:id/receive', (req: Request, res: Response) => {
  const po = purchaseOrders.find((p) => p.id === req.params['id']);
  if (!po) {
    res.status(404).json({success: false, message: 'Purchase order not found'});
    return;
  }

  po.status = 'Received';
  logAudit(
    req.body.user,
    req.body.role,
    'Purchasing',
    po.id,
    `Marked received from ${po.supplier}`,
  );

  res.json({success: true, data: po});
});

// ----------------------------------------------------
// TRANSFERS & RETURNS ENDPOINTS
// ----------------------------------------------------
apiRouter.get('/transfers', (_req: Request, res: Response) => {
  res.json({success: true, data: transfers});
});

apiRouter.post('/transfers', (req: Request, res: Response) => {
  const {sku, batch: batchNum, from, to, qty, notes, user, role} = req.body;
  if (from === to) {
    res.status(400).json({
      success: false,
      message: 'Source and destination branches must differ',
    });
    return;
  }

  const sourceBatch = batches.find(
    (b) => b.sku === sku && b.batch === batchNum && b.branch === from,
  );
  if (!sourceBatch) {
    res.status(404).json({
      success: false,
      message: `Batch ${batchNum} not found at source branch ${from}`,
    });
    return;
  }

  const transferQty = Math.max(1, Number(qty) || 1);
  if (sourceBatch.stock < transferQty) {
    res.status(400).json({
      success: false,
      message: `Insufficient stock at source branch. Available: ${sourceBatch.stock}`,
    });
    return;
  }

  sourceBatch.stock -= transferQty;

  const newTransfer: StockTransfer = {
    id: `TR-${String(nextTransferId++).padStart(4, '0')}`,
    medicine: `${sourceBatch.medicine} · ${sourceBatch.batch}`,
    from,
    to,
    qty: transferQty,
    status: 'In transit',
    batchId: sourceBatch.id,
    notes,
  };

  transfers.unshift(newTransfer);
  logAudit(
    user,
    role,
    'Branch',
    newTransfer.id,
    `Staged transfer: ${transferQty} units of ${newTransfer.medicine} (${from} → ${to})`,
  );

  res.status(201).json({success: true, data: newTransfer});
});

apiRouter.put('/transfers/:id/receive', (req: Request, res: Response) => {
  const tr = transfers.find((t) => t.id === req.params['id']);
  if (!tr) {
    res.status(404).json({success: false, message: 'Transfer not found'});
    return;
  }

  if (tr.status === 'Received') {
    res.status(400).json({success: false, message: 'Already marked received'});
    return;
  }

  const sourceBatch = batches.find((b) => b.id === tr.batchId);
  if (sourceBatch) {
    const destBatch = batches.find(
      (b) =>
        b.sku === sourceBatch.sku &&
        b.batch === sourceBatch.batch &&
        b.branch === tr.to,
    );
    if (destBatch) {
      destBatch.stock += tr.qty;
    } else {
      batches.push({
        ...sourceBatch,
        id: nextBatchId++,
        branch: tr.to,
        stock: tr.qty,
      });
    }
  }

  tr.status = 'Received';
  logAudit(
    req.body.user,
    req.body.role,
    'Branch',
    tr.id,
    `Received transfer ${tr.qty} units at ${tr.to}`,
  );

  res.json({success: true, data: tr});
});

apiRouter.get('/returns', (_req: Request, res: Response) => {
  res.json({success: true, data: returns});
});

apiRouter.post('/returns', (req: Request, res: Response) => {
  const {sale, customer, item, amount, reason, notes, user, role} = req.body;
  const newReturn: ReturnRecord = {
    id: `RT-${String(nextReturnId++).padStart(4, '0')}`,
    sale: sale || 'Direct',
    customer: customer || 'Walk-in customer',
    item: item || 'Medicine item',
    amount: Math.max(0, Number(amount) || 0),
    reason: reason || 'Defective packaging',
    status: 'Pending approval',
    notes,
  };

  returns.unshift(newReturn);
  logAudit(
    user,
    role,
    'Returns',
    newReturn.id,
    `Submitted return request for ৳ ${newReturn.amount.toFixed(2)} (${newReturn.reason})`,
  );

  res.status(201).json({success: true, data: newReturn});
});

apiRouter.put('/returns/:id/status', (req: Request, res: Response) => {
  const ret = returns.find((r) => r.id === req.params['id']);
  if (!ret) {
    res.status(404).json({success: false, message: 'Return record not found'});
    return;
  }

  const {status, user, role} = req.body;
  if (status !== 'Refunded' && status !== 'Rejected') {
    res.status(400).json({
      success: false,
      message: 'Status must be Refunded or Rejected',
    });
    return;
  }

  ret.status = status;
  logAudit(
    user,
    role,
    'Returns',
    ret.id,
    `Return record set to ${status} for ${ret.item}`,
  );

  res.json({success: true, data: ret});
});

// ----------------------------------------------------
// AUDIT & LOGGING ENDPOINTS
// ----------------------------------------------------
apiRouter.get('/audit', (_req: Request, res: Response) => {
  res.json({success: true, data: auditLog});
});

apiRouter.post('/audit', (req: Request, res: Response) => {
  const {user, role, event, entity, details} = req.body;
  logAudit(user, role, event, entity, details);
  res.json({success: true, data: auditLog[0]});
});

// ----------------------------------------------------
// GEMINI AI PHARMACY COPILOT ENDPOINT
// ----------------------------------------------------
apiRouter.post('/copilot/chat', async (req: Request, res: Response) => {
  const {message} = req.body;
  if (!message || typeof message !== 'string') {
    res
      .status(400)
      .json({success: false, message: 'Message prompt is required'});
    return;
  }

  // Build live operational context digest
  const lowStock = batches.filter((b) => b.stock <= b.reorder);
  const nearExpiry = batches.filter((b) => {
    const diffDays = Math.ceil(
      (new Date(b.expiry).getTime() - new Date('2026-10-13').getTime()) /
        (1000 * 60 * 60 * 24),
    );
    return diffDays <= 180;
  });
  const pendingRx = prescriptions.filter(
    (p) => p.status === 'Pending review' || p.status === 'On hold',
  );
  const totalRevenue = sales.reduce((s, x) => s + x.total, 24580);
  const totalSales = sales.length + 86;

  const operationalContext = {
    totalRevenueBDT: totalRevenue,
    completedSalesCount: totalSales,
    totalBatchesTracked: batches.length,
    lowStockBatches: lowStock.map((b) => ({
      medicine: b.medicine,
      sku: b.sku,
      batch: b.batch,
      branch: b.branch,
      stock: b.stock,
      reorderLevel: b.reorder,
      supplier: b.supplier,
    })),
    nearExpiryBatches: nearExpiry.map((b) => ({
      medicine: b.medicine,
      batch: b.batch,
      branch: b.branch,
      expiryDate: b.expiry,
      stock: b.stock,
    })),
    pendingPrescriptions: pendingRx.map((p) => ({
      id: p.id,
      patient: p.patient,
      doctor: p.doctor,
      status: p.status,
      medicines: p.medicines,
    })),
    branches: ['Dhanmondi', 'Uttara', 'Mirpur'],
  };

  const apiKey = process.env['GEMINI_API_KEY'];

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const systemPrompt = `You are the AI Pharmacy Copilot for MediFlow Enterprise Pharmacy.
You provide clinical safety suggestions, batch inventory analysis, FEFO optimization advice, and smart reordering insights.
Always ground your answers in the provided live pharmacy context:
${JSON.stringify(operationalContext, null, 2)}

Guidelines:
1. Be concise, clinical, accurate, and professional.
2. If discussing drugs, specify standard precautions and remind that clinical dispensing requires licensed pharmacist verification.
3. For reorder or inventory questions, reference specific batches, branches, and quantities.
4. Keep answers readable with structured bullet points or short paragraphs.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: message,
        config: {
          systemInstruction: systemPrompt,
        },
      });

      const reply = response.text || 'No response generated.';
      res.json({
        success: true,
        data: {
          reply,
          source: 'gemini-3.8-flash',
          timestamp: new Date().toLocaleTimeString(),
        },
      });
      return;
    } catch (err: unknown) {
      console.warn('Gemini API call failed, falling back to local reasoning:', err);
    }
  }

  // Resilient fallback rule-based analyzer if API key is not present or failed
  const q = message.toLowerCase();
  let fallbackReply = '';

  if (q.includes('reorder') || q.includes('low stock') || q.includes('restock')) {
    fallbackReply =
      `Based on current inventory, ${lowStock.length} batch(es) require reordering: ` +
      lowStock
        .map(
          (b) =>
            `• ${b.medicine} (${b.batch}) at ${b.branch}: on-hand ${b.stock} units vs reorder point ${b.reorder}. Supplier: ${b.supplier}`,
        )
        .join('\n') +
      `\n\nRecommended Action: Navigate to Smart Reordering to generate purchase orders.`;
  } else if (
    q.includes('expir') ||
    q.includes('fefo') ||
    q.includes('watch')
  ) {
    fallbackReply =
      `Expiry Watch Alert: ${nearExpiry.length} batch(es) expire within 180 days: ` +
      nearExpiry
        .map(
          (b) =>
            `• ${b.medicine} [Batch ${b.batch}] at ${b.branch} — Expiry: ${b.expiry} (${b.stock} units remaining)`,
        )
        .join('\n') +
      `\n\nFEFO Protocol: Ensure POS prioritizes dispensing these earliest batches first.`;
  } else if (
    q.includes('prescription') ||
    q.includes('safety') ||
    q.includes('rx')
  ) {
    fallbackReply =
      `Prescription Safety Review Queue:\n` +
      pendingRx
        .map(
          (p) =>
            `• ${p.id} (${p.patient} prescribed by ${p.doctor}): Status '${p.status}'. Items: ${p.medicines}`,
        )
        .join('\n') +
      `\n\nClinical Rule: All 4 verification checks (Identity, Legibility, Allergy, Appropriateness) must be confirmed by a licensed pharmacist before dispensing is unlocked.`;
  } else if (q.includes('revenue') || q.includes('sale')) {
    fallbackReply = `Operations Snapshot: Today's tracked revenue is ৳ ${totalRevenue.toLocaleString()} across ${totalSales} sales. Gross margin estimates remain steady at 24.8%.`;
  } else {
    fallbackReply = `MediFlow Copilot Summary:
• Tracked Batches: ${batches.length} across 3 branches (Dhanmondi, Uttara, Mirpur)
• Low-Stock Batches: ${lowStock.length}
• Near-Expiry Batches: ${nearExpiry.length}
• Prescriptions Needing Review: ${pendingRx.length}
• Today's Revenue: ৳ ${totalRevenue.toLocaleString()}

How else can I assist with clinical inventory verification or branch allocations?`;
  }

  res.json({
    success: true,
    data: {
      reply: fallbackReply,
      source: 'local-operational-grounding',
      timestamp: new Date().toLocaleTimeString(),
    },
  });
});
