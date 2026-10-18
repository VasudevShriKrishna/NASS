const fs = require('fs');
const path = require('path');

const diffFiles = [
  'src/app/api/overview/route.ts',
  'src/app/api/projects/route.ts',
  'src/app/api/suppliers/route.ts',
  'src/components/app/shared.tsx',
  'src/components/app/views/actions.tsx',
  'src/components/app/views/assets.tsx',
  'src/components/app/views/control-tower.tsx',
  'src/components/app/views/exceptions.tsx',
  'src/components/app/views/live.tsx',
  'src/components/app/views/procurement.tsx',
  'src/components/app/views/projects.tsx',
  'src/components/app/views/receiving.tsx',
  'src/components/app/views/suppliers.tsx',
  'src/lib/app-state.ts',
  'src/lib/client.ts',
  'src/lib/geo.ts',
  'src/lib/maritime-routes.ts',
  'src/lib/pdf-report.ts'
];

for (const f of diffFiles) {
  const dPath = path.join('C:/Users/Krish Sangani/Downloads/Krish', f);
  const kPath = path.join('C:/Users/Krish Sangani/Documents/Trader/Krish_2', f);
  if (!fs.existsSync(dPath) || !fs.existsSync(kPath)) continue;
  const dLines = fs.readFileSync(dPath, 'utf8').split('\n');
  const kLines = fs.readFileSync(kPath, 'utf8').split('\n');
  console.log(`[${f}]: Downloads has ${dLines.length} lines, Krish_2 has ${kLines.length} lines`);
}
