const fs = require('fs');
const path = require('path');

function walk(dir) {
  let res = [];
  if (!fs.existsSync(dir)) return res;
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      res = res.concat(walk(p));
    } else {
      res.push(p);
    }
  }
  return res;
}

const dDir = 'C:/Users/Krish Sangani/Downloads/Krish';
const kDir = 'C:/Users/Krish Sangani/Documents/Trader/Krish_2';

console.log('=== Comparing Downloads/Krish vs Krish_2 ===');
const dFiles = walk(path.join(dDir, 'src'));
for (const file of dFiles) {
  const rel = path.relative(path.join(dDir, 'src'), file);
  const kFile = path.join(kDir, 'src', rel);
  if (!fs.existsSync(kFile)) {
    console.log('[MISSING IN K2]: src/' + rel);
  } else {
    const b1 = fs.readFileSync(file);
    const b2 = fs.readFileSync(kFile);
    if (!b1.equals(b2)) {
      console.log('[DIFF]: src/' + rel);
    }
  }
}

// Also check reverse
const kFiles = walk(path.join(kDir, 'src'));
for (const file of kFiles) {
  const rel = path.relative(path.join(kDir, 'src'), file);
  const dFile = path.join(dDir, 'src', rel);
  if (!fs.existsSync(dFile)) {
    console.log('[MISSING IN DOWNLOADS]: src/' + rel);
  }
}
