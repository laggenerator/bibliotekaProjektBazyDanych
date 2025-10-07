const express = require('express');
const router = express.Router();
const Admin = require("../models/admin");
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { localsName } = require('ejs');

router.get("/dashboard", requireAdmin, async (req, res) => {
  const liczbaUzytkownikow = await Admin.ileUzytkownikow();
  res.render("admin/admin-dashboard", {
    tytul: "Panel admina",
    customCSS: '/css/dashboard.css',
    liczbaUzytkownikow: liczbaUzytkownikow
  });
});

module.exports = router;