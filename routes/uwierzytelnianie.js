const express = require('express');
const router = express.Router();
const Uzytkownik = require("../models/uzytkownik");
const { registerValidation, loginValidation } = require('../validators/authValidator');
const { validateRequest } = require('../middleware/auth');
const {pokazowka} = require('../zmienna');

router.get("/register", (req, res) => {
  if (req.session.userId) {
    return res.redirect("/dashboard");
  }
  
  res.render("auth/register", {
    tytul: "Rejestracja",
    formData: {},
    customCSS: '/css/auth.css'
  });
});

router.post('/register', registerValidation, validateRequest, async (req, res) => {
  try{
    const { nazwa_uzytkownika, email, haslo } = req.body;
    const czyIstnieje = await Uzytkownik.istnieje(nazwa_uzytkownika, email);
    if(czyIstnieje){
      // return res.status(400).json({
      //   sukces: false,
      //   wiadomosc: "Nazwa użytkownika lub email jest w użyciu!"
      // });
      res.render("auth/register", {
        tytul: "Rejestracja",
        error: "Nazwa użytkownika lub email jest w użyciu!",
        customCSS: '/css/auth.css'
      })
    }

    const uzytkownik = await Uzytkownik.create(nazwa_uzytkownika, email, haslo);

    // res.status(201).json({
    //   sukces: true, 
    //   wiadomosc: "Konto utworzone pomyślnie!",
    //   uzytkownik: uzytkownik
    // });

    
    req.session.userId = uzytkownik.numer_karty;
    req.session.nazwa_uzytkownika = uzytkownik.nazwa_uzytkownika;
    req.session.email = uzytkownik.email;
    req.session.rola = uzytkownik.rola;
    req.session.poterminie = uzytkownik.numer_karty;
    req.session.koszyk = uzytkownik.koszyk;
    
    res.redirect("/");
  } catch(error){
    console.error("Błąd rejestracji:", error); // Niezawodna forma error handlingu
    // res.status(500).json({
    //   sukces: false, 
    //   wiadomosc: 'Nastąpił nieoczekiwany błąd'
    // });
    res.render("auth/register", {
      tytul: "Rejestracja",
      error: error.message,
      formData: req.body,
      customCSS: '/css/auth.css'
    });
  }
});


router.get("/login", (req, res) => {
  if(req.session.userId) {
    return res.redirect("/dashboard");
  }
  res.render("auth/login", {
    tytul: "Logowanie",
    formData: {},
    customCSS: '/css/auth.css'
  })
});

router.post('/login', loginValidation, validateRequest, async (req, res) => {
  try{
    const { nazwa_uzytkownika, haslo } = req.body;

    const uzytkownik = await Uzytkownik.auth(nazwa_uzytkownika, haslo);

    req.session.userId = uzytkownik.numer_karty;
    req.session.nazwa_uzytkownika = uzytkownik.nazwa_uzytkownika;
    req.session.email = uzytkownik.email;
    req.session.rola = uzytkownik.rola;
    req.session.poterminie = uzytkownik.numer_karty;
    req.session.koszyk = uzytkownik.koszyk;
    // res.json({
    //   sukces: true,
    //   wiadomosc: "Logowanie pomyślne",
    //   uzytkownik: uzytkownik
    // });
    res.redirect("/dashboard");
    // res.render("dashboard", {
    //   tytul: "Panel użytkownika",
    //   uzytkownik: uzytkownik
    // })
  } catch(error){
    console.error("Błąd:", error); // Niezawodna forma error handlingu
    let statusCode = 500;
    let wiadomosc = "Nastąpił nieoczekiwany błąd";

    if(error.message === "Nie odnaleziono użytkownika!"){
      statusCode = 401;
      wiadomosc = error.message;
    } else if(error.message === "Podane dane są niepoprawne!"){
      statusCode = 402;
      wiadomosc = error.message
    } else if(error.message === "Konto nie jest aktywne!"){
      statusCode = 403;
      wiadomosc = error.message;
    }

    // res.status(statusCode).json({
    //   sukces: false,
    //   wiadomosc: wiadomosc
    // });
    res.render("auth/login", {
      tytul: "Login",
      error: error.message,
      formData: req.body,
      customCSS: '/css/auth.css'
    });
  }
});

router.post('/wyloguj', (req, res) => {
  req.session.destroy((err) => {
    if(err){
      // return res.status(500).json({
      //   sukces: false,
      //   wiadomosc: "Nie udało się wylogować"
      // });
      res.render("error", {
        tytul: "Błąd",
        error: "Nie udało się wylogować",
        customCSS: '/css/error.css'
      })
    }

    res.clearCookie('connect.sid');
    // res.json({
    //   sukces: true,
    //   wiadomosc: "Wylogowano pomyślnie!"
    // });
    res.redirect("/");
  });
});

router.post('/moje-konto', async (req, res) => {
  if(!req.session.userId){
    // return res.status(401).json({
    //   sukces: false,
    //   wiadomosc: "Nie jesteś uwierzytelniony"
    // });
    res.render("/login", {
      tytul: "Login",
      formData: {},
      customCSS: '/css/auth.css'
    })
  }

  try{
    const uzytkownik = await Uzytkownik.znajdzPrzezKarte(req.session.userId);
    if(!uzytkownik){
      // return res.status(404).json({
      //   sukces: false,
      //   wiadomosc: "Nie odnaleziono użytkownika"
      // });
      res.render("/login", {
        tytul: "Login",
        error: "Nie odnaleziono użytkownika",
        formData: {},
        customCSS: '/css/auth.css'
      });
    }

    res.json({
      sukces: true,
      uzytkownik: uzytkownik
    });
  } catch(error){
    console.error("Błąd użytkownika:", error);
    // res.status(500).json({
    //   sukces: false,
    //   wiadomosc: "Nastąpił nieoczekiwany błąd"
    // });
    res.render("/login", {
      tytul: "Login",
      error: "Nastąpił nieoczekiwany błąd",
      formData: {},
      customCSS: '/css/auth.css'
    });
  }
});


module.exports = router;