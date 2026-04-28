import fs from 'fs';
import { query } from './src/db.js';

async function run() {
  try {
    const sql = fs.readFileSync('init.sql', 'utf-8');
    await query(sql);
    console.log('Tables created successfully in Postgres.');
    process.exit(0);
  } catch (error) {
    console.error('Error creating tables:', error.message);
    process.exit(1);
  }
}

run();
