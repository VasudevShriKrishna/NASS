import dotenv from 'dotenv';
dotenv.config();

const sarvamKey = process.env.SARVAM_API_KEY;

async function askSarvam(prompt) {
  const res = await fetch('https://api.sarvam.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'api-subscription-key': sarvamKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'sarvam-105b-conversations',
      messages: [
        {
          role: 'system',
          content: 'You are the NASS Senior AI Logistics and Operations Copilot for NASS Group in Bahrain. You assist with supply chain, maritime logistics, project management, technical engineering, and general professional inquiries. Be helpful, concise, and professional.'
        },
        { role: 'user', content: prompt }
      ],
      max_tokens: 300
    })
  });

  const data = await res.json();
  console.log(`\n--- Prompt: "${prompt}" ---`);
  console.log(data.choices?.[0]?.message?.content);
}

async function run() {
  await askSarvam("Explain the difference between FOB and CIF for our Bahrain port shipments.");
  await askSarvam("Draft a brief 2-sentence note to Hyundai Elevators regarding shipment SHP-8804.");
  await askSarvam("Tell me a quick motivating thought for the engineering site team today.");
}

run();
