import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * GET /api/voice/sarvam — Check if Sarvam API key is configured
 * Checks process.env.SARVAM_API_KEY, cookies, and headers.
 */
export async function GET(req: NextRequest) {
  const envKey = process.env.SARVAM_API_KEY?.trim();
  const cookieKey = req.cookies.get("sarvam_key")?.value?.trim();
  const headerKey = req.headers.get("x-sarvam-key")?.trim();

  const key = headerKey || cookieKey || envKey;
  const source = headerKey ? "header" : cookieKey ? "cookie" : envKey ? "env" : "none";

  return ok({
    configured: Boolean(key),
    source,
    // SECURITY FIX: Never leak partial API key fragments to unauthenticated callers
    // maskedKey: key ? `${key.slice(0, 4)}...${key.slice(-4)}` : null,
    provider: "Sarvam AI (saaras:v2)",
  });
}

/**
 * POST /api/voice/sarvam — Transcribe recorded audio with Sarvam AI Speech-to-Text API
 */
export async function POST(req: NextRequest) {
  try {
    const envKey = process.env.SARVAM_API_KEY?.trim();
    const cookieKey = req.cookies.get("sarvam_key")?.value?.trim();
    const headerKey = req.headers.get("x-sarvam-key")?.trim();

    const apiKey = headerKey || cookieKey || envKey;

    if (!apiKey) {
      return err(
        "SARVAM_KEY_MISSING",
        "Sarvam API key not found. Please paste your Sarvam API subscription key in the Voice Settings or add SARVAM_API_KEY in .env",
        400
      );
    }

    const formData = await req.formData();
    const audioFile = formData.get("file") as Blob | null;
    const model = (formData.get("model") as string) || "saaras:v2";
    const languageCode = (formData.get("language_code") as string) || "en-IN";

    if (!audioFile) {
      return err("BAD_REQUEST", "Audio file is required in 'file' form field", 400);
    }

    // Forward to Sarvam AI Speech-to-Text endpoint
    const sarvamFormData = new FormData();
    sarvamFormData.append("file", audioFile, "recording.webm");
    sarvamFormData.append("model", model);
    sarvamFormData.append("language_code", languageCode);
    sarvamFormData.append("with_diarization", "false");

    const response = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: {
        "api-subscription-key": apiKey,
      },
      body: sarvamFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return err(
        "SARVAM_API_ERROR",
        `Sarvam API error (${response.status}): ${errorText || response.statusText}`,
        response.status
      );
    }

    const result = await response.json();
    return ok({
      transcript: result.transcript || "",
      language_code: result.language_code || languageCode,
      model,
      provider: "Sarvam AI",
    });
  } catch (e) {
    console.error("[Sarvam STT Route Error]", e);
    // SECURITY FIX: Return generic safe error message to client rather than raw system error strings
    return err("INTERNAL_ERROR", "Failed to process audio with Sarvam AI", 500);
  }
}
