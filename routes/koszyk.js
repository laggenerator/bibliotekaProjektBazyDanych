const express = require("express");
const router = express.Router();
const Uzytkownik = require("../models/uzytkownik");
const { requireAuth } = require("../middleware/auth");
const { normalizacjaISBN } = require("../models/ksiazka");
const { pokazowka } = require("../zmienna");
const pool = require("../db");
const Zamowienie = require("../models/zamowienie");
const Ksiazka = require("../models/ksiazka");
const { znajdzPoId } = require("../models/egzemplarz");

router.get("/", requireAuth, async (req, res) => {
  try {
    const koszyk = await Uzytkownik.zapodajKoszyk(req.session.userId);
    const results = await Promise.all(
      koszyk.map(async (item) => {
        const egzemplarz = await znajdzPoId(item.id_egzemplarza);
        const ksiazka = await Ksiazka.pobierzPoID(egzemplarz.id_ksiazki);
        return {
          ...ksiazka,
          id_egzemplarza: item.id_egzemplarza,
        };
      })
    );

    if (pokazowka) return res.json(Array.isArray(results) ? results : []);
    res.render("koszyk", {
      tytul: "Koszyk",
      ksiazki: Array.isArray(results) ? results : [],
      customCSS: [
        "/css/header.css",
        "/css/admin.css",
        "/css/ksiazki.css",
        "/css/szczegolyKsiazka.css",
      ],
    });
  } catch (error) {
    if (pokazowka) return res.json({ error: error.message });
    console.error("Błąd pobierania koszyka:", error);
    res.status(500).json({ error: "Błąd serwera" });
  }
});

router.post("/dodaj/:isbn", requireAuth, async (req, res) => {
  try {
    const { isbn } = req.params;
    const result = await Uzytkownik.dodajDoKoszykaISBN(
      req.session.userId,
      isbn
    );
    let wiadomosc;
    if (result) wiadomosc = "Udalo sie dodac ksiazke";
    else wiadomosc = "Nie udalo sie dodac ksiazki";
    if (pokazowka) return res.json({ result, wiadomosc });
    res.redirect("/koszyk");
  } catch (error) {
    if (pokazowka) return res.json({ error: error.message });
    res.render("error", {
      error: `Wystąpił błąd podczas rezerwacji książki: ${error.message}`,
      customCSS: "/css/error.css",
    });
  }
});

router.post("/dodajPoID/:id_egzemplarza", requireAuth, async (req, res) => {
  try {
    const { id_egzemplarza } = req.params;
    const result = await Uzytkownik.dodajDoKoszyka(
      req.session.userId,
      id_egzemplarza
    );
    let wiadomosc;
    if (result) wiadomosc = "Udalo sie dodac ksiazke";
    else wiadomosc = "Nie udalo sie dodac ksiazki";
    if (pokazowka) return res.json({ result, wiadomosc });
    res.redirect("/koszyk");
  } catch (error) {
    if (pokazowka) return res.json({ error: error.message });
    res.render("error", {
      error: `Wystąpił błąd podczas rezerwacji książki: ${error.message}`,
      customCSS: "/css/error.css",
    });
  }
});

router.post("/usun/:id_egzemplarza", requireAuth, async (req, res) => {
  try {
    const { id_egzemplarza } = req.params;
    const result = await Uzytkownik.usunZKoszyka(
      req.session.userId,
      id_egzemplarza
    );
    let wiadomosc;
    if (result) wiadomosc = "Udalo sie wyciagnac ksiazke";
    else wiadomosc = "Nie udalo sie wyciagnac ksiazki";
    if (pokazowka) return res.json({ result, wiadomosc });
    res.redirect("/koszyk");
  } catch (error) {
    if (pokazowka) return res.json({ error: error.message });
    res.render("error", {
      error: `Wystąpił błąd podczas rezerwacji książki: ${error.message}`,
      customCSS: "/css/error.css",
    });
  }
});

router.post("/wyczysc", requireAuth, async (req, res) => {
  try {
    const usuniete = await Uzytkownik.wyczyscKoszyk(req.session.userId);
    let wiadomosc;
    if (usuniete > 0) wiadomosc = "Udalo sie wyczyscic koszyk";
    else wiadomosc = "Nie udalo sie wyczyscic koszyka";
    if (pokazowka) return res.json({ usuniete, wiadomosc });
    res.redirect("/koszyk");
  } catch (error) {
    if (pokazowka) return res.json({ error: error.message });
    res.render("error", {
      error: `Wystąpił błąd podczas czyszczenia koszyka: ${error.message}`,
      customCSS: "/css/error.css",
    });
  }
});

router.post("/wypozycz", requireAuth, async (req, res) => {
  try {
    const result = await Zamowienie.zlozZamowienie(req.session.userId);
    if (pokazowka) return res.json(result);
    res.redirect("/koszyk");
  } catch (error) {
    if (pokazowka) return res.json({ error: error.message });
    res.render("error", {
      error: `Wystąpił błąd podczas wypożyczania koszyka: ${error.message}`,
      customCSS: "/css/error.css",
    });
  }
});

router.post("/oddajKsiazki", requireAuth, async (req, res) => {
  try {
    const { id_egzemplarzy } = req.body;
    const result = await Zamowienie.oddajKsiazki(id_egzemplarzy);
    if (pokazowka) return res.json(result);
    res.redirect("/koszyk");
  } catch (error) {
    if (pokazowka) return res.json({ error: error.message });
    res.render("error", {
      error: `Wystąpił błąd podczas wypożyczania koszyka: ${error.message}`,
      customCSS: "/css/error.css",
    });
  }
});

module.exports = router;
