const express = require('express');
const router = express.Router();
const Uzytkownik = require("../models/uzytkownik");
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { localsName } = require('ejs');
const Ksiazka = require('../models/ksiazka');

router.get("/", async (req, res) => {
  try{
    const ksiazki = await Ksiazka.pobierzWszystkie();
    res.render("ksiazki/lista", {
      tytul: "Wszystkie książki",
      ksiazki: Array.isArray(ksiazki) ? ksiazki : [],
      customCSS: ['/css/szczegolyKsiazka.css', '/css/ksiazki.css']
    });
  } catch (error) {
    res.render("ksiazki/lista", {
      tytul: "Wszystkie książki",
      ksiazki: [],
      customCSS: ['/css/szczegolyKsiazka.css', '/css/ksiazki.css'],
      error: error
    })
  }
});

router.get("/:isbn", async (req, res) => {
  try{
    const { isbn } = req.params;
    const ksiazki = await Ksiazka.pobierzPoISBN(isbn);

    if(!ksiazki || ksiazki.length === 0){
      return res.render("error", {
        error: "Książka o danym ISBN nie istnieje!",
      customCSS: '/css/error.css'
      });
    }
    const ksiazka = ksiazki[0];
    res.render("ksiazki/szczegoly", {
      tytul: ksiazka.tytul,
      ksiazka: ksiazka,
      kopie: ksiazki,
      dostepneKopie: ksiazki.filter(k => k.dostepna),
      niedostepneKopie: ksiazki.filter(k => !k.dostepna),
      customCSS: ['/css/szczegolyKsiazka.css', '/css/ksiazki.css']
    });
  } catch (error){
    res.render("error", {
      error: "Wystąpił błąd podczas pobierania książek"
    });
  }
});


router.post("/wyszukaj", async (req, res) => {
  try {
    const query = req.body.query;
    const ksiazki = await Ksiazka.znajdzKsiazki(query);
    return res.render("ksiazki/lista", {
      tytul: `Wyniki dla: ${query}`,
      query: query,
      ksiazki: ksiazki,
      customCSS: ['/css/szczegolyKsiazka.css', '/css/ksiazki.css']
    });
  } catch (error) {
      res.render("ksiazki/lista", {
      tytul: 'Wyszukiwanie',
      query: req.query.q || '',
      ksiazki: [],
      error: 'Wystąpił błąd podczas wyszukiwania',
      customCSS: ['/css/szczegolyKsiazka.css', '/css/ksiazki.css']
    });
  }
});

module.exports = router;