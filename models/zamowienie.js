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

}

module.exports = Zamowienie;