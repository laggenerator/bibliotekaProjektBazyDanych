const e = require('express');
const pool = require('../db');
const bcrypt = require('bcryptjs');
const Ksiazka = require('./ksiazka');

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
      
      let query = `SELECT * FROM ksiazki WHERE isbn = $1 AND dostepna = True`;
      const ksiazkaResult = await pool.query(query, [isbn]);
      if(ksiazkaResult.rows.length === 0){
        throw new Error("Nie mamy dostępnej żadnej kopii tej książki :(");
      }

      const ksiazka = Ksiazka.formatKsiazka(ksiazkaResult.rows[0]);
      
      koszyk.push(ksiazka);

      query = `UPDATE ksiazki SET dostepna = FALSE WHERE ksiazkaId = $1`;
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
      let query = `SELECT * FROM ksiazki WHERE ksiazkaId = $1 AND dostepna = True`;
      const ksiazkaResult = await pool.query(query, [ksiazkaId]);
      if(ksiazkaResult.rows.length === 0){
        throw new Error("Wybrana kopia nie jest dostępna :(");
      }
      ksiazka = Ksiazka.formatKsiazka(ksiazkaResult.rows[0]);
      
      koszyk.push(ksiazka);

      query = `UPDATE ksiazki SET dostepna = FALSE WHERE ksiazkaId = $1`;
      await pool.query(query, [ksiazka.id]);
      
      const koszykJson = JSON.stringify(koszyk);
      
      query = `UPDATE uzytkownicy SET koszyk = $1 WHERE numer_karty = $2`;
      await pool.query(query, [koszykJson, numer_karty]);
      
      return await this.zapodajKoszyk(numer_karty);
  }

  static async usunZKoszyka(numer_karty, ksiazkaId){
    let koszyk = await this.zapodajKoszyk(numer_karty);
    koszyk = koszyk.filter(item => item.id != ksiazkaId);
    let query = `UPDATE ksiazki SET dostepna = TRUE WHERE ksiazkaId = $1`;
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