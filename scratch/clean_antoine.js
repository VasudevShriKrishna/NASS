const fs = require('fs');
const path = require('path');

const dirs = [
  'C:/Users/Krish Sangani/Documents/Trader/Krish_2',
  'C:/Users/Krish Sangani/Downloads/Krish'
];

const changedFiles = [];

// 1. Update project.json in Downloads/Krish
const dVercelProj = 'C:/Users/Krish Sangani/Downloads/Krish/.vercel/project.json';
if (fs.existsSync(dVercelProj)) {
  const content = JSON.stringify({
    projectId: "prj_IWgoehuFKn0JzGIo43VLV4DBLi3f",
    orgId: "team_wOC8IN2FcDiGPpUtKP81YAu8",
    projectName: "mycorps"
  });
  fs.writeFileSync(dVercelProj, content);
  changedFiles.push('C:/Users/Krish Sangani/Downloads/Krish/.vercel/project.json');
}

// 2. Scan and replace in specific files
function processFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  let text = fs.readFileSync(filePath, 'utf8');
  let original = text;

  // Replace myantoine with mycorps
  text = text.replace(/myantoine\.vercel\.app/g, 'mycorps.vercel.app');
  text = text.replace(/antoine\.vercel\.app/g, 'mycorps.vercel.app');
  text = text.replace(/"name":\s*"myantoine"/g, '"name": "mycorps"');
  text = text.replace(/myantoine/g, 'mycorps');

  if (text !== original) {
    fs.writeFileSync(filePath, text, 'utf8');
    changedFiles.push(filePath);
  }
}

// Check specific script and config files
const targetFiles = [
  'C:/Users/Krish Sangani/Downloads/Krish/package.json',
  'C:/Users/Krish Sangani/Downloads/Krish/scripts/deploy_myantoine.py',
  'C:/Users/Krish Sangani/Downloads/Krish/scripts/test_comprehensive_verification.py',
  'C:/Users/Krish Sangani/Downloads/Krish/scripts/test_live_api.py',
  'C:/Users/Krish Sangani/Downloads/Krish/scripts/test_user_query.py',
  'C:/Users/Krish Sangani/Documents/Trader/Krish_2/package.json',
  'C:/Users/Krish Sangani/Documents/Trader/Krish_2/package-lock.json',
  'C:/Users/Krish Sangani/Documents/Trader/Krish_2/scratch/test_live.js'
];

for (const f of targetFiles) {
  processFile(f);
}

// Rename deploy_myantoine.py to deploy_mycorps.py in Downloads/Krish
const oldScript = 'C:/Users/Krish Sangani/Downloads/Krish/scripts/deploy_myantoine.py';
const newScript = 'C:/Users/Krish Sangani/Downloads/Krish/scripts/deploy_mycorps.py';
if (fs.existsSync(oldScript)) {
  fs.renameSync(oldScript, newScript);
  changedFiles.push(`${oldScript} -> ${newScript}`);
}

console.log('Files updated:');
for (const c of changedFiles) {
  console.log(' - ' + c);
}
