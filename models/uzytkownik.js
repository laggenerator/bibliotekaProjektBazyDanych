const e = require('express');
const pool = require('../db');
const bcrypt = require('bcryptjs');
const Ksiazka = require('./ksiazka');

class Uzytkownik {
  static async create(nazwa_uzytkownika, email, haslo){
    const haslo_hashed = await bcrypt.hash(haslo, 12);
    const client = await pool.connect();
    try{
      await client.query('BEGIN');

      const query = `
      INSERT INTO uzytkownik (nazwa_uzytkownika, email, haslo_hash, ostatnie_logowanie)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      RETURNING numer_karty, nazwa_uzytkownika, email
      `;
  
      const result = await client.query(query, [nazwa_uzytkownika, email, haslo_hashed]);
      
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      await client.release();
    }
  }

  static async auth(nazwa_uzytkownika, haslo){
    const client = await pool.connect();
    let result;
    try{
      await client.query('BEGIN');

      const query = `
      SELECT numer_karty, nazwa_uzytkownika, email, haslo_hash, aktywny, rola
      FROM uzytkownik
      WHERE nazwa_uzytkownika = $1 OR email = $1
      `;
  
      result = await client.query(query, [nazwa_uzytkownika]);
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      await client.release();
    }

    if(result.rows.length === 0){
      throw new Error("Nie odnaleziono użytkownika!");
    }

    const uzytkownik = result.rows[0];
    if(!uzytkownik.aktywny){
      throw new Error("Konto nie jest aktywne!");
    }

    const poprawnoscHasla = await bcrypt.compare(haslo, uzytkownik.haslo_hash);

    if(!poprawnoscHasla){
      throw new Error("Podane dane są niepoprawne!");
    }
    const client_ = await pool.connect();
    try{
      let query = 
        `UPDATE uzytkownik SET ostatnie_logowanie = CURRENT_TIMESTAMP WHERE numer_karty = $1`;

      result = await client.query(query, [uzytkownik.numer_karty]);
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      await client.release();
    }

    let poterminie = await this.ilePoTerminie(uzytkownik.numer_karty);

    return {
      numer_karty: uzytkownik.numer_karty,
      nazwa_uzytkownika: uzytkownik.nazwa_uzytkownika,
      email: uzytkownik.email,
      rola: uzytkownik.rola,
      poterminie: poterminie
    };
  }

  static async pokazPoTerminie(numer_karty){
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
        AND w.numer_karty = $1
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

  static async ilePoTerminie(numer_karty){
    try {
      const spis = await this.pokazPoTerminie(numer_karty);
      return spis.length;
    } catch (error){
      return 0;
    }
  }

  static async podajRecenzje(numer_karty){
    try{
      const query = `
      SELECT 
        r.id_recenzji,
        r.ocena,
        r.tekst,
        r.data_dodania,
        k.tytul AS tytul_ksiazki,
        k.isbn,
        u.nazwa_uzytkownika
      FROM recenzja r
      JOIN ksiazka k ON r.id_ksiazki = k.id_ksiazki
      JOIN uzytkownik u ON r.numer_karty = u.numer_karty
      WHERE r.numer_karty = $1
      ORDER BY r.data_dodania DESC
      `;
      const result = await pool.query(query, [numer_karty]);
      return result.rows;
    } catch (error) {
      throw new Error(error);
    }
  }

  static async istnieje(nazwa_uzytkownika, email){
    const query = `
    SELECT EXISTS(
      SELECT 1 FROM uzytkownik WHERE nazwa_uzytkownika = $1 OR email = $2
    ) as istnieje
    `;
    const result = await pool.query(query, [nazwa_uzytkownika, email]);
    return result.rows[0].istnieje;
  }

  static async znajdzPrzezKarte(numer_karty){
    const query = `
    SELECT numer_karty, nazwa_uzytkownika, email, stworzono, ostatnie_logowanie, rola
    FROM uzytkownicy
    WHERE numer_karty = $1 AND aktywny = true
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0];
  }


  // NIŻEJ SĄ JESZCZE STARE DO PRZERÓBKI NA PORZĄDNĄ BAZĘ
  static async zapodajKoszyk(numer_karty){
    const query = `SELECT koszyk FROM uzytkownicy where numer_karty = $1`;
    const result = await pool.query(query, [numer_karty]);
    return result.rows[0].koszyk;
  }

  static async ileWKoszyku(numer_karty){
    try{
      let koszyk = await this.zapodajKoszyk(numer_karty)
      return koszyk.length;
    } catch (error){
      return 0;
    }
  }

  static async dodajDoKoszyka(numer_karty, id_egzemplarza){
    const client = await pool.connect();
    try{
      await client.query(`BEGIN`);
      const query = `
      UPDATE egzemplarz
      SET status = 'W koszyku', wlasciciel = $2
      WHERE id_egzemplarza = $1 AND status = 'Wolna' AND wlasciciel IS NULL
      RETURNING *
      `;
      const result = await client.query(query, [id_egzemplarza, numer_karty]);
      await client.query('COMMIT');
      if(result.rows.length === 0){
        return false;
      } else if(result.rows.length === 1) {
        return true;
      }
    } catch (error) {
      throw new Error(error);
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  }

  static async usunZKoszyka(numer_karty, id_egzemplarza){
    const client = await pool.connect();
    try{
      await client.query(`BEGIN`);
      const query = `
      UPDATE egzemplarz
      SET status = 'Wolna', wlasciciel = NULL
      WHERE id_egzemplarza = $1 AND status = 'W koszyku' AND wlasciciel = $2
      RETURNING *
      `;
      const result = await client.query(query, [id_egzemplarza, numer_karty]);
      await client.query('COMMIT');
      if(result.rows.length === 0){
        return false;
      } else if(result.rows.length === 1) {
        return true;
      }
    } catch (error) {
      throw new Error(error);
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  }

  static async wyczyscKoszyk(numer_karty){
    const client = await pool.connect();
    try{
      await client.query(`BEGIN`);
      const query = `
      UPDATE egzemplarz
      SET status = 'Wolna', wlasciciel = NULL
      WHERE status = 'W koszyku' AND wlasciciel = $1
      RETURNING *
      `;
      const result = await client.query(query, [numer_karty]);
      await client.query('COMMIT');
      return result.rows.length
    } catch (error) {
      throw new Error(error);
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  }
}

module.exports = Uzytkownik;