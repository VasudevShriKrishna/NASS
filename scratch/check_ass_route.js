const fs = require('fs');

const dAss = 'C:/Users/Krish Sangani/Downloads/Krish/src/app/api/assistant/route.ts';
const content = fs.readFileSync(dAss, 'utf8');
const lines = content.split('\n');
console.log('Lines 650-750:');
console.log(lines.slice(650, 750).join('\n'));
