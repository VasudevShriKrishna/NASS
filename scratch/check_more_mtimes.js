const fs = require('fs');

const files = [
  'src/components/app/views/projects.tsx',
  'src/app/api/projects/route.ts',
  'src/components/app/views/control-tower.tsx',
  'src/app/api/overview/route.ts',
  'src/lib/client.ts',
  'src/lib/geo.ts',
  'src/lib/maritime-routes.ts'
];

for (const f of files) {
  const d = 'C:/Users/Krish Sangani/Downloads/Krish/' + f;
  const k = 'C:/Users/Krish Sangani/Documents/Trader/Krish_2/' + f;
  console.log(`${f} -> Downloads: ${fs.statSync(d).mtime.toISOString()}, Krish_2: ${fs.statSync(k).mtime.toISOString()}`);
}
