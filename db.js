const { Pool } = require("pg");
require("dotenv").config();

if (process.env.NODE_ENV === "test") {
  process.env.DB_NAME = "testy_hej";
  console.log("Używany .env.test");
} else {
  console.log("Używany .env");
}
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

module.exports = pool;
