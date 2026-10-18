async function testLive() {
  const urls = [
    'https://mycorps.vercel.app',
    'https://myantoine.vercel.app'
  ];

  for (const base of urls) {
    console.log(`\n=== Testing ${base} ===`);
    try {
      const resAssistant = await fetch(`${base}/api/assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'What is shipment SHP-8802?' })
      });
      const assJson = await resAssistant.json();
      console.log(`[POST /api/assistant] Status: ${resAssistant.status}`);
      console.log('Provider:', assJson.data?.provider, '| Model:', assJson.data?.model);
      console.log('Answer preview:\n', assJson.data?.answer?.slice(0, 300));
    } catch (err) {
      console.error(`Error testing ${base}:`, err.message);
    }
  }
}

testLive();
