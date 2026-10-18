const fs = require('fs');

const dPdf = 'C:/Users/Krish Sangani/Downloads/Krish/src/lib/pdf-reports-generator.ts';
const content = fs.readFileSync(dPdf, 'utf8');
const lines = content.split('\n');
console.log('Lines 60-120:');
console.log(lines.slice(60, 120).join('\n'));
