const express = require("express");
const router = express.Router();
const { localsName } = require("ejs");
const multer = require("multer");
const path = require("path");
const { validationResult } = require("express-validator");
const { error } = require("console");
const { pokazowka } = require("../zmienna");

// Walidacja upload i uwierzytelnianie
const uploadValidation = require("../validators/uploadValidator");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const {
  registerValidation,
  loginValidation,
} = require("../validators/authValidator");
const { validateRequest } = require("../middleware/auth");
// Modele
const Uzytkownik = require("../models/uzytkownik");
const Admin = require("../models/admin");
const Ksiazka = require("../models/ksiazka");
const Egzemplarz = require("../models/egzemplarz");
const Zamowienie = require("../models/zamowienie");
const Autor = require("../models/autor");

// ============== Ścieżki admin ============

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

router.get("/admin/dashboard", requireAdmin, async (req, res) => {
  try {
    const liczbaUzytkownikow = await Admin.ileUzytkownikow();
    const poTerminie = await Admin.ilePoTerminie();
    const liczbaAktywnychZamowien = await Zamowienie.policzAktywne();
    const liczbaWszystkichZamowien = await Zamowienie.policzWszystkie();
    return res.json({ liczbaUzytkownikow, poTerminie });
  } catch (error) {
    return res.json({ error: error.message });
  }
});

router.get("/admin/ksiazki", requireAdmin, async (req, res) => {
  try {
    const ksiazki = await Ksiazka.pobierzWszystkie();
    return res.json(ksiazki);
  } catch (error) {
    return res.json({ error: error.message });
  }
});

router.get("/admin/uzytkownicy", requireAdmin, async (req, res) => {
  try {
    const uzytkownicy = await Admin.pobierzUzytkownikow();
    return res.json(uzytkownicy);
  } catch (error) {
    return res.json({ error: error.message });
  }
});

router.post("/admin/uzytkownicy/dezaktywuj", requireAdmin, async (req, res) => {
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
    return res.json(zwrot);
  } catch (error) {
    return res.json({ sukces: false, error: error.message });
  }
});

router.post("/admin/uzytkownicy/aktywuj", requireAdmin, async (req, res) => {
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
    return res.json(zwrot);
  } catch (error) {
    return res.json({ sukces: false, error: error.message });
  }
});

router.get("/admin/zamowienia/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const zamowienie = await Zamowienie.pobierzSzczegoly(id);

    if (!zamowienie) {
      return res.json({ error: "Zamówienie nie istnieje" });
    }

    return res.json(zamowienie);
  } catch (error) {
    return res.json({ error: error.message });
  }
});

router.post("/admin/zamowienia/:id/status", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { nowy_status } = req.body;

    const wynik = await Zamowienie.zmienStatus(id, nowy_status);

    let wiadomosc = `Zmieniono status zamówienia #${id} na "${nowy_status}"`;

    if (nowy_status === "Zwrócone") {
      wiadomosc = `Zarejestrowano zwrot wszystkich książek z zamówienia #${id}`;
    }

    return res.json({ sukces: true, wiadomosc });
  } catch (error) {
    return res.json({ sukces: false, error: error.message });
  }
});

router.post("/admin/zamowienia/:id/zwrot", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await Zamowienie.zmienStatus(id, "Zwrócone");

    res.json({
      sukces: true,
      wiadomosc: `Pomyślnie zarejestrowano zwrot zamówienia #${id}`,
    });
  } catch (error) {
    return res.json({ sukces: false, error: error.message });
  }
});

router.post(
  "/zamowienia/:id_wypozyczenia/zwroc/:id_egzemplarza",
  requireAdmin,
  async (req, res) => {
    try {
      const { id_wypozyczenia, id_egzemplarza } = req.params;
      await Zamowienie.oddajKsiazki([parseInt(id_egzemplarza)]);

      res.json({ sukces: true, wiadomosc: "Pomyślnie zwrócono książkę" });
    } catch (error) {
      return res.json({ sukces: false, error: error.message });
    }
  }
);

router.post("/admin/zamowienia/:id/anuluj", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await Zamowienie.zmienStatus(id, "Anulowane");

    res.json({
      sukces: true,
      wiadomosc: `Pomyślnie anulowano zamówienie #${id}`,
    });
  } catch (error) {
    return res.json({ sukces: false, error: error.message });
  }
});

router.get("/admin/zamowienia", requireAdmin, async (req, res) => {
  try {
    const [aktywne, nieaktywne] = await Promise.all([
      Zamowienie.aktywneZamowienia(),
      Zamowienie.zakonczoneZamowienia(),
    ]);

    const zamowienia = {
      aktywne: aktywne,
      nieaktywne: nieaktywne,
    };

    return res.json(zamowienia);
  } catch (error) {
    return res.json({ error: error.message });
  }
});

router.post("/admin/wyszukaj-ksiazke", async (req, res) => {
  try {
    const query = req.body.query;
    const ksiazki = await Ksiazka.znajdzKsiazki(query);
    return res.json(ksiazki);
  } catch (error) {
    return res.json({ error: error.message });
  }
});

router.post("/admin/ksiazki/szukaj", async (req, res) => {
  try {
    const query = req.body.query;
    const ksiazki = await Ksiazka.znajdzKsiazki(query);
    return res.json(ksiazki);
  } catch (error) {
    return res.json({ error: error.message });
  }
});

router.post(
  "/admin/ksiazki/dodajEgzemplarz",
  requireAdmin,
  async (req, res) => {
    try {
      const { id_ksiazki } = req.body;
      const result = await Egzemplarz.dodajEgzemplarz(id_ksiazki);
      return res.json({ result });
    } catch (error) {
      return res.json({ error: error.message });
    }
  }
);

router.get("/admin/ksiazki/dodaj", requireAdmin, (req, res) => {
  return res.json({ message: "Formularz dodawania książki" });
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
        return res.json({ error: errors.array()[0].msg });
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

      return res.json(ksiazki);
    } catch (error) {
      return res.json({ error: error.message });
    }
  }
);

router.get("/admin/ksiazki/:isbn/edytuj", requireAdmin, async (req, res) => {
  try {
    const { isbn } = req.params;
    const ksiazka = await Ksiazka.pobierzPoISBN(isbn);
    if (!ksiazka) {
      return res.json({ error: "Książka nie istnieje" });
    }

    const egzemplarze = await Egzemplarz.znajdzDlaKsiazki(ksiazka.id_ksiazki);

    return res.json({ ksiazka, egzemplarze });
  } catch (error) {
    return res.json({ error: error.message });
  }
});

router.post("/admin/ksiazki/:isbn/edytuj", requireAdmin, async (req, res) => {
  try {
    const { isbn } = req.params;
    const { tytul, rok_wydania, ilosc_stron, img_link } = req.body;

    // Walidacja danych
    if (!tytul || !rok_wydania || !ilosc_stron) {
      return res.json({ error: "Wypełnij wszystkie wymagane pola" });
    }

    const daneDoAktualizacji = {
      tytul,
      rok_wydania: parseInt(rok_wydania),
      ilosc_stron: parseInt(ilosc_stron),
    };

    const zaktualizowana = await Ksiazka.aktualizuj(isbn, daneDoAktualizacji);

    return res.json({ sukces: true, ksiazka: zaktualizowana });
  } catch (error) {
    return res.json({ error: error.message });
  }
});

router.post(
  "/ksiazki/:isbn/egzemplarze/:id_egzemplarza/zarchiwizuj",
  requireAdmin,
  async (req, res) => {
    try {
      const { isbn, id_egzemplarza } = req.params;

      const result = await Egzemplarz.wylaczZObiegu(parseInt(id_egzemplarza));

      return res.json({
        sukces: true,
        message: "Egzemplarz został wycofany z obiegu",
        data: result,
      });
    } catch (error) {
      return res.json({ error: error.message });
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

      return res.json({
        sukces: true,
        message: "Egzemplarz został przywrócony do obiegu",
        data: result,
      });
    } catch (error) {
      return res.json({ error: error.message });
    }
  }
);

router.get(
  "/admin/uzytkownicy/:numer_karty",
  requireAdmin,
  async (req, res) => {
    try {
      const { numer_karty } = req.params;

      const przegladanyUzytkownik = await Uzytkownik.pobierzUzytkownika(
        numer_karty
      );

      if (!przegladanyUzytkownik) {
        return res.json({ error: "Użytkownik nie istnieje" });
      }

      const wypozyczenia = await Zamowienie.historiaWypozyczen(numer_karty);

      return res.json({ przegladanyUzytkownik, wypozyczenia });
    } catch (error) {
      return res.json({ error: error.message });
    }
  }
);

// ============== Ścieżki autorzy ============

router.get("/autorzy/:autor", async (req, res) => {
  try {
    const autor = decodeURIComponent(req.params.autor);
    const pociety_autor = autor.trim().split(" ");
    if (pociety_autor.length < 1) {
      throw new Error("TO AUTOR NAWET IMIENIA NIE MA!!!???");
    }
    let nazwisko = "";
    if (pociety_autor.length > 1) {
      nazwisko = pociety_autor.pop();
    }
    const imie = pociety_autor.join(" ");
    let ksiazki = await Autor.kopieAutora(imie, nazwisko);
    if (!ksiazki || ksiazki.length === 0) {
      return res.json({ error: "Nie posiadamy książek pożądanego autora!" });
    }

    if (req.session.userId) {
      ksiazki = await Ksiazka.dodajFlagiWKoszyku(ksiazki, req.session.userId);
    }

    return res.json({ autor, ksiazki });
  } catch (error) {
    return res.json({ error: error.message });
  }
});

router.get("/autorzy/", async (req, res) => {
  try {
    const autorzy = await Autor.wszyscy();
  } catch (error) {
    return res.json({ error: error.message });
  }
});

// ============== Ścieżki kategorie ============

router.get("/kategorie/:kategoria", async (req, res) => {
  try {
    const kategoria = req.params.kategoria;
    let ksiazki = await Ksiazka.wyszukajKategorie(kategoria);

    if (!ksiazki || ksiazki.length === 0) {
      return res.json({ error: "Nie posiadamy książek w danej kategorii" });
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

    return res.json({ kategoria, ksiazki, licznik });
  } catch (error) {
    return res.json({ error: error.message });
  }
});

router.get("/kategorie/", async (req, res) => {
  try {
    const kategorie = await Ksiazka.kategorie();
    return res.json(kategorie);
  } catch (error) {
    return res.json({ error: error.message });
  }
});

// ============== Ścieżki koszyk ============

router.get("/koszyk/", requireAuth, async (req, res) => {
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

    return res.json(Array.isArray(results) ? results : []);
  } catch (error) {
    return res.json({ error: error.message });
  }
});

router.post("/koszyk/dodaj/:isbn", requireAuth, async (req, res) => {
  try {
    const { isbn } = req.params;
    const result = await Uzytkownik.dodajDoKoszykaISBN(
      req.session.userId,
      isbn
    );
    let wiadomosc;
    if (result) wiadomosc = "Udalo sie dodac ksiazke";
    else wiadomosc = "Nie udalo sie dodac ksiazki";
    return res.json({ result, wiadomosc });
  } catch (error) {
    return res.json({ error: error.message });
  }
});

router.post(
  "/koszyk/dodajPoID/:id_egzemplarza",
  requireAuth,
  async (req, res) => {
    try {
      const { id_egzemplarza } = req.params;
      const result = await Uzytkownik.dodajDoKoszyka(
        req.session.userId,
        id_egzemplarza
      );
      let wiadomosc;
      if (result) wiadomosc = "Udalo sie dodac ksiazke";
      else wiadomosc = "Nie udalo sie dodac ksiazki";
      return res.json({ result, wiadomosc });
    } catch (error) {
      return res.json({ error: error.message });
    }
  }
);

router.post("/koszyk/usun/:id_egzemplarza", requireAuth, async (req, res) => {
  try {
    const { id_egzemplarza } = req.params;
    const result = await Uzytkownik.usunZKoszyka(
      req.session.userId,
      id_egzemplarza
    );
    let wiadomosc;
    if (result) wiadomosc = "Udalo sie wyciagnac ksiazke";
    else wiadomosc = "Nie udalo sie wyciagnac ksiazki";
    return res.json({ result, wiadomosc });
  } catch (error) {
    return res.json({ error: error.message });
  }
});

router.post("/koszyk/wyczysc", requireAuth, async (req, res) => {
  try {
    const usuniete = await Uzytkownik.wyczyscKoszyk(req.session.userId);
    let wiadomosc;
    if (usuniete > 0) wiadomosc = "Udalo sie wyczyscic koszyk";
    else wiadomosc = "Nie udalo sie wyczyscic koszyka";
    return res.json({ usuniete, wiadomosc });
  } catch (error) {
    return res.json({ error: error.message });
  }
});

router.post("/koszyk/wypozycz", requireAuth, async (req, res) => {
  try {
    const result = await Zamowienie.zlozZamowienie(req.session.userId);
    return res.json(result);
  } catch (error) {
    return res.json({ error: error.message });
  }
});

router.post("/koszyk/oddajKsiazki", requireAuth, async (req, res) => {
  try {
    const { id_egzemplarzy } = req.body;
    const result = await Zamowienie.oddajKsiazki(id_egzemplarzy);
    return res.json(result);
  } catch (error) {
    return res.json({ error: error.message });
  }
});

// ============== Ścieżki książki ============

router.get("/ksiazki/", async (req, res) => {
  try {
    let ksiazki = await Ksiazka.pobierzWszystkie();

    if (req.session.userId) {
      ksiazki = await Ksiazka.dodajFlagiWKoszyku(ksiazki, req.session.userId);
    }

    return res.json(ksiazki);
  } catch (error) {
    return res.json({ error: error.message });
  }
});

router.get("/ksiazki/:isbn", async (req, res) => {
  try {
    const { isbn } = req.params;
    const ksiazka = await Ksiazka.pobierzPoISBN(isbn);

    if (!ksiazka) {
      return res.json({ error: "Książka o danym ISBN nie istnieje!" });
    }

    const egzemplarze = await Egzemplarz.znajdzDlaKsiazki(ksiazka.id_ksiazki);

    const kopie = egzemplarze.map((e) => ({
      id: e.id_egzemplarza,
      dostepna: e.status === "Wolna",
      wKoszyku: e.status === "W_koszyku",
      status: e.status,
      lokalizacja:
        e.pokoj && e.polka
          ? `Pokój ${e.pokoj}, półka ${e.polka}`
          : "Brak lokalizacji",
    }));
    let uzytkownikDalRecenzje = null;
    if (req.session.userId) {
      uzytkownikDalRecenzje = ksiazka.recenzje.find(
        (recenzja) => recenzja.numer_karty === req.session.userId
      );
    }
    return res.json({
      tytul: ksiazka.tytul,
      ksiazka: ksiazka,
      kopie: kopie,
      dostepneKopie: kopie.filter((k) => k.dostepna),
      niedostepneKopie: kopie.filter((k) => !k.dostepna),
      recenzje: ksiazka.recenzje || [],
      zmiennaKtorejNieMaJeszcze: uzytkownikDalRecenzje,
    });
  } catch (error) {
    return res.json({ error: error.message });
  }
});

router.post(
  "/ksiazki/dodaj-recenzje/:id_ksiazki",
  requireAuth,
  async (req, res) => {
    try {
      const { ocena, tekst } = req.body;
      const ksiazka = {
        id_ksiazki: req.params.id_ksiazki,
        ocena: parseInt(ocena),
        tekst: tekst || null,
        numer_karty: req.session.userId,
      };

      const isbn = await Ksiazka.dodajRecenzje(ksiazka);
      if (isbn === -1) throw new Error("Zakres ocen to [0;5]");
      return res.json({ sukces: true, isbn });
    } catch (error) {
      return res.json({ error: error.message });
    }
  }
);

router.post(
  "/ksiazki/usun-recenzje/:id_recenzji",
  requireAuth,
  async (req, res) => {
    try {
      const ksiazka = {
        id_recenzji: req.params.id_recenzji,
        numer_karty: req.session.userId,
      };

      const isbn = await Ksiazka.usunRecenzje(ksiazka);

      return res.json({ sukces: true, isbn });
    } catch (error) {
      return res.json({ error: error.message });
    }
  }
);

router.post("/ksiazki/wyszukaj", async (req, res) => {
  try {
    const { tytulksiazki, autor, isbn, kategoria } = req.body;
    const zapytanie = [
      tytulksiazki || null,
      autor || null,
      Ksiazka.denormalizacjaISBN(isbn) || null,
      kategoria || null,
    ];
    const ksiazki = await Ksiazka.znajdzKsiazki(zapytanie);
    return res.json(ksiazki);
  } catch (error) {
    return res.json({ error: error.message });
  }
});

// ============== Ścieżki main ============

router.get("/", async (req, res) => {
  try {
    const ksiazki = await Ksiazka.najnowsze6Ksiazek();
    const najnowsze = await Zamowienie.najnowsze();

    return res.json({ ksiazki, najnowsze });
  } catch (error) {
    return res.json({ error: error.message });
  }
});

router.get("/dashboard", requireAuth, async (req, res) => {
  try {
    const liczbaPoTerminie = await Uzytkownik.ilePoTerminie(req.session.userId);
    return res.json(liczbaPoTerminie);
  } catch (error) {
    return res.json({ error: error.message });
  }
});

router.get("/dashboard/moje-recenzje", requireAuth, async (req, res) => {
  try {
    const recenzje = await Uzytkownik.podajRecenzje(req.session.userId);
    return res.json(recenzje);
  } catch (error) {
    return res.json({ error: error.message });
  }
});

// Bieżące wypożyczenia
router.get("/dashboard/biezace-wypozyczenia", requireAuth, async (req, res) => {
  try {
    const wypozyczenia = await Zamowienie.biezaceWypozyczenia(
      req.session.userId
    );

    return res.json(wypozyczenia);
  } catch (error) {
    return res.json({ error: error.message });
  }
});

// Historia wypożyczeń
router.get("/dashboard/historia", requireAuth, async (req, res) => {
  try {
    const wypozyczenia = await Zamowienie.historiaWypozyczen(
      req.session.userId
    );

    return res.json(wypozyczenia);
  } catch (error) {
    return res.json({ error: error.message });
    console.error("Błąd pobierania historii wypożyczeń:", error);
  }
});

router.get("/wyszukiwarka", async (req, res) => {
  try {
    return res.json({ message: "Strona wyszukiwarki" });
  } catch (error) {
    return res.json({ error: error.message });
  }
});

router.get("/poterminie", requireAuth, async (req, res) => {
  try {
    const listaPoTerminie = await Uzytkownik.listaZaleglosci(
      req.session.userId
    );
    return res.json(listaPoTerminie);
  } catch (error) {
    return res.json({ error: error.message });
  }
});

router.get("/koszyk", requireAuth, async (req, res) => {
  try {
    const koszyk = await Uzytkownik.zapodajKoszyk(req.session.userId);
    return res.json(koszyk);
  } catch (error) {
    return res.json({ error: error.message });
  }
});

router.post("/dashboard/dezaktywuj", requireAuth, async (req, res) => {
  try {
    const numer_karty = req.session.userId;
    const result = await Admin.dezaktywujUzytkownika(numer_karty);
    let zwrot;
    if (!result) {
      zwrot = {
        sukces: false,
        wiadomosc:
          "Nie udało się dezaktywować konta, sprawdź czy nie masz zaległości w oddawaniu książek",
        numer_karty: numer_karty,
      };
      const liczbaPoTerminie = await Uzytkownik.ilePoTerminie(
        req.session.userId
      );
      res.json({ error: zwrot.wiadomosc });
    } else {
      zwrot = {
        sukces: true,
        wiadomosc: "Dezaktywowano konto",
        numer_karty: numer_karty,
      };
      req.session.destroy((err) => {
        if (err) {
          console.error("Błąd przy niszczeniu sesji:", err);
          throw new Error("Błąd przy niszczeniu sesji");
        }
      });

      res.json({ sukces: zwrot.wiadomosc });
    }
  } catch (err) {
    res.json({ error: `Błąd dezaktywacji konta: ${err}` });
  }
});
// ============== Ścieżki uwierzytelnianie ============

router.get("/auth/register", (req, res) => {
  if (req.session.userId) {
    return res.json({ message: "Jesteś już zalogowany" });
  }

  return res.json({ message: "Strona rejestracji" });
});

router.post(
  "/auth/register",
  registerValidation,
  validateRequest,
  async (req, res) => {
    try {
      const { nazwa_uzytkownika, email, haslo } = req.body;
      const czyIstnieje = await Uzytkownik.istnieje(nazwa_uzytkownika, email);
      if (czyIstnieje) {
        return res.json({
          sukces: false,
          wiadomosc: "Nazwa użytkownika lub email jest w użyciu!",
        });
      }

      const uzytkownik = await Uzytkownik.create(
        nazwa_uzytkownika,
        email,
        haslo
      );

      return res.json({
        sukces: true,
        wiadomosc: "Konto utworzone pomyślnie!",
        uzytkownik: uzytkownik,
      });
    } catch (error) {
      console.error("Błąd rejestracji:", error);
      return res.json({
        sukces: false,
        wiadomosc: error.message,
      });
    }
  }
);

router.get("/auth/login", (req, res) => {
  const returnTo = req.query.returnTo || req.headers.referer || "/dashboard";
  req.session.returnTo = returnTo;

  if (req.session.userId) {
    return res.json({ message: "Jesteś już zalogowany/a" });
  }

  return res.json({ message: "Strona logowania" });
});

router.post(
  "/auth/login",
  loginValidation,
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
      return res.json({
        sukces: true,
        wiadomosc: "Logowanie pomyślne",
        uzytkownik: uzytkownik,
      });
    } catch (error) {
      return res.json({
        sukces: false,
        wiadomosc: error.message,
        formData: req.body,
      });
    }
  }
);

router.post("/auth/wyloguj", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.json({
        sukces: false,
        wiadomosc: "Nie udało się wylogować",
      });
    }

    res.clearCookie("connect.sid");
    return res.json({
      sukces: true,
      wiadomosc: "Wylogowano pomyślnie!",
    });
  });
});

router.post("/auth/moje-konto", async (req, res) => {
  if (!req.session.userId) {
    return res.json({
      sukces: false,
      wiadomosc: "Nie jesteś uwierzytelniony",
    });
  }

  try {
    const uzytkownik = await Uzytkownik.znajdzPrzezKarte(req.session.userId);
    if (!uzytkownik) {
      return res.json({
        sukces: false,
        wiadomosc: "Nie odnaleziono użytkownika",
      });
    }

    res.json({
      sukces: true,
      uzytkownik: uzytkownik,
    });
  } catch (error) {
    return res.json({
      sukces: false,
      wiadomosc: error.message,
    });
  }
});

module.exports = router;
