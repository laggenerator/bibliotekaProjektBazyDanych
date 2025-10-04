const express = require("express");
const path = require("path");
const app = express();
var favicon = require("serve-favicon");
const PORT = 1789;

app.use(express.static(path.join(__dirname, "public")));
app.use(favicon(path.join(__dirname, "public/assets", "favicon.png")));
app.use(express.static(path.join(__dirname, "public/css")));
app.use(express.static(path.join(__dirname, "public/js")));
app.use(express.static(path.join(__dirname, "public/assets")));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/roadmap.html");
});

app.listen(PORT, () => {
  console.log(`Biblioteka dziala na http://localhost:${PORT}`);
});
