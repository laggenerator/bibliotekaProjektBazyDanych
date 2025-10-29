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
    img_link: ksiazka.img_link || `/assets/okladki/${this.denormalizacjaISBN(ksiazka.isbn)}.webp`,
    
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
      COUNT(DISTINCT CASE WHEN e.status = 'Wolna' THEN e.id_egzemplarza END) AS liczba_dostepnych_egzemplarzy,
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
    ORDER BY liczba_dostepnych_egzemplarzy DESC
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
    const ksiazka = this.formatKsiazka(result.rows[0])
    return ksiazka;
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
      COUNT(DISTINCT CASE WHEN e.status = 'Wolna' THEN e.id_egzemplarza END) AS liczba_dostepnych_egzemplarzy,
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

  static async kategorie(){
    const query = `
    SELECT opis FROM kategoria ORDER BY id_kategorii ASC;
    `;
    const result = await pool.query(query);
    return result.rows.map(row => row.opis);
  };

  static async wyszukajKategorie(kategoria){
    const query = `
    SELECT
      k.*,
      ARRAY_AGG(DISTINCT a.imie || ' ' || a.nazwisko) AS autor,
      ARRAY_AGG(DISTINCT kat.opis) AS kategorie
    FROM ksiazka k
    LEFT JOIN ksiazka_autor ka ON k.id_ksiazki = ka.id_ksiazki
    LEFT JOIN autor a ON ka.id_autora = a.id_autora
    LEFT JOIN ksiazka_kategoria kk ON k.id_ksiazki = kk.id_ksiazki
    LEFT JOIN kategoria kat ON kk.id_kategorii = kat.id_kategorii
    WHERE kat.opis ILIKE $1
    GROUP BY k.id_ksiazki
    ORDER BY k.tytul
    `;
    const pattern = `%${kategoria}%`;
    const result = await pool.query(query, [pattern]);
    return result.rows.map(row => this.formatKsiazka(row));
  }

    static async dodaj(ksiazka){
    const client = await pool.connect();
    try{
      await client.query("BEGIN");
      const dodawanaKsiazka = {
        ...ksiazka,
        isbn: this.denormalizacjaISBN(ksiazka.isbn),
        autor: Array.isArray(ksiazka.autor) ? ksiazka.autor : [ksiazka.autor],
        kategorie: Array.isArray(ksiazka.kategorie) ? ksiazka.kategorie : [ksiazka.kategorie]  
      
      }

      // Dodawania książki do ksiazka
      const ksiazkaQuery = `
        INSERT INTO ksiazka (isbn, tytul, rok_wydania, ilosc_stron)
        SELECT $1::varchar(13), $2, $3, $4
        WHERE NOT EXISTS (
            SELECT 1 FROM ksiazka WHERE isbn = $1
        )
        RETURNING id_ksiazki
      `;
      const ksiazkaResult = await client.query(ksiazkaQuery, [
        dodawanaKsiazka.isbn,
        dodawanaKsiazka.tytul,
        parseInt(dodawanaKsiazka.rok_wydania),
        parseInt(dodawanaKsiazka.ilosc_stron)
      ]);
      if (ksiazkaResult.rows.length === 0) {
        throw new Error('Książka o takim ISBN już istnieje w bazie');
      }

      const idKsiazki = ksiazkaResult.rows[0].id_ksiazki;

      // Dodawanie autorów do autor
      for (const autorStr of dodawanaKsiazka.autor){
        const pociety_autor = autorStr.trim().split(" ");
        if(pociety_autor.length < 1){
          throw new Error("TO AUTOR NAWET IMIENIA NIE MA!!!???")
        }
        let nazwisko = '';
        if(pociety_autor.length > 1){
          nazwisko = pociety_autor.pop();
        }
        const imie = pociety_autor.join(" ");
        const autorQuery = `
        INSERT INTO autor(imie, nazwisko)
        SELECT $1, $2
        WHERE NOT EXISTS(
          SELECT 1 FROM autor WHERE imie = $1 AND nazwisko = $2
        )
        RETURNING id_autora
        `;
        

        const autorResult = await client.query(autorQuery, [imie, nazwisko]);

        const idAutora = autorResult.rows.length > 0 
        ? autorResult.rows[0].id_autora
        : (await client.query(
          `SELECT id_autora FROM autor WHERE imie = $1::text AND nazwisko = $2::text`, [imie, nazwisko]
        )).rows[0].id_autora;
        // DOBRA A CO ROBIMY JAK DWOCH SIE TAK SAMO NAZYWA TO TRZEBA ROZWIAZAC A NIE ZE LACZYMY LUDZI
        const autorKsiazkaQuery = `
        INSERT INTO ksiazka_autor (id_ksiazki, id_autora)
        VALUES($1, $2)
        `;
        const autorKsiazkaResult = await client.query(autorKsiazkaQuery, [idKsiazki, idAutora]);
      }
      // Dodawanie kategorii do kategoria
      for(const kategoriaStr of dodawanaKsiazka.kategorie){
        const opis = kategoriaStr.trim();
        if(!opis) continue;

        const kategoriaQuery = `
        INSERT INTO kategoria(opis)
        VALUES ($1::text)
        ON CONFLICT (opis) DO NOTHING
        RETURNING id_kategorii
        `;

        const kategoriaResult = await client.query(kategoriaQuery, [opis]);
        const idKategorii = kategoriaResult.rows.length > 0 
        ? kategoriaResult.rows[0].id_kategorii
        : (await client.query(
          `SELECT id_kategorii FROM kategoria WHERE opis ILIKE $1`, [opis]
        )).rows[0].id_kategorii;

        const kategoriaKsiazkaQuery = `
        INSERT INTO ksiazka_kategoria (id_ksiazki, id_kategorii)
        VALUES ($1, $2)
        `;

        const kategoriaKsiazkaResult = await client.query(kategoriaKsiazkaQuery, [idKsiazki, idKategorii]);
      }
      let dodaneItemy = [];
      // Dodawania egezemplarzy do egzemplarze
      if(dodawanaKsiazka.liczba_kopii && dodawanaKsiazka.liczba_kopii > 0){
        const domyslnyPokoj = 21;
        const domyslnaPolka = 37;

        const lokalizacjaQuery = `
        INSERT INTO magazyn (pokoj, polka)
        SELECT $1, $2
        WHERE NOT EXISTS (
          SELECT 1 FROM magazyn WHERE pokoj = $1 AND polka = $2
        ) RETURNING id_lokalizacji
        `;

        const lokalizacjaResult = await client.query(lokalizacjaQuery, [domyslnyPokoj, domyslnaPolka]);
        const idLokalizacji = lokalizacjaResult.rows.length > 0 
        ? lokalizacjaResult.rows[0].id_lokalizacji
        : (await client.query(`
          SELECT id_lokalizacji FROM magazyn WHERE pokoj = $1 AND polka = $2`, [domyslnyPokoj, domyslnaPolka]
        )).rows[0].id_lokalizacji;

        const egzemplarzQuery = `
        INSERT INTO egzemplarz(id_ksiazki, id_lokalizacji)
        VALUES ($1, $2)
        RETURNING id_ksiazki
        `;
        for(let i=0;i<dodawanaKsiazka.liczba_kopii;i++){
          let placeholder = await client.query(egzemplarzQuery, [idKsiazki, idLokalizacji]);
        }
      }
      await client.query("COMMIT");
      return idKsiazki;
    } catch (error){
      await client.query("ROLLBACK");
      console.log([error])
      throw new Error(`Błąd podczas dodawania książki: ${error}`);
    } finally {
      client.release();
    }
  }


  static async dodajRecenzje(recenzja){
    const client = await pool.connect();
    try{
      client.query("BEGIN")
      const recenzjaQuery = `
      INSERT INTO recenzja(id_ksiazki, numer_karty, ocena, tekst)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id_ksiazki, numer_karty) DO NOTHING
      RETURNING (
        SELECT isbn FROM ksiazka
        WHERE id_ksiazki = $1
      ) AS isbn
      `;

      const result = await client.query(recenzjaQuery, [recenzja.id_ksiazki, recenzja.numer_karty, recenzja.ocena, recenzja.tekst]);
      client.query("COMMIT");
      return this.denormalizacjaISBN(result.rows[0].isbn);
    } catch (error){
      console.log(error)
      client.query("ROLLBACK");
    } finally {
      client.release();
    }
  }

  static async usunRecenzje(recenzja){
    const client = await pool.connect();
    try{
      client.query("BEGIN")
      const recenzjaQuery = `
      DELETE FROM recenzja r
      WHERE id_recenzji = $1 AND (
        numer_karty = $2 
        OR EXISTS (
          SELECT 1 FROM uzytkownik
          WHERE numer_karty = $2 AND rola = 'ADMIN'
        )
      ) RETURNING ( 
        SELECT isbn FROM ksiazka WHERE id_ksiazki = r.id_ksiazki
      ) AS isbn
      `;

      const result = await client.query(recenzjaQuery, [recenzja.id_recenzji, recenzja.numer_karty]);
      client.query("COMMIT");
      return this.denormalizacjaISBN(result.rows[0].isbn);
    } catch (error){
      console.log(error)
      client.query("ROLLBACK");
    } finally {
      client.release();
    }
  }

  static async znajdzKsiazki(zapytanie){
    try{
      const query = `
      SELECT 
        k.*,
        ARRAY_AGG(DISTINCT a.imie || ' ' || a.nazwisko) AS autor,
        ARRAY_AGG(DISTINCT kat.opis) AS kategorie
      FROM ksiazka k
      LEFT JOIN ksiazka_autor ka ON k.id_ksiazki = ka.id_ksiazki
      LEFT JOIN autor a ON ka.id_autora = a.id_autora
      LEFT JOIN ksiazka_kategoria kk ON k.id_ksiazki = kk.id_ksiazki
      LEFT JOIN kategoria kat ON kk.id_kategorii = kat.id_kategorii
      WHERE
        ($1::text IS NULL OR $1 = '' OR k.tytul ILIKE '%' || $1 || '%')
        AND ($2::text IS NULL OR $2 = '' OR (a.imie || ' ' || a.nazwisko ILIKE '%' || $2 || '%' OR a.nazwisko || ' ' || a.imie ILIKE '%' || $2 || '%'))
        AND ($3::text IS NULL OR $3 = '' OR REPLACE(k.isbn, '-', '') ILIKE '%' || REPLACE($3, '-', '') || '%')
        AND ($4::text IS NULL OR $4 = '' OR kat.opis ILIKE '%' || $4 || '%')
      GROUP BY k.id_ksiazki, k.tytul, k.isbn, k.rok_wydania
      ORDER BY k.tytul
      `;
  
      const result = await pool.query(query, zapytanie);
      return result.rows.map(row => this.formatKsiazka(row));
    } catch (error) {
      console.log(error);
      throw new Error(error);
    }
  }

  // PONIŻEJ SĄ JESZCZE STARE DO PRZERÓBKI NA PORZĄDNĄ BAZĘ

  // static async znajdzKsiazki(wyszukiwanie){
  //   const query = `
  //   SELECT * FROM (
  //     SELECT DISTINCT ON (ISBN) ksiazkaId, ISBN, tytul, autor, rok_wydania, ilosc_stron, kategorie
  //     FROM ksiazki
  //     WHERE ISBN = $1 OR tytul ~* ALL($2::text[]) OR autor::text ~* ALL($2::text[])
  //   ) AS wyszukiwanie ORDER BY tytul
  //   `;
  //   const arraySlow = wyszukiwanie.split(" ");
  //   const pattern = arraySlow.map(slowo => `\\m${slowo}`);
    
  //   const result = await pool.query(query, [wyszukiwanie, pattern]);
  //   return result.rows.map(row => this.formatKsiazka(row));

  //   console.log(result.rows.length);
  //   return result.rows[0];
  // }

  static async zaklepKsiazke(ksiazkaId){
    const query = `
    UPDATE ksiazki SET dostepna = false WHERE ksiazkaId = $1
    `;

    const result = await pool.query(query, [ksiazkaId]);
    return result.rows[0];
  }
};

module.exports = Ksiazka;