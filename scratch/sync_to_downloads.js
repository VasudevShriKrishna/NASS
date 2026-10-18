const fs = require('fs');
const path = require('path');

const filesToCopyToDownloads = [
  'src/lib/app-state.ts',
  'src/lib/voice/copilot-types.ts',
  'src/lib/voice/mistral.ts',
  'src/lib/voice/sarvam.ts',
  'src/components/app/voice-copilot.tsx',
  'src/components/app/views/ceo-tower.tsx',
  'src/app/api/ceo-control-tower/route.ts',
  'src/app/api/voice/copilot/route.ts',
  'src/app/api/voice/stt/route.ts',
  'src/app/api/voice/tts/route.ts',
  'src/lib/operational-tools.ts',
  'src/lib/reports-engine.ts',
  'src/app/page.tsx',
];

const srcDir = 'C:/Users/Krish Sangani/Documents/Trader/Krish_2';
const destDir = 'C:/Users/Krish Sangani/Downloads/Krish';

for (const rel of filesToCopyToDownloads) {
  const srcPath = path.join(srcDir, rel);
  const destPath = path.join(destDir, rel);
  if (!fs.existsSync(srcPath)) {
    console.error(`Source not found in Krish_2: ${srcPath}`);
    continue;
  }
  const dir = path.dirname(destPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(srcPath, destPath);
  console.log(`Copied to Downloads: ${rel}`);
}

console.log('Sync to Downloads completed successfully!');
