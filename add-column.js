import pg from 'pg';
const pool = new pg.Pool({
  connectionString: 'postgresql://neondb_owner:npg_ZfmuYvSP41Xt@ep-billowing-sound-anzg12ng-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});
pool.query('ALTER TABLE return_sales ADD COLUMN IF NOT EXISTS product_name VARCHAR(255)')
  .then(() => { console.log('Column added OK'); pool.end(); })
  .catch(e => { console.error('Error:', e.message); pool.end(); });
