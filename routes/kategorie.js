const express = require("express");
const router = express.Router();
const Ksiazka = require("../models/ksiazka");
const { pokazowka } = require("../zmienna");

router.get("/:kategoria", async (req, res) => {
  try {
    const kategoria = req.params.kategoria;
    let ksiazki = await Ksiazka.wyszukajKategorie(kategoria);

    if (!ksiazki || ksiazki.length === 0) {
      if (pokazowka)
        return res.json({ error: "Nie posiadamy książek w danej kategorii" });
      return res.render("error", {
        error:
          "Nie posiadamy książek w danej kategorii, zachęcamy do sprawdzenia katalogu kategorii!",
      });
    }

    if (req.session.userId) {
      ksiazki = await Ksiazka.dodajFlagiWKoszyku(ksiazki, req.session.userId);
    }

    // Oblicz statystyki
    const licznik = {
      wszystkie: ksiazki.length,
      dostepne: ksiazki.filter((k) => k.liczba_dostepnych_egzemplarzy > 0)
        .length,
      niedostepne: ksiazki.filter((k) => k.liczba_dostepnych_egzemplarzy === 0)
        .length,
      lacznie_egzemplarzy: ksiazki.reduce(
        (sum, k) => sum + (k.liczba_egzemplarzy || 0),
        0
      ),
      lacznie_dostepnych: ksiazki.reduce(
        (sum, k) => sum + (k.liczba_dostepnych_egzemplarzy || 0),
        0
      ),
    };

    if (pokazowka) return res.json({ kategoria, ksiazki, licznik });

    res.render("ksiazki/wspolna-lista", {
      tytul: kategoria,
      ksiazki: ksiazki,
      customCSS: [
        "/css/szczegolyKsiazka.css",
        "/css/ksiazki.css",
        "/css/admin.css",
      ],
    });
  } catch (error) {
    if (pokazowka) return res.json({ error: error.message });
    console.log(error);
    res.render("error", {
      error: "Wystąpił błąd podczas pobierania książek",
      customCSS: "/css/error.css",
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const kategorie = await Ksiazka.kategorie();
    if (pokazowka) return res.json(kategorie);
    res.render("kategorie/lista", {
      tytul: "Wszystkie kategorie",
      kategorie: kategorie,
      liczbaKategorii: kategorie.length,
      customCSS: ["/css/autorzy.css"],
    });
  } catch (error) {
    if (pokazowka) return res.json({ error: error.message });
    res.render("error", {
      error: "Błąd przy pobieraniu kategorii",
      customCSS: "/css/error.css",
    });
  }
});

module.exports = router;
