// runMigrations.js
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

async function runSqlFile(client, filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  await client.query(sql);
  console.log('Ran', filePath);
}

(async () => {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });
  await client.connect();

  try {
    await runSqlFile(client, path.resolve(__dirname, '../migrations/001_init.sql'));
    await runSqlFile(client, path.resolve(__dirname, '../migrations/002_add_show_answers.sql'));
    await runSqlFile(client, path.resolve(__dirname, '../seeds/001_seed_basic.sql'));
    console.log('Migrations & seeds applied successfully.');
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
})();
