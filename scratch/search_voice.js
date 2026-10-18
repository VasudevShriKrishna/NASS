const fs = require('fs');
const path = require('path');

function searchDir(dir, query) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      searchDir(p, query);
    } else if (f.endsWith('.ts') || f.endsWith('.tsx')) {
      const c = fs.readFileSync(p, 'utf8');
      if (c.includes(query)) {
        console.log(`Found "${query}" in: ${p}`);
      }
    }
  }
}

console.log('Searching Downloads/Krish for "voice":');
searchDir('C:/Users/Krish Sangani/Downloads/Krish/src', 'voice');
