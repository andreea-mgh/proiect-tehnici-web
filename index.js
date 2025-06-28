const express = require('express');
const path = require('path');
const ejs = require('ejs');
const fs = require('fs');
const sass = require('sass');


const app = express();

// generat foldere
const vect_foldere = ["temp", "backup"];

vect_foldere.forEach(folder => {
    const caleFolder = path.join(__dirname, folder);
    if (!fs.existsSync(caleFolder)) {
        fs.mkdirSync(caleFolder);
        console.log(`Am creat folderul: ${caleFolder}`);
    }
});


// erori (global???)

global.obGlobal = {
    obErori: null,
    folderScss: path.join(__dirname, 'resurse', 'scss'),
    folderCss: path.join(__dirname, 'resurse', 'css'),
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


// SCSS
function compileazaScss(caleScss, caleCss) {
    if (!path.isAbsolute(caleScss)) {
        caleScss = path.join(obGlobal.folderScss, caleScss);
    }

    if (!caleCss) {
        const numeFisier = path.basename(caleScss, ".scss") + ".css";
        caleCss = path.join(obGlobal.folderCss, numeFisier);
    } else if (!path.isAbsolute(caleCss)) {
        caleCss = path.join(obGlobal.folderCss, caleCss);
    }

    // compilare
    try {
        const rezultat = sass.compile(caleScss, { style: "expanded" });
        // backup
        const now = new Date();
        const timestamp = now.toISOString().replace(/[-:.TZ]/g, "_");
        const caleBackup = path.join(__dirname, 'backup', `${path.basename(caleCss, '.css')}_${timestamp}.css`);
        if (fs.existsSync(caleCss)) {
            fs.copyFileSync(caleCss, caleBackup);
            console.log(`Backup creat: ${caleBackup}`);
        }
        fs.writeFileSync(caleCss, rezultat.css);
        console.log(`Compilat: ${caleScss} -> ${caleCss}`);
    } catch (err) {
        console.error("Eroare la compilarea SCSS:", err);
    }
}

// compileaza la pornire
const fisiereScss = fs.readdirSync(obGlobal.folderScss).filter(fisier => fisier.endsWith('.scss'));
fisiereScss.forEach(fisier => {
    const caleScss = path.join(obGlobal.folderScss, fisier);
    compileazaScss(caleScss);
});

// compileaza pe parcurs
fs.watch(obGlobal.folderScss, (eventType, filename) => {
    if (filename && filename.endsWith(".scss")) {
        const caleScss = path.join(obGlobal.folderScss, filename);
        console.log(`Fișierul ${filename} a fost modificat. Recompilare...`);
        if (fs.existsSync(caleScss)) {
            compileazaScss(caleScss);
        }
    }
});



// galerie
function oraInInterval(interval) {
    const oraCurenta = new Date();
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
function getImaginiGalerie() {
    const imagini = JSON.parse(fs.readFileSync("galerie.json", "utf8"));
    imagini.imagini.forEach(img => {
        img.cale_imagine = path.join(imagini.cale_galerie, img.cale_imagine);
    });
    return imagini.imagini.filter(img => oraInInterval(img.timp));
    // testeaza fara filtru
    // return imagini.imagini;
}
app.get("/galerie", (req, res) => {

    res.render("pagini/galerie", { imagini: getImaginiGalerie() });
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
    res.render('pagini/index', { title: 'Proiect Tehnici Web' , ip: req.ip, imagini: getImaginiGalerie() });
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