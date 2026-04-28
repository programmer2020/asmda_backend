import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import jwt from 'jsonwebtoken';
import swaggerUi from 'swagger-ui-express';
import {
  createCreditSalesRecord,
  createSalesRecord,
  deleteCreditSalesRecord,
  deleteSalesRecord,
  getReturnsData,
  createReturnRecord,
  updateReturnRecord,
  deleteReturnRecord,
  getCreditSalesData,
  getDashboardData,
  getSalesData,
  updateCreditSalesRecord,
  updateSalesRecord,
  getPriceListData,
  createPriceListRecord,
  updatePriceListRecord,
  deletePriceListRecord,
  getCustodiesData,
  createCustodyRecord,
  updateCustodyRecord,
  deleteCustodyRecord,
  getCustodyTransactions,
  createCustodyTransaction,
  deleteCustodyTransaction,
  getChecksData,
  createCheckRecord,
  updateCheckRecord,
  deleteCheckRecord,
  getFinalProductStoreData,
  createFinalProductRecord,
  updateFinalProductRecord,
  deleteFinalProductRecord,
  getRawMaterialsStoreData,
  createRawMaterialRecord,
  updateRawMaterialRecord,
  deleteRawMaterialRecord,
  getRepSubStoresData,
  createRepSubStoreRecord,
  updateRepSubStoreRecord,
  deleteRepSubStoreRecord,
  getFinancialManagerCustodyData,
  createFinManagerCustodyRecord,
  getFinManagerCustodyRecord,
  updateFinManagerCustodyRecord,
  deleteFinManagerCustodyRecord,
  getManagerBudget,
  setManagerBudget,
  getRawMaterialsPurchasesData,
  createRawPurchaseRecord,
  updateRawPurchaseRecord,
  deleteRawPurchaseRecord,
  getRawMaterialsCatalogData,
  createRawMaterialsCatalogRecord,
  updateRawMaterialsCatalogRecord,
  deleteRawMaterialsCatalogRecord,
  getSuppliersData,
  createSupplierRecord,
  updateSupplierRecord,
  deleteSupplierRecord,
  getMachineMaintenancePurchasesData,
  createMachinePurchaseRecord,
  updateMachinePurchaseRecord,
  deleteMachinePurchaseRecord,
  getMiscPurchasesData,
  createMiscPurchaseRecord,
  updateMiscPurchaseRecord,
  deleteMiscPurchaseRecord,
  getPayrollAdvancesData,
  createPayrollAdvanceRecord,
  updatePayrollAdvanceRecord,
  deletePayrollAdvanceRecord,
  getCustomerPaymentAlertsData,
  createPaymentAlertRecord,
  updatePaymentAlertRecord,
  deletePaymentAlertRecord,
  getFreeSamplesData,
  createFreeSampleRecord,
  updateFreeSampleRecord,
  deleteFreeSampleRecord,
  getProductCardsData,
  createProductCardRecord,
  importProductCardsFromNames,
  updateProductCardRecord,
  deleteProductCardRecord,
  transferToRep,
  repSaleDeduct,
  getCashReceiptsData,
  createCashReceiptRecord,
  updateCashReceiptRecord,
  deleteCashReceiptRecord
} from './data/erbStore.js';
import { getDatabaseStatus, safeQuery, getCurrentMode, switchMode } from './db.js';
import { createSwaggerSpec } from './swagger.js';
import bcrypt from 'bcryptjs';
import { getAllUsers, getUserByUsername, getUserById, createUser, updateUser, deleteUser, ROLES, ROLE_LABELS, ROLE_PAGES, getAllRoles, createRole, updateRole, deleteRole, ALL_PAGES, getRolePagesById } from './data/users.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET ?? 'asmda-secret-dev-key-change-in-prod';

function authMiddleware(req, res, next) {
  const auth = req.headers['authorization'] ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) { res.status(401).json({ message: 'غير مصرح. يرجى تسجيل الدخول.' }); return; }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch { res.status(401).json({ message: 'انتهت صلاحية الجلسة. يرجى إعادة تسجيل الدخول.' }); }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') { res.status(403).json({ message: 'هذا الإجراء متاح للمدير فقط.' }); return; }
  next();
}

function managerOrAdmin(req, res, next) {
  if (!['admin', 'manager'].includes(req.user?.role)) {
    res.status(403).json({ message: 'هذا الإجراء متاح للمدير أو مدير النظام فقط.' });
    return;
  }
  next();
}

const app = express();
const port = Number(process.env.PORT ?? 5000);
const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
const allowedOrigins = [frontendUrl, 'http://localhost:5175', 'http://localhost:5173', 'http://localhost:3000'];
const normalizedAllowedOrigins = new Set(
  allowedOrigins
    .filter(Boolean)
    .map((value) => String(value).trim().replace(/\/$/, ''))
);
const localOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  const normalizedOrigin = String(origin).trim().replace(/\/$/, '');
  return normalizedAllowedOrigins.has(normalizedOrigin) || localOriginPattern.test(normalizedOrigin);
};
const isVercel = !!process.env.VERCEL;
const swaggerSpec = createSwaggerSpec(isVercel ? '' : `http://localhost:${port}`);

app.use(
  cors(
    isVercel
      ? { origin: true }
      : {
        origin: (origin, cb) => {
          if (isAllowedOrigin(origin)) cb(null, true);
          else cb(new Error(`Origin ${origin} not allowed by CORS`));
        }
      }
  )
);
app.use(express.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/api-docs.json', (_request, response) => {
  response.json(swaggerSpec);
});

function validateSalesPayload(body) {
  if (!body.customerName || !body.productName || !body.salesRep || !body.saleDate) {
    return 'يرجى إدخال اسم العميل والمنتج ومسؤول المبيعات وتاريخ البيع.';
  }

  if (Number(body.amount) <= 0) {
    return 'قيمة المبيعات يجب أن تكون أكبر من صفر.';
  }

  return '';
}

function validateCreditSalesPayload(body) {
  if (!body.customerName || !body.invoiceNumber || !body.salesRep || !body.dueDate) {
    return 'يرجى إدخال اسم العميل ورقم الفاتورة ومسؤول المبيعات وتاريخ الاستحقاق.';
  }

  if (Number(body.amount) <= 0) {
    return 'قيمة مبيعات الآجل يجب أن تكون أكبر من صفر.';
  }

  if (Number(body.paidAmount) < 0) {
    return 'المبلغ المسدد لا يمكن أن يكون سالبًا.';
  }

  return '';
}

function validateReturnsPayload(body) {
  if (!body.customerName || !body.salesRep || !body.returnDate) {
    return 'يرجى إدخال اسم العميل ومسؤول المبيعات وتاريخ الإرجاع.';
  }

  if (Number(body.amount) <= 0) {
    return 'قيمة المرتجع يجب أن تكون أكبر من صفر.';
  }

  return '';
}

function validatePriceListPayload(body) {
  if (!body.productName) {
    return 'يرجى إدخال اسم المنتج.';
  }
  if (Number(body.purchasePrice) < 0 || Number(body.sellingPrice) < 0) {
    return 'الأسعار لا يمكن أن تكون سالبة.';
  }
  return '';
}

async function getDashboardPayload() {
  const databaseStatus = await getDatabaseStatus();

  return getDashboardData({
    runtime: databaseStatus.mode,
    database: databaseStatus.connected ? 'connected' : 'fallback',
    message: databaseStatus.message,
    updatedAt: databaseStatus.time
  });
}

app.get('/', (_request, response) => {
  response.json({ status: 'ok', message: 'ASMDA Backend API is running.', docs: '/api-docs' });
});

app.get('/api/health', async (_request, response) => {
  const databaseStatus = await getDatabaseStatus();

  response.json({
    status: 'ok',
    runtime: databaseStatus.mode,
    database: databaseStatus.connected ? 'connected' : 'fallback',
    message: databaseStatus.message,
    time: databaseStatus.time
  });
});

app.get('/api/db-mode', authMiddleware, (_req, res) => {
  res.json({ mode: getCurrentMode() });
});

app.post('/api/db-mode', authMiddleware, adminOnly, (req, res) => {
  const { mode } = req.body;
  if (!['local', 'cloud'].includes(mode)) {
    return res.status(400).json({ message: 'وضع غير صالح. اختر local أو cloud.' });
  }
  switchMode(mode);
  res.json({ mode: getCurrentMode() });
});

app.get('/api/dashboard', async (_request, response) => {
  try {
    const payload = await getDashboardPayload();
    response.json(payload);
  } catch (err) {
    response.status(500).json({ message: err.message });
  }
});

app.get('/api/sales', async (_request, response) => {
  try {
    response.json(await getSalesData());
  } catch (err) {
    response.status(500).json({ message: err.message });
  }
});

app.post('/api/sales', async (request, response) => {
  const validationMessage = validateSalesPayload(request.body);

  if (validationMessage) {
    response.status(400).json({ message: validationMessage });
    return;
  }

  try {
    const created = await createSalesRecord(request.body);
    response.status(201).json(created);
  } catch (err) {
    if (err.message && (err.message.includes('مخازن المناديب') || err.message.includes('المندوب') || err.message.includes('المنتج المختار'))) {
      response.status(400).json({ message: err.message });
      return;
    }
    response.status(500).json({ message: err.message });
  }
});

app.put('/api/sales/:id', async (request, response) => {
  const validationMessage = validateSalesPayload(request.body);

  if (validationMessage) {
    response.status(400).json({ message: validationMessage });
    return;
  }

  try {
    const updated = await updateSalesRecord(request.params.id, request.body);

    if (!updated) {
      response.status(404).json({ message: 'سجل المبيعات المطلوب غير موجود.' });
      return;
    }

    response.json(updated);
  } catch (err) {
    if (err.message && (err.message.includes('مخازن المناديب') || err.message.includes('المندوب') || err.message.includes('المنتج المختار'))) {
      response.status(400).json({ message: err.message });
      return;
    }
    response.status(500).json({ message: err.message });
  }
});

app.delete('/api/sales/:id', async (request, response) => {
  try {
    const deleted = await deleteSalesRecord(request.params.id);

    if (!deleted) {
      response.status(404).json({ message: 'سجل المبيعات المطلوب غير موجود.' });
      return;
    }

    response.status(204).send();
  } catch (err) {
    response.status(500).json({ message: err.message });
  }
});

app.get('/api/credit-sales', async (_request, response) => {
  try {
    response.json(await getCreditSalesData());
  } catch (err) {
    response.status(500).json({ message: err.message });
  }
});

app.get('/api/credit', async (_request, response) => {
  try {
    response.json(await getCreditSalesData());
  } catch (err) {
    response.status(500).json({ message: err.message });
  }
});

app.post('/api/credit-sales', async (request, response) => {
  const validationMessage = validateCreditSalesPayload(request.body);

  if (validationMessage) {
    response.status(400).json({ message: validationMessage });
    return;
  }

  try {
    const created = await createCreditSalesRecord(request.body);
    response.status(201).json(created);
  } catch (err) {
    response.status(500).json({ message: err.message });
  }
});

app.put('/api/credit-sales/:id', async (request, response) => {
  const validationMessage = validateCreditSalesPayload(request.body);

  if (validationMessage) {
    response.status(400).json({ message: validationMessage });
    return;
  }

  try {
    const updated = await updateCreditSalesRecord(request.params.id, request.body);

    if (!updated) {
      response.status(404).json({ message: 'سجل مبيعات الآجل المطلوب غير موجود.' });
      return;
    }

    response.json(updated);
  } catch (err) {
    response.status(500).json({ message: err.message });
  }
});

app.delete('/api/credit-sales/:id', async (request, response) => {
  try {
    const deleted = await deleteCreditSalesRecord(request.params.id);

    if (!deleted) {
      response.status(404).json({ message: 'سجل مبيعات الآجل المطلوب غير موجود.' });
      return;
    }

    response.status(204).send();
  } catch (err) {
    response.status(500).json({ message: err.message });
  }
});

app.get('/api/returns', async (_request, response) => {
  try {
    response.json(await getReturnsData());
  } catch (err) {
    response.status(500).json({ message: err.message });
  }
});

app.post('/api/returns', async (request, response) => {
  const validationMessage = validateReturnsPayload(request.body);

  if (validationMessage) {
    response.status(400).json({ message: validationMessage });
    return;
  }

  try {
    const created = await createReturnRecord(request.body);
    response.status(201).json(created);
  } catch (err) {
    response.status(500).json({ message: err.message });
  }
});

app.put('/api/returns/:id', async (request, response) => {
  const validationMessage = validateReturnsPayload(request.body);

  if (validationMessage) {
    response.status(400).json({ message: validationMessage });
    return;
  }

  try {
    const updated = await updateReturnRecord(request.params.id, request.body);

    if (!updated) {
      response.status(404).json({ message: 'سجل المرتجع المطلوب غير موجود.' });
      return;
    }

    response.json(updated);
  } catch (err) {
    response.status(500).json({ message: err.message });
  }
});

app.delete('/api/returns/:id', async (request, response) => {
  try {
    const deleted = await deleteReturnRecord(request.params.id);

    if (!deleted) {
      response.status(404).json({ message: 'سجل المرتجع المطلوب غير موجود.' });
      return;
    }

    response.status(204).send();
  } catch (err) {
    response.status(500).json({ message: err.message });
  }
});

app.get('/api/price-list', async (_request, response) => {
  try {
    response.json(await getPriceListData());
  } catch (err) {
    response.status(500).json({ message: err.message });
  }
});

app.post('/api/price-list', async (request, response) => {
  const validationMessage = validatePriceListPayload(request.body);

  if (validationMessage) {
    response.status(400).json({ message: validationMessage });
    return;
  }

  try {
    const created = await createPriceListRecord(request.body);
    response.status(201).json(created);
  } catch (err) {
    response.status(500).json({ message: err.message });
  }
});

app.put('/api/price-list/:id', async (request, response) => {
  const validationMessage = validatePriceListPayload(request.body);

  if (validationMessage) {
    response.status(400).json({ message: validationMessage });
    return;
  }

  try {
    const updated = await updatePriceListRecord(request.params.id, request.body);

    if (!updated) {
      response.status(404).json({ message: 'المنتج المطلوب غير موجود.' });
      return;
    }

    response.json(updated);
  } catch (err) {
    response.status(500).json({ message: err.message });
  }
});

app.delete('/api/price-list/:id', async (request, response) => {
  try {
    const deleted = await deletePriceListRecord(request.params.id);

    if (!deleted) {
      response.status(404).json({ message: 'المنتج المطلوب غير موجود.' });
      return;
    }

    response.status(204).send();
  } catch (err) {
    response.status(500).json({ message: err.message });
  }
});

app.get('/api/tasks', async (_request, response) => {
  const tasksResult = await safeQuery(
    'SELECT id, title, description, status, created_at FROM tasks ORDER BY id ASC'
  );

  response.json({
    data: tasksResult.ok ? tasksResult.rows : []
  });
});

function validateCustodyPayload(body) {
  if (!body.employeeName) return 'يرجى إدخال اسم المستلم.';
  if (!body.custodyType) return 'يرجى تحديد نوع العهدة.';
  if (body.custodyType === 'نقدية' && Number(body.initialAmount) <= 0) {
    return 'قيمة العهدة النقدية يجب أن تكون أكبر من صفر.';
  }
  return '';
}

app.get('/api/custodies', async (_request, response) => {
  try {
    response.json(await getCustodiesData());
  } catch (err) {
    response.status(500).json({ message: err.message });
  }
});

app.post('/api/custodies', async (request, response) => {
  const validationMSG = validateCustodyPayload(request.body);
  if (validationMSG) {
    response.status(400).json({ message: validationMSG });
    return;
  }
  try {
    const created = await createCustodyRecord(request.body);
    response.status(201).json(created);
  } catch (err) {
    response.status(500).json({ message: err.message });
  }
});

app.put('/api/custodies/:id', async (request, response) => {
  const validationMSG = validateCustodyPayload(request.body);
  if (validationMSG) {
    response.status(400).json({ message: validationMSG });
    return;
  }
  try {
    const updated = await updateCustodyRecord(request.params.id, request.body);
    if (!updated) {
      response.status(404).json({ message: 'العهدة غير موجودة.' });
      return;
    }
    response.json(updated);
  } catch (err) {
    response.status(500).json({ message: err.message });
  }
});

app.delete('/api/custodies/:id', async (request, response) => {
  try {
    const deleted = await deleteCustodyRecord(request.params.id);
    if (!deleted) {
      response.status(404).json({ message: 'العهدة غير موجودة.' });
      return;
    }
    response.status(204).send();
  } catch (err) {
    response.status(500).json({ message: err.message });
  }
});

app.get('/api/custodies/:id/transactions', async (request, response) => {
  try {
    response.json(await getCustodyTransactions(request.params.id));
  } catch (err) {
    response.status(500).json({ message: err.message });
  }
});

app.post('/api/custodies/:id/transactions', async (request, response) => {
  try {
    if (!request.body.transactionType) {
      response.status(400).json({ message: 'نوع الحركة مطلوب.' });
      return;
    }
    const created = await createCustodyTransaction(request.params.id, request.body);
    response.status(201).json(created);
  } catch (err) {
    response.status(500).json({ message: err.message });
  }
});

app.delete('/api/custodies/:id/transactions/:txId', async (request, response) => {
  try {
    const deleted = await deleteCustodyTransaction(request.params.txId);
    if (!deleted) {
      response.status(404).json({ message: 'الحركة غير موجودة.' });
      return;
    }
    response.status(204).send();
  } catch (err) {
    response.status(500).json({ message: err.message });
  }
});

// ── Checks ────────────────────────────────────────────────────────────────────

function validateCheckPayload(body) {
  if (!body.customerName) return 'يرجى إدخال اسم العميل.';
  if (Number(body.amount) <= 0) return 'قيمة الشيك يجب أن تكون أكبر من صفر.';
  if (!body.collectionDate) return 'يرجى تحديد تاريخ التحصيل.';
  return '';
}

app.get('/api/checks', async (_request, response) => {
  try {
    response.json(await getChecksData());
  } catch (err) {
    response.status(500).json({ message: err.message });
  }
});

app.post('/api/checks', async (request, response) => {
  const validationMessage = validateCheckPayload(request.body);
  if (validationMessage) {
    response.status(400).json({ message: validationMessage });
    return;
  }
  try {
    const created = await createCheckRecord(request.body);
    response.status(201).json(created);
  } catch (err) {
    response.status(500).json({ message: err.message });
  }
});

app.put('/api/checks/:id', async (request, response) => {
  const validationMessage = validateCheckPayload(request.body);
  if (validationMessage) {
    response.status(400).json({ message: validationMessage });
    return;
  }
  try {
    const updated = await updateCheckRecord(request.params.id, request.body);
    if (!updated) {
      response.status(404).json({ message: 'الشيك غير موجود.' });
      return;
    }
    response.json(updated);
  } catch (err) {
    response.status(500).json({ message: err.message });
  }
});

app.delete('/api/checks/:id', async (request, response) => {
  try {
    const deleted = await deleteCheckRecord(request.params.id);
    if (!deleted) {
      response.status(404).json({ message: 'الشيك غير موجود.' });
      return;
    }
    response.status(204).send();
  } catch (err) {
    response.status(500).json({ message: err.message });
  }
});

// ── Cash Receipts ──────────────────────────────────────────────────
app.get('/api/cash-receipts', async (_req, res) => { try { res.json(await getCashReceiptsData()); } catch (e) { res.status(500).json({ message: e.message }); } });

app.post('/api/cash-receipts', async (req, res) => {
  const { customerName, amount, receiptDate } = req.body ?? {};
  if (!customerName) { res.status(400).json({ message: 'يرجى إدخال اسم العميل.' }); return; }
  if (Number(amount) <= 0) { res.status(400).json({ message: 'قيمة المبلغ يجب أن تكون أكبر من صفر.' }); return; }
  if (!receiptDate) { res.status(400).json({ message: 'يرجى تحديد تاريخ السداد.' }); return; }
  try { res.status(201).json(await createCashReceiptRecord(req.body)); } catch (e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/cash-receipts/:id', async (req, res) => {
  const { customerName, amount, receiptDate } = req.body ?? {};
  if (!customerName) { res.status(400).json({ message: 'يرجى إدخال اسم العميل.' }); return; }
  if (Number(amount) <= 0) { res.status(400).json({ message: 'قيمة المبلغ يجب أن تكون أكبر من صفر.' }); return; }
  if (!receiptDate) { res.status(400).json({ message: 'يرجى تحديد تاريخ السداد.' }); return; }
  try {
    const updated = await updateCashReceiptRecord(req.params.id, req.body);
    if (!updated) { res.status(404).json({ message: 'السجل غير موجود.' }); return; }
    res.json(updated);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/cash-receipts/:id', async (req, res) => {
  try {
    const deleted = await deleteCashReceiptRecord(req.params.id);
    if (!deleted) { res.status(404).json({ message: 'السجل غير موجود.' }); return; }
    res.status(204).send();
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── Final Product Store ──────────────────────────────────────────────────────
app.get('/api/final-product-store', async (_req, res) => { try { res.json(await getFinalProductStoreData()); } catch (e) { res.status(500).json({ message: e.message }); } });
app.post('/api/final-product-store', async (req, res) => {
  if (!req.body.productName) { res.status(400).json({ message: 'يرجى إدخال اسم المنتج.' }); return; }
  try { res.status(201).json(await createFinalProductRecord(req.body)); } catch (e) { res.status(500).json({ message: e.message }); }
});
app.put('/api/final-product-store/:id', async (req, res) => {
  if (!req.body.productName) { res.status(400).json({ message: 'يرجى إدخال اسم المنتج.' }); return; }
  try { const u = await updateFinalProductRecord(req.params.id, req.body); if (!u) { res.status(404).json({ message: 'السجل غير موجود.' }); return; } res.json(u); } catch (e) { res.status(500).json({ message: e.message }); }
});
app.delete('/api/final-product-store/:id', async (req, res) => { try { const d = await deleteFinalProductRecord(req.params.id); if (!d) { res.status(404).json({ message: 'السجل غير موجود.' }); return; } res.status(204).send(); } catch (e) { res.status(500).json({ message: e.message }); } });

// ── Raw Materials & Packaging Store ──────────────────────────────────────────
app.get('/api/raw-materials-store', async (_req, res) => { try { res.json(await getRawMaterialsStoreData()); } catch (e) { res.status(500).json({ message: e.message }); } });
app.post('/api/raw-materials-store', async (req, res) => {
  if (!req.body.materialName) { res.status(400).json({ message: 'يرجى إدخال اسم الخامة.' }); return; }
  try { res.status(201).json(await createRawMaterialRecord(req.body)); } catch (e) { res.status(500).json({ message: e.message }); }
});
app.put('/api/raw-materials-store/:id', async (req, res) => {
  if (!req.body.materialName) { res.status(400).json({ message: 'يرجى إدخال اسم الخامة.' }); return; }
  try { const u = await updateRawMaterialRecord(req.params.id, req.body); if (!u) { res.status(404).json({ message: 'السجل غير موجود.' }); return; } res.json(u); } catch (e) { res.status(500).json({ message: e.message }); }
});
app.delete('/api/raw-materials-store/:id', async (req, res) => { try { const d = await deleteRawMaterialRecord(req.params.id); if (!d) { res.status(404).json({ message: 'السجل غير موجود.' }); return; } res.status(204).send(); } catch (e) { res.status(500).json({ message: e.message }); } });

// ── Rep Sub-Stores ───────────────────────────────────────────────────────────
app.get('/api/rep-sub-stores', async (_req, res) => { try { res.json(await getRepSubStoresData()); } catch (e) { res.status(500).json({ message: e.message }); } });
app.post('/api/rep-sub-stores', async (req, res) => {
  if (!req.body.repName || !req.body.productName) { res.status(400).json({ message: 'يرجى إدخال اسم المندوب واسم المنتج.' }); return; }
  try { res.status(201).json(await createRepSubStoreRecord(req.body)); } catch (e) { res.status(500).json({ message: e.message }); }
});
app.put('/api/rep-sub-stores/:id', async (req, res) => {
  if (!req.body.repName || !req.body.productName) { res.status(400).json({ message: 'يرجى إدخال اسم المندوب واسم المنتج.' }); return; }
  try { const u = await updateRepSubStoreRecord(req.params.id, req.body); if (!u) { res.status(404).json({ message: 'السجل غير موجود.' }); return; } res.json(u); } catch (e) { res.status(500).json({ message: e.message }); }
});
app.delete('/api/rep-sub-stores/:id', async (req, res) => { try { const d = await deleteRepSubStoreRecord(req.params.id); if (!d) { res.status(404).json({ message: 'السجل غير موجود.' }); return; } res.status(204).send(); } catch (e) { res.status(500).json({ message: e.message }); } });

// ── Financial Manager Custody ────────────────────────────────────────────────
app.get('/api/financial-manager-custody/budget', (_req, res) => {
  res.json({ total: getManagerBudget() });
});
app.put('/api/financial-manager-custody/budget', (req, res) => {
  const v = Number(req.body.total);
  if (isNaN(v) || v < 0) { res.status(400).json({ message: 'قيمة غير صالحة.' }); return; }
  setManagerBudget(v);
  res.json({ total: getManagerBudget() });
});
app.get('/api/financial-manager-custody', async (_req, res) => { try { res.json(await getFinancialManagerCustodyData()); } catch (e) { res.status(500).json({ message: e.message }); } });
app.post('/api/financial-manager-custody', async (req, res) => {
  if (!req.body.employeeName) { res.status(400).json({ message: 'يرجى إدخال اسم الموظف.' }); return; }
  if (Number(req.body.amount) <= 0) { res.status(400).json({ message: 'قيمة العهدة يجب أن تكون أكبر من صفر.' }); return; }
  if (!req.body.purpose || !String(req.body.purpose).trim()) { res.status(400).json({ message: 'يرجى إدخال الغرض من العهدة.' }); return; }
  if (!req.body.custodyDate) { res.status(400).json({ message: 'يرجى إدخال تاريخ العهدة.' }); return; }
  if (!req.body.status || !String(req.body.status).trim()) { res.status(400).json({ message: 'يرجى اختيار حالة العهدة.' }); return; }
  try {
    const fmcRecord = await createFinManagerCustodyRecord(req.body);
    // إنشاء عهدة تلقائية للموظف في جدول العهد
    await createCustodyRecord({
      employeeName: req.body.employeeName,
      custodyType: 'نقدية',
      initialAmount: Number(req.body.amount),
      startDate: req.body.custodyDate || null,
      status: 'نشطة',
      notes: req.body.notes || ''
    });
    res.status(201).json(fmcRecord);
  } catch (e) { res.status(500).json({ message: e.message }); }
});
app.post('/api/financial-manager-custody/:id/assign', async (req, res) => {
  const amount = Number(req.body.amount);
  if (!req.body.employeeName) { res.status(400).json({ message: 'يرجى اختيار الموظف.' }); return; }
  if (amount <= 0) { res.status(400).json({ message: 'قيمة التعيين يجب أن تكون أكبر من صفر.' }); return; }

  try {
    const managerRecord = await getFinManagerCustodyRecord(req.params.id);
    if (!managerRecord) { res.status(404).json({ message: 'عهدة المدير غير موجودة.' }); return; }
    if (managerRecord.status !== 'نشطة') { res.status(400).json({ message: 'لا يمكن التعيين من عهدة غير نشطة.' }); return; }
    if (amount > Number(managerRecord.amount || 0)) { res.status(400).json({ message: 'المبلغ المطلوب أكبر من رصيد عهدة المدير.' }); return; }

    await updateFinManagerCustodyRecord(req.params.id, {
      amount: Number(managerRecord.amount || 0) - amount
    });

    const createdCustody = await createCustodyRecord({
      employeeName: req.body.employeeName,
      custodyType: 'نقدية',
      initialAmount: amount,
      startDate: req.body.custodyDate || null,
      status: 'نشطة',
      notes: req.body.notes || ''
    });

    res.status(201).json(createdCustody);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});
app.put('/api/financial-manager-custody/:id', async (req, res) => {
  if (!req.body.employeeName) { res.status(400).json({ message: 'يرجى إدخال اسم الموظف.' }); return; }
  if (Number(req.body.amount) <= 0) { res.status(400).json({ message: 'قيمة العهدة يجب أن تكون أكبر من صفر.' }); return; }
  if (!req.body.purpose || !String(req.body.purpose).trim()) { res.status(400).json({ message: 'يرجى إدخال الغرض من العهدة.' }); return; }
  if (!req.body.custodyDate) { res.status(400).json({ message: 'يرجى إدخال تاريخ العهدة.' }); return; }
  if (!req.body.status || !String(req.body.status).trim()) { res.status(400).json({ message: 'يرجى اختيار حالة العهدة.' }); return; }
  try { const u = await updateFinManagerCustodyRecord(req.params.id, req.body); if (!u) { res.status(404).json({ message: 'السجل غير موجود.' }); return; } res.json(u); } catch (e) { res.status(500).json({ message: e.message }); }
});
app.delete('/api/financial-manager-custody/:id', async (req, res) => { try { const d = await deleteFinManagerCustodyRecord(req.params.id); if (!d) { res.status(404).json({ message: 'السجل غير موجود.' }); return; } res.status(204).send(); } catch (e) { res.status(500).json({ message: e.message }); } });

// ── Raw Materials Purchases ──────────────────────────────────────────────────
app.get('/api/raw-materials-purchases', async (_req, res) => { try { res.json(await getRawMaterialsPurchasesData()); } catch (e) { res.status(500).json({ message: e.message }); } });
app.post('/api/raw-materials-purchases', async (req, res) => {
  if (!req.body.supplierName || !req.body.materialName) { res.status(400).json({ message: 'يرجى إدخال اسم المورد واسم الخامة.' }); return; }
  if (!req.body.purchaseDate || !String(req.body.invoiceNumber || '').trim()) { res.status(400).json({ message: 'تاريخ الشراء ورقم الفاتورة مطلوبان.' }); return; }
  if (Number(req.body.quantity) <= 0 || Number(req.body.unitPrice) <= 0) { res.status(400).json({ message: 'الكمية وسعر الوحدة يجب أن يكونا أكبر من صفر.' }); return; }
  try { res.status(201).json(await createRawPurchaseRecord(req.body)); } catch (e) { res.status(500).json({ message: e.message }); }
});
app.put('/api/raw-materials-purchases/:id', async (req, res) => {
  if (!req.body.supplierName || !req.body.materialName) { res.status(400).json({ message: 'يرجى إدخال اسم المورد واسم الخامة.' }); return; }
  if (!req.body.purchaseDate || !String(req.body.invoiceNumber || '').trim()) { res.status(400).json({ message: 'تاريخ الشراء ورقم الفاتورة مطلوبان.' }); return; }
  try { const u = await updateRawPurchaseRecord(req.params.id, req.body); if (!u) { res.status(404).json({ message: 'السجل غير موجود.' }); return; } res.json(u); } catch (e) { res.status(500).json({ message: e.message }); }
});
app.delete('/api/raw-materials-purchases/:id', async (req, res) => { try { const d = await deleteRawPurchaseRecord(req.params.id); if (!d) { res.status(404).json({ message: 'السجل غير موجود.' }); return; } res.status(204).send(); } catch (e) { res.status(500).json({ message: e.message }); } });

// ── Raw Materials Catalog (Names) ─────────────────────────────────────────────
app.get('/api/raw-materials-catalog', async (_req, res) => { try { res.json(await getRawMaterialsCatalogData()); } catch (e) { res.status(500).json({ message: e.message }); } });
app.post('/api/raw-materials-catalog', async (req, res) => {
  if (!req.body.name) { res.status(400).json({ message: 'يرجى إدخال اسم الخامة.' }); return; }
  try { res.status(201).json(await createRawMaterialsCatalogRecord(req.body)); } catch (e) { res.status(500).json({ message: e.message }); }
});
app.put('/api/raw-materials-catalog/:id', async (req, res) => {
  if (!req.body.name) { res.status(400).json({ message: 'يرجى إدخال اسم الخامة.' }); return; }
  try { const u = await updateRawMaterialsCatalogRecord(req.params.id, req.body); if (!u) { res.status(404).json({ message: 'الخامة غير موجودة.' }); return; } res.json(u); } catch (e) { res.status(500).json({ message: e.message }); }
});
app.delete('/api/raw-materials-catalog/:id', async (req, res) => { try { const d = await deleteRawMaterialsCatalogRecord(req.params.id); if (!d) { res.status(404).json({ message: 'الخامة غير موجودة.' }); return; } res.status(204).send(); } catch (e) { res.status(500).json({ message: e.message }); } });

// ── Suppliers Catalog (Names) ─────────────────────────────────────────────────
app.get('/api/suppliers', async (_req, res) => { try { res.json(await getSuppliersData()); } catch (e) { res.status(500).json({ message: e.message }); } });
app.post('/api/suppliers', async (req, res) => {
  if (!req.body.name) { res.status(400).json({ message: 'يرجى إدخال اسم المورد.' }); return; }
  try { res.status(201).json(await createSupplierRecord(req.body)); } catch (e) { res.status(500).json({ message: e.message }); }
});
app.put('/api/suppliers/:id', async (req, res) => {
  if (!req.body.name) { res.status(400).json({ message: 'يرجى إدخال اسم المورد.' }); return; }
  try { const u = await updateSupplierRecord(req.params.id, req.body); if (!u) { res.status(404).json({ message: 'المورد غير موجود.' }); return; } res.json(u); } catch (e) { res.status(500).json({ message: e.message }); }
});
app.delete('/api/suppliers/:id', async (req, res) => { try { const d = await deleteSupplierRecord(req.params.id); if (!d) { res.status(404).json({ message: 'المورد غير موجود.' }); return; } res.status(204).send(); } catch (e) { res.status(500).json({ message: e.message }); } });

// ── Machine Maintenance Purchases ────────────────────────────────────────────
app.get('/api/machine-maintenance-purchases', async (_req, res) => { try { res.json(await getMachineMaintenancePurchasesData()); } catch (e) { res.status(500).json({ message: e.message }); } });
app.post('/api/machine-maintenance-purchases', async (req, res) => {
  if (!req.body.supplierName || !req.body.description) { res.status(400).json({ message: 'يرجى إدخال اسم المورد ووصف العملية.' }); return; }
  if (Number(req.body.amount) <= 0) { res.status(400).json({ message: 'القيمة يجب أن تكون أكبر من صفر.' }); return; }
  try { res.status(201).json(await createMachinePurchaseRecord(req.body)); } catch (e) { res.status(500).json({ message: e.message }); }
});
app.put('/api/machine-maintenance-purchases/:id', async (req, res) => {
  if (!req.body.supplierName || !req.body.description) { res.status(400).json({ message: 'يرجى إدخال اسم المورد ووصف العملية.' }); return; }
  try { const u = await updateMachinePurchaseRecord(req.params.id, req.body); if (!u) { res.status(404).json({ message: 'السجل غير موجود.' }); return; } res.json(u); } catch (e) { res.status(500).json({ message: e.message }); }
});
app.delete('/api/machine-maintenance-purchases/:id', async (req, res) => { try { const d = await deleteMachinePurchaseRecord(req.params.id); if (!d) { res.status(404).json({ message: 'السجل غير موجود.' }); return; } res.status(204).send(); } catch (e) { res.status(500).json({ message: e.message }); } });

// ── Misc Purchases ───────────────────────────────────────────────────────────
app.get('/api/misc-purchases', async (_req, res) => { try { res.json(await getMiscPurchasesData()); } catch (e) { res.status(500).json({ message: e.message }); } });
app.post('/api/misc-purchases', async (req, res) => {
  if (!req.body.description) { res.status(400).json({ message: 'يرجى إدخال وصف المصروف.' }); return; }
  if (Number(req.body.amount) <= 0) { res.status(400).json({ message: 'القيمة يجب أن تكون أكبر من صفر.' }); return; }
  try { res.status(201).json(await createMiscPurchaseRecord(req.body)); } catch (e) { res.status(500).json({ message: e.message }); }
});
app.put('/api/misc-purchases/:id', async (req, res) => {
  if (!req.body.description) { res.status(400).json({ message: 'يرجى إدخال وصف المصروف.' }); return; }
  try { const u = await updateMiscPurchaseRecord(req.params.id, req.body); if (!u) { res.status(404).json({ message: 'السجل غير موجود.' }); return; } res.json(u); } catch (e) { res.status(500).json({ message: e.message }); }
});
app.delete('/api/misc-purchases/:id', async (req, res) => { try { const d = await deleteMiscPurchaseRecord(req.params.id); if (!d) { res.status(404).json({ message: 'السجل غير موجود.' }); return; } res.status(204).send(); } catch (e) { res.status(500).json({ message: e.message }); } });

// ── Payroll & Advances ───────────────────────────────────────────────────────
app.get('/api/payroll-advances', async (_req, res) => { try { res.json(await getPayrollAdvancesData()); } catch (e) { res.status(500).json({ message: e.message }); } });
app.post('/api/payroll-advances', async (req, res) => {
  if (!req.body.employeeName) { res.status(400).json({ message: 'يرجى إدخال اسم الموظف.' }); return; }
  if (Number(req.body.amount) <= 0) { res.status(400).json({ message: 'القيمة يجب أن تكون أكبر من صفر.' }); return; }
  try { res.status(201).json(await createPayrollAdvanceRecord(req.body)); } catch (e) { res.status(500).json({ message: e.message }); }
});
app.put('/api/payroll-advances/:id', async (req, res) => {
  if (!req.body.employeeName) { res.status(400).json({ message: 'يرجى إدخال اسم الموظف.' }); return; }
  try { const u = await updatePayrollAdvanceRecord(req.params.id, req.body); if (!u) { res.status(404).json({ message: 'السجل غير موجود.' }); return; } res.json(u); } catch (e) { res.status(500).json({ message: e.message }); }
});
app.delete('/api/payroll-advances/:id', async (req, res) => { try { const d = await deletePayrollAdvanceRecord(req.params.id); if (!d) { res.status(404).json({ message: 'السجل غير موجود.' }); return; } res.status(204).send(); } catch (e) { res.status(500).json({ message: e.message }); } });

// ── Customer Payment Alerts ──────────────────────────────────────────────────
app.get('/api/customer-payment-alerts', async (_req, res) => { try { res.json(await getCustomerPaymentAlertsData()); } catch (e) { res.status(500).json({ message: e.message }); } });
app.post('/api/customer-payment-alerts', async (req, res) => {
  if (!req.body.customerName) { res.status(400).json({ message: 'يرجى إدخال اسم العميل.' }); return; }
  if (Number(req.body.amount) <= 0) { res.status(400).json({ message: 'القيمة يجب أن تكون أكبر من صفر.' }); return; }
  try { res.status(201).json(await createPaymentAlertRecord(req.body)); } catch (e) { res.status(500).json({ message: e.message }); }
});
app.put('/api/customer-payment-alerts/:id', async (req, res) => {
  if (!req.body.customerName) { res.status(400).json({ message: 'يرجى إدخال اسم العميل.' }); return; }
  try { const u = await updatePaymentAlertRecord(req.params.id, req.body); if (!u) { res.status(404).json({ message: 'السجل غير موجود.' }); return; } res.json(u); } catch (e) { res.status(500).json({ message: e.message }); }
});
app.delete('/api/customer-payment-alerts/:id', async (req, res) => { try { const d = await deletePaymentAlertRecord(req.params.id); if (!d) { res.status(404).json({ message: 'السجل غير موجود.' }); return; } res.status(204).send(); } catch (e) { res.status(500).json({ message: e.message }); } });

// ── Free Samples ─────────────────────────────────────────────────────────────
app.get('/api/free-samples', async (_req, res) => { try { res.json(await getFreeSamplesData()); } catch (e) { res.status(500).json({ message: e.message }); } });
app.post('/api/free-samples', async (req, res) => {
  if (!req.body.customerName) { res.status(400).json({ message: 'يرجى إدخال اسم العميل.' }); return; }
  if (!req.body.productName) { res.status(400).json({ message: 'يرجى إدخال اسم المنتج.' }); return; }
  try { res.status(201).json(await createFreeSampleRecord(req.body)); } catch (e) { res.status(500).json({ message: e.message }); }
});
app.put('/api/free-samples/:id', async (req, res) => {
  if (!req.body.customerName) { res.status(400).json({ message: 'يرجى إدخال اسم العميل.' }); return; }
  if (!req.body.productName) { res.status(400).json({ message: 'يرجى إدخال اسم المنتج.' }); return; }
  try { const u = await updateFreeSampleRecord(req.params.id, req.body); if (!u) { res.status(404).json({ message: 'السجل غير موجود.' }); return; } res.json(u); } catch (e) { res.status(500).json({ message: e.message }); }
});
app.delete('/api/free-samples/:id', async (req, res) => { try { const d = await deleteFreeSampleRecord(req.params.id); if (!d) { res.status(404).json({ message: 'السجل غير موجود.' }); return; } res.status(204).send(); } catch (e) { res.status(500).json({ message: e.message }); } });

// ── Product Cards ─────────────────────────────────────────────────────────────
app.get('/api/product-cards', async (_req, res) => { try { res.json(await getProductCardsData()); } catch (e) { res.status(500).json({ message: e.message }); } });
app.post('/api/product-cards', async (req, res) => {
  if (!req.body.productName) { res.status(400).json({ message: 'يرجى إدخال اسم الصنف.' }); return; }
  try { res.status(201).json(await createProductCardRecord(req.body)); } catch (e) { res.status(500).json({ message: e.message }); }
});
app.post('/api/product-cards/import', async (req, res) => {
  const names = req.body?.names;
  if (!Array.isArray(names) || names.length === 0) {
    res.status(400).json({ message: 'يرجى إرسال قائمة أصناف صالحة داخل names.' });
    return;
  }
  try {
    const result = await importProductCardsFromNames(names);
    res.status(201).json(result);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});
app.put('/api/product-cards/:id', async (req, res) => {
  if (!req.body.productName) { res.status(400).json({ message: 'يرجى إدخال اسم الصنف.' }); return; }
  try { const u = await updateProductCardRecord(req.params.id, req.body); if (!u) { res.status(404).json({ message: 'الصنف غير موجود.' }); return; } res.json(u); } catch (e) { res.status(500).json({ message: e.message }); }
});
app.delete('/api/product-cards/:id', async (req, res) => { try { const d = await deleteProductCardRecord(req.params.id); if (!d) { res.status(404).json({ message: 'الصنف غير موجود.' }); return; } res.status(204).send(); } catch (e) { res.status(500).json({ message: e.message }); } });

// ── Rep transfer & sale-deduct ──
app.post('/api/rep-sub-stores/transfer', async (req, res) => {
  try {
    const result = await transferToRep(req.body);
    res.json(result);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.post('/api/rep-sub-stores/sale-deduct', async (req, res) => {
  try {
    const result = await repSaleDeduct(req.body);
    res.json(result);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// ── Auth endpoints ──
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) { res.status(400).json({ message: 'يرجى إدخال اسم المستخدم وكلمة المرور.' }); return; }
  const user = getUserByUsername(username);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ message: 'اسم المستخدم أو كلمة المرور غير صحيحة.' }); return;
  }
  const token = jwt.sign({ id: user.id, username: user.username, displayName: user.displayName, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, user: { id: user.id, username: user.username, displayName: user.displayName, role: user.role, roleLabel: ROLE_LABELS[user.role], pages: ROLE_PAGES[user.role] } });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = getUserById(req.user.id);
  if (!user) { res.status(404).json({ message: 'المستخدم غير موجود.' }); return; }
  const { passwordHash: _, ...safe } = user;
  res.json({ ...safe, roleLabel: ROLE_LABELS[safe.role], pages: ROLE_PAGES[safe.role] });
});

app.get('/api/users/options', authMiddleware, (_req, res) => {
  res.json(getAllUsers().map(({ id, displayName, code, role }) => ({ id, displayName, code, role })));
});

// ── User management (admin only) ──
app.get('/api/users', authMiddleware, adminOnly, (_req, res) => {
  res.json({ users: getAllUsers(), roles: getAllRoles().map(r => ({ value: r.id, label: r.label })) });
});

// Get users by role (accessible to all authenticated users)
app.get('/api/users/by-role/:role', authMiddleware, (req, res) => {
  const users = getAllUsers().filter(u => u.role === req.params.role);
  res.json(users);
});

// ── Reps Management (manager/admin) ──
app.get('/api/reps', authMiddleware, managerOrAdmin, (_req, res) => {
  const reps = getAllUsers()
    .filter((u) => u.role === 'sales')
    .map(({ id, username, displayName, code, role }) => ({ id, username, displayName, code: code || '', role }));
  res.json(reps);
});

app.post('/api/reps', authMiddleware, managerOrAdmin, (req, res) => {
  const { username, password, displayName, code } = req.body ?? {};
  if (!username || !password || !displayName) {
    res.status(400).json({ message: 'يرجى إدخال اسم المستخدم وكلمة المرور والاسم الظاهر.' });
    return;
  }
  try {
    const created = createUser({ username, password, displayName, code: code || '', role: 'sales' });
    res.status(201).json(created);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

app.put('/api/reps/:id', authMiddleware, managerOrAdmin, (req, res) => {
  const target = getUserById(req.params.id);
  if (!target || target.role !== 'sales') {
    res.status(404).json({ message: 'المندوب غير موجود.' });
    return;
  }

  const { displayName, code, password } = req.body ?? {};
  if (!displayName) {
    res.status(400).json({ message: 'يرجى إدخال الاسم الظاهر.' });
    return;
  }

  try {
    const updated = updateUser(req.params.id, {
      displayName,
      code: code || '',
      role: 'sales',
      ...(password ? { password } : {})
    });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

app.delete('/api/reps/:id', authMiddleware, managerOrAdmin, (req, res) => {
  const target = getUserById(req.params.id);
  if (!target || target.role !== 'sales') {
    res.status(404).json({ message: 'المندوب غير موجود.' });
    return;
  }

  try {
    deleteUser(req.params.id);
    res.status(204).send();
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

app.post('/api/users', authMiddleware, adminOnly, (req, res) => {
  const { username, password, displayName, role } = req.body ?? {};
  if (!username || !password || !displayName || !role) { res.status(400).json({ message: 'يرجى إدخال جميع الحقول المطلوبة.' }); return; }
  try { res.status(201).json(createUser({ username, password, displayName, role })); }
  catch (e) { res.status(400).json({ message: e.message }); }
});

app.put('/api/users/:id', authMiddleware, adminOnly, (req, res) => {
  try { res.json(updateUser(req.params.id, req.body)); }
  catch (e) { res.status(400).json({ message: e.message }); }
});

app.delete('/api/users/:id', authMiddleware, adminOnly, (req, res) => {
  try { deleteUser(req.params.id); res.status(204).send(); }
  catch (e) { res.status(400).json({ message: e.message }); }
});

// ── Roles Management ──────────────────────────────────────────────────────────
app.get('/api/roles', authMiddleware, adminOnly, (req, res) => {
  res.json({ roles: getAllRoles(), pages: ALL_PAGES });
});

app.post('/api/roles', authMiddleware, adminOnly, (req, res) => {
  try {
    const { label, pages } = req.body;
    const role = createRole({ label, pages });
    res.status(201).json(role);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.put('/api/roles/:id', authMiddleware, adminOnly, (req, res) => {
  try {
    const { label, pages } = req.body;
    const role = updateRole(req.params.id, { label, pages });
    res.json(role);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.delete('/api/roles/:id', authMiddleware, adminOnly, (req, res) => {
  try { deleteRole(req.params.id); res.status(204).send(); }
  catch (e) { res.status(400).json({ message: e.message }); }
});

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`ERB backend is running on http://localhost:${port}`);
  });
}

export default app;
