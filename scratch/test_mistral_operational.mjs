import dotenv from 'dotenv';
dotenv.config();

const k = process.env.MISTRAL_API_KEY;

import { OPERATIONAL_TOOLS } from '../src/lib/voice/mistral.ts';

async function testMistralNass() {
  const messages = [
    {
      role: 'system',
      content: 'You are the NASS Voice AI Copilot for the Closed-Loop Control Tower in Bahrain. Call the appropriate tool when asked about projects, shipments, stock, pricing, or weight audits.'
    },
    {
      role: 'user',
      content: 'What is the status and position of shipment SHP-8802?'
    }
  ];

  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + k,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'open-mistral-7b',
      messages,
      tools: OPERATIONAL_TOOLS,
      tool_choice: 'auto'
    })
  });

  console.log("Status:", res.status);
  const data = await res.json();
  const toolCalls = data.choices?.[0]?.message?.tool_calls;
  console.log("Mistral decided to call tool:", toolCalls?.[0]?.function?.name);
  console.log("Arguments:", toolCalls?.[0]?.function?.arguments);
}

testMistralNass().catch(console.error);
