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

    // Strictly server-side authentication via process.env.SARVAM_API_KEY

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "Missing or empty text parameter" }, { status: 400 });
    }

    const result = await synthesizeSpeech(text, speaker);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[Voice TTS Route Error]", err);
    // SECURITY FIX: Suppress internal error details in response
    return NextResponse.json(
      { error: "TTS synthesis failure" },
      { status: 500 }
    );
  }
}
