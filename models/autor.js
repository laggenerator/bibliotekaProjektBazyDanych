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

  static async kopieAutora(autor){
    const query = `
    SELECT * FROM ksiazki WHERE autor::text ILIKE $1 ORDER BY tytul;
    `;
    const pattern = `%${autor}%`;
    const result = await pool.query(query, [pattern]);
    return result.rows.map(row => Ksiazka.formatKsiazka(row));
  }

  static async wszyscy(){
    const query = `
    SELECT DISTINCT unnest(autor) as autor FROM ksiazki ORDER BY autor;
    `;
    const result = await pool.query(query);
    return result.rows.map(row => row.autor);
  }
};

module.exports = Autor;