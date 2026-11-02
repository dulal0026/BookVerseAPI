import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPool } from './pool.js';

const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');
const pool = getPool();

await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (name VARCHAR(255) PRIMARY KEY, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
const [applied] = await pool.query('SELECT name FROM schema_migrations');
const done = new Set(applied.map((row) => row.name));
for (const name of (await fs.readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort()) {
  if (done.has(name)) continue;
  const sql = await fs.readFile(path.join(migrationsDir, name), 'utf8');
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    for (const statement of sql.split(/;\s*(?:\n|$)/).map((part) => part.trim()).filter(Boolean)) await connection.query(statement);
    await connection.query('INSERT INTO schema_migrations (name) VALUES (?)', [name]);
    await connection.commit();
    console.log(`Applied ${name}`);
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
}
await pool.end();
