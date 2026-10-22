import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPromptLogIntegrity } from "@/lib/audit/prompt-logger";

export const runtime = "nodejs";

/**
 * GET /api/audit/verify?id=<logId>
 * Verification procedure checking both SHA-256 digest and HMAC-SHA-256 cryptographic signature.
 * Fulfills Section 16 of NASS Group Copilot Security Specification.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Audit log ID is required: /api/audit/verify?id=<logId>" },
        { status: 400 }
      );
    }

    const record = await (db as any).agentPromptLog.findUnique({
      where: { id },
    });

    if (!record) {
      return NextResponse.json(
        { error: `Audit log record with ID "${id}" was not found.` },
        { status: 404 }
      );
    }

    const verification = verifyPromptLogIntegrity(record);

    return NextResponse.json({
      success: true,
      logId: record.id,
      isValid: verification.isValid,
      shaMatches: verification.shaMatches,
      hmacMatches: verification.hmacMatches,
      reason: verification.reason || "Cryptographic integrity verified.",
      record: {
        id: record.id,
        createdAt: record.createdAt,
        promptSha256: record.promptSha256,
        promptHmacSha256: record.promptHmacSha256,
        ipAddress: record.ipAddress,
        sessionId: record.sessionId,
        conversationId: record.conversationId,
        messageSequence: record.messageSequence,
        model: record.model,
        status: record.status,
        latencyMs: record.latencyMs,
        toolsUsed: record.toolsUsed ? JSON.parse(record.toolsUsed) : [],
        promptExcerpt: record.promptText.slice(0, 120),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Audit verification failed", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}
