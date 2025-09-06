const fs = require('fs');
const ohm = require('ohm-js');
const g = fs.readFileSync('src/compiler/leafmusic.ohm', 'utf8');
const G = ohm.grammar(g);
console.log('Grammar rules:', Object.keys(G.rules));
const src = 'tempo = 120';
const m = G.match(src);
console.log('match.succeeded():', m.succeeded());
if (!m.succeeded()) console.log(m.message);
