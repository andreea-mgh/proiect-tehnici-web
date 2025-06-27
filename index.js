const express = require('express');
const path = require('path');
const ejs = require('ejs');


const app = express();

// index.ejs
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/res', express.static(path.join(__dirname, 'resurse')));


app.get(['/', '/index', '/home'], (req, res) => {
    res.render('pagini/index', { title: 'Proiect Tehnici Web' });
});




app.listen(8080);

console.log(`Current working directory: ${process.cwd()}`);
console.log(`__dirname: ${__dirname}`);
console.log(`__filename: ${__filename}`);