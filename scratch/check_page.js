const fs = require('fs');

const dPage = 'C:/Users/Krish Sangani/Downloads/Krish/src/app/page.tsx';
const content = fs.readFileSync(dPage, 'utf8');
const lines = content.split('\n');
console.log('Lines 420-485:');
console.log(lines.slice(420, 485).join('\n'));
