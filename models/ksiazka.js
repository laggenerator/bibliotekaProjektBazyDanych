const e = require('express');
const pool = require('../db');

class Ksiazka {
  static normalizacjaISBN(isbn){
    const czystyISBN = isbn.replace(/[-\s]/g, '');
    const len = czystyISBN.length;
    
    if (len === 10) {
        return `${czystyISBN.substring(0, 2)}-${czystyISBN.substring(2, 4)}-${czystyISBN.substring(4, 9)}-${czystyISBN.substring(9)}`;
    }
    
    if (len === 13) {
        return `${czystyISBN.substring(0, 3)}-${czystyISBN.substring(3, 5)}-${czystyISBN.substring(5, 9)}-${czystyISBN.substring(9, 12)}-${czystyISBN.substring(12)}`;
    }
  }

  static formatKsiazka(ksiazka) {
    return {
      id: ksiazka.ksiazkaid,
      isbn: this.normalizacjaISBN(ksiazka.isbn),
      tytul: ksiazka.tytul,
      autor: ksiazka.autor, // tablica autorów
      rok_wydania: ksiazka.rok_wydania,
      ilosc_stron: ksiazka.ilosc_stron,
      img_link: `/assets/okladki/${this.normalizacjaISBN(ksiazka.isbn)}.webp`,
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

    const result = await pool.query(query, [this.normalizacjaISBN(ksiazka.isbn)]);
    return result.rows.map(row => this.formatKsiazka(row));
  }

  static async najnowsze6Ksiazek(){
    // const query = `
    // SELECT DISTINCT ON (tytul) * FROM ksiazki ORDER BY ksiazkaId, tytul DESC LIMIT 6;
    // `;
    const query = `
    SELECT * FROM (
      SELECT DISTINCT ON (tytul) * FROM ksiazki ORDER BY tytul
    ) AS najnowszeKsiazki
    ORDER BY ksiazkaId DESC LIMIT 6; 
    `;
    const result = await pool.query(query);
    return result.rows.map(row => this.formatKsiazka(row));
  }

  static async wyszukajKategorie(kategoria){
    const query = `
    SELECT DISTINCT ON (tytul) * FROM ksiazki WHERE kategorie::text ILIKE $1
    `;
    const pattern = `%${kategoria}%`;
    const result = await pool.query(query, [pattern]);
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
      let result = await pool.query(query, [this.normalizacjaISBN(ISBN), tytul, autorArray, rok_wydania, ilosc_stron]);
      results.push(this.formatKsiazka(result.rows[0]));
    }
    return results;
  }

  static async znajdzKsiazki(wyszukiwanie){
    const query = `
    SELECT * FROM (
      SELECT DISTINCT ON (ISBN) ksiazkaId, ISBN, tytul, autor, rok_wydania, ilosc_stron, kategorie
      FROM ksiazki
      WHERE ISBN = $1 OR tytul ~* ALL($2::text[]) OR autor::text ~* ALL($2::text[])
    ) AS wyszukiwanie ORDER BY tytul
    `;
    const arraySlow = wyszukiwanie.split(" ");
    const pattern = arraySlow.map(slowo => `\\m${slowo}`);
    
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
        isbn: this.normalizacjaISBN(ksiazka.isbn),
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