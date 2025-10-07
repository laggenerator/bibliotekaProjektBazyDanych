const e = require('express');
const pool = require('../db');
const bcrypt = require('bcryptjs');

class Uzytkownik {
  static async create(nazwa_uzytkownika, email, haslo){
    const haslo_hashed = await bcrypt.hash(haslo, 12);
  
    const query = `
    INSERT INTO uzytkownicy (nazwa_uzytkownika, email, haslo_hash, ostatnie_logowanie)
    VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
    RETURNING numer_karty, nazwa_uzytkownika, email
    `;

    const result = await pool.query(query, [nazwa_uzytkownika, email, haslo_hashed]);
    return result.rows[0];
  }

  static async auth(nazwa_uzytkownika, haslo){
    const query = `
    SELECT numer_karty, nazwa_uzytkownika, email, haslo_hash, czyaktywny, rola
    FROM uzytkownicy
    WHERE nazwa_uzytkownika = $1 OR email = $1
    `;

    const result = await pool.query(query, [nazwa_uzytkownika]);

    if(result.rows.length === 0){
      throw new Error("Nie odnaleziono użytkownika!");
    }

    const uzytkownik = result.rows[0];
    if(!uzytkownik.czyaktywny){
      throw new Error("Konto nie jest aktywne!");
    }

    const poprawnoscHasla = await bcrypt.compare(haslo, uzytkownik.haslo_hash);

    if(!poprawnoscHasla){
      throw new Error("Podane dane są niepoprawne!");
    }

    await pool.query(
      `UPDATE uzytkownicy SET ostatnie_logowanie = CURRENT_TIMESTAMP WHERE numer_karty = $1`, [uzytkownik.numer_karty]
    );

    return {
      numer_karty: uzytkownik.numer_karty,
      nazwa_uzytkownika: uzytkownik.nazwa_uzytkownika,
      email: uzytkownik.email,
      rola: uzytkownik.rola,
      poterminie: uzytkownik.numer_karty
    };
  }

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
      SELECT 1 FROM uzytkownicy WHERE nazwa_uzytkownika = $1 OR email = $2
    ) as istnieje
    `;
    const result = await pool.query(query, [nazwa_uzytkownika, email]);
    return result.rows[0].istnieje;
  }

  static async listaZaleglosci(numer_karty){
    const query = ``;
    // Spoko byłby obiekt książka czy coś tego typu
    return [{tytul: 'XD', autor: 'Artur', termin: 'niewiemjakpodawactimestamp'}];
  }

  static async ileZaleglosci(numer_karty){
    return ((await this.listaZaleglosci(numer_karty)).length);
  }
}

module.exports = Uzytkownik;