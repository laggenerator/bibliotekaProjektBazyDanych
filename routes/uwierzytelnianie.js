const express = require("express");
const router = express.Router();
const Uzytkownik = require("../models/uzytkownik");
const {
  registerValidation,
  loginValidation,
} = require("../validators/authValidator");
const { validateRequest } = require("../middleware/auth");
const { pokazowka } = require("../zmienna");

router.get("/register", (req, res) => {
  if (req.session.userId) {
    return res.redirect("/dashboard");
  }

  if (pokazowka) return res.json({ message: "Strona rejestracji" });
  res.render("auth/register", {
    tytul: "Rejestracja",
    formData: {},
    customCSS: "/css/auth.css",
  });
});

router.post(
  "/register",
  pokazowka ? [] : registerValidation,
  validateRequest,
  async (req, res) => {
    try {
      const { nazwa_uzytkownika, email, haslo } = req.body;
      const czyIstnieje = await Uzytkownik.istnieje(nazwa_uzytkownika, email);
      if (czyIstnieje) {
        if (pokazowka)
          return res.json({
            sukces: false,
            wiadomosc: "Nazwa użytkownika lub email jest w użyciu!",
          });
        return res.render("auth/register", {
          tytul: "Rejestracja",
          error: "Nazwa użytkownika lub email jest w użyciu!",
          customCSS: "/css/auth.css",
        });
      }

      const uzytkownik = await Uzytkownik.create(
        nazwa_uzytkownika,
        email,
        haslo
      );

      if (pokazowka)
        return res.json({
          sukces: true,
          wiadomosc: "Konto utworzone pomyślnie!",
          uzytkownik: uzytkownik,
        });

      req.session.userId = uzytkownik.numer_karty;
      req.session.nazwa_uzytkownika = uzytkownik.nazwa_uzytkownika;
      req.session.email = uzytkownik.email;
      req.session.rola = uzytkownik.rola;
      req.session.poterminie = uzytkownik.numer_karty;
      req.session.koszyk = uzytkownik.koszyk;

      res.redirect("/");
    } catch (error) {
      console.error("Błąd rejestracji:", error);
      if (pokazowka)
        return res.json({
          sukces: false,
          wiadomosc: error.message,
        });
      res.render("auth/register", {
        tytul: "Rejestracja",
        error: error.message,
        formData: req.body,
        customCSS: "/css/auth.css",
      });
    }
  }
);

router.get("/login", (req, res) => {
  const returnTo = req.query.returnTo || req.headers.referer || "/dashboard";
  req.session.returnTo = returnTo;

  if (req.session.userId) {
    return res.redirect(returnTo);
  }

  if (pokazowka) return res.json({ message: "Strona logowania" });
  res.render("auth/login", {
    tytul: "Logowanie",
    formData: {},
    customCSS: "/css/auth.css",
  });
});

router.post(
  "/login",
  pokazowka ? [] : loginValidation,
  validateRequest,
  async (req, res) => {
    try {
      const { nazwa_uzytkownika, haslo } = req.body;
      const uzytkownik = await Uzytkownik.auth(nazwa_uzytkownika, haslo);
      req.session.userId = uzytkownik.numer_karty;
      req.session.nazwa_uzytkownika = uzytkownik.nazwa_uzytkownika;
      req.session.email = uzytkownik.email;
      req.session.rola = uzytkownik.rola;
      req.session.poterminie = uzytkownik.numer_karty;
      req.session.koszyk = uzytkownik.koszyk;
      req.session.datarejestracji = uzytkownik.datarejestracji;
      if (pokazowka)
        return res.json({
          sukces: true,
          wiadomosc: "Logowanie pomyślne",
          uzytkownik: uzytkownik,
        });

      const returnTo = req.session.returnTo || "/dashboard";
      res.redirect(returnTo);
    } catch (error) {
      console.error("Błąd:", error);
      if (pokazowka)
        return res.json({
          sukces: false,
          wiadomosc: error.message,
          formData: req.body,
        });

      res.render("auth/login", {
        tytul: "Login",
        error: error.message,
        formData: req.body,
        customCSS: "/css/auth.css",
      });
    }
  }
);

router.post("/wyloguj", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      if (pokazowka)
        return res.json({
          sukces: false,
          wiadomosc: "Nie udało się wylogować",
        });
      return res.render("error", {
        tytul: "Błąd",
        error: "Nie udało się wylogować",
        customCSS: "/css/error.css",
      });
    }

    res.clearCookie("connect.sid");
    if (pokazowka)
      return res.json({
        sukces: true,
        wiadomosc: "Wylogowano pomyślnie!",
      });
    res.redirect("/");
  });
});

router.post("/moje-konto", async (req, res) => {
  if (!req.session.userId) {
    if (pokazowka)
      return res.json({
        sukces: false,
        wiadomosc: "Nie jesteś uwierzytelniony",
      });
    return res.render("/login", {
      tytul: "Login",
      formData: {},
      customCSS: "/css/auth.css",
    });
  }

  try {
    const uzytkownik = await Uzytkownik.znajdzPrzezKarte(req.session.userId);
    if (!uzytkownik) {
      if (pokazowka)
        return res.json({
          sukces: false,
          wiadomosc: "Nie odnaleziono użytkownika",
        });
      return res.render("/login", {
        tytul: "Login",
        error: "Nie odnaleziono użytkownika",
        formData: {},
        customCSS: "/css/auth.css",
      });
    }

    if (pokazowka)
      return res.json({
        sukces: true,
        uzytkownik: uzytkownik,
      });
    res.json({
      sukces: true,
      uzytkownik: uzytkownik,
    });
  } catch (error) {
    console.error("Błąd użytkownika:", error);
    if (pokazowka)
      return res.json({
        sukces: false,
        wiadomosc: error.message,
      });
    res.render("/login", {
      tytul: "Login",
      error: "Nastąpił nieoczekiwany błąd",
      formData: {},
      customCSS: "/css/auth.css",
    });
  }
});

module.exports = router;
