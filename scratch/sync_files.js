const fs = require('fs');
const path = require('path');

const filesToSync = [
  'src/lib/pdf-reports-generator.ts',
  'src/app/api/assistant/route.ts',
  'src/app/api/reports/generate/route.ts',
  'src/lib/assistant-tools.ts',
  'src/lib/assistant-types.ts',
  'src/components/app/views/assistant.tsx',
  'src/app/api/voice/sarvam/route.ts',
  'src/components/app/views/suppliers.tsx',
  'src/app/api/suppliers/route.ts',
  'src/components/app/views/projects.tsx',
  'src/app/api/projects/route.ts',
  'src/components/app/views/control-tower.tsx',
  'src/app/api/overview/route.ts',
  'src/lib/client.ts',
  'src/lib/geo.ts',
  'src/lib/maritime-routes.ts',
];

const srcDir = 'C:/Users/Krish Sangani/Downloads/Krish';
const destDir = 'C:/Users/Krish Sangani/Documents/Trader/Krish_2';

for (const rel of filesToSync) {
  const srcPath = path.join(srcDir, rel);
  const destPath = path.join(destDir, rel);
  if (!fs.existsSync(srcPath)) {
    console.error(`Source file not found: ${srcPath}`);
    continue;
  }
  const dir = path.dirname(destPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(srcPath, destPath);
  console.log(`Synced: ${rel} (${fs.statSync(destPath).size} bytes)`);
}

console.log('Sync complete!');
