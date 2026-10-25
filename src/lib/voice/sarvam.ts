/**
 * Sarvam API Adapter for Real-Time Speech-to-Text (STT) and Text-to-Speech (TTS).
 *
 * Implements Person C (Speech Engineer) requirements:
 * - Sarvam speech provider adapter
 * - English speech evaluation & operational vocabulary handling
 * - Clean server-side key management (never leaked to browser)
 * - Safe degradation when API key is missing or quota/network fails
 */

import type { SttResult, TtsResult } from "./copilot-types";
import { resolveSarvamApiKey } from "../sarvam/api-key";

const SARVAM_STT_ENDPOINT = process.env.SARVAM_STT_ENDPOINT || "https://api.sarvam.ai/speech-to-text";
const SARVAM_TTS_ENDPOINT = process.env.SARVAM_TTS_ENDPOINT || "https://api.sarvam.ai/text-to-speech";

/**
 * Transcribe English audio using Sarvam STT API (saarika:v2).
 * Handles operational terms (SHP-8801, PO-3001, KBSP, TEU, MT, Incoterms).
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType = "audio/webm",
  customApiKey?: string
): Promise<SttResult> {
  const startTime = Date.now();
  const effectiveKey = resolveSarvamApiKey(customApiKey);

  if (!effectiveKey) {
    return {
      transcript: "",
      confidence: 0,
      provider: "fallback",
      latencyMs: Date.now() - startTime,
    };
  }

  try {
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
    formData.append("file", blob, "speech.webm");
    formData.append("model", "saaras:v3");
    formData.append("language_code", "en-IN");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(SARVAM_STT_ENDPOINT, {
      method: "POST",
      headers: {
        "api-subscription-key": effectiveKey,
      },
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[Sarvam STT] HTTP ${response.status}: ${errText}`);
      return {
        transcript: "",
        provider: "fallback",
        latencyMs: Date.now() - startTime,
      };
    }

    const data = await response.json();
    const transcript = (data.transcript || data.text || "").trim();

    return {
      transcript,
      confidence: data.confidence ?? 0.95,
      languageCode: data.language_code || "en-IN",
      provider: "sarvam",
      latencyMs: Date.now() - startTime,
    };
  } catch (err: any) {
    console.error("[Sarvam STT Exception]", err?.message || err);
    return {
      transcript: "",
      provider: "fallback",
      latencyMs: Date.now() - startTime,
    };
  }
}

/**
 * Synthesize English speech using Sarvam TTS API (bulbul:v1).
 * Returns base64 encoded audio or fallback indicator.
 */
export async function synthesizeSpeech(
  text: string,
  speaker = "aditya",
  customApiKey?: string
): Promise<TtsResult> {
  const startTime = Date.now();
  const effectiveKey = resolveSarvamApiKey(customApiKey);

  if (!effectiveKey || !text.trim()) {
    return {
      audioBase64: null,
      provider: "fallback",
      latencyMs: Date.now() - startTime,
    };
  }

  // Sanitize text for TTS: strip markdown symbols, URLs, special bullets, and excessive whitespace
  // Sarvam bulbul:v3 strictly requires each input string to be at most 500 characters.
  const sanitizedText = text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/[`#_•—–|~]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 480)
    .trim();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const targetSpeaker = speaker === "arvind" || !speaker ? "aditya" : speaker;

    const response = await fetch(SARVAM_TTS_ENDPOINT, {
      method: "POST",
      headers: {
        "api-subscription-key": effectiveKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: [sanitizedText],
        target_language_code: "en-IN",
        speaker: targetSpeaker,
        pitch: 0,
        pace: 1.05,
        loudness: 1.0,
        speech_sample_rate: 22050,
        enable_preprocessing: true,
        model: "bulbul:v3",
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[Sarvam TTS] HTTP ${response.status}: ${errText}`);
      return {
        audioBase64: null,
        provider: "fallback",
        latencyMs: Date.now() - startTime,
      };
    }

    const data = await response.json();
    const audioBase64 = data.audios?.[0] || data.audio || null;

    return {
      audioBase64,
      mimeType: "audio/wav",
      provider: "sarvam",
      latencyMs: Date.now() - startTime,
    };
  } catch (err: any) {
    console.error("[Sarvam TTS Exception]", err?.message || err);
    return {
      audioBase64: null,
      provider: "fallback",
      latencyMs: Date.now() - startTime,
    };
  }
}
