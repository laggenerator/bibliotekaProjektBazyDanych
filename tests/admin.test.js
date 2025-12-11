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

  describe("Aktywacja/dezaktywacja użytkownika", function () {
    it("Dezaktywacja aktywnego użytkownika", async function () {
      let res = await adminAgent
        .post("/api/admin/uzytkownicy/dezaktywuj")
        .send({
          numer_karty: 2,
        });
      expect(res.body.sukces).toEqual(true);
    });

    it("Dezaktywacja nieaktywnego użytkownika", async function () {
      let res = await adminAgent
        .post("/api/admin/uzytkownicy/dezaktywuj")
        .send({
          numer_karty: 2,
        });
      expect(res.body.sukces).toEqual(false);
    });
    it("Aktywacja nieaktywnego użytkownika", async function () {
      let res = await adminAgent.post("/api/admin/uzytkownicy/aktywuj").send({
        numer_karty: 2,
      });
      expect(res.body.sukces).toEqual(true);
    });

    it("Aktywacja aktywnego użytkownika", async function () {
      let res = await adminAgent.post("/api/admin/uzytkownicy/aktywuj").send({
        numer_karty: 2,
      });
      expect(res.body.sukces).toEqual(false);
    });
  });
});
