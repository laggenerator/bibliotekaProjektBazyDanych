const e = require('express');
const pool = require('../db');
const Ksiazka = require("./ksiazka")

class Egzemplarz {
  static async dodajEgzemplarz(id_ksiazki){
    const client = await pool.connect();
    try{
      const egz = await this.znajdzDlaKsiazki(id_ksiazki);
      const lokalizacje = egz.map(e => ({
        pokoj: e.pokoj,
        polka: e.polka
      }));
      const losowaLokalizacja = lokalizacje[Math.floor(Math.random() * lokalizacje.length)];
      await client.query('BEGIN');
      const query = `
      INSERT INTO egzemplarz(id_ksiazki, id_lokalizacji, wlasciciel)
      SELECT $1, id_lokalizacji, NULL FROM magazyn WHERE pokoj = $2 AND polka = $3
      AND EXISTS (
        SELECT 1 FROM ksiazka WHERE id_ksiazki = $1
      ) RETURNING id_egzemplarza;
      `;
      const result = await client.query(query, [id_ksiazki, losowaLokalizacja.pokoj, losowaLokalizacja.polka]);
      await client.query('COMMIT');
      return result.rows[0].id_egzemplarza;
    } catch(error){
      await client.query('ROLLBACK');
      throw new Error(error);
    } finally{
      client.release();
    }
  }


  static async znajdzDlaKsiazki(id_ksiazki) {
    const query = `
      SELECT 
        e.id_egzemplarza,
        e.id_ksiazki,
        e.id_lokalizacji,
        e.status,
        e.wlasciciel,
        m.pokoj,
        m.polka,
        u.nazwa_uzytkownika,
        u.numer_karty,
        CASE 
          WHEN e.status = 'Wolna' THEN true
          ELSE false
        END AS dostepna,
        CASE 
          WHEN e.status = 'W koszyku' THEN true
          ELSE false
        END AS wKoszyku
      FROM egzemplarz e
      LEFT JOIN magazyn m ON e.id_lokalizacji = m.id_lokalizacji
      LEFT JOIN uzytkownik u ON e.wlasciciel = u.numer_karty
      WHERE e.id_ksiazki = $1
      ORDER BY e.id_egzemplarza
    `;
    
    const result = await pool.query(query, [id_ksiazki]);
    return result.rows;
  }

  static async znajdzPoId(id_egzemplarza) {
    const query = `
      SELECT 
        e.*,
        k.tytul,
        k.isbn,
        m.pokoj,
        m.polka,
        u.nazwa_uzytkownika
      FROM egzemplarz e
      JOIN ksiazka k ON e.id_ksiazki = k.id_ksiazki
      LEFT JOIN magazyn m ON e.id_lokalizacji = m.id_lokalizacji
      LEFT JOIN uzytkownik u ON e.wlasciciel = u.numer_karty
      WHERE e.id_egzemplarza = $1
    `;
    
    const result = await pool.query(query, [id_egzemplarza]);
    return result.rows[0] || null;
  }

  static async zmienStatus(id_egzemplarza, nowy_status) {
    const query = `
      UPDATE egzemplarz 
      SET status = $1 
      WHERE id_egzemplarza = $2
      RETURNING *
    `;
    
    const result = await pool.query(query, [nowy_status, id_egzemplarza]);
    return result.rows[0];
  }

  static async dostepneDlaKsiazki(id_ksiazki) {
    const query = `
      SELECT COUNT(*) 
      FROM egzemplarz 
      WHERE id_ksiazki = $1 AND status = 'Wolna'
    `;
    
    const result = await pool.query(query, [id_ksiazki]);
    return parseInt(result.rows[0].count);
  }
}

module.exports = Egzemplarz;