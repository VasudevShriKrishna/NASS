import dotenv from "dotenv";
dotenv.config();

import { synthesizeSpeech, transcribeAudio } from "../src/lib/voice/sarvam";

async function main() {
  console.log("Testing Sarvam API Key with live TTS (bulbul:v3)...");
  const res = await synthesizeSpeech("Welcome to NASS Closed-Loop Control Tower. Operational status is verified.");
  console.log("Sarvam TTS Result:", {
    provider: res.provider,
    latencyMs: res.latencyMs,
    hasAudio: !!res.audioBase64,
    audioChars: res.audioBase64?.length,
  });

  if (res.provider === "sarvam" && res.audioBase64) {
    console.log("SUCCESS: Sarvam TTS generated live base64 audio successfully!");
  } else {
    console.log("FAILED or FALLBACK:", res);
  }
}

main().catch(console.error);
