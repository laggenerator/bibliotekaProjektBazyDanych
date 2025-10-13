const { body } = require('express-validator');

const uploadValidation = [
body('tytul_ksiazki')
    .notEmpty()
    .withMessage("Tytuł nie może być pusty")
    .isLength({ min: 1, max: 255 })
    .withMessage("Tytuł musi mieścić się w zakresie [1; 255] znaków")
    .trim()
    .escape(),

  body('autor')
    .notEmpty()
    .withMessage("Autor nie może być pusty")
    .isLength({ min: 1, max: 500 })
    .withMessage("Pole autor musi mieścić się w zakresie [1; 500] znaków")
    .custom((value) => {
      // Sprawdzenie czy autorzy są poprawnie oddzieleni przecinkami
      const autorzy = value.split(',').map(a => a.trim()).filter(a => a.length > 0);
      if (autorzy.length === 0) {
        throw new Error('Należy podać przynajmniej jednego autora');
      }
      return true;
    })
    .trim(),

  body('isbn')
    .notEmpty()
    .withMessage("ISBN nie może być pusty")
    .matches(/^(?:\d{3}-)?\d{1,5}-\d{1,7}-\d{1,7}-\d{1}$|^\d{13}$/)
    .withMessage("Podaj poprawny format ISBN (10/13 cyfr lub format z myślnikami)")
    .custom((value) => {
      const cleanIsbn = value.replace(/-/g, '');
      if (cleanIsbn.length !== 13 && cleanIsbn.length !== 10) {
        throw new Error('ISBN musi zawierać 10/13 cyfr');
      }
      
      return true;
    })
    .trim(),

  body('rok_wydania')
    .isInt({ min: 0, max: new Date().getFullYear() + 1 })
    .withMessage(`Rok wydania musi być liczbą całkowitą w zakresie [0; ${new Date().getFullYear() + 1}]`)
    .toInt(),

  body('ilosc_stron')
    .isInt({ min: 1, max: 10000 })
    .withMessage("Ilość stron musi być liczbą całkowitą w zakresie [1; 10000]")
    .toInt(),

  body('kategorie')
    .optional()
    .isLength({ max: 500 })
    .withMessage("Kategorie nie mogą przekraczać 500 znaków")
    .trim(),

  body('liczba_kopii')
    .isInt({ min: 1, max: 100 })
    .withMessage("Liczba kopii musi być liczbą całkowitą w zakresie [1; 100]")
    .toInt(),
    
  // Walidacja dla pliku 
  body('okladka')
    .optional()
    .custom((value, { req }) => {
      if (req.file) {
        // Sprawdzenie typu pliku
        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedMimes.includes(req.file.mimetype)) {
          throw new Error('Dozwolone formaty obrazów: JPEG, JPG, PNG, WEBP');
        }
        
        // Sprawdzenie rozmiaru pliku (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (req.file.size > maxSize) {
          throw new Error('Rozmiar pliku nie może przekraczać 5MB');
        }
      }
      return true;
    })
];

module.exports = uploadValidation;