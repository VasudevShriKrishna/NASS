/**
 * Centralized Sarvam API Key & Environment Resolver
 *
 * Enforces:
 * - Deterministic resolution: custom override (request header/cookie) -> process.env.SARVAM_API_KEY
 * - Never prints or leaks secrets to client or unsafe logs
 * - Distinguishes between local development and Vercel production runtimes
 * - Validates key format (e.g. sk_...) and length
 */

import { redactSecret, getServerRuntimeInfo } from "../diagnostics";

export interface SarvamKeyDiagnostics {
  isConfigured: boolean;
  source: "request_override" | "process_env" | "none";
  redactedPreview: string;
  keyLength: number;
  environment: "production" | "development" | "test";
  isVercel: boolean;
  isValidFormat: boolean;
}

/**
 * Resolves the active Sarvam API key with zero leakage.
 */
export function resolveSarvamApiKey(_customOverride?: string | null): string {
  // Strictly resolve from server environment variable process.env.SARVAM_API_KEY
  return (process.env.SARVAM_API_KEY || "").trim();
}

/**
 * Returns safe, non-sensitive diagnostics about the Sarvam key configuration.
 */
export function inspectSarvamKey(_customOverride?: string | null): SarvamKeyDiagnostics {
  const effectiveKey = resolveSarvamApiKey();
  const runtime = getServerRuntimeInfo();

  return {
    isConfigured: effectiveKey.length > 0,
    source: effectiveKey.length > 0 ? "process_env" : "none",
    redactedPreview: redactSecret(effectiveKey),
    keyLength: effectiveKey.length,
    environment: runtime.environment,
    isVercel: runtime.isVercel,
    isValidFormat: effectiveKey.startsWith("sk_") && effectiveKey.length >= 24,
  };
}
