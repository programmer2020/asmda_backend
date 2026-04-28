CREATE TABLE IF NOT EXISTS direct_sales (
  id VARCHAR(50) PRIMARY KEY,
  customer_name VARCHAR(255) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status VARCHAR(50) DEFAULT 'جديدة',
  sales_rep VARCHAR(255),
  sale_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS installment_sales (
  id VARCHAR(50) PRIMARY KEY,
  customer_name VARCHAR(255) NOT NULL,
  invoice_number VARCHAR(100),
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  due_date DATE,
  status VARCHAR(50) DEFAULT 'مستحقة',
  sales_rep VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS return_sales (
  id VARCHAR(50) PRIMARY KEY,
  customer_name VARCHAR(255) NOT NULL,
  product_name VARCHAR(255),
  original_invoice_number VARCHAR(100),
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  reason TEXT,
  return_date DATE,
  status VARCHAR(50) DEFAULT 'قيد المراجعة',
  sales_rep VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS price_list (
  id VARCHAR(50) PRIMARY KEY,
  product_name VARCHAR(255) NOT NULL,
  category VARCHAR(255),
  purchase_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS petty_cash;

CREATE TABLE IF NOT EXISTS custodies (
  id VARCHAR(50) PRIMARY KEY,
  employee_name VARCHAR(255) NOT NULL,
  custody_type VARCHAR(50) NOT NULL,
  item_details TEXT,
  initial_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  current_balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  start_date DATE,
  status VARCHAR(50) DEFAULT 'نشطة',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS custody_transactions (
  id VARCHAR(50) PRIMARY KEY,
  custody_id VARCHAR(50) NOT NULL REFERENCES custodies(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS checks (
  id VARCHAR(50) PRIMARY KEY,
  customer_name VARCHAR(255) NOT NULL,
  check_number VARCHAR(100),
  bank_name VARCHAR(255),
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  collection_date DATE,
  status VARCHAR(50) DEFAULT 'معلق',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cash_receipts (
  id VARCHAR(50) PRIMARY KEY,
  customer_name VARCHAR(255) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  receipt_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
