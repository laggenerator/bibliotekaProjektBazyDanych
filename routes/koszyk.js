const express = require('express');
const router = express.Router();
const Uzytkownik = require('../models/uzytkownik');
const { requireAuth } = require('../middleware/auth');
const { normalizacjaISBN } = require('../models/ksiazka');

router.get('/', requireAuth, async (req, res) => {
    try {
        const koszyk = await Uzytkownik.zapodajKoszyk(req.session.userId);
        res.render("koszyk", {
            tytul: "Koszyk",
            ksiazki: Array.isArray(koszyk) ? koszyk : [],
            customCSS: ['/css/header.css', '/css/admin.css', '/css/ksiazki.css', '/css/szczegolyKsiazka.css']
        })
    } catch (error) {
        console.error('Błąd pobierania koszyka:', error);
        res.status(500).json({ error: 'Błąd serwera' });
    }
});


router.get('/dodaj/:isbn', requireAuth, async (req, res) => {
    try {
        const { isbn } = req.params;
        await Uzytkownik.dodajDoKoszyka(req.session.userId, normalizacjaISBN(isbn));
        req.session.sukces = 'Książka dodana do koszyka';
        res.redirect("/koszyk");
    } catch (error) {
        res.render("error", {
            error: `Wystąpił błąd podczas rezerwacji książki: ${error.message}`,
            customCSS: '/css/error.css'
        });
    }
});

router.get('/dodajpoID/:ksiazkaId', requireAuth, async (req, res) => {
    try {
        const { ksiazkaId } = req.params;
        await Uzytkownik.dodajDoKoszykaPoId(req.session.userId, ksiazkaId);
        req.session.sukces = 'Książka dodana do koszyka';
        res.redirect("/koszyk");
    } catch (error) {
        res.render("error", {
            error: `Wystąpił błąd podczas rezerwacji książki: ${error.message}`,
            customCSS: '/css/error.css'
        });
    }
});

router.get('/usun/:ksiazkaId', requireAuth, async (req, res) => {
    try {
        const { ksiazkaId } = req.params;
        const koszyk = await Uzytkownik.usunZKoszyka(req.session.userId, ksiazkaId);

        res.render("koszyk", { 
            sukces: 'Książka usunięta z koszyka',
            tytul: "Koszyk",
            ksiazki: koszyk,
            customCSS: ['/css/auth.css', '/css/admin.css','/css/header.css', '/css/ksiazki.css', '/css/szczegolyKsiazka.css']
        });
    } catch (error) {
        res.render("error", {
            error: `Wystąpił błąd podczas rezerwacji książki: ${error.message}`,
            customCSS: '/css/error.css'
        }); 
    }
});

router.get('/wyczysc', requireAuth, async (req, res) => {
    try {
        const koszyk = await Uzytkownik.wyczyscKoszyk(req.session.userId);

        res.render("koszyk", { 
            sukces: 'Koszyk został wyczyszczony',
            tytul: "Koszyk",
            ksiazki: koszyk,
            customCSS: ['/css/auth.css', '/css/admin.css','/css/header.css', '/css/ksiazki.css', '/css/szczegolyKsiazka.css']
        });
    } catch (error) {
        res.render("error", {
            error: `Wystąpił błąd podczas czyszczenia koszyka: ${error.message}`,
            customCSS: '/css/error.css'
        }); 
    }
});

module.exports = router;