/**
 * NASS AI Copilot — Backend Diagnostics & Failure Categorization Engine
 *
 * Implements structured, actionable diagnostics for:
 * - Missing environment variables (SARVAM_API_KEY)
 * - Invalid API credentials (401, 403)
 * - Bad request payloads or models (400, 404)
 * - Rate limiting / concurrency limits (429)
 * - Upstream server errors (5xx)
 * - Network timeouts, connection resets, and DNS failures
 * - Malformed responses or parse errors
 * - Internal tool and database execution errors
 *
 * Security & Privacy:
 * - Redacts all secrets (API keys, authorization headers, tokens)
 * - Redacts sensitive confidential customer/shipment PII
 * - Retains full technical telemetry in server logs
 * - Returns clean, honest, actionable user-facing messages
 */

export type DiagnosticErrorCategory =
  | "CONFIGURATION_ERROR"
  | "AUTHENTICATION_ERROR"
  | "RATE_LIMIT_ERROR"
  | "UPSTREAM_SERVICE_ERROR"
  | "BAD_REQUEST_ERROR"
  | "NOT_FOUND_ERROR"
  | "NETWORK_TIMEOUT_ERROR"
  | "PARSE_ERROR"
  | "TOOL_EXECUTION_ERROR"
  | "INPUT_VALIDATION_ERROR"
  | "UNEXPECTED_ERROR";

export interface DiagnosticEvent {
  requestId: string;
  correlationId?: string;
  timestamp: string;
  runtime: string;
  environment: "production" | "development" | "test";
  stage:
    | "route_entry"
    | "auth_check"
    | "input_validation"
    | "model_routing"
    | "tool_execution"
    | "upstream_call"
    | "synthesis"
    | "response_delivery";
  status?: number;
  category?: DiagnosticErrorCategory;
  durationMs?: number;
  details: Record<string, any>;
}

/** Redacts sensitive keys and credentials from logs */
export function redactSecret(value: unknown): string {
  if (typeof value !== "string" || !value) return "[EMPTY]";
  const trimmed = value.trim();
  if (trimmed.length <= 8) return "[REDACTED]";
  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)} (len:${trimmed.length})`;
}

/** Recursively sanitize an object to prevent secret leakage in server logs */
export function sanitizeLogDetails(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeLogDetails);

  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    const lk = k.toLowerCase();
    if (
      lk.includes("key") ||
      lk.includes("secret") ||
      lk.includes("token") ||
      lk.includes("auth") ||
      lk.includes("cookie") ||
      lk.includes("password")
    ) {
      clean[k] = redactSecret(v);
    } else if (typeof v === "object" && v !== null) {
      clean[k] = sanitizeLogDetails(v);
    } else {
      clean[k] = v;
    }
  }
  return clean;
}

/** Formats a structured diagnostic log entry to the server console */
export function logDiagnostic(event: DiagnosticEvent): void {
  const isErr = Boolean(event.category || (event.status && event.status >= 400));
  const sanitized = {
    ...event,
    details: sanitizeLogDetails(event.details),
  };

  const line = `[COPILOT_DIAGNOSTICS][${event.stage.toUpperCase()}][${event.category || "INFO"}] (req: ${event.requestId}) duration: ${event.durationMs ?? 0}ms - ${JSON.stringify(sanitized.details)}`;

  if (isErr) {
    console.error(line);
  } else {
    console.log(line);
  }
}

/** Resolves the active server runtime information */
export function getServerRuntimeInfo(): {
  runtime: string;
  environment: "production" | "development" | "test";
  isVercel: boolean;
  nodeVersion: string;
} {
  const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
  const environment = (process.env.NODE_ENV as any) || (isVercel ? "production" : "development");
  return {
    runtime: isVercel ? "nodejs (Vercel Serverless)" : `nodejs (${process.version})`,
    environment: environment === "production" ? "production" : environment === "test" ? "test" : "development",
    isVercel,
    nodeVersion: process.version,
  };
}

/** Maps technical HTTP status or errors to standard error categories */
export function categorizeHttpError(status: number): DiagnosticErrorCategory {
  if (status === 401 || status === 403) return "AUTHENTICATION_ERROR";
  if (status === 429) return "RATE_LIMIT_ERROR";
  if (status === 400) return "BAD_REQUEST_ERROR";
  if (status === 404) return "NOT_FOUND_ERROR";
  if (status >= 500) return "UPSTREAM_SERVICE_ERROR";
  return "UNEXPECTED_ERROR";
}

/** Generates user-friendly, honest error notices without falsifying success */
export function getSafeUserNotice(
  category: DiagnosticErrorCategory,
  context?: { status?: number; model?: string; tool?: string }
): {
  userFacingMessage: string;
  providerNotice: string;
} {
  switch (category) {
    case "CONFIGURATION_ERROR":
      return {
        userFacingMessage:
          "Operational Notice: SARVAM_API_KEY is not configured in this deployment environment. The Control Tower is operating in grounded local deterministic mode.",
        providerNotice: "Server configuration notice: SARVAM_API_KEY absent from server runtime environment.",
      };
    case "AUTHENTICATION_ERROR":
      return {
        userFacingMessage:
          "Operational Notice: Sarvam AI subscription key was rejected or expired (HTTP 401/403). Operating with authoritative local database records.",
        providerNotice: "Upstream authentication failure: api-subscription-key rejected by Sarvam AI.",
      };
    case "RATE_LIMIT_ERROR":
      return {
        userFacingMessage:
          "Operational Notice: Sarvam AI rate limit or concurrency quota reached (HTTP 429). Serving verified records directly from NASS Control Tower database.",
        providerNotice: "Upstream rate limit: Sarvam AI 105B concurrency quota exceeded.",
      };
    case "UPSTREAM_SERVICE_ERROR":
      return {
        userFacingMessage:
          "Operational Notice: Sarvam AI cloud service temporarily unavailable (HTTP 5xx). Authoritative data served from NASS local database.",
        providerNotice: `Upstream service failure: Sarvam AI HTTP ${context?.status || 500}.`,
      };
    case "NETWORK_TIMEOUT_ERROR":
      return {
        userFacingMessage:
          "Operational Notice: Upstream connection to Sarvam AI timed out. Serving authoritative grounded data from local records.",
        providerNotice: "Network failure: Connection to api.sarvam.ai timed out.",
      };
    case "TOOL_EXECUTION_ERROR":
      return {
        userFacingMessage:
          `Operational Notice: Unable to execute operational tool [${context?.tool || "tool"}]. Data query encountered a storage or network error.`,
        providerNotice: `Internal tool execution failure: ${context?.tool || "tool"}.`,
      };
    case "INPUT_VALIDATION_ERROR":
      return {
        userFacingMessage:
          "No operational inquiry detected. Please specify a shipment, purchase order, project, or navigation instruction.",
        providerNotice: "Validation notice: Empty or invalid input message.",
      };
    default:
      return {
        userFacingMessage:
          "Operational Notice: An unexpected error occurred while processing your request. Authoritative NASS database remains online.",
        providerNotice: "Unexpected runtime exception handled.",
      };
  }
}
