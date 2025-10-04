const express = require("express");
const path = require("path");
const app = express();
var favicon = require("serve-favicon");
const PORT = 1789;


app.set("view engine", "ejs");
// app.use("views", "views");
app.use(express.json());
app.use(express.urlencoded({extended: false}));

app.use(express.static(path.join(__dirname, "public")));
app.use(favicon(path.join(__dirname, "public/assets", "favicon.png")));
app.use(express.static(path.join(__dirname, "public/css")));
app.use(express.static(path.join(__dirname, "public/js")));
app.use(express.static(path.join(__dirname, "public/assets")));

app.get("/", (req, res) => {
  // res.sendFile(__dirname + "/public/index.html");
  // TO OCZYWISCIE NIE BEDA CONSTY TYLKO REQUESTY Z POSTGRESA
      const ksiazki = [
        {
            img: 'assets/okladki/fizyka1.png',
            tytul: 'Fizyka 1',
            autor: ['Robert Resnick', 'David Halliday']
        },
        {
            img: 'assets/okladki/fizyka1.png',
            tytul: '1984',
            autor: 'jorjor well'
        },
        {
            img: 'assets/okladki/fizyka1.png',
            tytul: 'Modele dynamiki układów fizycznych dla inżynierów',
            autor: 'Anna Czemplik'
        },
        {
            img: 'assets/okladki/fizyka1.png',
            tytul: 'Maszyny elektryczne',
            autor: 'Antoni M. Plamitzer'
        },
        {
            img: 'assets/okladki/fizyka1.png',
            tytul: 'Nie znam więcej książek',
            autor: 'Tomasz Gąsior'
        }
    ];

    const najnowsze = [
      {
        tytul: 'Fizyka 1',
        autor: ['Robert Resnick', 'David Halliday']
      }
    ]
    
    res.render('index', { ksiazki: ksiazki , najnowsze: najnowsze});
});
app.get("/roadmap", (req, res) => {
  // res.sendFile(__dirname + "/public/roadmap.html");
  res.render("roadmap", {title: "Roadmap"});
});

app.listen(PORT, () => {
  console.log(`Biblioteka dziala na http://localhost:${PORT}`);
});
