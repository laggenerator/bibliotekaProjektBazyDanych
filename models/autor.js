const e = require('express');
const pool = require('../db');
const Ksiazka = require("./ksiazka")

class Autor {
  static async wyszukajAutora(autor){
    const query = `
    SELECT DISTINCT ON (ISBN) * FROM ksiazki WHERE autor::text ILIKE $1 ORDER BY ISBN, tytul;
    `;
    const pattern = `%${autor}%`;
    const result = await pool.query(query, [pattern]);
    return result.rows.map(row => Ksiazka.formatKsiazka(row));
  }

  static async kopieAutora(imie, nazwisko){
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
    WHERE a.imie = $1 AND a.nazwisko = $2
    GROUP BY k.id_ksiazki
  `;

    const result = await pool.query(query, [imie, nazwisko]);
    return result.rows.map(row => Ksiazka.formatKsiazka(row));
  }

  static async wszyscy(){
    const query = `
    SELECT imie, nazwisko FROM autor;
    `;
    const result = await pool.query(query);
    return result.rows.map(row => `${row.imie} ${row.nazwisko}`);
  }
};

module.exports = Autor;