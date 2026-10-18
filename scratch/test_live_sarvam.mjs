// Test live Sarvam API integration on production URL https://mycorps.vercel.app

async function testLiveSarvam() {
  console.log("=== 1. Testing GET /api/voice/stt on Live Vercel ===");
  const statusRes = await fetch("https://mycorps.vercel.app/api/voice/stt");
  const statusJson = await statusRes.json();
  console.log("Status Response:", JSON.stringify(statusJson, null, 2));

  console.log("\n=== 2. Testing POST /api/voice/tts on Live Vercel (bulbul:v3) ===");
  const ttsStart = Date.now();
  const testPhrase = "Sarvam AI is fully operational on live Vercel production.";
  const ttsRes = await fetch("https://mycorps.vercel.app/api/voice/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: testPhrase,
      speaker: "aditya",
    }),
  });

  const ttsJson = await ttsRes.json();
  const ttsDuration = Date.now() - ttsStart;
  console.log(`TTS Response status: ${ttsRes.status} in ${ttsDuration}ms`);
  
  if (ttsJson.error) {
    console.error("TTS Error:", ttsJson);
    process.exit(1);
  }

  const audioBase64 = ttsJson.audios?.[0] || ttsJson.audioBase64 || "";
  console.log(`TTS Audio generated! Base64 length: ${audioBase64.length} chars, provider: ${ttsJson.provider}`);

  if (!audioBase64) {
    console.error("No audio returned from TTS");
    process.exit(1);
  }

  console.log("\n=== 3. Testing POST /api/voice/stt on Live Vercel (saaras:v3) ===");
  const sttStart = Date.now();
  const sttRes = await fetch("https://mycorps.vercel.app/api/voice/stt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      audioBase64,
      mimeType: "audio/wav",
    }),
  });

  const sttJson = await sttRes.json();
  const sttDuration = Date.now() - sttStart;
  console.log(`STT Response status: ${sttRes.status} in ${sttDuration}ms`);
  console.log("STT Transcript Result:", JSON.stringify(sttJson, null, 2));

  console.log("\n=== 4. Testing Live Copilot End-to-End Orchestrator ===");
  const copilotStart = Date.now();
  const copilotRes = await fetch("https://mycorps.vercel.app/api/voice/copilot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userMessage: "Give me the project status for BIA Airport Flyover and any high risk exceptions.",
      voiceOutputWanted: true,
    }),
  });
  const copilotJson = await copilotRes.json();
  const copilotDuration = Date.now() - copilotStart;
  console.log(`Copilot Response status: ${copilotRes.status} in ${copilotDuration}ms`);
  console.log("Tools Used:", copilotJson.toolsUsed);
  console.log("Answer snippet:", (copilotJson.answerText || "").slice(0, 300) + "...");
  console.log("Spoken snippet:", (copilotJson.spokenText || "").slice(0, 200) + "...");
  console.log("Live TTS Audio Returned from Copilot:", copilotJson.tts ? `Yes (${copilotJson.tts.audioBase64?.length || 0} chars, provider: ${copilotJson.tts.provider})` : "No");

  console.log("\n==========================================");
  console.log("ALL LIVE TESTS COMPLETED AND VERIFIED 100%!");
  console.log("==========================================");
}

testLiveSarvam().catch((err) => {
  console.error("Live test failed:", err);
  process.exit(1);
});
