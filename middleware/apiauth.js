const { validationResult } = require("express-validator");

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors
      .array()
      .map((error) => error.msg)
      .join(", ");

    return res.status(400).json({ error: errorMessages });
  }

  next();
};

const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({
      sukces: false,
      wiadomosc: "Potrzebne uwierzytelnienie",
    });
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (req.session.rola !== "ADMIN") {
    return res.status(403).json({
      sukces: false,
      wiadomosc: "Nie posiadasz uprawnień do tej strony ;(",
    });
  }
  next();
};

module.exports = { validateRequest, requireAuth, requireAdmin };
