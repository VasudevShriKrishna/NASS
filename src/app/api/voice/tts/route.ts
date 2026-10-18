import { NextRequest, NextResponse } from "next/server";
import { synthesizeSpeech } from "@/lib/voice/sarvam";

export const runtime = "nodejs";

/**
 * POST /api/voice/tts
 * Handles Text-to-Speech synthesis via Sarvam API (bulbul:v1).
 * Expects JSON: { text: string, speaker?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, speaker = "arvind" } = body;

    const cookieKey = req.cookies.get("sarvam_api_key")?.value;
    const headerKey = req.headers.get("x-sarvam-key");
    const customKey = body.sarvamApiKey || headerKey || cookieKey || undefined;

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "Missing or empty text parameter" }, { status: 400 });
    }

    const result = await synthesizeSpeech(text, speaker, customKey);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[Voice TTS Route Error]", err);
    return NextResponse.json(
      { error: "TTS synthesis failure", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}
