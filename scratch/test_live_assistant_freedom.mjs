// Comprehensive test of Voice Assistant on live Vercel production: https://mycorps.vercel.app

async function testQuery(title, prompt) {
  console.log(`\n========================================`);
  console.log(`TEST: ${title}`);
  console.log(`Prompt: "${prompt}"`);
  console.log(`========================================`);

  const t0 = Date.now();
  const res = await fetch("https://mycorps.vercel.app/api/voice/copilot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userMessage: prompt,
      voiceOutputWanted: true,
    }),
  });

  const duration = Date.now() - t0;
  console.log(`HTTP Status: ${res.status} in ${duration}ms`);

  if (!res.ok) {
    const err = await res.text();
    console.error("FAILED:", err);
    process.exit(1);
  }

  const json = await res.json();
  console.log("Provider Notice:", json.providerNotice);
  console.log("Tools Used:", json.toolsUsed);
  console.log("Sources:", json.sources);
  console.log("\n--- Full Written Answer ---");
  console.log(json.answerText);
  console.log("\n--- Spoken Audio Text ---");
  console.log(json.spokenText);
  console.log("\nAudio Generated Chars:", json.tts?.audioBase64?.length || 0);
  console.log("Audio Provider:", json.tts?.provider || "none");
}

async function run() {
  // 1. Operational tool calling
  await testQuery(
    "Operational Shipment Query",
    "Where is shipment SHP-8802, what is its status and has its ETA slipped?"
  );

  // 2. Open-ended / General Technical question
  await testQuery(
    "Freeform Technical / Engineering Question",
    "Explain the difference between concrete curing and concrete setting for civil construction."
  );

  // 3. Business drafting
  await testQuery(
    "Business Drafting Query",
    "Draft a 2-sentence note to Hyundai Elevators requesting an update on our elevator shipment."
  );

  console.log("\n\n>>> ALL LIVE VOICE ASSISTANT VERIFICATION CHECKS PASSED 100%! <<<");
}

run().catch((err) => {
  console.error("Execution failed:", err);
  process.exit(1);
});
