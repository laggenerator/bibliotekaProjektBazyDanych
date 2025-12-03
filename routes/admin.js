const express = require("express");
const router = express.Router();
const Admin = require("../models/admin");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const uploadValidation = require("../validators/uploadValidator");
const { localsName } = require("ejs");
const Ksiazka = require("../models/ksiazka");
const Egzemplarz = require("../models/egzemplarz");
const Zamowienie = require("../models/zamowienie");
const multer = require("multer");
const path = require("path");
const { validationResult } = require("express-validator");
const { error } = require("console");
const { pokazowka } = require("../zmienna");
const Uzytkownik = require("../models/uzytkownik");

// Konfiguracja multera do okładek
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/assets/okladki/");
  },
  filename: function (req, file, cb) {
    const isbn = req.body.isbn;
    cb(null, isbn + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const dozwoloneTypy = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (dozwoloneTypy.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Nieobsługiwany format pliku. Dozwolone: JPG, PNG, WEBP"),
      false
    );
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

router.get("/dashboard", requireAdmin, async (req, res) => {
  try {
    const liczbaUzytkownikow = await Admin.ileUzytkownikow();
    const poTerminie = await Admin.ilePoTerminie();
    const liczbaAktywnychZamowien = await Zamowienie.policzAktywne();
    const liczbaWszystkichZamowien = await Zamowienie.policzWszystkie();
    if (pokazowka) return res.json({ liczbaUzytkownikow, poTerminie });
    res.render("admin/dashboard", {
      tytul: "Panel admina",
      customCSS: "/css/dashboard.css",
      liczbaUzytkownikow: liczbaUzytkownikow,
      liczbaAktywnychZamowien: liczbaAktywnychZamowien,
      liczbaWszystkichZamowien: liczbaWszystkichZamowien,
      poTerminie: poTerminie,
    });
  } catch (error) {
    if (pokazowka) return res.json({ error: error.message });
    res.render("admin/dashboard", {
      tytul: "Panel admina",
      customCSS: "/css/dashboard.css",
      error: error,
    });
  }
});

router.get("/ksiazki", requireAdmin, async (req, res) => {
  try {
    const ksiazki = await Ksiazka.pobierzWszystkie();
    if (pokazowka) return res.json(ksiazki);
    res.render("admin/ksiazki", {
      tytul: "Zarządzanie książkami",
      customCSS: ["/css/dashboard.css", "/css/ksiazki.css", "/css/admin.css"],
      ksiazki: Array.isArray(ksiazki) ? ksiazki : [],
    });
  } catch (error) {
    if (pokazowka) return res.json({ error: error.message });
    res.render("admin/ksiazki", {
      tytul: "Zarządzanie książkami",
      ksiazki: [],
      customCSS: ["/css/dashboard.css", "/css/ksiazki.css", "/css/admin.css"],
      error: error,
    });
  }
});

router.get("/uzytkownicy", requireAdmin, async (req, res) => {
  try {
    const uzytkownicy = await Admin.pobierzUzytkownikow();
    if (pokazowka) return res.json(uzytkownicy);
    res.render("admin/uzytkownicy", {
      tytul: "Zarządzanie użytkownikami",
      customCSS: ["/css/dashboard.css", "/css/ksiazki.css", "/css/admin.css"],
      uzytkownicy: Array.isArray(uzytkownicy) ? uzytkownicy : [],
    });
  } catch (error) {
    if (pokazowka) return res.json({ error: error.message });
    res.render("admin/uzytkownicy", {
      tytul: "Zarządzanie użytkownikami",
      uzytkownicy: [],
      customCSS: ["/css/dashboard.css", "/css/ksiazki.css", "/css/admin.css"],
      error: error,
    });
  }
});

router.post("/uzytkownicy/dezaktywuj", requireAdmin, async (req, res) => {
  try {
    const { numer_karty } = req.body;
    const result = await Admin.dezaktywujUzytkownika(numer_karty);
    let zwrot;
    if (!result) {
      zwrot = {
        sukces: false,
        wiadomosc: "Nie udało się dezaktywować użytkownika",
        numer_karty: numer_karty,
      };
    } else {
      zwrot = {
        sukces: true,
        wiadomosc: "Dezaktywowano użytkownika",
        numer_karty: numer_karty,
      };
    }
    if (pokazowka) return res.json(zwrot);
    const uzytkownicy = await Admin.pobierzUzytkownikow();
    res.render("admin/uzytkownicy", {
      tytul: "Zarządzanie użytkownikami",
      customCSS: ["/css/dashboard.css", "/css/ksiazki.css", "/css/admin.css"],
      uzytkownicy: Array.isArray(uzytkownicy) ? uzytkownicy : [],
      sukces: zwrot.sukces ? zwrot.wiadomosc : null,
      error: !zwrot.sukces ? zwrot.wiadomosc : null,
    });
  } catch (error) {
    if (pokazowka) return res.json({ sukces: false, error: error.message });
    const uzytkownicy = await Admin.pobierzUzytkownikow();
    res.render("admin/uzytkownicy", {
      tytul: "Zarządzanie użytkownikami",
      uzytkownicy: Array.isArray(uzytkownicy) ? uzytkownicy : [],
      customCSS: ["/css/dashboard.css", "/css/ksiazki.css", "/css/admin.css"],
      error: error.message,
    });
  }
});

router.post("/uzytkownicy/aktywuj", requireAdmin, async (req, res) => {
  try {
    const { numer_karty } = req.body;
    const result = await Admin.aktywujUzytkownika(numer_karty);
    let zwrot;
    if (!result) {
      zwrot = {
        sukces: false,
        wiadomosc: "Nie udało się aktywować użytkownika",
        numer_karty: numer_karty,
      };
    } else {
      zwrot = {
        sukces: true,
        wiadomosc: "Aktywowano użytkownika",
        nazwa_uzytkownika: result.nazwa_uzytkownika,
        numer_karty: result.numer_karty,
        aktywny: result.aktywny,
      };
    }
    if (pokazowka) return res.json(zwrot);
    const uzytkownicy = await Admin.pobierzUzytkownikow();
    res.render("admin/uzytkownicy", {
      tytul: "Zarządzanie użytkownikami",
      customCSS: ["/css/dashboard.css", "/css/ksiazki.css", "/css/admin.css"],
      uzytkownicy: Array.isArray(uzytkownicy) ? uzytkownicy : [],
      sukces: zwrot.sukces ? zwrot.wiadomosc : null,
      error: !zwrot.sukces ? zwrot.wiadomosc : null,
    });
  } catch (error) {
    if (pokazowka) return res.json({ sukces: false, error: error.message });
    const uzytkownicy = await Admin.pobierzUzytkownikow();
    res.render("admin/uzytkownicy", {
      tytul: "Zarządzanie użytkownikami",
      uzytkownicy: Array.isArray(uzytkownicy) ? uzytkownicy : [],
      customCSS: ["/css/dashboard.css", "/css/ksiazki.css", "/css/admin.css"],
      error: error.message,
    });
  }
});

router.get("/zamowienia/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const zamowienie = await Zamowienie.pobierzSzczegoly(id);

    if (!zamowienie) {
      if (pokazowka) return res.json({ error: "Zamówienie nie istnieje" });
      const [aktywne, nieaktywne] = await Promise.all([
        Zamowienie.aktywneZamowienia(),
        Zamowienie.zakonczoneZamowienia(),
      ]);
      return res.render("admin/zamowienia", {
        tytul: "Zarządzanie zamówieniami",
        customCSS: ["/css/dashboard.css", "/css/ksiazki.css", "/css/admin.css"],
        zamowienia: { aktywne, nieaktywne },
        error: "Zamówienie nie istnieje",
      });
    }

    if (pokazowka) return res.json(zamowienie);
    res.render("admin/zamowienia-szczegoly", {
      tytul: `Zamówienie #${zamowienie.id_wypozyczenia}`,
      customCSS: [
        "/css/dashboard.css",
        "/css/szczegolyZamowienia.css",
        "/css/ksiazki.css",
        "/css/admin.css",
      ],
      zamowienie: zamowienie,
    });
  } catch (error) {
    if (pokazowka) return res.json({ error: error.message });
    const [aktywne, nieaktywne] = await Promise.all([
      Zamowienie.aktywneZamowienia(),
      Zamowienie.zakonczoneZamowienia(),
    ]);
    res.render("admin/zamowienia", {
      tytul: "Zarządzanie zamówieniami",
      customCSS: [
        "/css/dashboard.css",
        "/css/szczegolyZamowienia.css",
        "/css/ksiazki.css",
        "/css/admin.css",
      ],
      zamowienia: { aktywne, nieaktywne },
      error: "Błąd podczas pobierania szczegółów zamówienia",
    });
  }
});

router.post("/zamowienia/:id/status", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { nowy_status } = req.body;

    const wynik = await Zamowienie.zmienStatus(id, nowy_status);

    let wiadomosc = `Zmieniono status zamówienia #${id} na "${nowy_status}"`;

    if (nowy_status === "Zwrócone") {
      wiadomosc = `Zarejestrowano zwrot wszystkich książek z zamówienia #${id}`;
    }

    if (pokazowka) return res.json({ sukces: true, wiadomosc });
    const [aktywne, nieaktywne] = await Promise.all([
      Zamowienie.aktywneZamowienia(),
      Zamowienie.zakonczoneZamowienia(),
    ]);

    res.render("admin/zamowienia", {
      tytul: "Zarządzanie zamówieniami",
      customCSS: ["/css/dashboard.css", "/css/ksiazki.css", "/css/admin.css"],
      zamowienia: { aktywne, nieaktywne },
      sukces: wiadomosc,
    });
  } catch (error) {
    if (pokazowka) return res.json({ sukces: false, error: error.message });
    const [aktywne, nieaktywne] = await Promise.all([
      Zamowienie.aktywneZamowienia(),
      Zamowienie.zakonczoneZamowienia(),
    ]);

    res.render("admin/zamowienia", {
      tytul: "Zarządzanie zamówieniami",
      customCSS: ["/css/dashboard.css", "/css/ksiazki.css", "/css/admin.css"],
      zamowienia: { aktywne, nieaktywne },
      error: error.message,
    });
  }
});

router.post("/zamowienia/:id/zwrot", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await Zamowienie.zmienStatus(id, "Zwrócone");

    if (pokazowka)
      res.json({
        sukces: true,
        wiadomosc: `Pomyślnie zarejestrowano zwrot zamówienia #${id}`,
      });
    const [aktywne, nieaktywne] = await Promise.all([
      Zamowienie.aktywneZamowienia(),
      Zamowienie.zakonczoneZamowienia(),
    ]);

    res.render("admin/zamowienia", {
      tytul: "Zarządzanie zamówieniami",
      customCSS: ["/css/dashboard.css", "/css/ksiazki.css", "/css/admin.css"],
      zamowienia: { aktywne, nieaktywne },
      sukces: `Pomyślnie zarejestrowano zwrot zamówienia #${id}`,
    });
  } catch (error) {
    if (pokazowka) return res.json({ sukces: false, error: error.message });
    const [aktywne, nieaktywne] = await Promise.all([
      Zamowienie.aktywneZamowienia(),
      Zamowienie.zakonczoneZamowienia(),
    ]);

    res.render("admin/zamowienia", {
      tytul: "Zarządzanie zamówieniami",
      customCSS: ["/css/dashboard.css", "/css/ksiazki.css", "/css/admin.css"],
      zamowienia: { aktywne, nieaktywne },
      error: error.message,
    });
  }
});

router.post(
  "/zamowienia/:id_wypozyczenia/zwroc/:id_egzemplarza",
  requireAdmin,
  async (req, res) => {
    try {
      const { id_wypozyczenia, id_egzemplarza } = req.params;
      await Zamowienie.oddajKsiazki([parseInt(id_egzemplarza)]);

      if (pokazowka)
        res.json({ sukces: true, wiadomosc: "Pomyślnie zwrócono książkę" });
      const zamowienie = await Zamowienie.pobierzSzczegoly(id_wypozyczenia);
      res.render("admin/zamowienia-szczegoly", {
        tytul: `Zamówienie #${zamowienie.id_wypozyczenia}`,
        customCSS: ["/css/dashboard.css", "/css/ksiazki.css", "/css/admin.css"],
        zamowienie: zamowienie,
        sukces: "Pomyślnie zwrócono książkę",
      });
    } catch (error) {
      if (pokazowka) return res.json({ sukces: false, error: error.message });
      const zamowienie = await Zamowienie.pobierzSzczegoly(
        req.params.id_wypozyczenia
      );
      res.render("admin/zamowienia-szczegoly", {
        tytul: `Zamówienie #${zamowienie.id_wypozyczenia}`,
        customCSS: ["/css/dashboard.css", "/css/ksiazki.css", "/css/admin.css"],
        zamowienie: zamowienie,
        error: error.message,
      });
    }
  }
);

router.post("/zamowienia/:id/anuluj", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await Zamowienie.zmienStatus(id, "Anulowane");

    if (pokazowka)
      res.json({
        sukces: true,
        wiadomosc: `Pomyślnie anulowano zamówienie #${id}`,
      });
    const [aktywne, nieaktywne] = await Promise.all([
      Zamowienie.aktywneZamowienia(),
      Zamowienie.zakonczoneZamowienia(),
    ]);

    res.render("admin/zamowienia", {
      tytul: "Zarządzanie zamówieniami",
      customCSS: ["/css/dashboard.css", "/css/ksiazki.css", "/css/admin.css"],
      zamowienia: { aktywne, nieaktywne },
      sukces: `Pomyślnie anulowano zamówienie #${id}`,
    });
  } catch (error) {
    if (pokazowka) return res.json({ sukces: false, error: error.message });
    const [aktywne, nieaktywne] = await Promise.all([
      Zamowienie.aktywneZamowienia(),
      Zamowienie.zakonczoneZamowienia(),
    ]);

    res.render("admin/zamowienia", {
      tytul: "Zarządzanie zamówieniami",
      customCSS: ["/css/dashboard.css", "/css/ksiazki.css", "/css/admin.css"],
      zamowienia: { aktywne, nieaktywne },
      error: error.message,
    });
  }
});

router.get("/zamowienia", requireAdmin, async (req, res) => {
  try {
    const [aktywne, nieaktywne] = await Promise.all([
      Zamowienie.aktywneZamowienia(),
      Zamowienie.zakonczoneZamowienia(),
    ]);

    const zamowienia = {
      aktywne: aktywne,
      nieaktywne: nieaktywne,
    };

    if (pokazowka) return res.json(zamowienia);
    res.render("admin/zamowienia", {
      tytul: "Zarządzanie zamówieniami",
      customCSS: ["/css/dashboard.css", "/css/ksiazki.css", "/css/admin.css"],
      zamowienia: zamowienia,
    });
  } catch (error) {
    if (pokazowka) return res.json({ error: error.message });
    res.render("admin/dashboard", {
      tytul: "Panel admina",
      customCSS: "/css/dashboard.css",
      error: "Błąd podczas pobierania zamówień",
    });
  }
});

router.post("/wyszukaj-ksiazke", async (req, res) => {
  try {
    const query = req.body.query;
    const ksiazki = await Ksiazka.znajdzKsiazki(query);
    if (pokazowka) return res.json(ksiazki);
    res.render("admin/ksiazki", {
      tytul: `Wyniki dla: ${query}`,
      query: query,
      ksiazki: ksiazki,
      customCSS: ["/css/dashboard.css", "/css/ksiazki.css", "/css/admin.css"],
    });
  } catch (error) {
    if (pokazowka) return res.json({ error: error.message });
    res.render("admin/ksiazki", {
      tytul: "Wyszukiwanie",
      query: req.query.q || "",
      ksiazki: [],
      error: "Wystąpił błąd podczas wyszukiwania",
      customCSS: ["/css/dashboard.css", "/css/ksiazki.css", "/css/admin.css"],
    });
  }
});

router.post("/ksiazki/szukaj", async (req, res) => {
  try {
    const query = req.body.query;
    const ksiazki = await Ksiazka.znajdzKsiazki(query);
    if (pokazowka) return res.json(ksiazki);
    res.render("admin/ksiazki", {
      tytul: `Wyniki dla: ${query}`,
      query: query,
      ksiazki: ksiazki,
      customCSS: ["/css/dashboard.css", "/css/ksiazki.css", "/css/admin.css"],
    });
  } catch (error) {
    if (pokazowka) return res.json({ error: error.message });
    res.render("admin/ksiazki", {
      tytul: "Wyszukiwanie",
      query: req.query.q || "",
      ksiazki: [],
      error: "Wystąpił błąd podczas wyszukiwania",
      customCSS: ["/css/dashboard.css", "/css/ksiazki.css", "/css/admin.css"],
    });
  }
});

router.post("/ksiazki/dodajEgzemplarz", requireAdmin, async (req, res) => {
  try {
    const { id_ksiazki } = req.body;
    const result = await Egzemplarz.dodajEgzemplarz(id_ksiazki);
    if (pokazowka) return res.json({ result });
    const ksiazki = await Ksiazka.pobierzWszystkie();
    res.render("admin/ksiazki", {
      tytul: "Książki",
      sukces: `Dodano egzemplarz #${result}`,
      ksiazki: Array.isArray(ksiazki) ? ksiazki : [],
      customCSS: ["/css/dashboard.css", "/css/ksiazki.css", "/css/admin.css"],
    });
  } catch (error) {
    if (pokazowka) return res.json({ error: error.message });
    const ksiazki = await Ksiazka.pobierzWszystkie();
    res.render("admin/ksiazki", {
      tytul: "Książki",
      ksiazki: Array.isArray(ksiazki) ? ksiazki : [],
      error: error.message,
      customCSS: ["/css/dashboard.css", "/css/ksiazki.css", "/css/admin.css"],
    });
  }
});

router.get("/ksiazki/dodaj", requireAdmin, (req, res) => {
  if (pokazowka) return res.json({ message: "Formularz dodawania książki" });
  res.render("admin/dodaj-ksiazke.ejs", {
    tytul: "Dodawanie książki",
    customCSS: ["/css/admin.css"],
  });
});

router.post(
  "/ksiazki/dodaj",
  requireAdmin,
  upload.single("okladka"),
  uploadValidation,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        if (pokazowka) return res.json({ error: errors.array()[0].msg });
        return res.render("admin/dodaj-ksiazke", {
          error: errors.array()[0].msg,
          ...req.body,
          customCSS: "/css/error.css",
        });
      }
      const liczbaKopii = parseInt(req.body.liczba_kopii) || 1;
      const ksiazka = {
        tytul: req.body.tytul_ksiazki,
        autor: req.body.autor.split(",").map((autor) => autor.trim()),
        isbn: req.body.isbn,
        rok_wydania: req.body.rok_wydania,
        ilosc_stron: req.body.ilosc_stron,
        kategorie: req.body.kategorie
          ? req.body.kategorie.split(",").map((k) => k.trim())
          : [],
        liczba_kopii: liczbaKopii,
      };

      const result = await Ksiazka.dodaj(ksiazka);
      const ksiazki = await Ksiazka.pobierzPoID(result);

      if (pokazowka) return res.json(ksiazki);
      res.render("admin/ksiazki", {
        tytul: "Zarządzanie książkami",
        customCSS: ["/css/dashboard.css", "/css/ksiazki.css", "/css/admin.css"],
        sukces: `Dodano ${liczbaKopii}x ${ksiazka.tytul}!`,
        ksiazki: Array.isArray(ksiazki) ? ksiazki : [],
      });
    } catch (error) {
      if (pokazowka) return res.json({ error: error.message });
      res.render("admin/dodaj-ksiazke", {
        error: "Wystąpił błąd podczas dodawania: " + error.message,
        ...req.body,
        customCSS: ["/css/ksiazki.css", "/css/admin.css"],
      });
    }
  }
);

router.get("/ksiazki/:isbn/edytuj", requireAdmin, async (req, res) => {
  try {
    const { isbn } = req.params;
    const ksiazka = await Ksiazka.pobierzPoISBN(isbn);
    if (!ksiazka) {
      if (pokazowka) return res.json({ error: "Książka nie istnieje" });
      return res.render("error", {
        error: "Wybrana książka nie istnieje?!?!",
        customCSS: ["/css/ksiazki.css", "/css/admin.css", "/css/error.css"],
      });
    }

    const egzemplarze = await Egzemplarz.znajdzDlaKsiazki(ksiazka.id_ksiazki);

    if (pokazowka) return res.json({ ksiazka, egzemplarze });

    res.render("admin/modyfikuj-ksiazke", {
      tytul: `Edycja: ${ksiazka.tytul}`,
      customCSS: ["/css/dashboard.css", "/css/ksiazki.css", "/css/admin.css"],
      ksiazka: ksiazka,
      egzemplarze: egzemplarze || [],
    });
  } catch (error) {
    if (pokazowka) return res.json({ error: error.message });
    return res.render("error", {
      error: "Wybrana książka nie istnieje?!?!",
      customCSS: ["/css/ksiazki.css", "/css/admin.css", "/css/error.css"],
    });
  }
});

router.post("/ksiazki/:isbn/edytuj", requireAdmin, async (req, res) => {
  try {
    const { isbn } = req.params;
    const { tytul, rok_wydania, ilosc_stron, img_link } = req.body;

    // Walidacja danych
    if (!tytul || !rok_wydania || !ilosc_stron) {
      if (pokazowka)
        return res.json({ error: "Wypełnij wszystkie wymagane pola" });

      const ksiazka = await Ksiazka.pobierzPoISBN(isbn);
      const egzemplarze = await Egzemplarz.znajdzDlaKsiazki(ksiazka.id_ksiazki);

      return res.render("admin/modyfikuj-ksiazke", {
        tytul: `Edycja: ${ksiazka.tytul}`,
        customCSS: ["/css/dashboard.css", "/css/ksiazki.css", "/css/admin.css"],
        ksiazka: ksiazka,
        egzemplarze: egzemplarze || [],
        error: "Wypełnij wszystkie wymagane pola",
      });
    }

    const daneDoAktualizacji = {
      tytul,
      rok_wydania: parseInt(rok_wydania),
      ilosc_stron: parseInt(ilosc_stron),
    };

    const zaktualizowana = await Ksiazka.aktualizuj(isbn, daneDoAktualizacji);

    if (pokazowka) return res.json({ sukces: true, ksiazka: zaktualizowana });

    const ksiazka = await Ksiazka.pobierzPoISBN(isbn);
    const egzemplarze = await Egzemplarz.znajdzDlaKsiazki(ksiazka.id_ksiazki);

    res.render("admin/modyfikuj-ksiazke", {
      tytul: `Edycja: ${ksiazka.tytul}`,
      customCSS: ["/css/dashboard.css", "/css/ksiazki.css", "/css/admin.css"],
      ksiazka: ksiazka,
      egzemplarze: egzemplarze || [],
      sukces: "Dane książki zostały zaktualizowane",
    });
  } catch (error) {
    if (pokazowka) return res.json({ error: error.message });

    res.render("error", {
      tytul: `Błąd edycji`,
      customCSS: [
        "/css/dashboard.css",
        "/css/ksiazki.css",
        "/css/admin.css",
        "/css/error.css",
      ],
      error: error.message,
    });
  }
});

router.post(
  "/ksiazki/:isbn/egzemplarze/:id_egzemplarza/zarchiwizuj",
  requireAdmin,
  async (req, res) => {
    try {
      const { isbn, id_egzemplarza } = req.params;

      const result = await Egzemplarz.wylaczZObiegu(parseInt(id_egzemplarza));

      if (pokazowka) {
        return res.json({
          sukces: true,
          message: "Egzemplarz został wycofany z obiegu",
          data: result,
        });
      }

      res.redirect(
        `/admin/ksiazki/${isbn}/edytuj?sukces=Egzemplarz+został+wycofany+z+obiegu`
      );
    } catch (error) {
      if (pokazowka) return res.json({ error: error.message });
      return res.render("error", {
        error: error.message,
        customCSS: ["/css/ksiazki.css", "/css/admin.css", "/css/error.css"],
      });
    }
  }
);

router.post(
  "/ksiazki/:isbn/egzemplarze/:id_egzemplarza/aktywuj",
  requireAdmin,
  async (req, res) => {
    try {
      const { isbn, id_egzemplarza } = req.params;

      const result = await Egzemplarz.przywrocDoObiegu(
        parseInt(id_egzemplarza)
      );

      if (pokazowka) {
        return res.json({
          sukces: true,
          message: "Egzemplarz został przywrócony do obiegu",
          data: result,
        });
      }

      res.redirect(
        `/admin/ksiazki/${isbn}/edytuj?sukces=Egzemplarz+został+przywrócony+do+obiegu`
      );
    } catch (error) {
      if (pokazowka) return res.json({ error: error.message });
      return res.render("error", {
        error: error.message,
        customCSS: ["/css/ksiazki.css", "/css/admin.css", "/css/error.css"],
      });
    }
  }
);

router.get("/uzytkownicy/:numer_karty", requireAdmin, async (req, res) => {
  try {
    const { numer_karty } = req.params;

    const przegladanyUzytkownik = await Uzytkownik.pobierzUzytkownika(
      numer_karty
    );

    if (!przegladanyUzytkownik) {
      if (pokazowka) return res.json({ error: "Użytkownik nie istnieje" });
      const uzytkownicy = await Admin.pobierzUzytkownikow();
      return res.render("admin/uzytkownicy", {
        tytul: "Zarządzanie użytkownikami",
        customCSS: ["/css/dashboard.css", "/css/ksiazki.css", "/css/admin.css"],
        uzytkownicy: Array.isArray(uzytkownicy) ? uzytkownicy : [],
        error: "Użytkownik nie istnieje",
      });
    }

    const wypozyczenia = await Zamowienie.historiaWypozyczen(numer_karty);

    if (pokazowka) return res.json({ przegladanyUzytkownik, wypozyczenia });

    res.render("admin/uzytkownik-szczegoly", {
      tytul: `Użytkownik: ${przegladanyUzytkownik.nazwa_uzytkownika}`,
      customCSS: ["/css/dashboard.css", "/css/ksiazki.css", "/css/admin.css"],
      przegladanyUzytkownik: przegladanyUzytkownik,
      wypozyczenia: wypozyczenia || [],
    });
  } catch (error) {
    if (pokazowka) return res.json({ error: error.message });
    const uzytkownicy = await Admin.pobierzUzytkownikow();
    res.render("admin/uzytkownicy", {
      tytul: "Zarządzanie użytkownikami",
      customCSS: ["/css/dashboard.css", "/css/ksiazki.css", "/css/admin.css"],
      uzytkownicy: Array.isArray(uzytkownicy) ? uzytkownicy : [],
      error: error.message,
    });
  }
});

module.exports = router;
