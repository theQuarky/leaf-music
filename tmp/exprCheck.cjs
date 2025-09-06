const fs = require('fs');
const ohm = require('ohm-js');
try {
  const g = fs.readFileSync('src/compiler/leafmusic.ohm','utf8');
  const G = ohm.grammar(g);
  const expr = 'synth("saw", { adsr:[0.01,0.1,0.2,0.2] })';
  console.log('Testing expr:', expr);
  const m = G.match(expr, 'Expr');
  console.log('succeeded:', m.succeeded());
  if (!m.succeeded()) console.log(m.message);
} catch (err) {
  console.error('Error:', err && err.message ? err.message : err);
  process.exit(1);
}
