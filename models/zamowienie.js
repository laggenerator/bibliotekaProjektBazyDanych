const e = require("express");
const pool = require("../db");
const { denormalizacjaISBN } = require("./ksiazka");

class Zamowienie {
  static formatZamowienie(zamowienie) {
    return {
      id_zamowienia: zamowienie.id_zamowienia,
      numer_karty: zamowienie.numer_karty,
      data_oddania: zamowienie.data_oddania,
      deadline_oddania: zamowienie.deadline_oddania,
      data_wypozyczenia: zamowienie.data_wypozyczenia,
      status: zamowienie.status,
      egzemplarze: zamowienie.egzemplarze,
    };
  }

  static async aktywneZamowienia() {
    const query = `
    SELECT * FROM aktywne_zamowienia 
    ORDER BY 
        CASE WHEN termin_przekroczony THEN 0 ELSE 1 END,
        poczatek DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async policzAktywne() {
    const result = await this.aktywneZamowienia();
    return result.length;
  }

  static async policzWszystkie() {
    const result1 = await this.aktywneZamowienia();
    const result2 = await this.zakonczoneZamowienia();
    return result1.length + result2.length;
  }

  static async zakonczoneZamowienia() {
    const query = `
    SELECT * FROM zakonczone_zamowienia 
    ORDER BY poczatek DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async oddajKsiazki(id_egzemplarzy) {
    try {
      const query = `SELECT oddaj_ksiazki($1)`;
      const result = await pool.query(query, [id_egzemplarzy]);
      return result.rows[0].oddaj_ksiazki; // Zwraca TRUE jeśli się udało
    } catch (error) {
      console.error("Błąd funkcji oddaj_ksiazki:", error);
      throw new Error(`Nie udało się zwrócić książek: ${error.message}`);
    }
  }

  static async zmienStatus(id_wypozyczenia, nowy_status) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Zmiana statusu wypożyczenia
      const updateWypozyczenieQuery = `
        UPDATE wypozyczenie 
        SET status = $1 
        WHERE id_wypozyczenia = $2
        RETURNING *
        `;
      const wypozyczenieResult = await client.query(updateWypozyczenieQuery, [
        nowy_status,
        id_wypozyczenia,
      ]);

      // Automatyczne zwracanie książek przy zmianie na "Zwrócone"
      if (nowy_status === "Zwrócone" || nowy_status === "Anulowane") {
        const egzemplarzeQuery = `
            SELECT ARRAY_AGG(we.id_egzemplarza) as id_egzemplarzy
            FROM wypozyczenie_egzemplarz we
            WHERE we.id_wypozyczenia = $1 AND we.oddanie IS NULL
            `;
        const egzemplarzeResult = await client.query(egzemplarzeQuery, [
          id_wypozyczenia,
        ]);

        const id_egzemplarzy = egzemplarzeResult.rows[0]?.id_egzemplarzy;

        if (id_egzemplarzy && id_egzemplarzy.length > 0) {
          await client.query(`SELECT oddaj_ksiazki($1)`, [id_egzemplarzy]);
        }
      }

      await client.query("COMMIT");
      return wypozyczenieResult.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  static async dostepneStatusy() {
    return ["W przygotowaniu", "Gotowe do odbioru", "Odebrane", "Zwrócone"];
  }

  static async najnowsze() {
    const query = `
    SELECT 
      k.tytul,
      ARRAY_AGG(DISTINCT a.imie || ' ' || a.nazwisko) AS autor
    FROM wypozyczenie w
    JOIN wypozyczenie_egzemplarz we ON w.id_wypozyczenia = we.id_wypozyczenia
    JOIN egzemplarz e ON we.id_egzemplarza = e.id_egzemplarza
    JOIN ksiazka k ON e.id_ksiazki = k.id_ksiazki
    LEFT JOIN ksiazka_autor ka ON k.id_ksiazki = ka.id_ksiazki
    LEFT JOIN autor a ON ka.id_autora = a.id_autora
    WHERE w.id_wypozyczenia = (
      SELECT id_wypozyczenia 
      FROM wypozyczenie 
      ORDER BY poczatek DESC 
      LIMIT 1
    )
    GROUP BY k.id_ksiazki, k.tytul
    `;

    const result = await pool.query(query, []);

    return result.rows.map((row) => ({
      tytul: row.tytul,
      autor: row.autor,
    }));
  }

  static async pobierzSzczegoly(id_wypozyczenia) {
    const query = `
    SELECT * FROM szczegoly_zamowienia 
    WHERE id_wypozyczenia = $1
    `;

    const result = await pool.query(query, [id_wypozyczenia]);

    if (result.rows.length === 0) {
      return null;
    }

    const zamowienie = result.rows[0];

    // Formatuj egzemplarze (dodaj img_link)
    if (zamowienie.egzemplarze) {
      zamowienie.egzemplarze = zamowienie.egzemplarze.map((egzemplarz) => ({
        ...egzemplarz,
        img_link:
          egzemplarz.img_link ||
          `/assets/okladki/${denormalizacjaISBN(egzemplarz.isbn)}.webp`,
      }));
    }

    return zamowienie;
  }

  static async biezaceWypozyczenia(numer_karty) {
    const query = `
    SELECT 
        w.id_wypozyczenia,
        w.status,
        w.poczatek,
        w.deadline,
        ARRAY_AGG(DISTINCT k.tytul) AS tytuly,
        ARRAY_AGG(DISTINCT a.imie || ' ' || a.nazwisko) AS autorzy,
        COUNT(we.id_egzemplarza) AS laczna_liczba_ksiazek,
        COUNT(we.oddanie) AS liczba_oddanych
    FROM wypozyczenie w
    JOIN wypozyczenie_egzemplarz we ON w.id_wypozyczenia = we.id_wypozyczenia
    JOIN egzemplarz e ON we.id_egzemplarza = e.id_egzemplarza
    JOIN ksiazka k ON e.id_ksiazki = k.id_ksiazki
    LEFT JOIN ksiazka_autor ka ON k.id_ksiazki = ka.id_ksiazki
    LEFT JOIN autor a ON ka.id_autora = a.id_autora
    WHERE w.numer_karty = $1
    AND w.id_wypozyczenia IN (
        SELECT DISTINCT id_wypozyczenia 
        FROM wypozyczenie_egzemplarz 
        WHERE oddanie IS NULL
    )
    GROUP BY w.id_wypozyczenia, w.poczatek, w.deadline
    ORDER BY w.poczatek DESC
    `;

    const result = await pool.query(query, [numer_karty]);
    return result.rows;
  }

  static async historiaWypozyczen(numer_karty) {
    const query = `
    SELECT 
      w.id_wypozyczenia,
      w.poczatek,
      w.deadline,
      w.status,
      ARRAY_AGG(DISTINCT k.tytul) AS tytuly,
      ARRAY_AGG(DISTINCT a.imie || ' ' || a.nazwisko) AS autorzy,
      COUNT(we.id_egzemplarza) AS laczna_liczba_ksiazek,
      COUNT(we.oddanie) AS liczba_oddanych,
      BOOL_AND(we.oddanie IS NOT NULL) as wszystkie_oddane,
      w.deadline < CURRENT_TIMESTAMP AS czy_przekroczony,
      CASE 
        WHEN w.deadline < CURRENT_TIMESTAMP 
        THEN EXTRACT(DAYS FROM (CURRENT_TIMESTAMP - w.deadline))
        ELSE 0 
      END AS dni_opoznienia
    FROM wypozyczenie w
    JOIN wypozyczenie_egzemplarz we ON w.id_wypozyczenia = we.id_wypozyczenia
    JOIN egzemplarz e ON we.id_egzemplarza = e.id_egzemplarza
    JOIN ksiazka k ON e.id_ksiazki = k.id_ksiazki
    LEFT JOIN ksiazka_autor ka ON k.id_ksiazki = ka.id_ksiazki
    LEFT JOIN autor a ON ka.id_autora = a.id_autora
    WHERE w.numer_karty = $1
    GROUP BY w.id_wypozyczenia, w.poczatek, w.deadline, w.status
    ORDER BY w.poczatek DESC
    `;

    const result = await pool.query(query, [numer_karty]);
    return result.rows;
  }

  static async zlozZamowienie(numer_karty) {
    // const query = `
    // SELECT wypozycz_ksiazki($1) as id_wypozyczenia;
    // `;
    const query = `
    WITH nowe_wypozyczenie AS (
      INSERT INTO wypozyczenie (numer_karty)
      SELECT $1
      WHERE EXISTS (
        SELECT 1 FROM egzemplarz WHERE wlasciciel = $1 AND status = 'W koszyku'
      )
      RETURNING id_wypozyczenia
    ),
    dodane_egzemplarze AS (
      INSERT INTO wypozyczenie_egzemplarz (id_wypozyczenia, id_egzemplarza)
      SELECT nw.id_wypozyczenia, e.id_egzemplarza
      FROM nowe_wypozyczenie nw
      CROSS JOIN egzemplarz e
      WHERE e.wlasciciel = $1 AND e.status = 'W koszyku'
    ),
    zaktualizowane_egzemplarze AS (
      UPDATE egzemplarz
      SET status = 'Wypozyczona'
      WHERE wlasciciel = $1 AND status = 'W koszyku'
      AND EXISTS (SELECT 1 FROM nowe_wypozyczenie)
    )
    SELECT id_wypozyczenia FROM nowe_wypozyczenie;
    `;
    const result = await pool.query(query, [numer_karty]);
    if (result.rows[0].id_wypozyczenia) {
      return {
        sukces: true,
        wiadomosc: "Utworzono wypozyczenie",
        id_wypozyczenia: result.rows[0].id_wypozyczenia,
      };
    } else {
      return {
        sukces: false,
        wiadomosc: "Brak książek w koszyku do wypożyczenia",
        id_wypozyczenia: -1,
      };
    }
  }

  static async oddajKsiazki(id_egzemplarzy) {
    const query = `
    SELECT oddaj_ksiazki($1) as sukces;
    `;

    try {
      const result = await pool.query(query, [[id_egzemplarzy]]);
      return {
        sukces: true,
        wiadomosc: "Oddanie przebiegło pomyślnie!",
      };
    } catch (error) {
      if (
        error.message.includes(
          "Proba oddania ksiazki, ktora nie jest zarejestrowana"
        )
      ) {
        return {
          sukces: false,
          wiadomosc:
            "Próba oddania książki, która nie jest zarejestrowana jako wypożyczona",
        };
      }
      return {
        sukces: false,
        wiadomosc: `Wystąpił błąd podczas oddawania książek: ${error.message}`,
      };
    }
  }
}

module.exports = Zamowienie;
