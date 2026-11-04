import { NextRequest, NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/voice/sarvam";

export const runtime = "nodejs";

/**
 * GET /api/voice/stt
 * Check if Sarvam API is configured (via cookie, header, or environment variable).
 */
export async function GET() {
  const envKey = process.env.SARVAM_API_KEY;
  const isConfigured = Boolean((envKey || "").trim());

  return NextResponse.json({
    configured: isConfigured,
    source: isConfigured ? "server_env" : "none",
    provider: isConfigured ? "sarvam" : "fallback",
    endpoint: "https://api.sarvam.ai/speech-to-text",
  });
}

/**
 * POST /api/voice/stt
 * Handles Speech-to-Text audio transcription via Sarvam API.
 * Supports multipart/form-data (audio file) or application/json (base64).
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let buffer: Buffer | null = null;
    let mimeType = "audio/webm";

    // Strictly server-side authentication via process.env.SARVAM_API_KEY

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      

      if (!file) {
        return NextResponse.json({ error: "Missing audio file in form data" }, { status: 400 });
      }
      mimeType = file.type || "audio/webm";
      buffer = Buffer.from(await file.arrayBuffer());
    } else if (contentType.includes("application/json")) {
      const body = await req.json();
      
      if (!body.audioBase64) {
        return NextResponse.json({ error: "Missing audioBase64 in request body" }, { status: 400 });
      }
      buffer = Buffer.from(body.audioBase64, "base64");
      mimeType = body.mimeType || "audio/webm";
    } else {
      // Raw binary stream
      const arrayBuffer = await req.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }

    if (!buffer || buffer.length === 0) {
      return NextResponse.json({ error: "Empty audio payload" }, { status: 400 });
    }

    const result = await transcribeAudio(buffer, mimeType);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[Voice STT Route Error]", err);
    // SECURITY FIX: Suppress internal error details in response
    return NextResponse.json(
      { error: "STT processing failure" },
      { status: 500 }
    );
  }
}
