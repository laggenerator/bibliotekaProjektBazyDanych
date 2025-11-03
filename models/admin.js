const e = require('express');
const pool = require('../db');
const Ksiazka = require("./ksiazka")

class Admin {
  static async pobierzUzytkownikow(){
    const query = `
    SELECT
      numer_karty,
      nazwa_uzytkownika,
      email,
      rola,
      stworzono,
      ostatnie_logowanie
    FROM uzytkownik
    ORDER BY rola DESC;
    `;

    const result = await pool.query(query);
    return result.rows;
  }
  static async ileUzytkownikow(){
    const query = `
    SELECT COUNT(numer_karty) FROM uzytkownik;
    `;
    const result = await pool.query(query);
    return result.rows[0].count;
  }
  
  static async dezaktywujUzytkownika(numer_karty){
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const query = `
      UPDATE uzytkownik
        SET aktywny = FALSE
        WHERE numer_karty = $1
        AND NOT EXISTS (
            SELECT 1 
            FROM wypozyczenie w
            JOIN wypozyczenie_egzemplarz we ON w.id_wypozyczenia = we.id_wypozyczenia
            WHERE w.numer_karty = $1 
            AND we.oddanie IS NULL
        ) RETURNING numer_karty, nazwa_uzytkownika, aktywny;
      `;
      const result = await client.query(query, [numer_karty]);

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error){
      await client.query('ROLLBACK');
      throw error;
    } finally {
      await client.release();
    }
  }

  static async aktywujUzytkownika(numer_karty){
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const query = `
      UPDATE uzytkownik
      SET aktywny = TRUE
      WHERE numer_karty = $1
      RETURNING numer_karty, nazwa_uzytkownika, aktywny;
      `;
      const result = await client.query(query, [numer_karty]);

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error){
      await client.query('ROLLBACK');
      throw error;
    } finally {
      await client.release();
    }
  }

  static async pokazPoTerminie(){
      const client = await pool.connect();
      try{
        await client.query('BEGIN');
  
        const query = `
        SELECT
          -- Info o egzemplarzu
          we.id_egzemplarza,
          we.id_wypozyczenia,
          we.oddanie,
          -- Info o zamówieniu
          w.numer_karty,
          w.poczatek,
          w.deadline,
          w.deadline < CURRENT_TIMESTAMP AS czy_po_terminie,
          EXTRACT(DAYS FROM (CURRENT_TIMESTAMP - w.deadline)) AS dni_po_terminie
        FROM wypozyczenie_egzemplarz we
        JOIN wypozyczenie w ON we.id_wypozyczenia = w.id_wypozyczenia
        WHERE we.oddanie IS NULL 
          AND w.deadline < CURRENT_TIMESTAMP
        ORDER BY dni_po_terminie DESC
        `;
    
        const result = await client.query(query, [numer_karty]);
        
        await client.query('COMMIT');
        return result.rows;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        await client.release();
      }
    }
  
    static async ilePoTerminie(){
      try {
        const spis = await this.pokazPoTerminie();
        return spis.length;
      } catch (error){
        return 0;
      }
    }
};

module.exports = Admin;