import { NextRequest, NextResponse } from "next/server";
import { runCopilotReasoning } from "@/lib/voice/mistral";
import { synthesizeSpeech, transcribeAudio } from "@/lib/voice/sarvam";
import type { PageContext, SttResult, TtsResult } from "@/lib/voice/copilot-types";

export const runtime = "nodejs";

/**
 * POST /api/voice/copilot
 * Full Conversational Loop Orchestrator:
 * 1. Audio Ingestion (optional) -> Sarvam STT
 * 2. Reasoning & Tool Calling -> Mistral AI (or Grounded Deterministic Engine)
 * 3. Audio Synthesis (optional) -> Sarvam TTS
 * 4. Grounded Metadata & Sources returned to client
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const contentType = req.headers.get("content-type") || "";
    let userMessage = "";
    let history: Array<{ role: "user" | "assistant"; content: string }> = [];
    let pageContext: PageContext | undefined = undefined;
    let voiceOutputWanted = true;
    let sttResult: SttResult | null = null;
    let attachedMediaNote = "";

    // Extract custom Sarvam key from cookie or header
    const cookieKey = req.cookies.get("sarvam_api_key")?.value;
    const headerKey = req.headers.get("x-sarvam-key");
    let customKey = headerKey || cookieKey || undefined;

    if (contentType.includes("multipart/form-data")) {
      // Direct audio upload from browser mic
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const historyRaw = formData.get("history") as string | null;
      const contextRaw = formData.get("pageContext") as string | null;
      const formKey = formData.get("sarvamApiKey") as string | null;
      const mediaName = formData.get("mediaName") as string | null;
      const mediaType = formData.get("mediaType") as string | null;

      if (formKey) customKey = formKey;
      if (mediaName) {
        attachedMediaNote = `\n[Operator attached ${mediaType || "media"}: "${mediaName}"]`;
      }

      if (historyRaw) {
        try {
          history = JSON.parse(historyRaw);
        } catch {}
      }
      if (contextRaw) {
        try {
          pageContext = JSON.parse(contextRaw);
        } catch {}
      }

      if (file) {
        const buffer = Buffer.from(await file.arrayBuffer());
        sttResult = await transcribeAudio(buffer, file.type || "audio/webm", customKey);
        userMessage = sttResult.transcript;
      } else {
        userMessage = (formData.get("userMessage") as string) || "";
      }
    } else {
      // JSON body
      const body = await req.json();
      userMessage = body.userMessage || "";
      history = body.history || [];
      pageContext = body.pageContext;
      voiceOutputWanted = body.voiceOutputWanted ?? true;
      if (body.sarvamApiKey) customKey = body.sarvamApiKey;
      if (body.media) {
        attachedMediaNote = `\n[Operator attached ${body.media.type || "media"}: "${body.media.name}" (${Math.round((body.media.size || 0) / 1024)} KB)]`;
      }

      // Base64 audio support
      if (!userMessage && body.audioBase64) {
        const buffer = Buffer.from(body.audioBase64, "base64");
        sttResult = await transcribeAudio(buffer, body.mimeType || "audio/webm", customKey);
        userMessage = sttResult.transcript;
      }
    }

    if (!userMessage.trim()) {
      return NextResponse.json(
        {
          error: "No audible speech or text message detected. Please try speaking again.",
          stt: sttResult,
          empty: true,
        },
        { status: 400 }
      );
    }

    const fullPrompt = attachedMediaNote ? `${userMessage.trim()}${attachedMediaNote}` : userMessage.trim();

    // Run Mistral / Sarvam dual-engine reasoning + operational tool calling loop
    const reasoning = await runCopilotReasoning({
      userMessage: fullPrompt,
      history,
      pageContext,
      sarvamApiKey: customKey,
    });

    // Run Sarvam TTS for spoken answer if requested
    let ttsResult: TtsResult | null = null;
    if (voiceOutputWanted && (reasoning.spokenText || reasoning.answerText)) {
      const textToSpeak = reasoning.spokenText || reasoning.answerText;
      ttsResult = await synthesizeSpeech(textToSpeak, "arvind", customKey);
    }

    const totalLatencyMs = Date.now() - startTime;

    return NextResponse.json({
      userMessage,
      answerText: reasoning.answerText,
      spokenText: reasoning.spokenText || reasoning.answerText,
      provider: reasoning.provider || "Sarvam AI",
      model: reasoning.model || "sarvam-105b-conversations",
      toolsUsed: reasoning.toolsUsed,
      sources: reasoning.sources,
      followUpSuggestions: reasoning.followUpSuggestions || [],
      providerNotice: reasoning.providerNotice,
      navigation: reasoning.navigation,
      report: reasoning.report,
      stt: sttResult,
      tts: ttsResult,
      latencyMs: totalLatencyMs,
    });
  } catch (err: any) {
    console.error("[Voice Copilot Route Exception]", err);
    return NextResponse.json(
      {
        error: "Voice copilot execution encountered an error",
        details: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}
