const express = require('express');
const router = express.Router();
const Admin = require("../models/admin");
const { requireAuth, requireAdmin } = require('../middleware/auth');
const uploadValidation = require('../validators/uploadValidator');
const { localsName } = require('ejs');
const Ksiazka = require('../models/ksiazka');
const multer = require('multer');
const path = require('path');
const { validationResult } = require('express-validator');
const { error } = require('console');

// Konfiguracja multera do okładek
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/assets/okladki/');
  },
  filename: function (req, file, cb) {
    // Używamy ISBN jako nazwy pliku
    const isbn = req.body.isbn;
    cb(null, isbn + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const dozwoloneTypy = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (dozwoloneTypy.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Nieobsługiwany format pliku. Dozwolone: JPG, PNG, WEBP'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});
// 

router.get("/dashboard", requireAdmin, async (req, res) => {
  const liczbaUzytkownikow = await Admin.ileUzytkownikow();
  res.render("admin/dashboard", {
    tytul: "Panel admina",
    customCSS: '/css/dashboard.css',
    liczbaUzytkownikow: liczbaUzytkownikow
  });
});

router.get("/ksiazki", requireAdmin, async (req, res) => {
  try{
    const ksiazki = await Ksiazka.pobierzWszystkie();
    res.render("admin/ksiazki", {
      tytul: "Zarządzanie książkami",
      customCSS: ['/css/dashboard.css', '/css/ksiazki.css', '/css/admin.css'],
      ksiazki: Array.isArray(ksiazki) ? ksiazki : [],
    });
  } catch (error) {
    res.render("admin/ksiazki", {
      tytul: "Zarządzanie książkami",
      ksiazki: [],
      customCSS: ['/css/dashboard.css', '/css/ksiazki.css', '/css/admin.css'],
      error: error
    });
  }
});

router.get("/uzytkownicy", requireAdmin, async (req, res) => {
  try{
    const uzytkownicy = [];
    res.render("admin/uzytkownicy", {
      tytul: "Zarządzanie użytkownikami",
      customCSS: ['/css/dashboard.css', '/css/ksiazki.css', '/css/admin.css'],
      uzytkownicy: Array.isArray(uzytkownicy) ? uzytkownicy : [],
    });
  } catch (error) {
    res.render("admin/uzytkownicy", {
      tytul: "Zarządzanie użytkownikami",
      uzytkownicy: [],
      customCSS: ['/css/dashboard.css', '/css/ksiazki.css', '/css/admin.css'],
      error: error
    });
  }
});

router.get("/zamowienia", requireAdmin, async (req, res) => {
  try{
    const zamowienia = [];
    res.render("admin/zamowienia", {
      tytul: "Zarządzanie zamówieniami",
      customCSS: ['/css/dashboard.css', '/css/ksiazki.css', '/css/admin.css'],
      zamowienia: Array.isArray(zamowienia) ? zamowienia : [],
    });
  } catch (error) {
    res.render("admin/zamowienia", {
      tytul: "Zarządzanie zamówieniami",
      zamowienia: [],
      customCSS: ['/css/dashboard.css', '/css/ksiazki.css', '/css/admin.css'],
      error: error
    });
  }
});

router.post("/wyszukaj-ksiazke", async (req, res) => {
  try {
    const query = req.body.query;
    const ksiazki = await Ksiazka.znajdzKsiazki(query);
    res.render("admin/ksiazki", {
      tytul: `Wyniki dla: ${query}`,
      query: query,
      ksiazki: ksiazki,
      customCSS: ['/css/dashboard.css', '/css/ksiazki.css', '/css/admin.css'],
    });
  } catch (error) {
      res.render("admin/ksiazki", {
      tytul: 'Wyszukiwanie',
      query: req.query.q || '',
      ksiazki: [],
      error: 'Wystąpił błąd podczas wyszukiwania',
      customCSS: ['/css/dashboard.css', '/css/ksiazki.css', '/css/admin.css'],
    });
  }
});


router.get("/zamowienia/szukaj", (req, res) => {
  const query = req.body.query;
});


router.get("/uzytkownicy/szukaj", (req, res) => {
  const query = req.body.query;
});

router.post("/ksiazki/szukaj", async (req, res) => {
  try{
    const query = req.body.query;
    console.log(query)
    const ksiazki = await Ksiazka.znajdzKsiazki(query);
    res.render("admin/ksiazki", {
      tytul: `Wyniki dla: ${query}`,
      query: query,
      ksiazki: ksiazki,
      customCSS: ['/css/dashboard.css', '/css/ksiazki.css', '/css/admin.css'],
    });
  } catch (error) {
      res.render("admin/ksiazki", {
      tytul: 'Wyszukiwanie',
      query: req.query.q || '',
      ksiazki: [],
      error: 'Wystąpił błąd podczas wyszukiwania',
      customCSS: ['/css/dashboard.css', '/css/ksiazki.css', '/css/admin.css'],
    });
  }
});

router.get("/ksiazki/dodaj", requireAdmin, (req, res) => {
  res.render("admin/dodaj-ksiazke.ejs", {
    tytul: "Dodawanie książki",
    customCSS: ['/css/admin.css']
  });
});

router.post("/ksiazki/dodaj", requireAdmin, upload.single('okladka'), uploadValidation, async (req, res) => {
  try{
    const errors = validationResult(req);
    if(!errors.isEmpty()){
      return res.render('admin/dodaj-ksiazke', {
        error: errors.array()[0].msg, ...req.body
      });
    }
    const liczbaKopii = parseInt(req.body.liczba_kopii) || 1;
    const ksiazka = {
      tytul: req.body.tytul_ksiazki,
      autor: req.body.autor.split(',').map(autor => autor.trim()),
      isbn: req.body.isbn,
      rok_wydania: req.body.rok_wydania,
      ilosc_stron: req.body.ilosc_stron,
      kategorie: req.body.kategorie ? req.body.kategorie.split(',').map(k => k.trim()) : [],
    }
    const results = [];
    for(let i=0;i<liczbaKopii;i++){
      let result = await Ksiazka.dodaj(ksiazka);
      results.push(result[0]);
    }
    res.render("admin/ksiazki", {
      tytul: `Dodane książki`,
      dodawanie: true,
      ksiazki: results,
      customCSS: ['/css/ksiazki.css', '/css/admin.css']
    });
  } catch (error){
    res.render("admin/dodaj-ksiazke", {
      error: 'Wystąpił błąd podczas dodawania: ' + error.message, ...req.body, customCSS: ['/css/ksiazki.css', '/css/admin.css']
    })
  }
})

module.exports = router;