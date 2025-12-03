const express = require("express");
const router = express.Router();
const Uzytkownik = require("../models/uzytkownik");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { localsName } = require("ejs");
const Ksiazka = require("../models/ksiazka");
const { pokazowka } = require("../zmienna");
const { historiaWypozyczen } = require("../models/zamowienie");
const Zamowienie = require("../models/zamowienie");

router.get("/", async (req, res) => {
  try {
    const ksiazki = await Ksiazka.najnowsze6Ksiazek();
    const najnowsze = await Zamowienie.najnowsze();

    if (pokazowka) return res.json({ ksiazki, najnowsze });
    res.render("index", {
      tytul: "Strona główna",
      ksiazki: ksiazki,
      najnowsze: najnowsze,
      customCSS: ["/css/index.css"],
    });
  } catch (error) {
    if (pokazowka) return res.json({ error: error.message });
    res.render("index", {
      tytul: "Strona główna",
      ksiazki: [],
      najnowsze: [],
      customCSS: ["/css/index.css"],
      error: error.message,
    });
  }
});

router.get("/dashboard", requireAuth, async (req, res) => {
  try {
    const liczbaPoTerminie = await Uzytkownik.ilePoTerminie(req.session.userId);
    if (pokazowka) return res.json(liczbaPoTerminie);
    res.render("dashboard", {
      tytul: "Panel użytkownika",
      poterminie: liczbaPoTerminie,
      customCSS: "/css/dashboard.css",
    });
  } catch (error) {
    if (pokazowka) return res.json({ error: error.message });
    res.render("dashboard", {
      tytul: "Panel użytkownika",
      poterminie: 0,
      customCSS: "/css/dashboard.css",
      error: error.message,
    });
  }
});

router.get("/dashboard/moje-recenzje", requireAuth, async (req, res) => {
  try {
    const recenzje = await Uzytkownik.podajRecenzje(req.session.userId);
    if (pokazowka) return res.json(recenzje);
    res.render("ksiazki/moje-recenzje", {
      tytul: "Moje recenzje",
      customCSS: [
        "/css/dashboard.css",
        "/css/ksiazki.css",
        "/css/admin.css",
        "/css/recenzje.css",
      ],
      recenzje: recenzje,
    });
  } catch (error) {
    if (pokazowka) return res.json({ error: error.message });
    res.render("ksiazki/moje-recenzje", {
      tytul: "Moje recenzje",
      customCSS: [
        "/css/dashboard.css",
        "/css/ksiazki.css",
        "/css/admin.css",
        "/css/recenzje.css",
      ],
      recenzje: [],
      error: `Nastąpił błąd podczas wyświetlania recenzji: ${error}`,
    });
  }
});

// Bieżące wypożyczenia
router.get("/dashboard/biezace-wypozyczenia", requireAuth, async (req, res) => {
  try {
    const wypozyczenia = await Zamowienie.biezaceWypozyczenia(
      req.session.userId
    );

    if (pokazowka) return res.json(wypozyczenia);

    res.render("wypozyczenia/biezace", {
      tytul: "Bieżące wypożyczenia",
      wypozyczenia: wypozyczenia,
      customCSS: [
        "/css/ksiazki.css",
        "/css/wypozyczenia.css",
        "/css/admin.css",
      ],
    });
  } catch (error) {
    if (pokazowka) return res.json({ error: error.message });
    console.error("Błąd pobierania bieżących wypożyczeń:", error);
    res.render("error", {
      error: "Wystąpił błąd podczas pobierania bieżących wypożyczeń",
      customCSS: "/css/error.css",
    });
  }
});

// Historia wypożyczeń
router.get("/dashboard/historia", requireAuth, async (req, res) => {
  try {
    const wypozyczenia = await Zamowienie.historiaWypozyczen(
      req.session.userId
    );

    if (pokazowka) return res.json(wypozyczenia);

    res.render("wypozyczenia/historia", {
      tytul: "Historia wypożyczeń",
      wypozyczenia: wypozyczenia,
      customCSS: [
        "/css/ksiazki.css",
        "/css/wypozyczenia.css",
        "/css/admin.css",
      ],
    });
  } catch (error) {
    if (pokazowka) return res.json({ error: error.message });
    console.error("Błąd pobierania historii wypożyczeń:", error);
    res.render("error", {
      error: "Wystąpił błąd podczas pobierania historii wypożyczeń",
      customCSS: "/css/error.css",
    });
  }
});

router.get("/wyszukiwarka", async (req, res) => {
  try {
    if (pokazowka) return res.json({ message: "Strona wyszukiwarki" });
    res.render("wyszukiwarka", {
      tytul: "Wyszukiwarka",
      customCSS: ["/css/dashboard.css", "/css/ksiazki.css", "/css/admin.css"],
    });
  } catch (error) {
    if (pokazowka) return res.json({ error: error.message });
    res.render("error", {
      error: "Wystąpił błąd podczas ładowania wyszukiwarki",
      customCSS: "/css/error.css",
    });
  }
});

router.get("/poterminie", requireAuth, async (req, res) => {
  try {
    const listaPoTerminie = await Uzytkownik.listaZaleglosci(
      req.session.userId
    );
    if (pokazowka) return res.json(listaPoTerminie);
    res.json(listaPoTerminie);
  } catch (error) {
    if (pokazowka) return res.json({ error: error.message });
    res.json({ error: error.message });
  }
});

router.get("/koszyk", requireAuth, async (req, res) => {
  try {
    const koszyk = await Uzytkownik.zapodajKoszyk(req.session.userId);
    if (pokazowka) return res.json(koszyk);
    res.json(koszyk);
  } catch (error) {
    if (pokazowka) return res.json({ error: error.message });
    res.json({ error: error.message });
  }
});

module.exports = router;
