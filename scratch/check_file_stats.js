const fs = require('fs');
const path = require('path');

const files = [
  'src/lib/pdf-reports-generator.ts',
  'src/app/api/assistant/route.ts',
  'src/app/api/reports/generate/route.ts',
  'src/lib/assistant-tools.ts',
  'src/lib/assistant-types.ts',
  'src/components/app/views/assistant.tsx'
];

for (const f of files) {
  const dPath = path.join('C:/Users/Krish Sangani/Downloads/Krish', f);
  const kPath = path.join('C:/Users/Krish Sangani/Documents/Trader/Krish_2', f);
  console.log(`\n=== FILE: ${f} ===`);
  if (!fs.existsSync(dPath)) {
    console.log('Not in Downloads');
    continue;
  }
  if (!fs.existsSync(kPath)) {
    console.log('Not in Krish_2');
    continue;
  }
  const dStat = fs.statSync(dPath);
  const kStat = fs.statSync(kPath);
  console.log(`Downloads: ${dStat.size} bytes, modified: ${dStat.mtime.toISOString()}`);
  console.log(`Krish_2:   ${kStat.size} bytes, modified: ${kStat.mtime.toISOString()}`);
}
