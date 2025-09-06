const fs = require('fs');
const ohm = require('ohm-js');
try {
  const g = fs.readFileSync('src/compiler/leafmusic.ohm', 'utf8');
  const G = ohm.grammar(g);
  console.log('Grammar loaded OK.');
  const sampleSrc = fs.readFileSync('src/App.tsx', 'utf8');
  // Extract the "Simple Melody" sample from the samples object
  const m = sampleSrc.match(/"Simple Melody"\s*:\s*`([\s\S]*?)`/);
  if (!m) {
    console.error('Sample "Simple Melody" not found in src/App.tsx');
    process.exit(2);
  }
  const code = m[1];
  const result = G.match(code);
  if (result.succeeded()) {
    console.log('Parse succeeded');
    process.exit(0);
  } else {
    console.error('Parse failed:\n', result.message);
    process.exit(3);
  }
} catch (err) {
  console.error('Error:', err && err.message ? err.message : err);
  process.exit(1);
}
