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

  // NIŻEJ SĄ JESZCZE STARE DO PRZERÓBKI NA PORZĄDNĄ BAZĘ

  static async znajdzPrzezKarte(numer_karty){
    const query = `
    SELECT numer_karty, nazwa_uzytkownika, email, stworzono, ostatnie_logowanie, rola
    FROM uzytkownicy
    WHERE numer_karty = $1 AND czyaktywny = true
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0];
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

  static async dodajDoKoszyka(numer_karty, isbn){
      let koszyk = await this.zapodajKoszyk(numer_karty);
      
      const istnieje = koszyk.some(item => item.isbn == isbn);
      if(istnieje){
        throw new Error("Dana książka jest już w koszyku :)");
      }
      
      let query = `SELECT * FROM ksiazki WHERE isbn = $1 AND dostepna = True AND wkoszyku = False ORDER BY ksiazkaId`;
      const ksiazkaResult = await pool.query(query, [isbn]);
      if(ksiazkaResult.rows.length === 0){
        throw new Error("Nie mamy dostępnej żadnej kopii tej książki :(");
      }

      const ksiazka = Ksiazka.formatKsiazka(ksiazkaResult.rows[0]);
      
      koszyk.push(ksiazka);

      query = `UPDATE ksiazki SET dostepna = false, wKoszyku = true WHERE ksiazkaId = $1`;
      await pool.query(query, [ksiazka.id]);
      
      const koszykJson = JSON.stringify(koszyk);
      
      query = `UPDATE uzytkownicy SET koszyk = $1 WHERE numer_karty = $2`;
      await pool.query(query, [koszykJson, numer_karty]);
      
      return await this.zapodajKoszyk(numer_karty);
  }

  static async dodajDoKoszykaPoId(numer_karty, ksiazkaId){
      let koszyk = await this.zapodajKoszyk(numer_karty);
      let ksiazka = await Ksiazka.pobierzPoID(ksiazkaId);
      let isbn = ksiazka.isbn;
      const istnieje = koszyk.some(item => item.isbn === isbn);
      if(istnieje){
        throw new Error("Książka z tego wydania jest już w koszyku :)");
      }
      let query = `SELECT * FROM ksiazki WHERE ksiazkaId = $1 AND dostepna = true AND wkoszyku = false`;
      const ksiazkaResult = await pool.query(query, [ksiazkaId]);
      console.log(ksiazkaResult.rows);
      if(ksiazkaResult.rows.length === 0){
        throw new Error("Wybrana kopia nie jest dostępna :(");
      }
      ksiazka = Ksiazka.formatKsiazka(ksiazkaResult.rows[0]);
      
      koszyk.push(ksiazka);

      query = `UPDATE ksiazki SET dostepna = false, wkoszyku = true WHERE ksiazkaId = $1`;
      await pool.query(query, [ksiazka.id]);
      
      const koszykJson = JSON.stringify(koszyk);
      
      query = `UPDATE uzytkownicy SET koszyk = $1 WHERE numer_karty = $2`;
      await pool.query(query, [koszykJson, numer_karty]);
      
      return await this.zapodajKoszyk(numer_karty);
  }

  static async usunZKoszyka(numer_karty, ksiazkaId){
    let koszyk = await this.zapodajKoszyk(numer_karty);
    koszyk = koszyk.filter(item => item.id != ksiazkaId);
    let query = `UPDATE ksiazki SET dostepna = true, wkoszyku = false WHERE ksiazkaId = $1`;
    await pool.query(query, [ksiazkaId]);
    
    const koszykJson = JSON.stringify(koszyk);
    query = `UPDATE uzytkownicy SET koszyk = $1 WHERE numer_karty = $2`;
    await pool.query(query, [koszykJson, numer_karty]);
    return koszyk;
  }

  static async wyczyscKoszyk(numer_karty){
    let koszyk = await this.zapodajKoszyk(numer_karty);
    for(const item of koszyk){
      await this.usunZKoszyka(numer_karty, item.id);
    }
    return await this.zapodajKoszyk(numer_karty);
  }
}

module.exports = Uzytkownik;