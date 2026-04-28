import { query } from '../db.js';

const dashboardBrand = {
  name: 'مركز قيادة ERB',
  eyebrow: 'لوحة الاستعداد التنفيذي',
  headline: 'لوحة عربية موحدة لمتابعة الأداء والمبيعات ومبيعات الآجل.',
  description:
    'واجهة تنفيذية تساعدك على متابعة المؤشرات الرئيسية وحركة البيع النقدي وحسابات الآجل من مكان واحد وبأسلوب واضح وسريع.',
  primaryAction: 'فتح صفحة المبيعات',
  secondaryAction: 'فتح صفحة مبيعات الآجل'
};

function mapSale(row) {
  return {
    id: row.id,
    customerName: row.customer_name,
    productName: row.product_name,
    amount: Number(row.amount),
    status: row.status,
    salesRep: row.sales_rep,
    saleDate: row.sale_date ? new Date(row.sale_date).toISOString().split('T')[0] : null,
    notes: row.notes || ''
  };
}

function mapCreditSale(row) {
  return {
    id: row.id,
    customerName: row.customer_name,
    invoiceNumber: row.invoice_number,
    items: Array.isArray(row.items) ? row.items : [],
    discountType: row.discount_type || 'fixed',
    discountValue: Number(row.discount_value || 0),
    discountAmount: Number(row.discount_amount || 0),
    amount: Number(row.amount),
    paidAmount: Number(row.paid_amount),
    remainingAmount: Math.max(0, Number(row.amount) - Number(row.paid_amount)),
    dueDate: row.due_date ? new Date(row.due_date).toISOString().split('T')[0] : null,
    status: row.status,
    salesRep: row.sales_rep,
    notes: row.notes || ''
  };
}

function mapReturn(row) {
  return {
    id: row.id,
    customerName: row.customer_name,
    productName: row.product_name || '',
    originalInvoiceNumber: row.original_invoice_number,
    amount: Number(row.amount),
    reason: row.reason || '',
    returnDate: row.return_date ? new Date(row.return_date).toISOString().split('T')[0] : null,
    status: row.status,
    salesRep: row.sales_rep,
    notes: row.notes || ''
  };
}

async function nextId(prefix, table) {
  try {
    const result = await query(`SELECT id FROM ${table} WHERE id LIKE $1 ORDER BY id DESC LIMIT 1`, [`${prefix}-%`]);
    if (result.rows.length === 0) {
      return `${prefix}-1001`;
    }
    const lastId = result.rows[0].id;
    const num = parseInt(lastId.split('-')[1], 10);
    return `${prefix}-${String(num + 1).padStart(4, '0')}`;
  } catch (e) {
    return `${prefix}-1001`;
  }
}

export async function getDashboardData(meta) {
  const salesResult = await query('SELECT * FROM direct_sales ORDER BY created_at DESC');
  const creditResult = await query('SELECT * FROM installment_sales ORDER BY created_at DESC');

  const sales = salesResult.rows.map(mapSale);
  const credits = creditResult.rows.map(mapCreditSale);

  const totalSales = sales.reduce((sum, item) => sum + item.amount, 0);
  const outstandingAmount = credits.reduce((sum, item) => sum + Math.max(0, item.amount - item.paidAmount), 0);
  const overdueCount = credits.filter((item) => item.status === 'متأخرة').length;
  const pendingSales = sales.filter((item) => item.status !== 'مكتملة').length;

  const alerts = [
    {
      title: 'متابعة الفواتير المتأخرة',
      description: `يوجد ${overdueCount} فواتير متأخرة تحتاج تواصل سريع مع العملاء.`,
      level: overdueCount > 0 ? 'high' : 'medium'
    },
    {
      title: 'الطلبات المفتوحة',
      description: `يوجد ${pendingSales} عمليات بيع ما زالت قيد المتابعة أو التنفيذ.`,
      level: pendingSales > 1 ? 'medium' : 'low'
    }
  ];

  return {
    meta,
    brand: dashboardBrand,
    summary: [
      {
        id: 'dashboard-sales',
        label: 'إجمالي المبيعات',
        value: totalSales,
        type: 'currency',
        helper: 'المبيعات الحالية',
        tone: 'accent'
      },
      {
        id: 'dashboard-orders',
        label: 'عمليات البيع',
        value: sales.length,
        type: 'number',
        helper: 'إجمالي السجلات',
        tone: 'calm'
      },
      {
        id: 'dashboard-credit',
        label: 'رصيد مبيعات الآجل',
        value: outstandingAmount,
        type: 'currency',
        helper: 'المبالغ المستحقة',
        tone: 'warning'
      },
      {
        id: 'dashboard-overdue',
        label: 'فواتير متأخرة',
        value: overdueCount,
        type: 'number',
        helper: 'تحتاج إجراء',
        tone: 'alert'
      }
    ],
    alerts,
    recentSales: sales.slice(0, 4),
    recentCreditSales: credits.slice(0, 4)
  };
}

export async function getSalesData() {
  const result = await query('SELECT * FROM direct_sales ORDER BY created_at DESC');
  const sales = result.rows.map(mapSale);

  const totalSalesAmount = sales.reduce((sum, item) => sum + item.amount, 0);
  const completedCount = sales.filter(item => item.status === 'مكتملة').length;

  const overview = [
    {
      id: 'sales-total',
      label: 'إجمالي المبيعات',
      value: totalSalesAmount,
      type: 'currency',
      helper: 'قيمة العمليات الحالية',
      tone: 'accent'
    },
    {
      id: 'sales-count',
      label: 'عدد عمليات البيع',
      value: sales.length,
      type: 'number',
      helper: 'عملية محدثة',
      tone: 'calm'
    },
    {
      id: 'sales-completed',
      label: 'طلبات مكتملة',
      value: completedCount,
      type: 'number',
      helper: 'جاهزة للإغلاق',
      tone: 'neutral'
    }
  ];

  return {
    overview,
    items: sales
  };
}

export async function getCreditSalesData() {
  const result = await query('SELECT * FROM installment_sales ORDER BY created_at DESC');
  const credits = result.rows.map(mapCreditSale);

  const totalCredit = credits.reduce((sum, item) => sum + item.amount, 0);
  const totalCollected = credits.reduce((sum, item) => sum + item.paidAmount, 0);
  const outstandingAmount = credits.reduce((sum, item) => sum + Math.max(0, item.amount - item.paidAmount), 0);
  const overdueCount = credits.filter(item => item.status === 'متأخرة').length;

  let collRate = 0;
  if (totalCredit > 0) {
    collRate = Math.round((totalCollected / totalCredit) * 100);
  }

  const overview = [
    {
      id: 'credit-outstanding',
      label: 'إجمالي الآجل المستحق',
      value: outstandingAmount,
      type: 'currency',
      helper: 'رصيد يحتاج متابعة',
      tone: 'warning'
    },
    {
      id: 'credit-overdue',
      label: 'فواتير متأخرة',
      value: overdueCount,
      type: 'number',
      helper: 'تحتاج تحصيل',
      tone: 'alert'
    },
    {
      id: 'credit-rate',
      label: 'نسبة التحصيل',
      value: collRate,
      type: 'percent',
      helper: 'من إجمالي الآجل',
      tone: 'calm'
    }
  ];

  return {
    overview,
    items: credits
  };
}

async function ensureRepStoreSalesLink(repName, productName) {
  const rep = String(repName || '').trim();
  const product = String(productName || '').trim();
  if (!rep || !product) {
    throw new Error('يرجى اختيار المندوب والمنتج من مخازن المناديب.');
  }

  const linkResult = await query(
    `SELECT id FROM rep_sub_stores
     WHERE LOWER(rep_name) = LOWER($1)
       AND LOWER(product_name) = LOWER($2)
     LIMIT 1`,
    [rep, product]
  );

  if (linkResult.rows.length === 0) {
    throw new Error('المنتج المختار غير مرتبط بالمندوب في مخازن المناديب.');
  }
}

export async function createSalesRecord(payload) {
  const id = await nextId('SAL', 'direct_sales');
  await ensureRepStoreSalesLink(payload.salesRep, payload.productName);
  
  const text = `
    INSERT INTO direct_sales 
    (id, customer_name, product_name, amount, status, sales_rep, sale_date, notes) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
  `;
  const values = [
    id,
    payload.customerName || '',
    payload.productName || '',
    Number(payload.amount || 0),
    payload.status || 'جديدة',
    payload.salesRep || '',
    payload.saleDate || null,
    payload.notes || ''
  ];

  const result = await query(text, values);
  return mapSale(result.rows[0]);
}

export async function updateSalesRecord(id, payload) {
  await ensureRepStoreSalesLink(payload.salesRep, payload.productName);
  const text = `
    UPDATE direct_sales SET 
      customer_name = COALESCE($2, customer_name),
      product_name = COALESCE($3, product_name),
      amount = COALESCE($4, amount),
      status = COALESCE($5, status),
      sales_rep = COALESCE($6, sales_rep),
      sale_date = COALESCE($7, sale_date),
      notes = COALESCE($8, notes)
    WHERE id = $1 RETURNING *
  `;
  const values = [
    id,
    payload.customerName,
    payload.productName,
    payload.amount !== undefined ? Number(payload.amount) : undefined,
    payload.status,
    payload.salesRep,
    payload.saleDate,
    payload.notes
  ];

  const result = await query(text, values);
  if (result.rows.length === 0) return null;
  return mapSale(result.rows[0]);
}

export async function deleteSalesRecord(id) {
  const result = await query('DELETE FROM direct_sales WHERE id = $1 RETURNING id', [id]);
  return result.rowCount > 0;
}

export async function createCreditSalesRecord(payload) {
  const id = await nextId('CRD', 'installment_sales');
  const items = Array.isArray(payload.items) ? payload.items : [];
  const discountType = payload.discountType || 'fixed';
  const discountValue = Number(payload.discountValue || 0);
  const discountAmount = Number(payload.discountAmount || 0);

  const text = `
    INSERT INTO installment_sales 
    (id, customer_name, invoice_number, items, discount_type, discount_value, discount_amount, amount, paid_amount, due_date, status, sales_rep, notes) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *
  `;
  const values = [
    id,
    payload.customerName || '',
    payload.invoiceNumber || '',
    JSON.stringify(items),
    discountType,
    discountValue,
    discountAmount,
    Number(payload.amount || 0),
    Number(payload.paidAmount || 0),
    payload.dueDate || null,
    payload.status || 'مستحقة',
    payload.salesRep || '',
    payload.notes || ''
  ];

  const result = await query(text, values);
  return mapCreditSale(result.rows[0]);
}

export async function updateCreditSalesRecord(id, payload) {
  const items = Array.isArray(payload.items) ? JSON.stringify(payload.items) : undefined;
  const text = `
    UPDATE installment_sales SET 
      customer_name = COALESCE($2, customer_name),
      invoice_number = COALESCE($3, invoice_number),
      items = COALESCE($4, items),
      discount_type = COALESCE($5, discount_type),
      discount_value = COALESCE($6, discount_value),
      discount_amount = COALESCE($7, discount_amount),
      amount = COALESCE($8, amount),
      paid_amount = COALESCE($9, paid_amount),
      due_date = COALESCE($10, due_date),
      status = COALESCE($11, status),
      sales_rep = COALESCE($12, sales_rep),
      notes = COALESCE($13, notes)
    WHERE id = $1 RETURNING *
  `;
  const values = [
    id,
    payload.customerName,
    payload.invoiceNumber,
    items,
    payload.discountType,
    payload.discountValue !== undefined ? Number(payload.discountValue) : undefined,
    payload.discountAmount !== undefined ? Number(payload.discountAmount) : undefined,
    payload.amount !== undefined ? Number(payload.amount) : undefined,
    payload.paidAmount !== undefined ? Number(payload.paidAmount) : undefined,
    payload.dueDate,
    payload.status,
    payload.salesRep,
    payload.notes
  ];

  const result = await query(text, values);
  if (result.rows.length === 0) return null;
  return mapCreditSale(result.rows[0]);
}

export async function deleteCreditSalesRecord(id) {
  const result = await query('DELETE FROM installment_sales WHERE id = $1 RETURNING id', [id]);
  return result.rowCount > 0;
}

export async function getReturnsData() {
  const result = await query('SELECT * FROM return_sales ORDER BY created_at DESC');
  const returns = result.rows.map(mapReturn);

  const totalReturnsAmount = returns.reduce((sum, item) => sum + item.amount, 0);
  const pendingCount = returns.filter(item => item.status === 'قيد المراجعة').length;

  const overview = [
    {
      id: 'returns-total',
      label: 'إجمالي المرتجعات',
      value: totalReturnsAmount,
      type: 'currency',
      helper: 'قيمة المرتجعات الحالية',
      tone: 'danger'
    },
    {
      id: 'returns-count',
      label: 'عدد المرتجعات',
      value: returns.length,
      type: 'number',
      helper: 'مرتجع مسجل',
      tone: 'warning'
    },
    {
      id: 'returns-pending',
      label: 'قيد المراجعة',
      value: pendingCount,
      type: 'number',
      helper: 'تحتاج اتخاذ قرار',
      tone: 'alert'
    }
  ];

  return {
    overview,
    items: returns
  };
}

export async function createReturnRecord(payload) {
  const id = await nextId('RET', 'return_sales');

  const text = `
    INSERT INTO return_sales 
    (id, customer_name, product_name, original_invoice_number, amount, reason, return_date, status, sales_rep, notes) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *
  `;
  const values = [
    id,
    payload.customerName || '',
    payload.productName || '',
    payload.originalInvoiceNumber || '',
    Number(payload.amount || 0),
    payload.reason || '',
    payload.returnDate || null,
    payload.status || 'قيد المراجعة',
    payload.salesRep || '',
    payload.notes || ''
  ];

  const result = await query(text, values);
  return mapReturn(result.rows[0]);
}

export async function updateReturnRecord(id, payload) {
  const text = `
    UPDATE return_sales SET 
      customer_name = COALESCE($2, customer_name),
      product_name = COALESCE($3, product_name),
      original_invoice_number = COALESCE($4, original_invoice_number),
      amount = COALESCE($5, amount),
      reason = COALESCE($6, reason),
      return_date = COALESCE($7, return_date),
      status = COALESCE($8, status),
      sales_rep = COALESCE($9, sales_rep),
      notes = COALESCE($10, notes)
    WHERE id = $1 RETURNING *
  `;
  const values = [
    id,
    payload.customerName,
    payload.productName,
    payload.originalInvoiceNumber,
    payload.amount !== undefined ? Number(payload.amount) : undefined,
    payload.reason,
    payload.returnDate,
    payload.status,
    payload.salesRep,
    payload.notes
  ];

  const result = await query(text, values);
  if (result.rows.length === 0) return null;
  return mapReturn(result.rows[0]);
}

export async function deleteReturnRecord(id) {
  const result = await query('DELETE FROM return_sales WHERE id = $1 RETURNING id', [id]);
  return result.rowCount > 0;
}

function mapPriceListItem(row) {
  return {
    id: row.id,
    productName: row.product_name,
    category: row.category || '',
    purchasePrice: Number(row.purchase_price),
    sellingPrice: Number(row.selling_price),
    notes: row.notes || ''
  };
}

export async function getPriceListData() {
  const result = await query('SELECT * FROM price_list ORDER BY created_at DESC');
  const items = result.rows.map(mapPriceListItem);

  let avgMargin = 0;
  if (items.length > 0) {
    const totalMargin = items.reduce((sum, item) => {
      const margin = item.purchasePrice > 0 ? ((item.sellingPrice - item.purchasePrice) / item.purchasePrice) * 100 : 0;
      return sum + margin;
    }, 0);
    avgMargin = Math.round(totalMargin / items.length);
  }

  const overview = [
    {
      id: 'price-count',
      label: 'عدد المنتجات',
      value: items.length,
      type: 'number',
      helper: 'منتج مسجل',
      tone: 'calm'
    },
    {
      id: 'price-margin',
      label: 'متوسط هامش الربح',
      value: avgMargin,
      type: 'percent',
      helper: 'تقريبياً بناءً على التكلفة',
      tone: 'accent'
    }
  ];

  return {
    overview,
    items
  };
}

export async function createPriceListRecord(payload) {
  const id = await nextId('PRC', 'price_list');

  const text = `
    INSERT INTO price_list 
    (id, product_name, category, purchase_price, selling_price, notes) 
    VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
  `;
  const values = [
    id,
    payload.productName || '',
    payload.category || '',
    Number(payload.purchasePrice || 0),
    Number(payload.sellingPrice || 0),
    payload.notes || ''
  ];

  const result = await query(text, values);
  return mapPriceListItem(result.rows[0]);
}

export async function updatePriceListRecord(id, payload) {
  const text = `
    UPDATE price_list SET 
      product_name = COALESCE($2, product_name),
      category = COALESCE($3, category),
      purchase_price = COALESCE($4, purchase_price),
      selling_price = COALESCE($5, selling_price),
      notes = COALESCE($6, notes)
    WHERE id = $1 RETURNING *
  `;
  const values = [
    id,
    payload.productName,
    payload.category,
    payload.purchasePrice !== undefined ? Number(payload.purchasePrice) : undefined,
    payload.sellingPrice !== undefined ? Number(payload.sellingPrice) : undefined,
    payload.notes
  ];

  const result = await query(text, values);
  if (result.rows.length === 0) return null;
  return mapPriceListItem(result.rows[0]);
}

export async function deletePriceListRecord(id) {
  const result = await query('DELETE FROM price_list WHERE id = $1 RETURNING id', [id]);
  return result.rowCount > 0;
}

function mapCustodyItem(row) {
  return {
    id: row.id,
    employeeName: row.employee_name,
    custodyType: row.custody_type,
    itemDetails: row.item_details || '',
    initialAmount: Number(row.initial_amount),
    currentBalance: Number(row.current_balance),
    startDate: row.start_date ? new Date(row.start_date).toISOString().split('T')[0] : null,
    status: row.status,
    notes: row.notes || ''
  };
}

function mapCustodyTransaction(row) {
  return {
    id: row.id,
    custodyId: row.custody_id,
    transactionType: row.transaction_type,
    amount: Number(row.amount),
    date: row.date ? new Date(row.date).toISOString().split('T')[0] : null,
    notes: row.notes || ''
  };
}

function toLocalDateKey(value) {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);

  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function getCustodiesData() {
  const result = await query('SELECT * FROM custodies ORDER BY created_at DESC');
  const items = result.rows.map(mapCustodyItem);

  const activeCash = items.filter(item => item.custodyType === 'نقدية' && item.status === 'نشطة').reduce((sum, item) => sum + item.currentBalance, 0);
  const activeItemsCount = items.filter(item => item.custodyType === 'عينية' && item.status === 'نشطة').length;
  const activeCount = items.filter((item) => item.status === 'نشطة').length;

  const overview = [
    {
      id: 'custodies-cash',
      label: 'إجمالي الأرصدة النقدية',
      value: activeCash,
      type: 'currency',
      helper: 'يحتفظ بها الموظفون',
      tone: 'warning'
    },
    {
      id: 'custodies-items',
      label: 'العهد العينية',
      value: activeItemsCount,
      type: 'number',
      helper: 'أصول بصحبة الموظفين',
      tone: 'calm'
    },
    {
      id: 'custodies-active',
      label: 'العهد النشطة',
      value: activeCount,
      type: 'number',
      helper: 'إجمالي العهد المفتوحة',
      tone: 'accent'
    }
  ];

  return {
    overview,
    items
  };
}

export async function createCustodyRecord(payload) {
  const id = await nextId('CST', 'custodies');

  const text = `
    INSERT INTO custodies 
    (id, employee_name, custody_type, item_details, initial_amount, current_balance, start_date, status, notes) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
  `;
  const isCash = payload.custodyType === 'نقدية';
  const values = [
    id,
    payload.employeeName || '',
    payload.custodyType || 'نقدية',
    isCash ? '' : (payload.itemDetails || ''),
    isCash ? Number(payload.initialAmount || 0) : 0,
    isCash ? Number(payload.initialAmount || 0) : 0,
    payload.startDate || null,
    payload.status || 'نشطة',
    payload.notes || ''
  ];

  const result = await query(text, values);
  return mapCustodyItem(result.rows[0]);
}

export async function updateCustodyRecord(id, payload) {
  const text = `
    UPDATE custodies SET 
      employee_name = COALESCE($2, employee_name),
      custody_type = COALESCE($3, custody_type),
      item_details = COALESCE($4, item_details),
      initial_amount = COALESCE($5, initial_amount),
      status = COALESCE($6, status),
      start_date = COALESCE($7, start_date),
      notes = COALESCE($8, notes)
    WHERE id = $1 RETURNING *
  `;
  const values = [
    id,
    payload.employeeName,
    payload.custodyType,
    payload.itemDetails,
    payload.initialAmount !== undefined ? Number(payload.initialAmount) : undefined,
    payload.status,
    payload.startDate,
    payload.notes
  ];

  const result = await query(text, values);
  if (result.rows.length === 0) return null;
  return mapCustodyItem(result.rows[0]);
}

export async function deleteCustodyRecord(id) {
  const result = await query('DELETE FROM custodies WHERE id = $1 RETURNING id', [id]);
  return result.rowCount > 0;
}

export async function getCustodyTransactions(custodyId) {
  const result = await query('SELECT * FROM custody_transactions WHERE custody_id = $1 ORDER BY date DESC, created_at DESC', [custodyId]);
  return result.rows.map(mapCustodyTransaction);
}

export async function createCustodyTransaction(custodyId, payload) {
  const id = await nextId('CTX', 'custody_transactions');
  
  const text = `
    INSERT INTO custody_transactions 
    (id, custody_id, transaction_type, amount, date, notes) 
    VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
  `;
  const amt = Number(payload.amount || 0);
  const values = [
    id,
    custodyId,
    payload.transactionType || 'صرف',
    amt,
    payload.date || null,
    payload.notes || ''
  ];

  const result = await query(text, values);
  const transaction = mapCustodyTransaction(result.rows[0]);

  // Update current_balance of custody if it is a cash custody
  const custodyRes = await query('SELECT custody_type, current_balance FROM custodies WHERE id = $1', [custodyId]);
  if (custodyRes.rows.length > 0 && custodyRes.rows[0].custody_type === 'نقدية') {
    let currentBalance = Number(custodyRes.rows[0].current_balance);
    if (transaction.transactionType === 'صرف') {
      currentBalance -= amt;
    } else if (transaction.transactionType === 'استعاضة' || transaction.transactionType === 'إرجاع عهدة') {
      currentBalance += amt;
    } else if (transaction.transactionType === 'تسوية') {
      // Settlement does not typically change the balance unless it means wiping it, but for our case let's assume it clears remaining
      if (amt > 0) {
        currentBalance -= amt; // Treat like expense
      }
    }
    
    await query('UPDATE custodies SET current_balance = $1 WHERE id = $2', [currentBalance, custodyId]);
  }

  return transaction;
}

export async function deleteCustodyTransaction(id) {
  // We need to fetch the transaction first to reverse the balance effect
  const trRes = await query('SELECT * FROM custody_transactions WHERE id = $1', [id]);
  if (trRes.rows.length === 0) return false;
  
  const tr = mapCustodyTransaction(trRes.rows[0]);

  const custodyRes = await query('SELECT custody_type, current_balance FROM custodies WHERE id = $1', [tr.custodyId]);
  if (custodyRes.rows.length > 0 && custodyRes.rows[0].custody_type === 'نقدية') {
    let currentBalance = Number(custodyRes.rows[0].current_balance);
    if (tr.transactionType === 'صرف') {
      currentBalance += tr.amount;
    } else if (tr.transactionType === 'استعاضة' || tr.transactionType === 'إرجاع عهدة') {
      currentBalance -= tr.amount;
    } else if (tr.transactionType === 'تسوية') {
      if (tr.amount > 0) currentBalance += tr.amount;
    }
    await query('UPDATE custodies SET current_balance = $1 WHERE id = $2', [currentBalance, tr.custodyId]);
  }

  const result = await query('DELETE FROM custody_transactions WHERE id = $1 RETURNING id', [id]);
  return result.rowCount > 0;
}

// ── Checks ────────────────────────────────────────────────────────────────────

function mapCheck(row) {
  return {
    id: row.id,
    customerName: row.customer_name,
    checkNumber: row.check_number || '',
    bankName: row.bank_name || '',
    amount: Number(row.amount),
    collectionDate: toLocalDateKey(row.collection_date),
    status: row.status,
    notes: row.notes || ''
  };
}

export async function getChecksData() {
  const result = await query('SELECT * FROM checks ORDER BY collection_date ASC, created_at DESC');
  const items = result.rows.map(mapCheck);

  const today = toLocalDateKey(new Date());
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  const pendingCount = items.filter((item) => item.status === 'معلق').length;
  const todayCount = items.filter((item) => item.collectionDate === today && item.status === 'معلق').length;
  const collectedAmount = items
    .filter((item) => item.status === 'محصّل')
    .reduce((sum, item) => sum + item.amount, 0);

  const overview = [
    {
      id: 'checks-total',
      label: 'إجمالي قيمة الشيكات',
      value: totalAmount,
      type: 'currency',
      helper: 'قيمة جميع الشيكات',
      tone: 'accent'
    },
    {
      id: 'checks-pending',
      label: 'شيكات معلقة',
      value: pendingCount,
      type: 'number',
      helper: 'تنتظر التحصيل',
      tone: 'warning'
    },
    {
      id: 'checks-today',
      label: 'تحصيل اليوم',
      value: todayCount,
      type: 'number',
      helper: 'موعد تحصيلها اليوم',
      tone: todayCount > 0 ? 'alert' : 'neutral'
    },
    {
      id: 'checks-collected',
      label: 'إجمالي المحصّل',
      value: collectedAmount,
      type: 'currency',
      helper: 'شيكات تم تحصيلها',
      tone: 'calm'
    }
  ];

  return { overview, items };
}

export async function createCheckRecord(payload) {
  const id = await nextId('CHK', 'checks');

  const text = `
    INSERT INTO checks
    (id, customer_name, check_number, bank_name, amount, collection_date, status, notes)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
  `;
  const values = [
    id,
    payload.customerName || '',
    payload.checkNumber || '',
    payload.bankName || '',
    Number(payload.amount || 0),
    payload.collectionDate || null,
    payload.status || 'معلق',
    payload.notes || ''
  ];

  const result = await query(text, values);
  return mapCheck(result.rows[0]);
}

export async function updateCheckRecord(id, payload) {
  const text = `
    UPDATE checks SET
      customer_name = COALESCE($2, customer_name),
      check_number = COALESCE($3, check_number),
      bank_name = COALESCE($4, bank_name),
      amount = COALESCE($5, amount),
      collection_date = COALESCE($6, collection_date),
      status = COALESCE($7, status),
      notes = COALESCE($8, notes)
    WHERE id = $1 RETURNING *
  `;
  const values = [
    id,
    payload.customerName,
    payload.checkNumber,
    payload.bankName,
    payload.amount !== undefined ? Number(payload.amount) : undefined,
    payload.collectionDate,
    payload.status,
    payload.notes
  ];

  const result = await query(text, values);
  if (result.rows.length === 0) return null;
  return mapCheck(result.rows[0]);
}

export async function deleteCheckRecord(id) {
  const result = await query('DELETE FROM checks WHERE id = $1 RETURNING id', [id]);
  return result.rowCount > 0;
}

// ── Cash Receipts ─────────────────────────────────────────────────────────────

function mapCashReceipt(row) {
  return {
    id: row.id,
    customerName: row.customer_name,
    amount: Number(row.amount),
    receiptDate: row.receipt_date ? new Date(row.receipt_date).toISOString().split('T')[0] : null,
    notes: row.notes || ''
  };
}

export async function getCashReceiptsData() {
  const result = await query('SELECT * FROM cash_receipts ORDER BY receipt_date DESC, created_at DESC');
  const items = result.rows.map(mapCashReceipt);
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  const overview = [
    { id: 'cash-total', label: 'إجمالي المقبوض نقداً', value: totalAmount, type: 'currency', helper: 'قيمة جميع الدفعات النقدية', tone: 'calm' },
    { id: 'cash-count', label: 'عدد المقبوضات', value: items.length, type: 'number', helper: 'إجمالي سجلات الدفع النقدي', tone: 'accent' }
  ];
  return { overview, items };
}

export async function createCashReceiptRecord(payload) {
  const id = await nextId('CSH', 'cash_receipts');
  const text = `INSERT INTO cash_receipts (id, customer_name, amount, receipt_date, notes) VALUES ($1,$2,$3,$4,$5) RETURNING *`;
  const values = [id, payload.customerName || '', Number(payload.amount || 0), payload.receiptDate || null, payload.notes || ''];
  const result = await query(text, values);
  return mapCashReceipt(result.rows[0]);
}

export async function updateCashReceiptRecord(id, payload) {
  const text = `UPDATE cash_receipts SET customer_name=COALESCE($2,customer_name), amount=COALESCE($3,amount), receipt_date=COALESCE($4,receipt_date), notes=COALESCE($5,notes) WHERE id=$1 RETURNING *`;
  const values = [id, payload.customerName, payload.amount !== undefined ? Number(payload.amount) : undefined, payload.receiptDate, payload.notes];
  const result = await query(text, values);
  if (result.rows.length === 0) return null;
  return mapCashReceipt(result.rows[0]);
}

export async function deleteCashReceiptRecord(id) {
  const result = await query('DELETE FROM cash_receipts WHERE id=$1 RETURNING id', [id]);
  return result.rowCount > 0;
}

// ── Final Product Store ───────────────────────────────────────────────────────

function mapFinalProduct(row) {
  return {
    id: row.id,
    productName: row.product_name,
    category: row.category || '',
    quantity: Number(row.quantity),
    unit: row.unit || 'قطعة',
    minStock: Number(row.min_stock),
    status: row.status,
    notes: row.notes || ''
  };
}

export async function getFinalProductStoreData() {
  const result = await query('SELECT * FROM final_product_store ORDER BY created_at DESC');
  const items = result.rows.map(mapFinalProduct);
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const lowStockCount = items.filter(i => i.quantity <= i.minStock && i.quantity > 0).length;
  const outOfStockCount = items.filter(i => i.quantity <= 0).length;
  const overview = [
    { id: 'fp-total', label: 'عدد الأصناف', value: items.length, type: 'number', helper: 'صنف مسجل', tone: 'calm' },
    { id: 'fp-qty', label: 'إجمالي الكميات', value: totalQty, type: 'number', helper: 'وحدة في المخزن', tone: 'accent' },
    { id: 'fp-low', label: 'مخزون منخفض', value: lowStockCount, type: 'number', helper: 'تحتاج إعادة تعبئة', tone: 'warning' },
    { id: 'fp-out', label: 'نفد المخزون', value: outOfStockCount, type: 'number', helper: 'أصناف غير متوفرة', tone: 'alert' }
  ];
  return { overview, items };
}

export async function createFinalProductRecord(payload) {
  const id = await nextId('FPS', 'final_product_store');
  const text = `INSERT INTO final_product_store (id, product_name, category, quantity, unit, min_stock, status, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`;
  const values = [id, payload.productName||'', payload.category||'', Number(payload.quantity||0), payload.unit||'قطعة', Number(payload.minStock||0), payload.status||'متوفر', payload.notes||''];
  const result = await query(text, values);
  return mapFinalProduct(result.rows[0]);
}

export async function updateFinalProductRecord(id, payload) {
  const text = `UPDATE final_product_store SET product_name=COALESCE($2,product_name), category=COALESCE($3,category), quantity=COALESCE($4,quantity), unit=COALESCE($5,unit), min_stock=COALESCE($6,min_stock), status=COALESCE($7,status), notes=COALESCE($8,notes) WHERE id=$1 RETURNING *`;
  const values = [id, payload.productName, payload.category, payload.quantity!==undefined?Number(payload.quantity):undefined, payload.unit, payload.minStock!==undefined?Number(payload.minStock):undefined, payload.status, payload.notes];
  const result = await query(text, values);
  if (result.rows.length === 0) return null;
  return mapFinalProduct(result.rows[0]);
}

export async function deleteFinalProductRecord(id) {
  const result = await query('DELETE FROM final_product_store WHERE id=$1 RETURNING id', [id]);
  return result.rowCount > 0;
}

// ── Raw Materials & Packaging Store ───────────────────────────────────────────

function mapRawMaterial(row) {
  return {
    id: row.id,
    materialName: row.material_name,
    category: row.category || '',
    quantity: Number(row.quantity),
    unit: row.unit || 'كجم',
    minStock: Number(row.min_stock),
    status: row.status,
    notes: row.notes || ''
  };
}

export async function getRawMaterialsStoreData() {
  const result = await query('SELECT * FROM raw_materials_store ORDER BY created_at DESC');
  const items = result.rows.map(mapRawMaterial);
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const lowStockCount = items.filter(i => i.quantity <= i.minStock && i.quantity > 0).length;
  const outOfStockCount = items.filter(i => i.quantity <= 0).length;
  const overview = [
    { id: 'rm-total', label: 'عدد الخامات', value: items.length, type: 'number', helper: 'خامة مسجلة', tone: 'calm' },
    { id: 'rm-qty', label: 'إجمالي الكميات', value: totalQty, type: 'number', helper: 'وحدة في المخزن', tone: 'accent' },
    { id: 'rm-low', label: 'مخزون منخفض', value: lowStockCount, type: 'number', helper: 'تحتاج طلب شراء', tone: 'warning' },
    { id: 'rm-out', label: 'نفد المخزون', value: outOfStockCount, type: 'number', helper: 'خامات غير متوفرة', tone: 'alert' }
  ];
  return { overview, items };
}

export async function createRawMaterialRecord(payload) {
  const id = await nextId('RMS', 'raw_materials_store');
  const text = `INSERT INTO raw_materials_store (id, material_name, category, quantity, unit, min_stock, status, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`;
  const values = [id, payload.materialName||'', payload.category||'', Number(payload.quantity||0), payload.unit||'كجم', Number(payload.minStock||0), payload.status||'متوفر', payload.notes||''];
  const result = await query(text, values);
  return mapRawMaterial(result.rows[0]);
}

export async function updateRawMaterialRecord(id, payload) {
  const text = `UPDATE raw_materials_store SET material_name=COALESCE($2,material_name), category=COALESCE($3,category), quantity=COALESCE($4,quantity), unit=COALESCE($5,unit), min_stock=COALESCE($6,min_stock), status=COALESCE($7,status), notes=COALESCE($8,notes) WHERE id=$1 RETURNING *`;
  const values = [id, payload.materialName, payload.category, payload.quantity!==undefined?Number(payload.quantity):undefined, payload.unit, payload.minStock!==undefined?Number(payload.minStock):undefined, payload.status, payload.notes];
  const result = await query(text, values);
  if (result.rows.length === 0) return null;
  return mapRawMaterial(result.rows[0]);
}

export async function deleteRawMaterialRecord(id) {
  const result = await query('DELETE FROM raw_materials_store WHERE id=$1 RETURNING id', [id]);
  return result.rowCount > 0;
}

// ── Rep Sub-Stores ────────────────────────────────────────────────────────────

function mapRepSubStore(row) {
  return {
    id: row.id,
    repName: row.rep_name,
    productName: row.product_name,
    quantity: Number(row.quantity),
    deliveryDate: row.delivery_date ? new Date(row.delivery_date).toISOString().split('T')[0] : null,
    status: row.status,
    notes: row.notes || ''
  };
}

export async function getRepSubStoresData() {
  const result = await query('SELECT * FROM rep_sub_stores ORDER BY created_at DESC');
  const items = result.rows.map(mapRepSubStore);
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const deliveredCount = items.filter(i => i.status === 'مسلّم').length;
  const reps = new Set(items.map(i => i.repName)).size;
  const overview = [
    { id: 'rss-reps', label: 'عدد المناديب', value: reps, type: 'number', helper: 'مندوب نشط', tone: 'calm' },
    { id: 'rss-qty', label: 'إجمالي الكميات', value: totalQty, type: 'number', helper: 'وحدة لدى المناديب', tone: 'accent' },
    { id: 'rss-delivered', label: 'تم التسليم', value: deliveredCount, type: 'number', helper: 'عملية تسليم', tone: 'neutral' }
  ];
  return { overview, items };
}

export async function createRepSubStoreRecord(payload) {
  const id = await nextId('RSS', 'rep_sub_stores');
  const text = `INSERT INTO rep_sub_stores (id, rep_name, product_name, quantity, delivery_date, status, notes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`;
  const values = [id, payload.repName||'', payload.productName||'', Number(payload.quantity||0), payload.deliveryDate||null, payload.status||'مسلّم', payload.notes||''];
  const result = await query(text, values);
  return mapRepSubStore(result.rows[0]);
}

export async function updateRepSubStoreRecord(id, payload) {
  const text = `UPDATE rep_sub_stores SET rep_name=COALESCE($2,rep_name), product_name=COALESCE($3,product_name), quantity=COALESCE($4,quantity), delivery_date=COALESCE($5,delivery_date), status=COALESCE($6,status), notes=COALESCE($7,notes) WHERE id=$1 RETURNING *`;
  const values = [id, payload.repName, payload.productName, payload.quantity!==undefined?Number(payload.quantity):undefined, payload.deliveryDate, payload.status, payload.notes];
  const result = await query(text, values);
  if (result.rows.length === 0) return null;
  return mapRepSubStore(result.rows[0]);
}

export async function deleteRepSubStoreRecord(id) {
  const result = await query('DELETE FROM rep_sub_stores WHERE id=$1 RETURNING id', [id]);
  return result.rowCount > 0;
}

// Transfer: final product store → rep sub-store (deducts from main store)
export async function transferToRep(payload) {
  const { repName, productName, quantity, deliveryDate, notes } = payload;
  const qty = Number(quantity || 0);
  if (!repName || !productName || qty <= 0) throw new Error('يرجى إدخال اسم المندوب والمنتج وكمية صحيحة.');

  // Find the product in final_product_store
  const productResult = await query(
    'SELECT * FROM final_product_store WHERE LOWER(product_name) = LOWER($1) LIMIT 1',
    [productName]
  );
  if (productResult.rows.length === 0) throw new Error(`المنتج "${productName}" غير موجود في مخزن المنتج النهائي.`);

  const product = productResult.rows[0];
  const currentQty = Number(product.quantity);
  if (currentQty < qty) throw new Error(`الكمية المتاحة في المخزن (${currentQty}) أقل من الكمية المطلوبة (${qty}).`);

  const newQty = currentQty - qty;
  let newStatus = 'متوفر';
  if (newQty <= 0) newStatus = 'نفد';
  else if (newQty <= Number(product.min_stock)) newStatus = 'منخفض';

  // Deduct from final product store
  await query(
    'UPDATE final_product_store SET quantity=$2, status=$3 WHERE id=$1',
    [product.id, newQty, newStatus]
  );

  // Add to rep sub-store (accumulate if same rep+product exists)
  const existingRep = await query(
    'SELECT * FROM rep_sub_stores WHERE LOWER(rep_name)=LOWER($1) AND LOWER(product_name)=LOWER($2) LIMIT 1',
    [repName, productName]
  );

  let repRecord;
  if (existingRep.rows.length > 0) {
    const existing = existingRep.rows[0];
    const updResult = await query(
      'UPDATE rep_sub_stores SET quantity=$2, delivery_date=$3, status=$4, notes=$5 WHERE id=$1 RETURNING *',
      [existing.id, Number(existing.quantity) + qty, deliveryDate || null, 'مسلّم', notes || existing.notes]
    );
    repRecord = mapRepSubStore(updResult.rows[0]);
  } else {
    const id = await nextId('RSS', 'rep_sub_stores');
    const insResult = await query(
      'INSERT INTO rep_sub_stores (id, rep_name, product_name, quantity, delivery_date, status, notes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [id, repName, productName, qty, deliveryDate || null, 'مسلّم', notes || '']
    );
    repRecord = mapRepSubStore(insResult.rows[0]);
  }

  return { repRecord, deducted: qty, remainingInStore: newQty };
}

// Rep sale: deduct from rep sub-store
export async function repSaleDeduct(payload) {
  const { repName, productName, quantity } = payload;
  const qty = Number(quantity || 0);
  if (!repName || !productName || qty <= 0) throw new Error('يرجى إدخال اسم المندوب والمنتج وكمية صحيحة.');

  const existing = await query(
    'SELECT * FROM rep_sub_stores WHERE LOWER(rep_name)=LOWER($1) AND LOWER(product_name)=LOWER($2) LIMIT 1',
    [repName, productName]
  );
  if (existing.rows.length === 0) throw new Error(`المندوب "${repName}" ليس لديه مخزون من "${productName}".`);

  const row = existing.rows[0];
  const currentQty = Number(row.quantity);
  if (currentQty < qty) throw new Error(`كمية المندوب المتاحة (${currentQty}) أقل من الكمية المطلوبة (${qty}).`);

  const newQty = currentQty - qty;
  const newStatus = newQty <= 0 ? 'مسترد' : 'مسلّم';
  const result = await query(
    'UPDATE rep_sub_stores SET quantity=$2, status=$3 WHERE id=$1 RETURNING *',
    [row.id, newQty, newStatus]
  );
  return mapRepSubStore(result.rows[0]);
}

// ── Financial Manager Custody ─────────────────────────────────────────────────

let managerTotalBudget = 0;
export function getManagerBudget() { return managerTotalBudget; }
export function setManagerBudget(v) { managerTotalBudget = Math.max(0, Number(v) || 0); }

function mapFinManagerCustody(row) {
  return {
    id: row.id,
    employeeName: row.employee_name,
    amount: Number(row.amount),
    purpose: row.purpose || '',
    custodyDate: row.custody_date ? new Date(row.custody_date).toISOString().split('T')[0] : null,
    status: row.status,
    notes: row.notes || ''
  };
}

export async function getFinancialManagerCustodyData() {
  const result = await query('SELECT * FROM financial_manager_custody ORDER BY created_at DESC');
  const items = result.rows.map(mapFinManagerCustody);
  const totalAmount = items.reduce((s, i) => s + i.amount, 0);
  const activeCount = items.filter(i => i.status === 'نشطة').length;
  const available = Math.max(0, managerTotalBudget - totalAmount);
  const overview = [
    { id: 'fmc-budget', label: 'ميزانية المدير', value: managerTotalBudget, type: 'currency', helper: 'إجمالي العهدة المخصصة للمدير', tone: 'calm' },
    { id: 'fmc-total', label: 'موزّع على الموظفين', value: totalAmount, type: 'currency', helper: `${activeCount} عهدة نشطة`, tone: 'warning' },
    { id: 'fmc-available', label: 'المتاح لدى المدير', value: available, type: 'currency', helper: 'الرصيد المتبقي', tone: 'accent' }
  ];
  return { overview, items };
}

export async function createFinManagerCustodyRecord(payload) {
  const id = await nextId('FMC', 'financial_manager_custody');
  const text = `INSERT INTO financial_manager_custody (id, employee_name, amount, purpose, custody_date, status, notes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`;
  const values = [id, payload.employeeName||'', Number(payload.amount||0), payload.purpose||'', payload.custodyDate||null, payload.status||'نشطة', payload.notes||''];
  const result = await query(text, values);
  return mapFinManagerCustody(result.rows[0]);
}

export async function updateFinManagerCustodyRecord(id, payload) {
  const text = `UPDATE financial_manager_custody SET employee_name=COALESCE($2,employee_name), amount=COALESCE($3,amount), purpose=COALESCE($4,purpose), custody_date=COALESCE($5,custody_date), status=COALESCE($6,status), notes=COALESCE($7,notes) WHERE id=$1 RETURNING *`;
  const values = [id, payload.employeeName, payload.amount!==undefined?Number(payload.amount):undefined, payload.purpose, payload.custodyDate, payload.status, payload.notes];
  const result = await query(text, values);
  if (result.rows.length === 0) return null;
  return mapFinManagerCustody(result.rows[0]);
}

export async function deleteFinManagerCustodyRecord(id) {
  const result = await query('DELETE FROM financial_manager_custody WHERE id=$1 RETURNING id', [id]);
  return result.rowCount > 0;
}

export async function getFinManagerCustodyRecord(id) {
  const result = await query('SELECT * FROM financial_manager_custody WHERE id = $1 LIMIT 1', [id]);
  if (result.rows.length === 0) return null;
  return mapFinManagerCustody(result.rows[0]);
}

// ── Raw Materials Purchases ───────────────────────────────────────────────────

function mapRawPurchase(row) {
  return {
    id: row.id,
    supplierName: row.supplier_name,
    materialName: row.material_name,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    totalAmount: Number(row.total_amount),
    purchaseDate: row.purchase_date ? new Date(row.purchase_date).toISOString().split('T')[0] : null,
    invoiceNumber: row.invoice_number || '',
    notes: row.notes || ''
  };
}

export async function getRawMaterialsPurchasesData() {
  const result = await query('SELECT * FROM raw_materials_purchases ORDER BY created_at DESC');
  const items = result.rows.map(mapRawPurchase);
  const totalSpent = items.reduce((s, i) => s + i.totalAmount, 0);
  const suppliers = new Set(items.map(i => i.supplierName)).size;
  const overview = [
    { id: 'rmp-total', label: 'إجمالي المشتريات', value: totalSpent, type: 'currency', helper: 'قيمة مشتريات الخامات', tone: 'warning' },
    { id: 'rmp-count', label: 'عدد الفواتير', value: items.length, type: 'number', helper: 'فاتورة مسجلة', tone: 'calm' },
    { id: 'rmp-suppliers', label: 'عدد الموردين', value: suppliers, type: 'number', helper: 'مورد نشط', tone: 'accent' }
  ];
  return { overview, items };
}

async function getActiveManagerCustodyRows() {
  const result = await query(
    "SELECT id, amount, status, created_at FROM financial_manager_custody WHERE status = 'نشطة' ORDER BY created_at ASC"
  );
  return (result.rows || []).filter((row) => row && row.status === 'نشطة');
}

async function consumeFromManagerCustody(requiredAmount) {
  let remaining = Number(requiredAmount || 0);
  if (remaining <= 0) return;

  const activeRows = await getActiveManagerCustodyRows();
  const available = activeRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  if (remaining > available) {
    throw new Error(`رصيد عهدة المدير المالي غير كافٍ. المتاح حاليًا ${available.toFixed(2)} والمطلوب ${remaining.toFixed(2)}.`);
  }

  for (const row of activeRows) {
    if (remaining <= 0) break;
    const current = Number(row.amount || 0);
    if (current <= 0) continue;
    const consume = Math.min(current, remaining);
    const nextAmount = current - consume;
    await query('UPDATE financial_manager_custody SET amount = $2 WHERE id = $1 RETURNING id', [row.id, nextAmount]);
    remaining -= consume;
  }
}

export async function createRawPurchaseRecord(payload) {
  const id = await nextId('RMP', 'raw_materials_purchases');
  const qty = Number(payload.quantity||0);
  const up = Number(payload.unitPrice||0);
  const total = qty * up;
  await consumeFromManagerCustody(total);
  const text = `INSERT INTO raw_materials_purchases (id, supplier_name, material_name, quantity, unit_price, total_amount, purchase_date, invoice_number, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`;
  const values = [id, payload.supplierName||'', payload.materialName||'', qty, up, total, payload.purchaseDate||null, payload.invoiceNumber||'', payload.notes||''];
  const result = await query(text, values);
  return mapRawPurchase(result.rows[0]);
}

export async function updateRawPurchaseRecord(id, payload) {
  const qty = payload.quantity!==undefined ? Number(payload.quantity) : undefined;
  const up = payload.unitPrice!==undefined ? Number(payload.unitPrice) : undefined;
  const total = (qty!==undefined && up!==undefined) ? qty*up : undefined;
  const text = `UPDATE raw_materials_purchases SET supplier_name=COALESCE($2,supplier_name), material_name=COALESCE($3,material_name), quantity=COALESCE($4,quantity), unit_price=COALESCE($5,unit_price), total_amount=COALESCE($6,total_amount), purchase_date=COALESCE($7,purchase_date), invoice_number=COALESCE($8,invoice_number), notes=COALESCE($9,notes) WHERE id=$1 RETURNING *`;
  const values = [id, payload.supplierName, payload.materialName, qty, up, total, payload.purchaseDate, payload.invoiceNumber, payload.notes];
  const result = await query(text, values);
  if (result.rows.length === 0) return null;
  return mapRawPurchase(result.rows[0]);
}

export async function deleteRawPurchaseRecord(id) {
  const result = await query('DELETE FROM raw_materials_purchases WHERE id=$1 RETURNING id', [id]);
  return result.rowCount > 0;
}

// ── Raw Materials Catalog (Names) ─────────────────────────────────────────────

let rawMaterialsCatalogStore = [];
let suppliersCatalogStore = [];

function nextCatalogId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function mapCatalogItem(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category || '',
    notes: row.notes || ''
  };
}

export async function getRawMaterialsCatalogData() {
  const items = rawMaterialsCatalogStore.map(mapCatalogItem);
  const overview = [
    { id: 'rmc-count', label: 'عدد الخامات', value: items.length, type: 'number', helper: 'خامة مسجلة', tone: 'calm' }
  ];
  return { overview, items };
}

export async function createRawMaterialsCatalogRecord(payload) {
  const name = String(payload.name || '').trim();
  if (!name) throw new Error('يرجى إدخال اسم الخامة.');
  const exists = rawMaterialsCatalogStore.some((item) => item.name.trim() === name);
  if (exists) throw new Error('اسم الخامة مسجل بالفعل.');
  const created = { id: nextCatalogId('RMC'), name, category: payload.category || '', notes: payload.notes || '' };
  rawMaterialsCatalogStore.unshift(created);
  return mapCatalogItem(created);
}

export async function updateRawMaterialsCatalogRecord(id, payload) {
  const idx = rawMaterialsCatalogStore.findIndex((item) => item.id === id);
  if (idx === -1) return null;
  const nextName = payload.name !== undefined ? String(payload.name).trim() : rawMaterialsCatalogStore[idx].name;
  if (!nextName) throw new Error('يرجى إدخال اسم الخامة.');
  const duplicated = rawMaterialsCatalogStore.some((item) => item.id !== id && item.name.trim() === nextName);
  if (duplicated) throw new Error('اسم الخامة مسجل بالفعل.');
  rawMaterialsCatalogStore[idx] = {
    ...rawMaterialsCatalogStore[idx],
    name: nextName,
    category: payload.category !== undefined ? payload.category : rawMaterialsCatalogStore[idx].category,
    notes: payload.notes !== undefined ? payload.notes : rawMaterialsCatalogStore[idx].notes
  };
  return mapCatalogItem(rawMaterialsCatalogStore[idx]);
}

export async function deleteRawMaterialsCatalogRecord(id) {
  const before = rawMaterialsCatalogStore.length;
  rawMaterialsCatalogStore = rawMaterialsCatalogStore.filter((item) => item.id !== id);
  return rawMaterialsCatalogStore.length < before;
}

// ── Suppliers Catalog (Names) ─────────────────────────────────────────────────

export async function getSuppliersData() {
  const items = suppliersCatalogStore.map(mapCatalogItem);
  const overview = [
    { id: 'sup-count', label: 'عدد الموردين', value: items.length, type: 'number', helper: 'مورد مسجل', tone: 'calm' }
  ];
  return { overview, items };
}

export async function createSupplierRecord(payload) {
  const name = String(payload.name || '').trim();
  if (!name) throw new Error('يرجى إدخال اسم المورد.');
  const exists = suppliersCatalogStore.some((item) => item.name.trim() === name);
  if (exists) throw new Error('اسم المورد مسجل بالفعل.');
  const created = { id: nextCatalogId('SUP'), name, notes: payload.notes || '' };
  suppliersCatalogStore.unshift(created);
  return mapCatalogItem(created);
}

export async function updateSupplierRecord(id, payload) {
  const idx = suppliersCatalogStore.findIndex((item) => item.id === id);
  if (idx === -1) return null;
  const nextName = payload.name !== undefined ? String(payload.name).trim() : suppliersCatalogStore[idx].name;
  if (!nextName) throw new Error('يرجى إدخال اسم المورد.');
  const duplicated = suppliersCatalogStore.some((item) => item.id !== id && item.name.trim() === nextName);
  if (duplicated) throw new Error('اسم المورد مسجل بالفعل.');
  suppliersCatalogStore[idx] = {
    ...suppliersCatalogStore[idx],
    name: nextName,
    notes: payload.notes !== undefined ? payload.notes : suppliersCatalogStore[idx].notes
  };
  return mapCatalogItem(suppliersCatalogStore[idx]);
}

export async function deleteSupplierRecord(id) {
  const before = suppliersCatalogStore.length;
  suppliersCatalogStore = suppliersCatalogStore.filter((item) => item.id !== id);
  return suppliersCatalogStore.length < before;
}

// ── Machine Maintenance Purchases ─────────────────────────────────────────────

function mapMachinePurchase(row) {
  return {
    id: row.id,
    supplierName: row.supplier_name,
    description: row.description || '',
    amount: Number(row.amount),
    purchaseDate: row.purchase_date ? new Date(row.purchase_date).toISOString().split('T')[0] : null,
    machineName: row.machine_name || '',
    invoiceNumber: row.invoice_number || '',
    notes: row.notes || ''
  };
}

export async function getMachineMaintenancePurchasesData() {
  const result = await query('SELECT * FROM machine_maintenance_purchases ORDER BY created_at DESC');
  const items = result.rows.map(mapMachinePurchase);
  const totalSpent = items.reduce((s, i) => s + i.amount, 0);
  const machines = new Set(items.filter(i => i.machineName).map(i => i.machineName)).size;
  const overview = [
    { id: 'mmp-total', label: 'إجمالي تكاليف الصيانة', value: totalSpent, type: 'currency', helper: 'مشتريات صيانة المكن', tone: 'warning' },
    { id: 'mmp-count', label: 'عدد العمليات', value: items.length, type: 'number', helper: 'عملية شراء', tone: 'calm' },
    { id: 'mmp-machines', label: 'مكن مختلفة', value: machines, type: 'number', helper: 'ماكينة تمت صيانتها', tone: 'accent' }
  ];
  return { overview, items };
}

export async function createMachinePurchaseRecord(payload) {
  const id = await nextId('MMP', 'machine_maintenance_purchases');
  const amount = Number(payload.amount || 0);
  await consumeFromManagerCustody(amount);
  const text = `INSERT INTO machine_maintenance_purchases (id, supplier_name, description, amount, purchase_date, machine_name, invoice_number, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`;
  const values = [id, payload.supplierName||'', payload.description||'', amount, payload.purchaseDate||null, payload.machineName||'', payload.invoiceNumber||'', payload.notes||''];
  const result = await query(text, values);
  return mapMachinePurchase(result.rows[0]);
}

export async function updateMachinePurchaseRecord(id, payload) {
  const text = `UPDATE machine_maintenance_purchases SET supplier_name=COALESCE($2,supplier_name), description=COALESCE($3,description), amount=COALESCE($4,amount), purchase_date=COALESCE($5,purchase_date), machine_name=COALESCE($6,machine_name), invoice_number=COALESCE($7,invoice_number), notes=COALESCE($8,notes) WHERE id=$1 RETURNING *`;
  const values = [id, payload.supplierName, payload.description, payload.amount!==undefined?Number(payload.amount):undefined, payload.purchaseDate, payload.machineName, payload.invoiceNumber, payload.notes];
  const result = await query(text, values);
  if (result.rows.length === 0) return null;
  return mapMachinePurchase(result.rows[0]);
}

export async function deleteMachinePurchaseRecord(id) {
  const result = await query('DELETE FROM machine_maintenance_purchases WHERE id=$1 RETURNING id', [id]);
  return result.rowCount > 0;
}

// ── Misc Purchases ────────────────────────────────────────────────────────────

function mapMiscPurchase(row) {
  return {
    id: row.id,
    description: row.description || '',
    amount: Number(row.amount),
    category: row.category || '',
    purchaseDate: row.purchase_date ? new Date(row.purchase_date).toISOString().split('T')[0] : null,
    receiptNumber: row.receipt_number || '',
    notes: row.notes || ''
  };
}

export async function getMiscPurchasesData() {
  const result = await query('SELECT * FROM misc_purchases ORDER BY created_at DESC');
  const items = result.rows.map(mapMiscPurchase);
  const totalSpent = items.reduce((s, i) => s + i.amount, 0);
  const categories = new Set(items.filter(i => i.category).map(i => i.category)).size;
  const overview = [
    { id: 'misc-total', label: 'إجمالي المصروفات النثرية', value: totalSpent, type: 'currency', helper: 'مجموع المشتريات', tone: 'warning' },
    { id: 'misc-count', label: 'عدد العمليات', value: items.length, type: 'number', helper: 'عملية مسجلة', tone: 'calm' },
    { id: 'misc-cats', label: 'تصنيفات', value: categories, type: 'number', helper: 'تصنيف مختلف', tone: 'accent' }
  ];
  return { overview, items };
}

export async function createMiscPurchaseRecord(payload) {
  const id = await nextId('MSC', 'misc_purchases');
  const amount = Number(payload.amount || 0);
  await consumeFromManagerCustody(amount);
  const text = `INSERT INTO misc_purchases (id, description, amount, category, purchase_date, receipt_number, notes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`;
  const values = [id, payload.description||'', amount, payload.category||'', payload.purchaseDate||null, payload.receiptNumber||'', payload.notes||''];
  const result = await query(text, values);
  return mapMiscPurchase(result.rows[0]);
}

export async function updateMiscPurchaseRecord(id, payload) {
  const text = `UPDATE misc_purchases SET description=COALESCE($2,description), amount=COALESCE($3,amount), category=COALESCE($4,category), purchase_date=COALESCE($5,purchase_date), receipt_number=COALESCE($6,receipt_number), notes=COALESCE($7,notes) WHERE id=$1 RETURNING *`;
  const values = [id, payload.description, payload.amount!==undefined?Number(payload.amount):undefined, payload.category, payload.purchaseDate, payload.receiptNumber, payload.notes];
  const result = await query(text, values);
  if (result.rows.length === 0) return null;
  return mapMiscPurchase(result.rows[0]);
}

export async function deleteMiscPurchaseRecord(id) {
  const result = await query('DELETE FROM misc_purchases WHERE id=$1 RETURNING id', [id]);
  return result.rowCount > 0;
}

// ── Payroll & Advances ────────────────────────────────────────────────────────

function mapPayrollAdvance(row) {
  return {
    id: row.id,
    employeeName: row.employee_name,
    type: row.type,
    amount: Number(row.amount),
    month: row.month || '',
    status: row.status,
    notes: row.notes || ''
  };
}

export async function getPayrollAdvancesData() {
  const result = await query('SELECT * FROM payroll_advances ORDER BY created_at DESC');
  const items = result.rows.map(mapPayrollAdvance);
  const totalPayroll = items.filter(i => i.type === 'راتب').reduce((s, i) => s + i.amount, 0);
  const totalAdvances = items.filter(i => i.type === 'سلفة').reduce((s, i) => s + i.amount, 0);
  const pendingCount = items.filter(i => i.status === 'معلق').length;
  const overview = [
    { id: 'pa-salaries', label: 'إجمالي الرواتب', value: totalPayroll, type: 'currency', helper: 'رواتب مسجلة', tone: 'accent' },
    { id: 'pa-advances', label: 'إجمالي السلف', value: totalAdvances, type: 'currency', helper: 'سلف مسجلة', tone: 'warning' },
    { id: 'pa-pending', label: 'معلّقة', value: pendingCount, type: 'number', helper: 'تحتاج إجراء', tone: 'alert' }
  ];
  return { overview, items };
}

export async function createPayrollAdvanceRecord(payload) {
  const id = await nextId('PAY', 'payroll_advances');
  const amount = Number(payload.amount || 0);
  await consumeFromManagerCustody(amount);
  const text = `INSERT INTO payroll_advances (id, employee_name, type, amount, month, status, notes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`;
  const values = [id, payload.employeeName||'', payload.type||'راتب', amount, payload.month||'', payload.status||'معلق', payload.notes||''];
  const result = await query(text, values);
  return mapPayrollAdvance(result.rows[0]);
}

export async function updatePayrollAdvanceRecord(id, payload) {
  const text = `UPDATE payroll_advances SET employee_name=COALESCE($2,employee_name), type=COALESCE($3,type), amount=COALESCE($4,amount), month=COALESCE($5,month), status=COALESCE($6,status), notes=COALESCE($7,notes) WHERE id=$1 RETURNING *`;
  const values = [id, payload.employeeName, payload.type, payload.amount!==undefined?Number(payload.amount):undefined, payload.month, payload.status, payload.notes];
  const result = await query(text, values);
  if (result.rows.length === 0) return null;
  return mapPayrollAdvance(result.rows[0]);
}

export async function deletePayrollAdvanceRecord(id) {
  const result = await query('DELETE FROM payroll_advances WHERE id=$1 RETURNING id', [id]);
  return result.rowCount > 0;
}

// ── Customer Payment Alerts ───────────────────────────────────────────────────

function mapPaymentAlert(row) {
  return {
    id: row.id,
    customerName: row.customer_name,
    amount: Number(row.amount),
    dueDate: row.due_date ? new Date(row.due_date).toISOString().split('T')[0] : null,
    alertType: row.alert_type || 'فاتورة آجل',
    status: row.status,
    notes: row.notes || ''
  };
}

export async function getCustomerPaymentAlertsData() {
  const result = await query('SELECT * FROM customer_payment_alerts ORDER BY due_date ASC, created_at DESC');
  const items = result.rows.map(mapPaymentAlert);
  const totalAmount = items.reduce((s, i) => s + i.amount, 0);
  const upcomingCount = items.filter(i => i.status === 'قادم').length;
  const overdueCount = items.filter(i => i.status === 'متأخر').length;
  const overview = [
    { id: 'cpa-total', label: 'إجمالي المستحقات', value: totalAmount, type: 'currency', helper: 'مبالغ مطلوبة', tone: 'warning' },
    { id: 'cpa-upcoming', label: 'مواعيد قادمة', value: upcomingCount, type: 'number', helper: 'تنبيه قادم', tone: 'accent' },
    { id: 'cpa-overdue', label: 'متأخرة', value: overdueCount, type: 'number', helper: 'تحتاج متابعة عاجلة', tone: 'alert' }
  ];
  return { overview, items };
}

export async function createPaymentAlertRecord(payload) {
  const id = await nextId('CPA', 'customer_payment_alerts');
  const text = `INSERT INTO customer_payment_alerts (id, customer_name, amount, due_date, alert_type, status, notes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`;
  const values = [id, payload.customerName||'', Number(payload.amount||0), payload.dueDate||null, payload.alertType||'فاتورة آجل', payload.status||'قادم', payload.notes||''];
  const result = await query(text, values);
  return mapPaymentAlert(result.rows[0]);
}

export async function updatePaymentAlertRecord(id, payload) {
  const text = `UPDATE customer_payment_alerts SET customer_name=COALESCE($2,customer_name), amount=COALESCE($3,amount), due_date=COALESCE($4,due_date), alert_type=COALESCE($5,alert_type), status=COALESCE($6,status), notes=COALESCE($7,notes) WHERE id=$1 RETURNING *`;
  const values = [id, payload.customerName, payload.amount!==undefined?Number(payload.amount):undefined, payload.dueDate, payload.alertType, payload.status, payload.notes];
  const result = await query(text, values);
  if (result.rows.length === 0) return null;
  return mapPaymentAlert(result.rows[0]);
}

export async function deletePaymentAlertRecord(id) {
  const result = await query('DELETE FROM customer_payment_alerts WHERE id=$1 RETURNING id', [id]);
  return result.rowCount > 0;
}

// ── Free Samples ─────────────────────────────────────────────────────────────

function mapFreeSample(row) {
  return {
    id: row.id,
    customerName: row.customer_name,
    productName: row.product_name,
    quantity: Number(row.quantity),
    unit: row.unit || 'قطعة',
    unitPrice: Number(row.unit_price || 0),
    reason: row.reason || '',
    sampleDate: row.sample_date ? new Date(row.sample_date).toISOString().split('T')[0] : null,
    notes: row.notes || ''
  };
}

export async function getFreeSamplesData() {
  const result = await query('SELECT * FROM free_samples ORDER BY created_at DESC');
  const items = result.rows.map(mapFreeSample);
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const uniqueCustomers = new Set(items.map(i => i.customerName)).size;
  const uniqueProducts = new Set(items.map(i => i.productName)).size;
  const overview = [
    { id: 'fs-total', label: 'إجمالي العينات', value: items.length, type: 'number', helper: 'عينة مسجلة', tone: 'calm' },
    { id: 'fs-qty', label: 'إجمالي الكميات', value: totalQty, type: 'number', helper: 'وحدة تم صرفها', tone: 'accent' },
    { id: 'fs-customers', label: 'عدد العملاء', value: uniqueCustomers, type: 'number', helper: 'عميل استلم عينات', tone: 'warning' },
    { id: 'fs-products', label: 'أصناف مختلفة', value: uniqueProducts, type: 'number', helper: 'منتج تم توزيعه', tone: 'accent' }
  ];
  return { overview, items };
}

export async function createFreeSampleRecord(payload) {
  const id = await nextId('FSM', 'free_samples');
  const text = `INSERT INTO free_samples (id, customer_name, product_name, quantity, unit, unit_price, reason, sample_date, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`;
  const values = [id, payload.customerName||'', payload.productName||'', Number(payload.quantity||1), payload.unit||'قطعة', Number(payload.unitPrice||0), payload.reason||'', payload.sampleDate||null, payload.notes||''];
  const result = await query(text, values);
  return mapFreeSample(result.rows[0]);
}

export async function updateFreeSampleRecord(id, payload) {
  const text = `UPDATE free_samples SET customer_name=COALESCE($2,customer_name), product_name=COALESCE($3,product_name), quantity=COALESCE($4,quantity), unit=COALESCE($5,unit), unit_price=COALESCE($6,unit_price), reason=COALESCE($7,reason), sample_date=COALESCE($8,sample_date), notes=COALESCE($9,notes) WHERE id=$1 RETURNING *`;
  const values = [id, payload.customerName, payload.productName, payload.quantity!==undefined?Number(payload.quantity):undefined, payload.unit, payload.unitPrice!==undefined?Number(payload.unitPrice):undefined, payload.reason, payload.sampleDate, payload.notes];
  const result = await query(text, values);
  if (result.rows.length === 0) return null;
  return mapFreeSample(result.rows[0]);
}

export async function deleteFreeSampleRecord(id) {
  const result = await query('DELETE FROM free_samples WHERE id=$1 RETURNING id', [id]);
  return result.rowCount > 0;
}

// ── Product Cards ────────────────────────────────────────────────────────────

const _productCards = [];

function mapProductCard(row) {
  return {
    id: row.id,
    productName: row.productName,
    category: row.category || '',
    unit: row.unit || 'قطعة',
    code: row.code || '',
    notes: row.notes || ''
  };
}

export async function getProductCardsData() {
  const items = _productCards.map(mapProductCard);
  const overview = [
    { id: 'pc-total', label: 'إجمالي الأصناف', value: items.length, type: 'number', helper: 'صنف مسجل في النظام', tone: 'calm' }
  ];
  return { overview, items };
}

export async function createProductCardRecord(payload) {
  const id = 'PC-' + String(_productCards.length + 1).padStart(4, '0') + '-' + Date.now();
  const record = { id, productName: payload.productName || '', category: payload.category || '', unit: payload.unit || 'قطعة', code: payload.code || '', notes: payload.notes || '' };
  _productCards.push(record);
  return mapProductCard(record);
}

function normalizeProductName(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export async function importProductCardsFromNames(names = []) {
  if (!Array.isArray(names)) {
    throw new Error('بيانات الاستيراد غير صحيحة.');
  }

  const existing = new Set(_productCards.map((item) => normalizeProductName(item.productName)));
  const seenInFile = new Set();

  let insertedCount = 0;
  let duplicateCount = 0;
  let emptyCount = 0;

  for (const rawName of names) {
    const cleanedName = String(rawName || '').trim();
    if (!cleanedName) {
      emptyCount += 1;
      continue;
    }

    const key = normalizeProductName(cleanedName);
    if (existing.has(key) || seenInFile.has(key)) {
      duplicateCount += 1;
      continue;
    }

    const id = 'PC-' + String(_productCards.length + 1).padStart(4, '0') + '-' + Date.now() + '-' + insertedCount;
    _productCards.push({ id, productName: cleanedName, category: '', unit: 'قطعة', code: '', notes: '' });
    existing.add(key);
    seenInFile.add(key);
    insertedCount += 1;
  }

  return {
    insertedCount,
    duplicateCount,
    emptyCount,
    totalRows: names.length
  };
}

export async function updateProductCardRecord(id, payload) {
  const idx = _productCards.findIndex(r => r.id === id);
  if (idx === -1) return null;
  _productCards[idx] = { ..._productCards[idx], ...payload };
  return mapProductCard(_productCards[idx]);
}

export async function deleteProductCardRecord(id) {
  const idx = _productCards.findIndex(r => r.id === id);
  if (idx === -1) return false;
  _productCards.splice(idx, 1);
  return true;
}

