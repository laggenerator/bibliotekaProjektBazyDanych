const express = require('express');
const router = express.Router();
const Ksiazka = require('../models/ksiazka');
const Autor = require('../models/autor');

router.get("/:autor", async (req, res) => {
  try{
    const autor = decodeURIComponent(req.params.autor);
    const ksiazki = await Autor.wyszukajAutora(autor);
    const kopie = await Autor.kopieAutora(autor);
    if(!ksiazki || ksiazki.length === 0 || !kopie || kopie.length === 0){
      return res.render("error", {
        error: "Nie posiadamy książek pożądanego autora!"
      });
    }
    res.render("autorzy/szczegoly", {
      tytul: autor,
      autor: autor,
      ksiazki: ksiazki,
      kopie: kopie,
      dostepneKopie: kopie.filter(k => k.dostepna),
      niedostepneKopie: kopie.filter(k => !k.dostepna),
      customCSS: ['/css/szczegolyKsiazka.css', '/css/ksiazki.css']
    });
  } catch (error){
    res.render("error", {
      error: "Wystąpił błąd podczas pobierania książek",
      customCSS: '/css/error.css'
    });
  }
});

router.get("/", async (req, res) => {
  try{
    const autorzy = await Autor.wszyscy();
    res.render("autorzy/lista", {
      tytul: "Wszyscy autorzy",
      autorzy: autorzy,
      liczbaAutorow: autorzy.length,
      customCSS: ['/css/autorzy.css']
    });
  } catch (error) {
    res.render("error", {
      error: "Błąd przy pobieraniu listy autorów",
      customCSS: '/css/error.css'
    })
  }
})

module.exports = router;