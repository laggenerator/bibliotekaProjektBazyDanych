const express = require('express');
const router = express.Router();
const Uzytkownik = require("../models/uzytkownik");
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { localsName } = require('ejs');
const Ksiazka = require('../models/ksiazka');

router.get("/", async (req, res) => {
  const ksiazki = await Ksiazka.najnowsze6Ksiazek();
  const najnowsze = [
    {
      tytul: 'Fizyka 1',
      autor: ['Robert Resnick', 'David Halliday']
    }
  ]
  
  res.render('index', {
    tytul: "Strona główna", 
    ksiazki: ksiazki, 
    najnowsze: najnowsze,
    customCSS: '/css/index.css'
  });
});

router.get("/dashboard", requireAuth, async (req, res) => {
  const liczbaPoTerminie = await Uzytkownik.ilePoTerminie(req.session.userId);
  res.render("dashboard", {
    tytul: "Panel użytkownika",
    poterminie: liczbaPoTerminie,
    customCSS: '/css/dashboard.css'
  });
});

router.get("/poterminie", requireAuth, async (req, res) => {
  const listaPoTerminie = await Uzytkownik.listaZaleglosci(req.session.userId);
  res.json(listaPoTerminie);
});

router.get("/koszyk", requireAuth, async (req, res) => {
  const koszyk = await Uzytkownik.zapodajKoszyk(req.session.userId);
  res.json(koszyk);
})



module.exports = router;