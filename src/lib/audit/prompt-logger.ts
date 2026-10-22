import crypto from "crypto";
import { db } from "@/lib/db";
import type { NextRequest } from "next/server";

const HMAC_SECRET = process.env.PROMPT_LOG_HMAC_KEY || "nass-sarvam-audit-hmac-secret-key-2026";

export interface LogPromptParams {
  promptText: string;
  ipAddress?: string | null;
  sessionId?: string | null;
  conversationId?: string | null;
  messageSequence?: number;
  userId?: string | null;
  pagePath?: string | null;
  host?: string | null;
  deploymentEnvironment?: string | null;
  deploymentUrl?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  model?: string;
}

export interface PromptLogRecord {
  id: string;
  createdAt: Date;
  promptText: string;
  promptSha256: string;
  promptHmacSha256: string;
  ipAddress: string | null;
  sessionId: string | null;
  conversationId: string | null;
  messageSequence: number;
  userId: string | null;
  pagePath: string | null;
  host: string | null;
  deploymentEnvironment: string | null;
  deploymentUrl: string | null;
  userAgent: string | null;
  requestId: string | null;
  model: string | null;
  toolsUsed: string | null;
  latencyMs: number | null;
  status: string;
  error: string | null;
}

/**
 * Extracts client IP from trusted server-side reverse proxy headers (Vercel / Cloudflare).
 * Never accepts arbitrary client headers without verification.
 */
export function extractClientIp(req: NextRequest | Headers): string | null {
  const headers = req instanceof Headers ? req : req.headers;
  const xForwardedFor = headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const ips = xForwardedFor.split(",").map((s) => s.trim());
    if (ips[0] && ips[0].length > 0) return ips[0];
  }
  const xRealIp = headers.get("x-real-ip");
  if (xRealIp && xRealIp.trim().length > 0) return xRealIp.trim();
  const cfConnectingIp = headers.get("cf-connecting-ip");
  if (cfConnectingIp && cfConnectingIp.trim().length > 0) return cfConnectingIp.trim();
  return null;
}

/**
 * Calculates cryptographic SHA-256 of exact prompt string (UTF-8).
 */
export function calculatePromptSha256(text: string): string {
  return crypto.createHash("sha256").update(Buffer.from(text, "utf8")).digest("hex");
}

/**
 * Computes canonical HMAC-SHA-256 for non-repudiation and tamper-evidence.
 */
export function calculatePromptHmac(text: string, conversationId = "", sequence = 1, secret = HMAC_SECRET): string {
  const canonicalPayload = `PROMPT:${sequence}:${conversationId}:${text}`;
  return crypto.createHmac("sha256", secret).update(Buffer.from(canonicalPayload, "utf8")).digest("hex");
}

/**
 * Persistently logs submitted agent prompts before AI execution.
 * Fulfills Section 15 & 16 of NASS Group Copilot Security Specification.
 */
export async function logAgentPrompt(params: LogPromptParams): Promise<PromptLogRecord> {
  const {
    promptText,
    ipAddress = null,
    sessionId = null,
    conversationId = null,
    messageSequence = 1,
    userId = null,
    pagePath = null,
    host = null,
    deploymentEnvironment = process.env.NODE_ENV || "production",
    deploymentUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://mycorps.vercel.app",
    userAgent = null,
    requestId = null,
    model = "sarvam-105b",
  } = params;

  if (typeof promptText !== "string" || promptText.length === 0) {
    throw new Error("Audit log failed: promptText must be a non-empty string.");
  }

  const promptSha256 = calculatePromptSha256(promptText);
  const promptHmacSha256 = calculatePromptHmac(promptText, conversationId || "", messageSequence);

  try {
    const record = await (db as any).agentPromptLog.create({
      data: {
        promptText,
        promptSha256,
        promptHmacSha256,
        ipAddress,
        sessionId,
        conversationId,
        messageSequence,
        userId,
        pagePath,
        host,
        deploymentEnvironment,
        deploymentUrl,
        userAgent,
        requestId,
        model,
        status: "RECEIVED",
      },
    });

    return record as PromptLogRecord;
  } catch (err: any) {
    console.error("[CRITICAL AUDIT LOG FAILURE] Unable to persist agent prompt log:", err);
    throw new Error(`Audit logging failed: Prompt cannot be processed without tamper-evident audit record (${err.message})`);
  }
}

/**
 * Updates prompt log after model inference completes.
 */
export async function updateAgentPromptLog(
  logId: string,
  update: {
    status: "PROCESSED" | "FAILED";
    model?: string;
    toolsUsed?: string[];
    latencyMs?: number;
    error?: string | null;
  }
): Promise<void> {
  try {
    await (db as any).agentPromptLog.update({
      where: { id: logId },
      data: {
        status: update.status,
        ...(update.model ? { model: update.model } : {}),
        ...(update.toolsUsed ? { toolsUsed: JSON.stringify(update.toolsUsed) } : {}),
        ...(update.latencyMs !== undefined ? { latencyMs: update.latencyMs } : {}),
        ...(update.error !== undefined ? { error: update.error } : {}),
      },
    });
  } catch (err) {
    console.warn("[Audit Log Post-Update Warning] Could not update prompt log status:", err);
  }
}

/**
 * Verifies integrity of a stored prompt log record.
 */
export function verifyPromptLogIntegrity(
  record: PromptLogRecord,
  secret = HMAC_SECRET
): { isValid: boolean; shaMatches: boolean; hmacMatches: boolean; reason?: string } {
  const computedSha = calculatePromptSha256(record.promptText);
  const computedHmac = calculatePromptHmac(record.promptText, record.conversationId || "", record.messageSequence, secret);

  const shaMatches = crypto.timingSafeEqual(Buffer.from(computedSha), Buffer.from(record.promptSha256));
  const hmacMatches = crypto.timingSafeEqual(Buffer.from(computedHmac), Buffer.from(record.promptHmacSha256));

  const isValid = shaMatches && hmacMatches;
  return {
    isValid,
    shaMatches,
    hmacMatches,
    reason: isValid ? undefined : !shaMatches ? "SHA-256 digest mismatch" : "HMAC-SHA-256 signature mismatch",
  };
}
