import pg from 'pg';
const pool = new pg.Pool({
  connectionString: 'postgresql://neondb_owner:npg_ZfmuYvSP41Xt@ep-billowing-sound-anzg12ng-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});
pool.query(`
  CREATE TABLE IF NOT EXISTS free_samples (
    id            VARCHAR(20)    PRIMARY KEY,
    customer_name VARCHAR(255)   NOT NULL DEFAULT '',
    product_name  VARCHAR(255)   NOT NULL DEFAULT '',
    quantity      INTEGER        NOT NULL DEFAULT 1,
    unit          VARCHAR(50)    NOT NULL DEFAULT 'قطعة',
    unit_price    NUMERIC(12,2)  NOT NULL DEFAULT 0,
    reason        TEXT           NOT NULL DEFAULT '',
    sample_date   DATE,
    notes         TEXT           NOT NULL DEFAULT '',
    created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW()
  );
  ALTER TABLE free_samples ADD COLUMN IF NOT EXISTS unit_price NUMERIC(12,2) NOT NULL DEFAULT 0;
`)
  .then(() => { console.log('free_samples table ready with unit_price OK'); pool.end(); })
  .catch(e => { console.error('Error:', e.message); pool.end(); });
