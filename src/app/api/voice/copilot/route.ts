import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import { runCopilotReasoning } from "@/lib/voice/copilot-engine";
import { synthesizeSpeech, transcribeAudio } from "@/lib/voice/sarvam";
import { logAgentPrompt, updateAgentPromptLog, extractClientIp } from "@/lib/audit/prompt-logger";
import { parseExcelNative, parseWordNative } from "@/lib/services/python-bridge";
import { processTradeDocument } from "@/lib/sarvam/document-intelligence";
import { logDiagnostic, getSafeUserNotice, getServerRuntimeInfo } from "@/lib/diagnostics";
import { inspectSarvamKey } from "@/lib/sarvam/api-key";
import type { PageContext, SttResult, TtsResult } from "@/lib/voice/copilot-types";

export const runtime = "nodejs";

/**
 * POST /api/voice/copilot
 * Full Conversational Loop Orchestrator with Multi-Input Pipeline:
 * 1. Multi-Input Processing:
 *    - Audio Ingestion -> Sarvam Saaras v4 STT
 *    - Excel (.xlsx/.xls) -> Python openpyxl deterministic extraction & math
 *    - Word (.docx) -> Python native XML extraction
 *    - PDF / Scanned Document -> Sarvam Vision Document AI
 *    - CSV / TSV -> Deterministic tabular ingestion
 *    - Document Image -> Sarvam Vision Document AI
 * 2. High-Security Audit Logging:
 *    - SHA-256 + HMAC-SHA-256 + Trusted Reverse-Proxy IP capture
 * 3. Reasoning & Tool Calling:
 *    - Sarvam-105B Reasoning Core (Exclusive, zero third-party LLMs)
 * 4. Audio Synthesis:
 *    - Sarvam Bulbul TTS
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const clientIp = extractClientIp(req);
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  let logRecordId: string | null = null;
  let tempFilePath: string | null = null;

  try {
    const contentType = req.headers.get("content-type") || "";
    let userMessage = "";
    let history: Array<{ role: "user" | "assistant"; content: string }> = [];
    let pageContext: PageContext | undefined = undefined;
    let voiceOutputWanted = true;
    let sttResult: SttResult | null = null;
    let attachedMediaNote = "";
    let extractedDocumentContext = "";

    // Strictly server-side authentication via process.env.SARVAM_API_KEY

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const historyRaw = formData.get("history") as string | null;
      const contextRaw = formData.get("pageContext") as string | null;
      
      const mediaName = formData.get("mediaName") as string | null;
      const mediaType = formData.get("mediaType") as string | null;

      

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
        const fileName = (file.name || mediaName || "upload.bin").toLowerCase();
        const mime = file.type || mediaType || "application/octet-stream";
        const buffer = Buffer.from(await file.arrayBuffer());

        // Pipeline classification by input type
        if (mime.startsWith("audio/") || fileName.endsWith(".webm") || fileName.endsWith(".wav") || fileName.endsWith(".mp3") || fileName.endsWith(".m4a")) {
          // Audio Pipeline -> Saaras v4 STT
          sttResult = await transcribeAudio(buffer, file.type || "audio/webm");
          userMessage = sttResult.transcript;
        } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls") || mime.includes("spreadsheet") || mime.includes("excel")) {
          // Excel Workbook Pipeline -> Python openpyxl Native
          const tempDir = path.join(os.tmpdir(), "nass_uploads");
          if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
          tempFilePath = path.join(tempDir, `${Date.now()}_${file.name}`);
          fs.writeFileSync(tempFilePath, buffer);

          const excelResult = await parseExcelNative(tempFilePath);
          if (excelResult.success) {
            extractedDocumentContext = `\n[PARSED EXCEL WORKBOOK: "${file.name}"]\nSheets: ${excelResult.summary.sheet_names.join(", ")}\nTotal Rows: ${excelResult.summary.total_rows}\nCalculated Aggregations: ${JSON.stringify(excelResult.summary.numeric_aggregations)}\nFirst Sheet Headers: ${JSON.stringify(excelResult.sheets[0]?.headers || [])}\nFirst 5 Rows: ${JSON.stringify(excelResult.sheets[0]?.rows?.slice(0, 5) || [])}`;
          } else {
            extractedDocumentContext = `\n[EXCEL PARSING NOTICE: Could not extract workbook ${file.name}: ${excelResult.error}]`;
          }
          userMessage = (formData.get("userMessage") as string) || `Analyze uploaded Excel file: ${file.name}`;
        } else if (fileName.endsWith(".docx") || fileName.endsWith(".doc") || mime.includes("wordprocessingml") || mime.includes("msword")) {
          // Word Document Pipeline -> Python Native
          const tempDir = path.join(os.tmpdir(), "nass_uploads");
          if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
          tempFilePath = path.join(tempDir, `${Date.now()}_${file.name}`);
          fs.writeFileSync(tempFilePath, buffer);

          const wordResult = await parseWordNative(tempFilePath);
          if (wordResult.success) {
            extractedDocumentContext = `\n[PARSED WORD DOCUMENT: "${file.name}"]\nParagraphs: ${wordResult.paragraphCount}, Tables: ${wordResult.tableCount}\nExcerpt:\n${wordResult.allParagraphs.slice(0, 8).join("\n")}`;
          } else {
            extractedDocumentContext = `\n[WORD PARSING NOTICE: Could not extract Word document ${file.name}: ${wordResult.error}]`;
          }
          userMessage = (formData.get("userMessage") as string) || `Analyze uploaded Word document: ${file.name}`;
        } else if (fileName.endsWith(".pdf") || mime === "application/pdf") {
          // PDF / Scanned Document Pipeline -> Sarvam Vision Document AI
          const base64 = buffer.toString("base64");
          const docType = fileName.includes("po") ? "PURCHASE_ORDER" : fileName.includes("bol") ? "BILL_OF_LADING" : "COMMERCIAL_INVOICE";
          const visionResult = await processTradeDocument(base64, file.name, docType);
          extractedDocumentContext = `\n[SARVAM VISION EXTRACTED PDF: "${file.name}"]\nDoc Type: ${visionResult.documentType}\nArithmetic Valid: ${visionResult.arithmeticValid}\nExtracted Fields: ${JSON.stringify(visionResult.fields, null, 2)}\nDigitized Excerpt:\n${visionResult.digitizedText.slice(0, 500)}`;
          userMessage = (formData.get("userMessage") as string) || `Inspect uploaded PDF: ${file.name}`;
        } else if (fileName.endsWith(".csv") || fileName.endsWith(".tsv") || mime.includes("csv")) {
          // CSV / TSV Tabular Pipeline
          const text = buffer.toString("utf8");
          const lines = text.split(/\r?\n/).filter(Boolean);
          const headers = lines[0]?.split(",") || [];
          extractedDocumentContext = `\n[PARSED CSV TABLE: "${file.name}"]\nHeaders: ${headers.join(", ")}\nTotal Rows: ${lines.length - 1}\nSample Rows:\n${lines.slice(1, 6).join("\n")}`;
          userMessage = (formData.get("userMessage") as string) || `Analyze uploaded CSV: ${file.name}`;
        } else if (mime.startsWith("image/")) {
          // Document Image Pipeline -> Sarvam Vision
          const base64 = buffer.toString("base64");
          const visionResult = await processTradeDocument(base64, file.name, "COMMERCIAL_INVOICE");
          extractedDocumentContext = `\n[SARVAM VISION DOCUMENT IMAGE: "${file.name}"]\nExtracted Fields: ${JSON.stringify(visionResult.fields)}\nDigitized OCR:\n${visionResult.digitizedText.slice(0, 400)}`;
          userMessage = (formData.get("userMessage") as string) || `Inspect uploaded document image: ${file.name}`;
        } else {
          userMessage = (formData.get("userMessage") as string) || `Received file: ${file.name}`;
        }
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
      

      if (body.media) {
        attachedMediaNote = `\n[Operator attached ${body.media.type || "media"}: "${body.media.name}" (${Math.round((body.media.size || 0) / 1024)} KB)]`;
      }

      // Handle Base64 file attachments in JSON mode
      if (body.fileBase64 && body.media?.name) {
        const fileName = (body.media.name as string).toLowerCase();
        const buffer = Buffer.from(body.fileBase64, "base64");

        if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
          const tempDir = path.join(os.tmpdir(), "nass_uploads");
          if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
          tempFilePath = path.join(tempDir, `${Date.now()}_${body.media.name}`);
          fs.writeFileSync(tempFilePath, buffer);

          const excelResult = await parseExcelNative(tempFilePath);
          if (excelResult.success) {
            extractedDocumentContext = `\n[PARSED EXCEL WORKBOOK: "${body.media.name}"]\nSheets: ${excelResult.summary.sheet_names.join(", ")}\nTotal Rows: ${excelResult.summary.total_rows}\nCalculated Aggregations: ${JSON.stringify(excelResult.summary.numeric_aggregations)}\nFirst Sheet Headers: ${JSON.stringify(excelResult.sheets[0]?.headers || [])}\nFirst 5 Rows: ${JSON.stringify(excelResult.sheets[0]?.rows?.slice(0, 5) || [])}`;
          }
        } else if (fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
          const tempDir = path.join(os.tmpdir(), "nass_uploads");
          if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
          tempFilePath = path.join(tempDir, `${Date.now()}_${body.media.name}`);
          fs.writeFileSync(tempFilePath, buffer);

          const wordResult = await parseWordNative(tempFilePath);
          if (wordResult.success) {
            extractedDocumentContext = `\n[PARSED WORD DOCUMENT: "${body.media.name}"]\nParagraphs: ${wordResult.paragraphCount}, Tables: ${wordResult.tableCount}\nExcerpt:\n${wordResult.allParagraphs.slice(0, 8).join("\n")}`;
          }
        } else if (fileName.endsWith(".pdf")) {
          const docType = fileName.includes("po") ? "PURCHASE_ORDER" : fileName.includes("bol") ? "BILL_OF_LADING" : "COMMERCIAL_INVOICE";
          const visionResult = await processTradeDocument(body.fileBase64, body.media.name, docType);
          extractedDocumentContext = `\n[SARVAM VISION EXTRACTED PDF: "${body.media.name}"]\nDoc Type: ${visionResult.documentType}\nArithmetic Valid: ${visionResult.arithmeticValid}\nExtracted Fields: ${JSON.stringify(visionResult.fields, null, 2)}`;
        }
      }

      // Base64 audio support
      if (!userMessage && body.audioBase64) {
        const buffer = Buffer.from(body.audioBase64, "base64");
        sttResult = await transcribeAudio(buffer, body.mimeType || "audio/webm");
        userMessage = sttResult.transcript;
      }
    }

    if (!userMessage.trim()) {
      return NextResponse.json(
        {
          error: "No audible speech or text message detected. Please try speaking or typing again.",
          stt: sttResult,
          empty: true,
        },
        { status: 400 }
      );
    }

    const fullPrompt = [
      userMessage.trim(),
      attachedMediaNote,
      extractedDocumentContext,
    ]
      .filter(Boolean)
      .join("\n");

    // Diagnostic logging for prompt intake
    const runtimeInfo = getServerRuntimeInfo();
    const keyDiag = inspectSarvamKey();
    logDiagnostic({
      requestId,
      timestamp: new Date().toISOString(),
      runtime: runtimeInfo.runtime,
      environment: runtimeInfo.environment,
      stage: "route_entry",
      details: {
        promptLength: fullPrompt.length,
        lineCount: fullPrompt.split("\n").length,
        hasKey: keyDiag.isConfigured,
        keySource: keyDiag.source,
        keyPreview: keyDiag.redactedPreview,
        clientIp,
      },
    });

    // ─── PERSISTENT AUDIT LOGGING (Sections 15 & 16) ───
    try {
      const logRecord = await logAgentPrompt({
        promptText: fullPrompt,
        ipAddress: clientIp,
        sessionId: req.cookies.get("session_id")?.value || null,
        conversationId: req.headers.get("x-conversation-id") || null,
        messageSequence: history.length + 1,
        pagePath: pageContext?.activeView || null,
        host: req.headers.get("host"),
        userAgent: req.headers.get("user-agent"),
        requestId,
        model: "sarvam-105b",
      });
      logRecordId = logRecord.id;
    } catch (logErr) {
      console.error("[CRITICAL AUDIT LOG WARNING] Failed to persist pre-execution prompt log:", logErr);
    }

    // ─── REASONING & ORCHESTRATION LOOP (Sarvam-105B Default) ───
    const reasoning = await runCopilotReasoning({
      userMessage: fullPrompt,
      history,
      pageContext,
      
    });

    // ─── SARVAM BULBUL TTS FOR SPOKEN OUTPUT ───
    let ttsResult: TtsResult | null = null;
    if (voiceOutputWanted && (reasoning.spokenText || reasoning.answerText)) {
      const textToSpeak = reasoning.spokenText || reasoning.answerText;
      ttsResult = await synthesizeSpeech(textToSpeak, "arvind");
    }

    const totalLatencyMs = Date.now() - startTime;

    // ─── UPDATE AUDIT LOG POST-EXECUTION ───
    if (logRecordId) {
      await updateAgentPromptLog(logRecordId, {
        status: "PROCESSED",
        model: reasoning.model || "sarvam-105b",
        toolsUsed: reasoning.toolsUsed,
        latencyMs: totalLatencyMs,
      });
    }

    logDiagnostic({
      requestId,
      timestamp: new Date().toISOString(),
      runtime: runtimeInfo.runtime,
      environment: runtimeInfo.environment,
      stage: "response_delivery",
      durationMs: totalLatencyMs,
      details: {
        toolsCount: reasoning.toolsUsed?.length || 0,
        hasNavigation: Boolean(reasoning.navigation),
        hasReport: Boolean(reasoning.report),
        model: reasoning.model,
      },
    });

    return NextResponse.json({
      userMessage,
      answerText: reasoning.answerText,
      spokenText: reasoning.spokenText || reasoning.answerText,
      provider: reasoning.provider || "Sarvam AI",
      model: reasoning.model || "sarvam-105b",
      toolsUsed: reasoning.toolsUsed,
      sources: reasoning.sources,
      followUpSuggestions: reasoning.followUpSuggestions || [],
      providerNotice: reasoning.providerNotice,
      navigation: reasoning.navigation,
      sidebarAction: (reasoning as any).sidebarAction,
      uiActions: (reasoning as any).uiActions,
      report: reasoning.report,
      executionStatus: (reasoning as any).executionStatus || "SUCCESS",
      stt: sttResult,
      tts: ttsResult,
      latencyMs: totalLatencyMs,
      auditLogId: logRecordId,
      requestId,
      ipCaptured: clientIp,
    });
  } catch (err: any) {
    const errMessage = err?.message || String(err);
    logDiagnostic({
      requestId,
      timestamp: new Date().toISOString(),
      runtime: getServerRuntimeInfo().runtime,
      environment: getServerRuntimeInfo().environment,
      stage: "response_delivery",
      category: "UNEXPECTED_ERROR",
      details: {
        error: errMessage,
      },
    });

    if (logRecordId) {
      await updateAgentPromptLog(logRecordId, {
        status: "FAILED",
        error: errMessage,
      });
    }

    const safeNotice = getSafeUserNotice("UNEXPECTED_ERROR");

    return NextResponse.json(
      {
        error: safeNotice.userFacingMessage,
        details: errMessage,
        requestId,
      },
      { status: 500 }
    );
  } finally {
    // Clean up temporary files safely
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch {}
    }
  }
}
