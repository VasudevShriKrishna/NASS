import dotenv from 'dotenv';
dotenv.config();

const k = process.env.MISTRAL_API_KEY;

async function testToolCalling(model) {
  const tools = [{
    type: "function",
    function: {
      name: "get_weather",
      description: "Get current temperature",
      parameters: {
        type: "object",
        properties: {
          location: { type: "string" }
        },
        required: ["location"]
      }
    }
  }];

  try {
    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + k,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'What is the weather in Manama?' }],
        tools,
        tool_choice: "auto"
      })
    });
    console.log(`Model ${model} with tools status: ${res.status}`);
    const data = await res.json();
    if (!res.ok) console.log("Error:", data);
    else {
      console.log("Tool calls:", data.choices?.[0]?.message?.tool_calls);
      console.log("Content:", data.choices?.[0]?.message?.content);
    }
  } catch (e) {
    console.error(e);
  }
}

async function run() {
  await testToolCalling('open-mistral-7b');
  await testToolCalling('mistral-small-2402');
  await testToolCalling('mistral-small-2409');
}

run();
