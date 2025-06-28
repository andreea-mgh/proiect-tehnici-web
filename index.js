const express = require('express');
const path = require('path');
const ejs = require('ejs');
const fs = require('fs');


const app = express();

// generat foldere
const vect_foldere = ["temp"];

vect_foldere.forEach(folder => {
    const caleFolder = path.join(__dirname, folder);
    if (!fs.existsSync(caleFolder)) {
        fs.mkdirSync(caleFolder);
        console.log(`Am creat folderul: ${caleFolder}`);
    }
});


// erori (global???)

global.obGlobal = {
    obErori: null
};
function initErori() {
    const eroriJson = JSON.parse(fs.readFileSync('erori.json', 'utf8'));

    // Setează calea absolută pentru fiecare imagine de eroare
    eroriJson.info_erori.forEach(eroare => {
        eroare.imagine = path.join(eroriJson.cale_baza, eroare.imagine);
    });
    eroriJson.eroare_default.imagine = path.join(eroriJson.cale_baza, eroriJson.eroare_default.imagine);

    obGlobal.obErori = eroriJson;
}
initErori();

function afiseazaEroare(res, identificator) {
  let eroare = obGlobal.obErori.info_erori.find(e => e.identificator == identificator);
  if (!eroare) eroare = obGlobal.obErori.eroare_default;
  if (eroare.status) {
    res.status(identificator);
  }

  res.render('pagini/eroare', {
    titlu: eroare.titlu,
    text: eroare.text,
    imagine: eroare.imagine
  });
}

// galerie
function oraInInterval(oraCurenta, interval) {
    let [start, end] = interval.split("-");
    let [hStart, mStart] = start.split(":").map(Number);
    let [hEnd, mEnd] = end.split(":").map(Number);

    let startMin = hStart * 60 + mStart;
    let endMin = hEnd * 60 + mEnd;

    let curMin = oraCurenta.getHours() * 60 + oraCurenta.getMinutes();

    // Interval normal
    if (startMin <= endMin) {
        return curMin >= startMin && curMin <= endMin;
    }
    // peste miezul nopții
    else {
        return curMin >= startMin || curMin <= endMin;
    }
}
app.get("/galerie", (req, res) => {
    const imagini = JSON.parse(fs.readFileSync("galerie.json", "utf8"));
    imagini.imagini.forEach(img => {
        img.cale_imagine = path.join(imagini.cale_galerie, img.cale_imagine);
    });
    
    
    const acum = new Date();
    // const imaginiAfisate = imagini.imagini.filter(img => oraInInterval(acum, img.timp));
    // testeaza fara filtru
    const imaginiAfisate = imagini.imagini;

    res.render("pagini/galerie", { imagini: imaginiAfisate });
});




app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/res', express.static(path.join(__dirname, 'resurse')));



app.use("/res", (req, res, next) => {
    if (req.path.match(/\/$/)) {
        return afiseazaEroare(res, 403);
    } else {
        next();
    }
});

app.use((req, res, next) => {
    if (req.url.match(/\.ejs(\?|$)/i)) {
        return afiseazaEroare(res, 400);
        
    } else {
        next();
    }
});



app.get(['/', '/index', '/home'], (req, res) => {
    res.render('pagini/index', { title: 'Proiect Tehnici Web' , ip: req.ip });
});

app.get("/:pagina", (req, res) => {
    // const pagina = req.params[0];
    const pagina = req.params.pagina || 'index';
    console.log(`Cerere pentru pagina: ${pagina}`);

    res.render(`pagini/${pagina}`, (err, html) => {
        if (err) {
            console.error(`Eroare la încărcarea paginii "${pagina}":`, err.message);
            
            // if (err.message.startsWith("Failed to lookup view")) {
            //     return res.status(404).render('pagini/404', { pagina });
            // } else {
            //     return res.status(500).render('pagini/eroare', { eroare: err });
            // }
            return afiseazaEroare(res, 404);
        }
        res.send(html);
    });
});

app.get("/favicon.ico", (req, res) => {
    res.sendFile(path.join(__dirname, "resurse", "ico", "favicon.ico"));
});




app.listen(8080);

console.log(`Current working directory: ${process.cwd()}`);
console.log(`__dirname: ${__dirname}`);
console.log(`__filename: ${__filename}`);