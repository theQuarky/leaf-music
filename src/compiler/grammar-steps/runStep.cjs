const fs = require('fs');
const ohm = require('ohm-js');
const path = require('path');

const step = process.argv[2] || 'step-01.ohm';
const stepPath = path.join(__dirname, step);
if (!fs.existsSync(stepPath)) {
  console.error('Step grammar not found:', stepPath);
  process.exit(2);
}

const g = fs.readFileSync(stepPath, 'utf8');
const G = ohm.grammar(g);
console.log('Loaded', stepPath);

const app = fs.readFileSync(path.join(__dirname, '..', '..', 'App.tsx'), 'utf8');
const m = app.match(/"Simple Melody"\s*:\s*`([\s\S]*?)`/);
if (!m) { console.error('Sample not found in App.tsx'); process.exit(2); }
const sample = m[1];

try {
  const res = G.match(sample);
  if (res.succeeded()) {
    console.log('Parse succeeded for full sample');
    process.exit(0);
  } else {
    console.error('Parse failed for full sample:\n', res.message);
    // also find first failing prefix
    const lines = sample.split('\n');
    for (let i = 1; i <= lines.length; i++) {
      const chunk = lines.slice(0, i).join('\n');
      const r = G.match(chunk);
      if (!r.succeeded()) {
        console.error('First failing at line', i, ':', lines[i-1]);
        console.error(r.message);
        break;
      }
    }
    process.exit(3);
  }
} catch (err) {
  console.error('Error:', err && err.message ? err.message : err);
  process.exit(1);
}
