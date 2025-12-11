const request = require("supertest");
const express = require("express");
const session = require("express-session");
const TestHelper = require("./testHelper");
const app = express();
const Uzytkownik = require("../models/uzytkownik");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const apiRoutes = require("../routes/api");

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
    store: new session.MemoryStore(),
  })
);

app.use(async (req, res, next) => {
  res.locals.uzytkownik = req.session.userId
    ? {
        numer_karty: req.session.userId,
        nazwa_uzytkownika: req.session.nazwa_uzytkownika,
        email: req.session.email,
        rola: req.session.rola,
        poterminie: req.session.poterminie,
        datarejestracji: req.session.datarejestracji,
        koszykCount: await Uzytkownik.ileWKoszyku(req.session.userId),
      }
    : null;
  next();
});

app.use("/api", apiRoutes);

describe("Testy admina", function () {
  const path = require("path");
  require("dotenv").config({
    path: path.resolve(__dirname, "../.env.test"),
    override: true,
  });

  jest.resetModules();
  let pomocnik, adminAgent;
  beforeAll(async function () {
    pomocnik = new TestHelper();
    await pomocnik.przygotujTesty();
    adminAgent = request.agent(app);
    const loginRes = await adminAgent.post("/api/auth/login").send({
      nazwa_uzytkownika: "admin",
      haslo: "admin",
    });
  });

  // Zamknięcie po wszystkich testach
  afterAll(async function () {
    await pomocnik.rozlacz();
  });

  describe("Dodawanie nowej książki", function () {
    it("Zły isbn", async function () {
      let res = await adminAgent.post("/api/admin/ksiazki/dodaj").send({
        tytul_ksiazki: "Testowa książka",
        autor: "Siniv, Lag generator",
        isbn: "abcabcabca",
        rok_wydania: 2025,
        ilosc_stron: 2137,
        kategorie: "Literatura piękna, Young adult",
        liczba_kopii: 1,
      });
      expect(res.statusCode).toEqual(409);
    });
    it("Brak tytułu", async function () {
      let res = await adminAgent.post("/api/admin/ksiazki/dodaj").send({
        tytul_ksiazki: "",
        autor: "Siniv, Lag generator",
        isbn: "1234567891",
        rok_wydania: 2025,
        ilosc_stron: 2137,
        kategorie: "Literatura piękna, Young adult",
        liczba_kopii: 1,
      });
      expect(res.statusCode).toEqual(409);
    });
    it("Prawidłowe formatowanie", async function () {
      let res = await adminAgent.post("/api/admin/ksiazki/dodaj").send({
        tytul_ksiazki: "Testowa książka",
        autor: "Siniv, Lag generator",
        isbn: "1234567891",
        rok_wydania: 2025,
        ilosc_stron: 2137,
        kategorie: "Literatura piękna, Young adult",
        liczba_kopii: 1,
      });
      expect(res.statusCode).toEqual(200);
    });
    it("Dodawania egzemplarza", async function () {
      let res = await adminAgent
        .post("/api/admin/ksiazki/dodajEgzemplarz")
        .send({
          id_ksiazki: 1,
        });
      expect(res.statusCode).toEqual(200);
    });
  });

  describe("Wypożyczanie książki", function () {
    it("Dodanie po ID", async function () {
      let res = await adminAgent.post("/api/koszyk/dodajPoId/1");
      expect(res.statusCode).toEqual(200);
    });
    it("Dodanie po ID tego samego wydania (inne ID)", async function () {
      let res = await adminAgent.post("/api/koszyk/dodajPoId/2");
      expect(res.statusCode).toEqual(400);
    });
    it("Czyszczenie koszyka", async function () {
      let res = await adminAgent.post("/api/koszyk/wyczysc");
      expect(res.statusCode).toEqual(200);
    });
    it("Dodanie po ISBN", async function () {
      let res = await adminAgent.post("/api/koszyk/dodaj/1234567891");
      expect(res.statusCode).toEqual(200);
    });
    it("Dodanie po ISBN tego samego wydania", async function () {
      let res = await adminAgent.post("/api/koszyk/dodaj/1234567891");
      expect(res.statusCode).toEqual(400);
    });
    it("Złożenie zamówienia", async function () {
      let res = await adminAgent.post("/api/koszyk/wypozycz");
      expect(res.statusCode).toEqual(200);
    });
    it("Złożenie zamówienia na pusty koszyk", async function () {
      let res = await adminAgent.post("/api/koszyk/wypozycz");
      expect(res.statusCode).toEqual(400);
    });
  });

  describe("Odbieranie i oddawanie zamówienia", function () {
    it("Wyszukiwanie istniejącego zamówienia", async function () {
      let res = await adminAgent.get("/api/admin/zamowienia/1");
      expect(res.statusCode).toEqual(200);
      expect(res.body.status_zamowienia).toEqual("W przygotowaniu");
    });
    it("Wyszukiwanie nieistniejącego zamówienia", async function () {
      let res = await adminAgent.get("/api/admin/zamowienia/2");
      expect(res.statusCode).toEqual(404);
    });
    it("Zmiana statusu na odebrany", async function () {
      let res = await adminAgent
        .post("/api/admin/zamowienia/1/status")
        .send({ nowy_status: "Odebrane" });
      expect(res.statusCode).toEqual(200);
    });
    it("Zamówienie na status odebrany", async function () {
      let res = await adminAgent.get("/api/admin/zamowienia/1");
      expect(res.statusCode).toEqual(200);
      expect(res.body.status_zamowienia).toEqual("Odebrane");
    });
    it("Zwrot zamówienia", async function () {
      let res = await adminAgent.post("/api/admin/zamowienia/1/zwrot");
      expect(res.statusCode).toEqual(200);
    });
  });
});
