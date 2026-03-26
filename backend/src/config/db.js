const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST || "172.31.85.93",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "exam_db",
  user: process.env.DB_USER || "exam_user",
  password: process.env.DB_PASS || "123123123",
});

module.exports = pool;
