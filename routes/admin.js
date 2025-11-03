const express = require('express');
const router = express.Router();
const Admin = require("../models/admin");
const { requireAuth, requireAdmin } = require('../middleware/auth');
const uploadValidation = require('../validators/uploadValidator');
const { localsName } = require('ejs');
const Ksiazka = require('../models/ksiazka');
const Egzemplarz = require('../models/egzemplarz');
const multer = require('multer');
const path = require('path');
const { validationResult } = require('express-validator');
const { error } = require('console');
const {pokazowka} = require('../zmienna');

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
  const poTerminie = await Admin.ilePoTerminie();
  if(pokazowka) return res.json({liczbaUzytkownikow, poTerminie});
  res.render("admin/dashboard", {
    tytul: "Panel admina",
    customCSS: '/css/dashboard.css',
    liczbaUzytkownikow: liczbaUzytkownikow,
    poTerminie: poTerminie
  });
});

router.get("/ksiazki", requireAdmin, async (req, res) => {
  try{
    const ksiazki = await Ksiazka.pobierzWszystkie();
    if(pokazowka) return res.json(ksiazki);
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
    const uzytkownicy = await Admin.pobierzUzytkownikow();
    if(pokazowka) return res.json(uzytkownicy);
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

router.post("/uzytkownicy/dezaktywuj", requireAdmin, async (req, res) => {
  try{
    const {numer_karty} = req.body;
    const result = await Admin.dezaktywujUzytkownika(numer_karty);
    let zwrot;
    if(!result){
      zwrot = {
        sukces: false,
        wiadomosc: "Nie udało się dezaktywować użytkownika (nie istnieje lub ma wypożyczone książki)",
        numer_karty: numer_karty
      }
    } else {
      zwrot = {
        sukces: true, 
        wiadomosc: "Dezaktywowano użytkownika",
        numer_karty: numer_karty
      }
    }
    if(pokazowka) return res.json(zwrot);
  } catch (error) {
    if (pokazowka) return res.json({ 
      sukces: false, 
      error: error.message 
    });
    res.render("admin/uzytkownicy", {
      tytul: "Zarządzanie użytkownikami",
      uzytkownicy: [],
      customCSS: ['/css/dashboard.css', '/css/ksiazki.css', '/css/admin.css'],
      error: error
    });
  }
})

router.post("/uzytkownicy/aktywuj", requireAdmin, async (req, res) => {
  try{
    const {numer_karty} = req.body;
    const result = await Admin.aktywujUzytkownika(numer_karty);
        let zwrot;
    if(!result){
      zwrot = {
        sukces: false,
        wiadomosc: "Nie udało się aktywować użytkownika (nie istnieje)",
        numer_karty: numer_karty
      }
    } else {
      zwrot = {
        sukces: true, 
        wiadomosc: "Aktywowano użytkownika",
        nazwa_uzytkownika: result.nazwa_uzytkownika,
        numer_karty: result.numer_karty,
        aktywny: result.aktywny
      }
    }
    if(pokazowka) return res.json(zwrot);
  } catch (error) {
    if (pokazowka) return res.json({ 
      sukces: false, 
      error: error.message 
    });
    res.render("admin/uzytkownicy", {
      tytul: "Zarządzanie użytkownikami",
      uzytkownicy: [],
      customCSS: ['/css/dashboard.css', '/css/ksiazki.css', '/css/admin.css'],
      error: error
    });
  }
})

router.get("/zamowienia", requireAdmin, async (req, res) => {
  try{
    const zamowienia = [];
    if(pokazowka) return res.json(zamowienia);
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
    if(pokazowka) return res.json(ksiazki);
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
    if(pokazowka) return res.json(ksiazki);
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

router.post("/ksiazki/dodajEgzemplarz", requireAdmin, async (req, res) => {
  try{
    const {id_ksiazki} = req.body;
    const result = await Egzemplarz.dodajEgzemplarz(id_ksiazki);
    if(pokazowka) return res.json({result});
  } catch (error){
    throw new Error(error);
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
      if(pokazowka) return res.json(errors.array()[0].msg);
      return res.render('admin/dodaj-ksiazke', {
        error: errors.array()[0].msg, ...req.body,
        customCSS: '/css/error.css'
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
      liczba_kopii: liczbaKopii      
    }
    let result;
    try{
      result = await Ksiazka.dodaj(ksiazka);
    } catch (error) {
      if(pokazowka) return res.json(error.message);
      res.render("admin/ksiazki", {
        tytul: "Zarządzanie książkami",
        ksiazki: [],
        customCSS: ['/css/dashboard.css', '/css/ksiazki.css', '/css/admin.css'],
        error: error
      });
    }
    try{
      const ksiazki = await Ksiazka.pobierzPoID(result);
      if(pokazowka) return res.json(ksiazki);
      res.render("admin/ksiazki", {
        tytul: "Zarządzanie książkami",
        customCSS: ['/css/dashboard.css', '/css/ksiazki.css', '/css/admin.css'],
        sukces: `Dodano ${liczbaKopii}x ${ksiazka.tytul}!`,
        ksiazki: Array.isArray(ksiazki) ? ksiazki : [],
      });
    } catch (error) {
      if(pokazowka) return res.json(error);
      res.render("admin/ksiazki", {
        tytul: "Zarządzanie książkami",
        ksiazki: [],
        customCSS: ['/css/dashboard.css', '/css/ksiazki.css', '/css/admin.css'],
        error: error
      });
    }
  } catch (error){
    if(pokazowka) return res.json(error);
    res.render("admin/dodaj-ksiazke", {
      error: 'Wystąpił błąd podczas dodawania: ' + error.message, ...req.body, customCSS: ['/css/ksiazki.css', '/css/admin.css']
    })
  }
})


module.exports = router;