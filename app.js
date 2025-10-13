const express = require("express");
const session = require("express-session");
const path = require("path");
const app = express();
const expressLayouts = require('express-ejs-layouts');
var favicon = require("serve-favicon");
const { Pool } = require('pg');
require('dotenv').config();


// Ścieżki
const authRoutes = require("./routes/uwierzytelnianie");
const mainRoutes = require("./routes/main");
const adminRoutes = require("./routes/admin");
const ksiazkiRoutes = require("./routes/ksiazki");
const autorzyRoutes = require("./routes/autorzy");
const kategorieRoutes = require("./routes/kategorie");
const koszykRoutes = require("./routes/koszyk");


// Middleware
const setSearchContext = require('./middleware/searchContext');
const Uzytkownik = require("./models/uzytkownik");
const PORT = process.env.PORT;


app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts);
app.set("layout", "layout");
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(express.static('public'));
app.use(favicon(path.join(__dirname, "public", "assets", "favicon.png")));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));


app.use(async (req, res, next) => {
  res.locals.uzytkownik = req.session.userId ? {
    numer_karty: req.session.userId,
    nazwa_uzytkownika: req.session.nazwa_uzytkownika,
    email: req.session.email,
    rola: req.session.rola,
    poterminie: req.session.poterminie,
    koszykCount: await Uzytkownik.ileWKoszyku(req.session.userId)
  } : null;
  next();
});

app.use(setSearchContext);

app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/ksiazki", ksiazkiRoutes);
app.use("/autorzy", autorzyRoutes);
app.use("/kategorie", kategorieRoutes);
app.use("/koszyk", koszykRoutes);
app.use("/", mainRoutes);

app.get("/roadmap", (req, res) => {
  res.sendFile(__dirname + "/public/roadmap.html");
});


// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render("error", {
    tytul: "Błąd serwera",
    wiadomosc: err.message || "Coś poszło nie tak!",
    customCSS: '/css/error.css'
  });
});
// 404 handling
app.use((req, res) => {
  res.status(404).render("error", {
    tytul: "Błąd",
    wiadomosc: "Strona której szukasz nie istnieje",
    customCSS: '/css/error.css'
  });
});

app.listen(PORT, () => {
  console.log(`Biblioteka dziala na http://localhost:${PORT}`);
});
