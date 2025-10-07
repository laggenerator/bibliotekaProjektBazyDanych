const express = require('express');
const router = express.Router();
const Ksiazka = require('../models/ksiazka');

// router.get("/:kategoria", async (req, res) => {
//   try{
//     const kategoria = req.params;
//     const ksiazki = await Autor.wyszukajAutora(autor);
//     const kopie = await Autor.kopieAutora(autor);
//     if(!ksiazki || ksiazki.length === 0 || !kopie || kopie.length === 0){
//       return res.render("error", {
//         error: "Nie posiadamy książek pożądanego autora!"
//       });
//     }
//     res.render("autorzy/szczegoly", {
//       autor: autor,
//       ksiazki: ksiazki,
//       kopie: kopie,
//       dostepneKopie: kopie.filter(k => k.dostepna),
//       niedostepneKopie: kopie.filter(k => !k.dostepna),
//       customCSS: ['/css/szczegolyKsiazka.css', '/css/ksiazki.css']
//     });
//   } catch (error){
//     res.render("error", {
//       error: "Wystąpił błąd podczas pobierania książek",
//       customCSS: '/css/error.css'
//     });
//   }
// });

router.get("/", async (req, res) => {
  try{
    const kategorie = await Ksiazka.kategorie();
    res.render("kategorie/lista", {
      tytul: "Wszystkie kategorie",
      kategorie: kategorie,
      liczbaKategorii: kategorie.length,
      customCSS: ['/css/autorzy.css']
    });
  } catch (error) {
    res.render("error", {
      error: "Błąd przy pobieraniu kategorii",
      customCSS: '/css/error.css'
    })
  }
})

module.exports = router;