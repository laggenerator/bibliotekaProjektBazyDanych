const e = require("express");
const pool = require("../db");
const bcrypt = require("bcryptjs");
const Ksiazka = require("./ksiazka");

class Uzytkownik {
  static async create(nazwa_uzytkownika, email, haslo) {
    const haslo_hashed = await bcrypt.hash(haslo, 12);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const query = `
      INSERT INTO uzytkownik (nazwa_uzytkownika, email, haslo_hash, ostatnie_logowanie)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      RETURNING numer_karty, nazwa_uzytkownika, email
      `;

      const result = await client.query(query, [
        nazwa_uzytkownika,
        email,
        haslo_hashed,
      ]);

      await client.query("COMMIT");
      return result.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      await client.release();
    }
  }

  static async auth(nazwa_uzytkownika, haslo) {
    const client = await pool.connect();
    let result;
    try {
      await client.query("BEGIN");

      const query = `
      SELECT numer_karty, nazwa_uzytkownika, email, haslo_hash, aktywny, rola, stworzono
      FROM uzytkownik
      WHERE nazwa_uzytkownika = $1 OR email = $1
      `;

      result = await client.query(query, [nazwa_uzytkownika]);

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      await client.release();
    }

    if (result.rows.length === 0) {
      throw new Error("Nie odnaleziono użytkownika!");
    }

    const uzytkownik = result.rows[0];
    if (!uzytkownik.aktywny) {
      throw new Error("Konto nie jest aktywne!");
    }

    const poprawnoscHasla = await bcrypt.compare(haslo, uzytkownik.haslo_hash);

    if (!poprawnoscHasla) {
      throw new Error("Podane dane są niepoprawne!");
    }
    const client_ = await pool.connect();
    try {
      let query = `UPDATE uzytkownik SET ostatnie_logowanie = CURRENT_TIMESTAMP WHERE numer_karty = $1`;

      result = await client.query(query, [uzytkownik.numer_karty]);

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
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
      poterminie: poterminie,
      datarejestracji: new Date(uzytkownik.stworzono).toLocaleDateString(
        "pl-PL",
        {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }
      ),
    };
  }

  static async pobierzUzytkownika(numer_karty) {
    const query = `
    SELECT * FROM uzytkownik
    WHERE numer_karty = $1
    `;

    const result = await pool.query(query, [numer_karty]);
    const ilepoterminie = await this.ilePoTerminie(numer_karty);
    return {
      numer_karty: result.rows[0].numer_karty,
      nazwa_uzytkownika: result.rows[0].nazwa_uzytkownika,
      email: result.rows[0].email,
      rola: result.rows[0].rola,
      aktywny: result.rows[0].aktywny,
      poterminie: ilepoterminie,
      datarejestracji: new Date(result.rows[0].stworzono).toLocaleDateString(
        "pl-PL",
        {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }
      ),
    };
  }

  static async pokazPoTerminie(numer_karty) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

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

      await client.query("COMMIT");
      return result.rows;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      await client.release();
    }
  }

  static async ilePoTerminie(numer_karty) {
    try {
      const spis = await this.pokazPoTerminie(numer_karty);
      return spis.length;
    } catch (error) {
      return 0;
    }
  }

  static async podajRecenzje(numer_karty) {
    try {
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

  static async istnieje(nazwa_uzytkownika, email) {
    const query = `
    SELECT EXISTS(
      SELECT 1 FROM uzytkownik WHERE nazwa_uzytkownika = $1 OR email = $2
    ) as istnieje
    `;
    const result = await pool.query(query, [nazwa_uzytkownika, email]);
    return result.rows[0].istnieje;
  }

  static async znajdzPrzezKarte(numer_karty) {
    const query = `
    SELECT numer_karty, nazwa_uzytkownika, email, stworzono, ostatnie_logowanie, rola
    FROM uzytkownicy
    WHERE numer_karty = $1 AND aktywny = true
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  // NIŻEJ SĄ JESZCZE STARE DO PRZERÓBKI NA PORZĄDNĄ BAZĘ
  static async zapodajKoszyk(numer_karty) {
    const query = `SELECT id_egzemplarza FROM egzemplarz WHERE wlasciciel = $1 AND status = 'W koszyku'`;
    const result = await pool.query(query, [numer_karty]);
    return result.rows;
  }

  static async ileWKoszyku(numer_karty) {
    try {
      let koszyk = await this.zapodajKoszyk(numer_karty);
      return koszyk.length;
    } catch (error) {
      return 0;
    }
  }

  static async dodajDoKoszykaISBN(numer_karty, isbn) {
    const client = await pool.connect();
    try {
      await client.query(`BEGIN`);

      const query = `
        WITH dostepne_egzemplarze AS (
            SELECT e.id_egzemplarza, e.id_ksiazki
            FROM egzemplarz e
            JOIN ksiazka k ON e.id_ksiazki = k.id_ksiazki
            WHERE k.isbn = $1
            AND e.status = 'Wolna' 
            AND e.wlasciciel IS NULL
            AND NOT EXISTS (
                SELECT 1 
                FROM egzemplarz e2 
                WHERE e2.id_ksiazki = e.id_ksiazki 
                AND e2.wlasciciel = $2 
                AND e2.status = 'W koszyku'
            )
            LIMIT 1
            FOR UPDATE SKIP LOCKED
        )
        UPDATE egzemplarz e
        SET status = 'W koszyku', wlasciciel = $2
        FROM dostepne_egzemplarze de
        WHERE e.id_egzemplarza = de.id_egzemplarza
        RETURNING e.*
        `;

      const result = await client.query(query, [
        Ksiazka.denormalizacjaISBN(isbn),
        numer_karty,
      ]);
      await client.query("COMMIT");

      return result.rows.length === 1;
    } catch (error) {
      await client.query("ROLLBACK");
      throw new Error(error);
    } finally {
      client.release();
    }
  }

  static async dodajDoKoszyka(numer_karty, id_egzemplarza) {
    const client = await pool.connect();
    try {
      await client.query(`BEGIN`);

      const query = `
        UPDATE egzemplarz e
        SET status = 'W koszyku', wlasciciel = $2
        WHERE e.id_egzemplarza = $1 
        AND e.status = 'Wolna' 
        AND e.wlasciciel IS NULL
        AND NOT EXISTS (
            SELECT 1 
            FROM egzemplarz e2 
            WHERE e2.id_ksiazki = (SELECT id_ksiazki FROM egzemplarz WHERE id_egzemplarza = $1)
            AND e2.wlasciciel = $2 
            AND e2.status = 'W koszyku'
        )
        RETURNING *
        `;

      const result = await client.query(query, [id_egzemplarza, numer_karty]);
      await client.query("COMMIT");

      return result.rows.length === 1;
    } catch (error) {
      await client.query("ROLLBACK");
      throw new Error(error);
    } finally {
      client.release();
    }
  }
  static async usunZKoszyka(numer_karty, id_egzemplarza) {
    const client = await pool.connect();
    try {
      await client.query(`BEGIN`);
      const query = `
      UPDATE egzemplarz
      SET status = 'Wolna', wlasciciel = NULL
      WHERE id_egzemplarza = $1 AND status = 'W koszyku' AND wlasciciel = $2
      RETURNING *
      `;
      const result = await client.query(query, [id_egzemplarza, numer_karty]);
      await client.query("COMMIT");
      if (result.rows.length === 0) {
        return false;
      } else if (result.rows.length === 1) {
        return true;
      }
    } catch (error) {
      throw new Error(error);
      await client.query("ROLLBACK");
    } finally {
      client.release();
    }
  }

  static async wyczyscKoszyk(numer_karty) {
    const client = await pool.connect();
    try {
      await client.query(`BEGIN`);
      const query = `
      UPDATE egzemplarz
      SET status = 'Wolna', wlasciciel = NULL
      WHERE status = 'W koszyku' AND wlasciciel = $1
      RETURNING *
      `;
      const result = await client.query(query, [numer_karty]);
      await client.query("COMMIT");
      return result.rows.length;
    } catch (error) {
      throw new Error(error);
      await client.query("ROLLBACK");
    } finally {
      client.release();
    }
  }

  static async czyJestWKoszyku(numer_karty, isbn) {
    const query = `
    SELECT COUNT(*) as count 
    FROM egzemplarz e
    JOIN ksiazka k ON e.id_ksiazki = k.id_ksiazki
    WHERE k.isbn = $1 
    AND e.wlasciciel = $2 
    AND e.status = 'W koszyku'
    `;

    const result = await pool.query(query, [isbn, numer_karty]);
    return parseInt(result.rows[0].count) > 0;
  }
}

module.exports = Uzytkownik;
