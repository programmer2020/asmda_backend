import dotenv from 'dotenv';
import fs from 'fs';
import pg from 'pg';
dotenv.config();

async function run() {
  const adminPool = new pg.Pool({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    database: 'postgres',
    user: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
  });

  try {
    await adminPool.query('CREATE DATABASE asmdaproje_db');
    console.log('Database asmdaproje_db created successfully.');
  } catch (e) {
    if (e.code === '42P04') {
        console.log('Database already exists.');
    } else {
        console.error('Error creating database:', e.message);
        process.exit(1);
    }
  }

  await adminPool.end();

  const appPool = new pg.Pool({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    database: 'asmdaproje_db',
    user: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
  });

  try {
    const sql = fs.readFileSync('init.sql', 'utf-8');
    await appPool.query(sql);
    console.log('Tables created successfully in Postgres.');
    process.exit(0);
  } catch (err) {
    console.error('Error creating tables:', err.message);
    process.exit(1);
  }
}
run();
