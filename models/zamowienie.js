const e = require('express');
const pool = require('../db');

class Zamowienie {
  static formatZamowienie(zamowienie){
    return {
      id_zamowienia: zamowienie.id_zamowienia,
      numer_karty: zamowienie.numer_karty,
      data_oddania: zamowienie.data_oddania,
      deadline_oddania: zamowienie.deadline_oddania,
      data_wypozyczenia: zamowienie.data_wypozyczenia,
      status: zamowienie.status,
      egzemplarze: zamowienie.egzemplarze
    }
  }

  static async pobierzZamowienia(){
    
  }
  static async pobierzZamowieniaUzytkownika(numer_karty){

  }
  static async pobierzZamowienie(numer_zamowienia){

  }

  static async zlozZamowienie(numer_karty){
    const query = `
    SELECT wypozycz_ksiazki($1) as id_wypozyczenia;
    `;
    const result = await pool.query(query, [numer_karty]);
    if (result.rows[0].id_wypozyczenia) {
      return {sukces: true, wiadomosc: 'Utworzono wypozyczenie', id_wypozyczenia: result.rows[0].id_wypozyczenia};
    } else {
      return {sukces: false, wiadomosc: 'Brak książek w koszyku do wypożyczenia', id_wypozyczenia: -1};
    }
  }

  static async oddajKsiazki(id_egzemplarzy){
    const query = `
    SELECT oddaj_ksiazki($1) as sukces;
    `;

    try{
      const result = await pool.query(query, [[id_egzemplarzy]]);
      return {
        sukces: true, 
        wiadomosc: 'Oddanie przebiegło pomyślnie!'
      }
    } catch (error){
      if (error.message.includes('Proba oddania ksiazki, ktora nie jest zarejestrowana')) {
            return {
                sukces: false, 
                wiadomosc: 'Próba oddania książki, która nie jest zarejestrowana jako wypożyczona'
            };
        }
        return {
            sukces: false, 
            wiadomosc: `Wystąpił błąd podczas oddawania książek: ${error.message}`
        };
    }
  }

}

module.exports = Zamowienie;