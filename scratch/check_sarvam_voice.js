const fs = require('fs');

const dSarvamVoice = 'C:/Users/Krish Sangani/Downloads/Krish/src/app/api/voice/sarvam/route.ts';
if (fs.existsSync(dSarvamVoice)) {
  const content = fs.readFileSync(dSarvamVoice, 'utf8');
  console.log(content);
} else {
  console.log('Not found');
}
