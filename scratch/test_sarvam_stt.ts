import dotenv from "dotenv";
dotenv.config();

import { synthesizeSpeech, transcribeAudio } from "../src/lib/voice/sarvam";

async function main() {
  console.log("1. Generating audio with Sarvam TTS...");
  const ttsRes = await synthesizeSpeech("Project Falcon Interchange flyover is progressing on schedule.");
  if (!ttsRes.audioBase64) {
    throw new Error("TTS failed to generate audio");
  }
  console.log("✓ TTS Success! Generated audio bytes:", ttsRes.audioBase64.length);

  console.log("2. Transcribing audio back with Sarvam STT (saarika:v2)...");
  const audioBuf = Buffer.from(ttsRes.audioBase64, "base64");
  const sttRes = await transcribeAudio(audioBuf, "audio/wav");

  console.log("Sarvam STT Result:", {
    transcript: sttRes.transcript,
    confidence: sttRes.confidence,
    languageCode: sttRes.languageCode,
    provider: sttRes.provider,
    latencyMs: sttRes.latencyMs,
  });

  if (sttRes.provider === "sarvam" && sttRes.transcript) {
    console.log("SUCCESS: Sarvam STT transcribed audio successfully!");
  } else {
    console.log("STT returned fallback or empty:", sttRes);
  }
}

main().catch(console.error);
