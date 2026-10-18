import dotenv from 'dotenv';
dotenv.config();

const k = process.env.MISTRAL_API_KEY;

async function testModel(model) {
  try {
    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + k,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Say hello in 5 words' }],
        max_tokens: 50
      })
    });
    console.log(`Model ${model}: HTTP ${res.status}`);
    const data = await res.json();
    if (!res.ok) console.log("Error:", data);
    else console.log("Reply:", data.choices?.[0]?.message?.content);
  } catch (e) {
    console.error(`Model ${model} failed:`, e);
  }
}

async function testSarvamChat() {
  const sarvamKey = process.env.SARVAM_API_KEY;
  console.log("\nTesting Sarvam 105B Chat Completion via REST API...");
  try {
    const res = await fetch('https://api.sarvam.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'api-subscription-key': sarvamKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sarvam-105b-conversations',
        messages: [{ role: 'user', content: 'Say hello in 5 words' }],
        max_tokens: 50
      })
    });
    console.log(`Sarvam Chat status: ${res.status}`);
    const data = await res.json();
    if (!res.ok) console.log("Sarvam Error:", data);
    else console.log("Sarvam Reply:", data.choices?.[0]?.message?.content);
  } catch (e) {
    console.error("Sarvam failed:", e);
  }
}

async function run() {
  await testModel('mistral-small-latest');
  await testModel('open-mistral-7b');
  await testModel('mistral-tiny');
  await testSarvamChat();
}

run();
