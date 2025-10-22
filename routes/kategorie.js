const express = require('express');
const router = express.Router();
const Ksiazka = require('../models/ksiazka');

router.get("/:kategoria", async (req, res) => {
  try{
    const kategoria = req.params.kategoria;
    const ksiazki = await Ksiazka.wyszukajKategorie(kategoria);
    if(!ksiazki || ksiazki.length === 0){
      return res.render("error", {
        error: "Nie posiadamy książek w danej kategorii, zachęcamy do sprawdzenia katalogu kategorii!"
      });
    }
    res.render("kategorie/szczegoly", {
      tytul: kategoria,
      ksiazki: ksiazki,
      customCSS: ['/css/szczegolyKsiazka.css', '/css/ksiazki.css', '/css/admin.css']
    });
  } catch (error){
    console.log(error);
    res.render("error", {
      error: "Wystąpił błąd podczas pobierania książek",
      customCSS: '/css/error.css'
    });
  }
});

router.get("/", async (req, res) => {
  try{
    const kategorie = await Ksiazka.kategorie();
    res.render("kategorie/lista", {
      tytul: "Wszystkie kategorie",
      kategorie: kategorie,
      liczbaKategorii: kategorie.length,
      customCSS: ['/css/autorzy.css']
    });
  } catch (error) {
    res.render("error", {
      error: "Błąd przy pobieraniu kategorii",
      customCSS: '/css/error.css'
    })
  }
})

module.exports = router;