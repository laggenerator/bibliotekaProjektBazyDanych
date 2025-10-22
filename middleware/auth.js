const { validationResult } = require('express-validator');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg).join(', ');
    
    let viewName, tytul;
    
    if (req.originalUrl.includes('register')) {
      viewName = 'auth/register';
      tytul = 'Rejestracja';
    } else if (req.originalUrl.includes('login')) {
      viewName = 'auth/login';
      tytul = 'Logowanie';
    } else {
      viewName = 'auth/login';
      tytul = 'Logowanie';
    }
    
    return res.render(viewName, {
      tytul: tytul,
      error: errorMessages,
      formData: req.body,
      customCSS: '/css/auth.css'
    });
  }
  
  next();
};

const requireAuth = (req, res, next) => {
  if(!req.session.userId){
    // return res.status(401).json({
    //   sukces: false,
    //   wiadomosc: "Potrzebne uwierzytelnienie"
    // })
    // return res.render("error", {
    //   tytul: "Błąd",
    //   error: "Musisz być zalogowany!",
    //   customCSS: '/css/error.css'
    // });
    return res.render("auth/login", {
      tytul: "Login",
      error: "Musisz się zalogować",
      formData: {},
      customCSS: ['/css/error.css', '/css/auth.css']
    })
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if(req.session.rola !== 'ADMIN' && req.session.nazwa_uzytkownika !== 'pythonbot'){
    // return res.status(403).json({
    //   sukces: false,
    //   wiadomosc: "Nie posiadasz uprawnień do tej strony ;("
    // });
    return res.render("error", {
      tytul: "Błąd",
      error: "Nie posiadasz uprawnień do strony",
      customCSS: '/css/error.css'
    });
  }
  next();
};

module.exports = { validateRequest, requireAuth, requireAdmin };