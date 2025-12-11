const bcrypt = require("bcryptjs");
const pool = require("../db");
const Uzytkownik = require("../models/uzytkownik");

class TestHelper {
  constructor() {
    if (process.env.DB_NAME != "testy_hej") {
      throw new Error("ZŁA BAZA DANYCH");
    }
    this.pool = pool;
  }
  async przygotujTesty() {
    const client = await pool.connect();
    if (process.env.DB_NAME != "testy_hej") {
      throw new Error("ZŁA BAZA DANYCH");
    }
    try {
      await client.query("BEGIN");

      await client.query("SET CONSTRAINTS ALL DEFERRED");

      await this.truncateAllTables(client);

      await this.wygenerujAdmina(client);

      await this.wygenerujUzytkownika(client);

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async truncateAllTables(client) {
    // Trunkacja
    const result = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      AND tablename NOT IN ('knex_migrations', 'knex_migrations_lock', 'spatial_ref_sys')
    `);

    if (result.rows.length > 0) {
      const tables = result.rows.map((row) => `"${row.tablename}"`).join(", ");
      await client.query(`TRUNCATE TABLE ${tables} CASCADE`);
    }

    // Reset sekwencji
    await client.query(`
      DO $$
      DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT schemaname, sequencename FROM pg_sequences WHERE schemaname = 'public') 
        LOOP
          EXECUTE 'ALTER SEQUENCE "' || r.schemaname || '"."' || r.sequencename || '" RESTART WITH 1';
        END LOOP;
      END $$;
    `);
  }

  async wygenerujAdmina(client) {
    const admin_hashed = await bcrypt.hash("admin", 12);
    await client.query(
      `
      INSERT INTO uzytkownik(nazwa_uzytkownika, email, haslo_hash, rola)
      VALUES ($1, $2, $3, $4)
    `,
      ["admin", "admin@pwrowicz.pl", admin_hashed, "ADMIN"]
    );
  }

  async wygenerujUzytkownika(client) {
    const uzytkownik_hashed = await bcrypt.hash("uzytkownik", 12);
    await client.query(
      `
      INSERT INTO uzytkownik(nazwa_uzytkownika, email, haslo_hash)
      VALUES ($1, $2, $3)
    `,
      ["uzytkownik", "uzytkownik@pwrowicz.pl", uzytkownik_hashed]
    );
  }

  async rozlacz() {
    await this.pool.end();
  }
}

module.exports = TestHelper;
