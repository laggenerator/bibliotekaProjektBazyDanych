const { body } = require('express-validator');

const registerValidation = [
  body('nazwa_uzytkownika')
    .isLength({min: 3, max: 50})
    .withMessage("Nazwa użytkownika musi mieścić się w zakresie [3; 50] znaków")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Nazwa użytwownika może składać się jedynie z liter, cyfr oraz podłóg"),

  body('email')
    .isEmail()
    .withMessage("Należy podać prawdziwy email")
    .normalizeEmail(),

  body('haslo')
    .notEmpty()
    .withMessage("Hasło nie może pozostać puste")
];

const loginValidation = [
  body('nazwa_uzytkownika')
    .notEmpty()
    .withMessage("Nazwa użytkownika nie może pozostać pusta"),

  body('haslo')
    .notEmpty()
    .withMessage("Hasło nie może pozostać puste")
];

module.exports = { registerValidation, loginValidation };