import dotenv from 'dotenv';
dotenv.config();

const sarvamKey = process.env.SARVAM_API_KEY;

async function testSarvamOperational() {
  const systemPrompt = `You are the NASS Senior AI Logistics and Operations Copilot for the NASS Group Closed-Loop Control Tower in Bahrain.
You have comprehensive knowledge of NASS projects (Bahrain Marina PRJ-2201, BIA Airport Flyover PRJ-2202, King Abdullah Medical City PRJ-2204, Al Raffa Hospital PRJ-2203, RCSI Medical University Campus PRJ-2205, and historical Alba Potline 6 PRJ-1801).
You can answer any questions the user asks about operations, engineering, logistics, materials, procurement, as well as general questions, calculations, explanations, and advice.
Always be helpful, professional, precise, and concise.`;

  const userQuery = "What are the key active projects under NASS and what should we watch out for?";

  const res = await fetch('https://api.sarvam.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'api-subscription-key': sarvamKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'sarvam-105b-conversations',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userQuery }
      ],
      max_tokens: 300,
      temperature: 0.3
    })
  });

  console.log("Sarvam Status:", res.status);
  const data = await res.json();
  console.log("Sarvam Response:\n", data.choices?.[0]?.message?.content);
}

testSarvamOperational();
