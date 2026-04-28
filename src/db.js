import dotenv from 'dotenv';
import pg from 'pg';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ENV_PATH = join(__dirname, '../../.env');

// Runtime-switchable mode (persists to .env on switch)
let currentMode = (process.env.DATA_MODE ?? 'local').toLowerCase();

// Cloud pool using DATABASE_URL (Neon) or individual host vars
function createCloudPool() {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString) {
    return new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  }
  return new Pool({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME ?? 'asmdaproje_db',
    user: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    connectionTimeoutMillis: 5000
  });
}

const cloudPool = createCloudPool();

let cachedStatus = {
  connected: false,
  mode: currentMode === 'local' ? 'local' : 'checking',
  message: currentMode === 'local' ? 'الوضع المحلي مفعل بدون Postgres.' : 'جارٍ التحقق من اتصال قاعدة البيانات.',
  time: new Date().toISOString(),
  source: currentMode === 'local' ? 'local' : 'cloud'
};
let lastCheckedAt = 0;

export function getCurrentMode() {
  return currentMode;
}

export function switchMode(mode) {
  currentMode = mode;
  lastCheckedAt = 0; // reset status cache
  try {
    let envContent = readFileSync(ENV_PATH, 'utf-8');
    if (/^DATA_MODE=/m.test(envContent)) {
      envContent = envContent.replace(/^DATA_MODE=.*/m, `DATA_MODE=${mode}`);
    } else {
      envContent += `\nDATA_MODE=${mode}`;
    }
    writeFileSync(ENV_PATH, envContent, 'utf-8');
  } catch { /* non-fatal */ }
}

function isLocalMode() {
  return currentMode === 'local';
}

// In-memory store for local mode — persists for the lifetime of the process
const mockData = {
  direct_sales: [],
  installment_sales: [],
  return_sales: [],
  price_list: [],
  custodies: [],
  custody_transactions: [],
  financial_manager_custody: [],
  raw_materials_purchases: [],
  machine_maintenance_purchases: [],
  misc_purchases: [],
  payments: [],
  customer_payments_accounts: [],
  free_samples: [],
  product_cards: [],
  final_product_store: [],
  raw_materials_store: [],
  rep_sub_stores: [],
  cash_receipts: [],
  tasks: []
};

export async function query(text, params = []) {
  if (isLocalMode()) {
    // INSERT ... RETURNING: build row from column list, persist to mockData
    if (/^\s*INSERT\s+INTO\s+/i.test(text) && /RETURNING/i.test(text)) {
      const tableName = text.match(/INSERT\s+INTO\s+(\w+)/i)?.[1];
      const colMatch = text.match(/\(([^)]+)\)\s+VALUES/i);
      const row = { created_at: new Date() };
      if (colMatch) {
        const columns = colMatch[1].split(',').map(c => c.trim());
        columns.forEach((col, i) => { row[col] = params[i]; });
      }
      if (tableName) {
        if (!mockData[tableName]) mockData[tableName] = [];
        mockData[tableName].unshift(row);
      }
      return { rows: [row], rowCount: 1 };
    }

    // UPDATE ... RETURNING: apply changes to existing record in mockData
    if (/^\s*UPDATE\s+/i.test(text) && /RETURNING/i.test(text)) {
      const tableName = text.match(/UPDATE\s+(\w+)/i)?.[1];
      const id = params[0];
      const table = mockData[tableName];
      const existing = table?.find(r => r.id === id) ?? { id };
      const setClauses = text.match(/SET\s+(.+?)\s+WHERE/is)?.[1] ?? '';
      const re = /\b(\w+)\s*=\s*(?:COALESCE\(\s*)?\$(\d+)/gi;
      let m;
      while ((m = re.exec(setClauses)) !== null) {
        const val = params[parseInt(m[2], 10) - 1];
        if (val !== undefined) existing[m[1]] = val;
      }
      return { rows: [existing], rowCount: 1 };
    }

    // DELETE FROM: remove record from mockData
    if (/^\s*DELETE\s+FROM\s+/i.test(text)) {
      const tableName = text.match(/DELETE\s+FROM\s+(\w+)/i)?.[1];
      const id = params[0];
      if (tableName && mockData[tableName]) {
        mockData[tableName] = mockData[tableName].filter(r => r.id !== id);
      }
      if (/RETURNING/i.test(text)) return { rows: [{ id }], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    }

    // SELECT: return from mockData
    const tableName = text.match(/FROM\s+([a-zA-Z0-9_]+)/i)?.[1];
    return {
      rows: mockData[tableName] ? [...mockData[tableName]] : [],
      rowCount: mockData[tableName]?.length ?? 0
    };
  }
  return cloudPool.query(text, params);
}

export async function getDatabaseStatus(force = false) {
  if (isLocalMode()) {
    cachedStatus = {
      connected: false,
      mode: 'local',
      message: 'الوضع المحلي مفعل — البيانات مؤقتة في الذاكرة.',
      time: new Date().toISOString(),
      source: 'local'
    };
    return cachedStatus;
  }

  if (!force && Date.now() - lastCheckedAt < 15000) {
    return cachedStatus;
  }

  try {
    const result = await cloudPool.query('SELECT NOW() AS now');
    cachedStatus = {
      connected: true,
      mode: 'cloud',
      message: 'الاتصال بقاعدة Neon Cloud يعمل بشكل سليم.',
      time: result.rows[0].now,
      source: 'cloud'
    };
  } catch (error) {
    cachedStatus = {
      connected: false,
      mode: 'cloud',
      message: `خطأ في الاتصال بـ Neon: ${error.message}`,
      time: new Date().toISOString(),
      source: 'cloud'
    };
  }

  lastCheckedAt = Date.now();
  return cachedStatus;
}

export async function safeQuery(text, params = []) {
  try {
    const result = await query(text, params);
    return {
      ok: true,
      rows: result.rows
    };
  } catch (error) {
    return {
      ok: false,
      error
    };
  }
}
