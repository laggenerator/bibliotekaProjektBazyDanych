const express = require('express');
const router = express.Router();
const Uzytkownik = require('../models/uzytkownik');
const { requireAuth } = require('../middleware/auth');
const { normalizacjaISBN } = require('../models/ksiazka');
const {pokazowka} = require('../zmienna');

router.get('/', requireAuth, async (req, res) => {
    try {
        const koszyk = await Uzytkownik.zapodajKoszyk(req.session.userId);
        if(pokazowka) return res.json(Array.isArray(koszyk) ? koszyk : []);
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


router.post('/dodaj', requireAuth, async (req, res) => {
    try {
        const { id_egzemplarza } = req.body;
        const result = await Uzytkownik.dodajDoKoszyka(req.session.userId, id_egzemplarza);
        let wiadomosc;
        if(result) wiadomosc = 'Udalo sie dodac ksiazke';
        else wiadomosc = 'Nie udalo sie dodac ksiazki';
        if(pokazowka) return res.json({result, wiadomosc});
        res.redirect("/koszyk");
    } catch (error) {
        res.render("error", {
            error: `Wystąpił błąd podczas rezerwacji książki: ${error.message}`,
            customCSS: '/css/error.css'
        });
    }
});

router.post('/usun', requireAuth, async (req, res) => {
    try {
        const { id_egzemplarza } = req.body;
        const result = await Uzytkownik.usunZKoszyka(req.session.userId, id_egzemplarza);
        let wiadomosc;
        if(result) wiadomosc = 'Udalo sie wyciagnac ksiazke';
        else wiadomosc = 'Nie udalo sie wyciagnac ksiazki';
        if(pokazowka) return res.json({result, wiadomosc});
        res.redirect("/koszyk");
    } catch (error) {
        res.render("error", {
            error: `Wystąpił błąd podczas rezerwacji książki: ${error.message}`,
            customCSS: '/css/error.css'
        });
    }
});

router.post('/wyczysc', requireAuth, async (req, res) => {
    try {
        const usuniete = await Uzytkownik.wyczyscKoszyk(req.session.userId);
        let wiadomosc;
        if(usuniete > 0) wiadomosc = 'Udalo sie wyczyscic koszyk';
        else wiadomosc = 'Nie udalo sie wyczyscic koszyka';
        if(pokazowka) return res.json({usuniete, wiadomosc});
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