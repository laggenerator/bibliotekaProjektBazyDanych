const e = require('express');
const pool = require('../db');

class Ksiazka {
  static formatKsiazka(ksiazka) {
    return {
      id: ksiazka.ksiazkaid,
      isbn: ksiazka.isbn,
      tytul: ksiazka.tytul,
      autor: ksiazka.autor, // tablica autorów
      rok_wydania: ksiazka.rok_wydania,
      ilosc_stron: ksiazka.ilosc_stron,
      img_link: `/assets/okladki/${ksiazka.isbn}.webp`,
      dostepna: ksiazka.dostepna,
      kategorie: ksiazka.kategorie
    };
  }

  static async pobierzWszystkie(){
    const query = `
    SELECT DISTINCT ON (isbn) * FROM ksiazki ORDER BY isbn, tytul;
    `;
    const result = await pool.query(query);
    return result.rows.map(row => this.formatKsiazka(row));
  }

  static async kategorie(){
    const query = `
    SELECT DISTINCT unnest(kategorie) as kategorie FROM ksiazki ORDER BY kategorie;
    `;
    const result = await pool.query(query);
    return result.rows.map(row => row.kategorie);
  };

  static async pobierzPoISBN(isbn){
    const query = `
    SELECT ksiazkaid, ISBN, tytul, autor, rok_wydania, ilosc_stron, dostepna, kategorie FROM ksiazki WHERE isbn = $1 ORDER BY dostepna;
    `;

    const result = await pool.query(query, [isbn]);
    return result.rows.map(row => this.formatKsiazka(row));
  }

  static async najnowsze6Ksiazek(){
    const query = `
    SELECT DISTINCT ON (tytul) * FROM ksiazki ORDER BY tytul, ksiazkaId DESC LIMIT 6;
    `;
    const result = await pool.query(query);
    return result.rows.map(row => this.formatKsiazka(row));
  }

  static async create(ISBN, tytul, autor, rok_wydania, ilosc_stron, ilosc_kopii){
    const autorArray = Array.isArray(autor) ? autor : [autor];
    const query = `
    INSERT INTO ksiazki (ISBN, tytul, autor, rok_wydania, ilosc_stron)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING ksiazkaId
    `;
    let results = [];
    for(let i=0;i<ilosc_kopii;i++){
      let result = await pool.query(query, [ISBN, tytul, autorArray, rok_wydania, ilosc_stron]);
      results.push(this.formatKsiazka(result.rows[0]));
    }
    return results;
  }

  static async znajdzKsiazki(wyszukiwanie){
    const query = `
    SELECT DISTINCT ON (ISBN) ksiazkaId, ISBN, tytul, autor, rok_wydania, ilosc_stron, kategorie
    FROM ksiazki
    WHERE ISBN = $1 OR tytul ILIKE $2 OR autor::text ILIKE $2
    `;
    
    const pattern = `%${wyszukiwanie}%`;
    const result = await pool.query(query, [wyszukiwanie, pattern]);
    return result.rows.map(row => this.formatKsiazka(row));

    console.log(result.rows.length);
    return result.rows[0];
  }

  static async zaklepKsiazke(ksiazkaId){
    const query = `
    UPDATE ksiazki SET dostepna = false WHERE ksiazkaId = $1
    `;

    const result = await pool.query(query, [ksiazkaId]);
    return result.rows[0];
  }

  static async dodaj(ksiazka){
    try {
      const dodawanaKsiazka = {
        ...ksiazka,
        // podwójna walidacja
        autor: Array.isArray(ksiazka.autor) ? ksiazka.autor : [ksiazka.autor],
        kategorie: Array.isArray(ksiazka.kategorie) ? ksiazka.kategorie : [ksiazka.kategorie]
      }

      const query = `
      INSERT INTO ksiazki (
      tytul, autor, isbn, rok_wydania, ilosc_stron, kategorie)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `;

      const result = await pool.query(query, [dodawanaKsiazka.tytul, dodawanaKsiazka.autor, dodawanaKsiazka.isbn, dodawanaKsiazka.rok_wydania, dodawanaKsiazka.ilosc_stron, dodawanaKsiazka.kategorie])
      
      return result.rows.map(row => this.formatKsiazka(row));
    } catch (error) {
      throw error;
    }
  }
};

module.exports = Ksiazka;