const express = require('express');
const router = express.Router();
const Ksiazka = require('../models/ksiazka');
const Autor = require('../models/autor');

router.get("/:autor", async (req, res) => {
  try{
    const autor = decodeURIComponent(req.params.autor);
    const pociety_autor = autor.trim().split(" ");
    if(pociety_autor.length < 1){
      throw new Error("TO AUTOR NAWET IMIENIA NIE MA!!!???")
    }
    let nazwisko = '';
    if(pociety_autor.length > 1){
      nazwisko = pociety_autor.pop();
    }
    const imie = pociety_autor.join(" ");
    const ksiazki = await Autor.kopieAutora(imie, nazwisko);
    if(!ksiazki || ksiazki.length === 0){
      return res.render("error", {
        error: "Nie posiadamy książek pożądanego autora!"
      });
    }
    res.render("autorzy/szczegoly", {
      tytul: autor,
      autor: autor,
      ksiazki: ksiazki,
      customCSS: ['/css/szczegolyKsiazka.css', '/css/ksiazki.css', '/css/admin.css']
    });
  } catch (error){
    res.render("error", {
      error: `Wystąpił błąd podczas pobierania książek: ${error}`,
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