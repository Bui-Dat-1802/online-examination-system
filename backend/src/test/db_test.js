const pool = require("../config/db");

async function testConnection() {
  const result = await pool.query("SELECT NOW()");
  console.log("DB connected, time:", result.rows[0]);
}

testConnection().catch(console.error);
