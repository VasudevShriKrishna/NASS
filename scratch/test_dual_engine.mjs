import dotenv from 'dotenv';
dotenv.config();

const mistralKey = process.env.MISTRAL_API_KEY;
const sarvamKey = process.env.SARVAM_API_KEY;

async function testMistral() {
  console.log("=== Testing Mistral with open-mistral-7b ===");
  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${mistralKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "open-mistral-7b",
      messages: [
        { role: "system", content: "You are the NASS Control Tower AI." },
        { role: "user", content: "Briefly explain the role of a weighbridge in logistics." }
      ],
      max_tokens: 150
    })
  });
  console.log("Mistral status:", res.status);
  const data = await res.json();
  console.log("Mistral reply:", data.choices?.[0]?.message?.content);
}

async function testSarvam() {
  console.log("\n=== Testing Sarvam 105B Conversational LLM ===");
  const res = await fetch("https://api.sarvam.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "api-subscription-key": sarvamKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "sarvam-105b-conversations",
      messages: [
        { role: "system", content: "You are the NASS Control Tower AI." },
        { role: "user", content: "Can you write a 4-line poem about civil engineers building bridges in Bahrain?" }
      ],
      max_tokens: 150
    })
  });
  console.log("Sarvam status:", res.status);
  const data = await res.json();
  console.log("Sarvam reply:\n", data.choices?.[0]?.message?.content);
}

async function run() {
  await testMistral();
  await testSarvam();
}

run();
