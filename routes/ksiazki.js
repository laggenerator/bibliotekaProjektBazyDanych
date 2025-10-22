const express = require('express');
const router = express.Router();
const Uzytkownik = require("../models/uzytkownik");
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { localsName } = require('ejs');
const Ksiazka = require('../models/ksiazka');
const Egzemplarz = require('../models/egzemplarz');

router.get("/", async (req, res) => {
  try{
    const ksiazki = await Ksiazka.pobierzWszystkie();
    res.render("ksiazki/lista", {
      tytul: "Wszystkie książki",
      ksiazki: Array.isArray(ksiazki) ? ksiazki : [],
      customCSS: ['/css/szczegolyKsiazka.css', '/css/ksiazki.css', '/css/admin.css']
    });
  } catch (error) {
    res.render("ksiazki/lista", {
      tytul: "Wszystkie książki",
      ksiazki: [],
      customCSS: ['/css/szczegolyKsiazka.css', '/css/ksiazki.css', '/css/admin.css'],
      error: error
    })
  }
});

router.get("/:isbn", async (req, res) => {
  try{
    const { isbn } = req.params;
    const ksiazka = await Ksiazka.pobierzPoISBN(isbn);

    if(!ksiazka){
      return res.render("error", {
        error: "Książka o danym ISBN nie istnieje!",
        customCSS: '/css/error.css'
      });
    }

    const egzemplarze = await Egzemplarz.znajdzDlaKsiazki(ksiazka.id_ksiazki);
    
    const kopie = egzemplarze.map(e => ({
      id: e.id_egzemplarza,
      dostepna: e.status === 'Wolna',
      wKoszyku: e.status === 'W_koszyku',
      status: e.status,
      lokalizacja: e.pokoj && e.polka ? `Pokój ${e.pokoj}, półka ${e.polka}` : 'Brak lokalizacji'
    }));
    let uzytkownikDalRecenzje = null;
    if(req.session.userId){
      uzytkownikDalRecenzje = ksiazka.recenzje.find(recenzja => recenzja.numer_karty === req.session.userId);
    }

    res.render("ksiazki/szczegoly", {
      tytul: ksiazka.tytul,
      ksiazka: ksiazka,
      kopie: kopie,
      dostepneKopie: kopie.filter(k => k.dostepna),
      niedostepneKopie: kopie.filter(k => !k.dostepna),
      recenzje: ksiazka.recenzje || [],
      zmiennaKtorejNieMaJeszcze: uzytkownikDalRecenzje,
      customCSS: ['/css/szczegolyKsiazka.css', '/css/ksiazki.css', '/css/recenzje.css']
    });
  } catch (error) {
    console.error('Błąd:', error);
    res.render("error", {
      error: "Wystąpił błąd serwera",
      customCSS: '/css/error.css'
    });
  }
});


router.post("/wyszukaj", async (req, res) => {
  try {
    const {tytulksiazki, autor, isbn, kategoria} = req.body.body;
    const ksiazki = await Ksiazka.znajdzKsiazki(query);
    return res.render("ksiazki/lista", {
      tytul: `Wyniki dla: ${query}`,
      query: query,
      ksiazki: ksiazki,
      customCSS: ['/css/szczegolyKsiazka.css', '/css/ksiazki.css', '/css/admin.css']
    });
  } catch (error) {
      res.render("wyszukiwarka", {
      tytul: 'Wyszukiwanie',
      query: req.query.q || '',
      ksiazki: [],
      error: 'Wystąpił błąd podczas wyszukiwania',
      customCSS: ['/css/szczegolyKsiazka.css', '/css/ksiazki.css', '/css/error.css', '/css/admin.css']
    });
  }
});

module.exports = router;