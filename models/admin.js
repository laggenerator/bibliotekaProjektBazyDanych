const e = require('express');
const pool = require('../db');
const Ksiazka = require("./ksiazka")

class Admin {
  static async ileUzytkownikow(){
    const query = `
    SELECT COUNT(numer_karty) FROM uzytkownicy;
    `;
    const result = await pool.query(query);
    return result.rows[0].count;
  }
};

module.exports = Admin;