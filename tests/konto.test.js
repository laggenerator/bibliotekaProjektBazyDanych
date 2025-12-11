const request = require("supertest");
const express = require("express");
const session = require("express-session");
const TestHelper = require("./testHelper");
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const apiRoutes = require("../routes/api");

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
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

describe("Testy uwierzytelnienia", function () {
  const path = require("path");
  require("dotenv").config({
    path: path.resolve(__dirname, "../.env.test"),
    override: true,
  });

  jest.resetModules();
  let pomocnik;
  beforeAll(async function () {
    pomocnik = new TestHelper();
    await pomocnik.przygotujTesty();
  });

  // Zamknięcie po wszystkich testach
  afterAll(async function () {
    await pomocnik.rozlacz();
  });

  describe("Rejestracja konta", function () {
    it("Za krótka nazwa", async function () {
      let res = await request(app).post("/api/auth/register").send({
        nazwa_uzytkownika: "t",
        haslo: "test",
        email: "test@test.test",
      });
      expect(res.statusCode).toEqual(400);
    });
    it("E-Mail o złym formacie", async function () {
      let res = await request(app).post("/api/auth/register").send({
        nazwa_uzytkownika: "test",
        haslo: "test",
        email: "test@test",
      });
      expect(res.statusCode).toEqual(400);
    });
    it("Brak hasła", async function () {
      let res = await request(app).post("/api/auth/register").send({
        nazwa_uzytkownika: "test",
        haslo: "",
        email: "test@test.test",
      });
      expect(res.statusCode).toEqual(400);
    });
    it("Tworzenie konta", async function () {
      let res = await request(app).post("/api/auth/register").send({
        nazwa_uzytkownika: "test",
        haslo: "test",
        email: "test@test.test",
      });
      expect(res.statusCode).toEqual(200);
    });
    it("Tworzenie konta o zajętej nazwie", async function () {
      let res = await request(app).post("/api/auth/register").send({
        nazwa_uzytkownika: "test",
        haslo: "test",
        email: "test@test.test",
      });
      expect(res.statusCode).toEqual(409);
    });
  });

  describe("Logowanie do konta", function () {
    it("Złe hasło", async function () {
      let res = await request(app).post("/api/auth/login").send({
        nazwa_uzytkownika: "admin",
        haslo: "nimda",
      });
      expect(res.statusCode).toEqual(400);
    });
    it("Dobre hasło", async function () {
      let res = await request(app).post("/api/auth/login").send({
        nazwa_uzytkownika: "admin",
        haslo: "admin",
      });
      expect(res.statusCode).toEqual(200);
    });
    it("Wylogowanie", async function () {
      let res = await request(app).post("/api/auth/wyloguj").send({});
      expect(res.statusCode).toEqual(200);
    });
  });
});
