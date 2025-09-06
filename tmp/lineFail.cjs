const fs = require('fs');
const ohm = require('ohm-js');
try {
  const g = fs.readFileSync('src/compiler/leafmusic.ohm', 'utf8');
  const G = ohm.grammar(g);
  const app = fs.readFileSync('src/App.tsx', 'utf8');
  const m = app.match(/"Simple Melody"\s*:\s*`([\s\S]*?)`/);
  if (!m) { console.error('sample not found'); process.exit(2); }
  const s = m[1];
  const lines = s.split(/\n/);
  for (let i = 1; i <= lines.length; i++) {
    const chunk = lines.slice(0, i).join('\n');
    const match = G.match(chunk);
    if (!match.succeeded()) {
      console.log('First failing at line', i, ':', lines[i-1]);
      console.log(match.message);
      process.exit(0);
    }
  }
  console.log('All prefixes parsed OK');
} catch (err) {
  console.error('Error:', err && err.message ? err.message : err);
  process.exit(1);
}
