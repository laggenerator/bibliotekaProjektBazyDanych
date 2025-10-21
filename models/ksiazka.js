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

  static denormalizacjaISBN(isbn){
    const czystyISBN = isbn.replace(/[-\s]/g, '');
    return czystyISBN;
  }

  // static formatKsiazka(ksiazka) {
  //   return {
  //     id: ksiazka.ksiazkaid,
  //     isbn: this.normalizacjaISBN(ksiazka.isbn),
  //     tytul: ksiazka.tytul,
  //     autor: ksiazka.autor, // tablica autorów
  //     rok_wydania: ksiazka.rok_wydania,
  //     ilosc_stron: ksiazka.ilosc_stron,
  //     img_link: `/assets/okladki/${this.normalizacjaISBN(ksiazka.isbn)}.webp`,
  //     dostepna: ksiazka.dostepna,
  //     wKoszyku: ksiazka.wkoszyku,
  //     kategorie: ksiazka.kategorie
  //   };
  // }

  static formatKsiazka(ksiazka) {
  return {
    // Podstawowe informacje o książce
    id_ksiazki: ksiazka.id_ksiazki,
    isbn: this.normalizacjaISBN(ksiazka.isbn),
    tytul: ksiazka.tytul,
    rok_wydania: ksiazka.rok_wydania,
    ilosc_stron: ksiazka.ilosc_stron,
    
    // Autorzy i kategorie
    autor: ksiazka.autor || [],
    kategorie: ksiazka.kategorie || [],
    
    // Link do okładki
    img_link: ksiazka.img_link || `/assets/okladki/${this.normalizacjaISBN(ksiazka.isbn)}.webp`,
    
    // Informacje o dostępności
    dostepna: parseInt(ksiazka.liczba_dostepnych_egzemplarzy) > 0,
    wKoszyku: ksiazka.wKoszyku || false,
    
    // Statystyki recenzji
    srednia_ocena: ksiazka.srednia_ocena ? parseFloat(ksiazka.srednia_ocena) : 0,
    liczba_recenzji: parseInt(ksiazka.liczba_recenzji) || 0,
    
    // Recenzje
    recenzje: ksiazka.recenzje || [],
    
    // Informacje o egzemplarzach
    laczna_liczba_egzemplarzy: parseInt(ksiazka.liczba_egzemplarzy) || 0,
    dostepne_egzemplarze: parseInt(ksiazka.liczba_dostepnych_egzemplarzy) || 0
  };
}

  static async pobierzWszystkie(){
    // const query = `
    // SELECT * FROM ksiazka ORDER BY id_ksiazki desc;
    // `;
    const query = `
    SELECT
      k.*,
      ARRAY_AGG(DISTINCT a.imie || ' ' || a.nazwisko) AS autor,
      ARRAY_AGG(DISTINCT kat.opis) AS kategorie,
      COUNT(DISTINCT e.id_egzemplarza) AS liczba_egzemplarzy,
      COUNT(DISTINCT CASE WHEN e.status = 'Wolna' THEN e.id_egzemplarza END) AS lizcba_dostepnych_egzemplarzy,
      AVG(r.ocena) AS srednia_ocena,
      COUNT(r.id_recenzji) AS liczba_recenzji
    FROM ksiazka k
    LEFT JOIN ksiazka_autor ka ON k.id_ksiazki = ka.id_ksiazki
    LEFT JOIN autor a ON ka.id_autora = a.id_autora
    LEFT JOIN ksiazka_kategoria kk ON k.id_ksiazki = kk.id_ksiazki
    LEFT JOIN kategoria kat ON kk.id_kategorii = kat.id_kategorii
    LEFT JOIN egzemplarz e ON k.id_ksiazki = e.id_ksiazki
    LEFT JOIN recenzja r ON k.id_ksiazki = r.id_ksiazki
    GROUP BY k.id_ksiazki
    ORDER BY k.id_ksiazki DESC
    `;
    const result = await pool.query(query);
    return result.rows.map(row => this.formatKsiazka(row));
  }

  static async pobierzPoISBN(isbn){
    const query = `
    SELECT
      k.*,
      ARRAY_AGG(DISTINCT a.imie || ' ' || a.nazwisko) AS autor,
      ARRAY_AGG(DISTINCT kat.opis) AS kategorie,
      COUNT(DISTINCT e.id_egzemplarza) AS liczba_egzemplarzy,
      COUNT(DISTINCT CASE WHEN e.status = 'Wolna' THEN e.id_egzemplarza END) AS liczba_dostepnych_egzemplarzy,
      AVG(r.ocena) AS srednia_ocena,
      COUNT(r.id_recenzji) AS liczba_recenzji,
      JSON_AGG(
        DISTINCT JSONB_BUILD_OBJECT(
          'id_recenzji', r.id_recenzji,
          'tekst', r.tekst,
          'ocena', r.ocena,
          'numer_karty', r.numer_karty,
          'nazwa_uzytkownika', u.nazwa_uzytkownika,
          'data_dodania', r.data_dodania
        )
      ) FILTER (WHERE r.id_recenzji IS NOT NULL) AS recenzje
    FROM ksiazka k
    LEFT JOIN ksiazka_autor ka ON k.id_ksiazki = ka.id_ksiazki
    LEFT JOIN autor a ON ka.id_autora = a.id_autora
    LEFT JOIN ksiazka_kategoria kk ON k.id_ksiazki = kk.id_ksiazki
    LEFT JOIN kategoria kat ON kk.id_kategorii = kat.id_kategorii
    LEFT JOIN egzemplarz e ON k.id_ksiazki = e.id_ksiazki
    LEFT JOIN recenzja r ON k.id_ksiazki = r.id_ksiazki
    LEFT JOIN uzytkownik u ON r.numer_karty = u.numer_karty
    WHERE k.isbn = $1
    GROUP BY k.id_ksiazki
  `;
    const result = await pool.query(query, [this.denormalizacjaISBN(isbn)]);
    return this.formatKsiazka(result.rows[0]);
  }

  static async pobierzPoID(ksiazkaId){
    const query = `
    SELECT
      k.*,
      ARRAY_AGG(DISTINCT a.imie || ' ' || a.nazwisko) AS autor,
      ARRAY_AGG(DISTINCT kat.opis) AS kategorie,
      COUNT(DISTINCT e.id_egzemplarza) AS liczba_egzemplarzy,
      COUNT(DISTINCT CASE WHEN e.status = 'Wolna' THEN e.id_egzemplarza END) AS liczba_dostepnych_egzemplarzy,
      AVG(r.ocena) AS srednia_ocena,
      COUNT(r.id_recenzji) AS liczba_recenzji,
      JSON_AGG(
        DISTINCT JSONB_BUILD_OBJECT(
          'id_recenzji', r.id_recenzji,
          'tekst', r.tekst,
          'ocena', r.ocena,
          'numer_karty', r.numer_karty,
          'nazwa_uzytkownika', u.nazwa_uzytkownika,
          'data_dodania', r.data_dodania
        )
      ) FILTER (WHERE r.id_recenzji IS NOT NULL) AS recenzje
    FROM ksiazka k
    LEFT JOIN ksiazka_autor ka ON k.id_ksiazki = ka.id_ksiazki
    LEFT JOIN autor a ON ka.id_autora = a.id_autora
    LEFT JOIN ksiazka_kategoria kk ON k.id_ksiazki = kk.id_ksiazki
    LEFT JOIN kategoria kat ON kk.id_kategorii = kat.id_kategorii
    LEFT JOIN egzemplarz e ON k.id_ksiazki = e.id_ksiazki
    LEFT JOIN recenzja r ON k.id_ksiazki = r.id_ksiazki
    LEFT JOIN uzytkownik u ON r.numer_karty = u.numer_karty
    WHERE k.id_ksiazki = $1
    GROUP BY k.id_ksiazki
  `;
    const result = await pool.query(query, [ksiazkaId]);
    return this.formatKsiazka(result.rows[0]);
  }

  static async najnowsze6Ksiazek(){
    const query = `
    SELECT
      k.*,
      ARRAY_AGG(DISTINCT a.imie || ' ' || a.nazwisko) AS autor,
      ARRAY_AGG(DISTINCT kat.opis) AS kategorie,
      COUNT(DISTINCT e.id_egzemplarza) AS liczba_egzemplarzy,
      COUNT(DISTINCT CASE WHEN e.status = 'Wolna' THEN e.id_egzemplarza END) AS lizcba_dostepnych_egzemplarzy,
      AVG(r.ocena) AS srednia_ocena,
      COUNT(r.id_recenzji) AS liczba_recenzji
    FROM ksiazka k
    LEFT JOIN ksiazka_autor ka ON k.id_ksiazki = ka.id_ksiazki
    LEFT JOIN autor a ON ka.id_autora = a.id_autora
    LEFT JOIN ksiazka_kategoria kk ON k.id_ksiazki = kk.id_ksiazki
    LEFT JOIN kategoria kat ON kk.id_kategorii = kat.id_kategorii
    LEFT JOIN egzemplarz e ON k.id_ksiazki = e.id_ksiazki
    LEFT JOIN recenzja r ON k.id_ksiazki = r.id_ksiazki
    GROUP BY k.id_ksiazki
    ORDER BY k.id_ksiazki DESC
    LIMIT 6
    `;
    const result = await pool.query(query);
    return result.rows.map(row => this.formatKsiazka(row));
  }

  // PONIŻEJ SĄ JESZCZE STARE DO PRZERÓBKI NA PORZĄDNĄ BAZĘ

  static async kategorie(){
    const query = `
    SELECT DISTINCT unnest(kategorie) as kategorie FROM ksiazki ORDER BY kategorie;
    `;
    const result = await pool.query(query);
    return result.rows.map(row => row.kategorie);
  };

  static async wyszukajKategorie(kategoria){
    const query = `
    SELECT DISTINCT ON (tytul) * FROM ksiazki WHERE kategorie::text ILIKE $1
    `;
    const pattern = `%${kategoria}%`;
    const result = await pool.query(query, [pattern]);
    return result.rows.map(row => this.formatKsiazka(row));
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