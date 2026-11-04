import { NextRequest, NextResponse } from "next/server";
import {
  extractDocument,
  isVisionExtractionEnabled,
  DOCUMENT_JSON_SCHEMAS,
  MAX_FILE_SIZE_BYTES,
  MAX_PAGES_PER_BATCH,
  MAX_REQUESTS_PER_WINDOW,
  DocumentSchemaType,
} from "@/lib/sarvam/vision-extractor";

export const runtime = "nodejs";

/**
 * GET /api/documents/extract
 * Returns Sarvam Vision Document Intelligence status, capabilities, schemas, and guardrail limits.
 */
export async function GET() {
  const enabled = isVisionExtractionEnabled();

  return NextResponse.json({
    service: "Sarvam Vision Document Intelligence (MCP)",
    status: enabled ? "ACTIVE" : "DISABLED",
    featureFlag: "SARVAM_VISION_EXTRACTION_ENABLED",
    singleCallCompliant: true,
    toolChaining: false,
    limits: {
      maxPagesPerBatch: MAX_PAGES_PER_BATCH,
      maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
      maxFileSizeMb: MAX_FILE_SIZE_BYTES / (1024 * 1024),
      rateLimitRequestsPerMin: MAX_REQUESTS_PER_WINDOW,
    },
    supportedFormats: {
      visionFormats: ["application/pdf", "image/png", "image/jpeg", "image/webp", "image/tiff"],
      localNonVisionFormats: [".docx", ".xlsx", ".csv"],
    },
    supportedSchemas: Object.keys(DOCUMENT_JSON_SCHEMAS),
  });
}

/**
 * POST /api/documents/extract
 * Additive Entry Point for Single-Call Sarvam Vision Document Extraction.
 * Accepts multipart/form-data or application/json.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Resolve Credentials (strictly from server environment)
    const customApiKey = undefined;

    const contentType = req.headers.get("content-type") || "";
    let buffer: Buffer | null = null;
    let fileName = "document.pdf";
    let mimeType = "application/pdf";
    let schemaType: DocumentSchemaType = "PURCHASE_ORDER";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const formSchema = formData.get("schemaType") as DocumentSchemaType | null;
      const formKey = formData.get("apiKey") as string | null;

      // formKey ignored - server-side authentication
      if (formSchema) schemaType = formSchema;

      if (!file) {
        return NextResponse.json(
          { error: "BAD_REQUEST", message: "No file provided in multipart/form-data payload." },
          { status: 400 }
        );
      }

      fileName = file.name || "uploaded_document.pdf";
      mimeType = file.type || "application/octet-stream";
      buffer = Buffer.from(await file.arrayBuffer());
    } else {
      const body = await req.json();
      // body.apiKey ignored - server-side authentication
      if (body.schemaType) schemaType = body.schemaType;
      if (body.fileName) fileName = body.fileName;
      if (body.mimeType) mimeType = body.mimeType;

      if (body.documentBase64) {
        buffer = Buffer.from(body.documentBase64, "base64");
      } else if (body.content) {
        buffer = Buffer.from(body.content, "utf-8");
      } else {
        return NextResponse.json(
          { error: "BAD_REQUEST", message: "Missing documentBase64 or file payload in request." },
          { status: 400 }
        );
      }
    }

    // 2. Execute Document Extraction via Isolated Module
    const result = await extractDocument({
      buffer,
      fileName,
      mimeType,
      schemaType,
      customApiKey,
    });

    // 3. Map Domain Errors to Specific HTTP Status Codes
    if (!result.success && result.error) {
      if (result.error.type === "FEATURE_DISABLED") {
        return NextResponse.json(result, { status: 403 });
      }
      if (result.error.type === "RATE_LIMIT_EXCEEDED") {
        const retryAfter = result.error.details?.retryAfterSeconds || 60;
        return NextResponse.json(result, {
          status: 429,
          headers: { "Retry-After": String(retryAfter) },
        });
      }
      if (result.error.type === "FILE_TOO_LARGE") {
        return NextResponse.json(result, { status: 413 });
      }
      if (result.error.type === "PAGE_LIMIT_EXCEEDED") {
        return NextResponse.json(result, { status: 400 });
      }
      if (result.error.type === "CONNECTOR_ERROR") {
        return NextResponse.json(result, { status: 502 });
      }
      if (result.error.type === "MODEL_ERROR") {
        return NextResponse.json(result, { status: 500 });
      }
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error("[Document Extraction Route Failure]", err);
    return NextResponse.json(
      {
        success: false,
        error: {
          type: "INTERNAL_SERVER_ERROR",
          message: err?.message || "An unexpected error occurred during document extraction.",
        },
      },
      { status: 500 }
    );
  }
}
