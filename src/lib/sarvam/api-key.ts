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
export function resolveSarvamApiKey(customOverride?: string | null): string {
  const trimmedOverride = typeof customOverride === "string" ? customOverride.trim() : "";
  if (trimmedOverride.length > 0) {
    return trimmedOverride;
  }

  const envKey = (process.env.SARVAM_API_KEY || "").trim();
  return envKey;
}

/**
 * Returns safe, non-sensitive diagnostics about the Sarvam key configuration.
 */
export function inspectSarvamKey(customOverride?: string | null): SarvamKeyDiagnostics {
  const effectiveKey = resolveSarvamApiKey(customOverride);
  const runtime = getServerRuntimeInfo();

  let source: SarvamKeyDiagnostics["source"] = "none";
  if (customOverride && customOverride.trim().length > 0) {
    source = "request_override";
  } else if ((process.env.SARVAM_API_KEY || "").trim().length > 0) {
    source = "process_env";
  }

  const isValidFormat = effectiveKey.startsWith("sk_") && effectiveKey.length >= 24;

  return {
    isConfigured: effectiveKey.length > 0,
    source,
    redactedPreview: redactSecret(effectiveKey),
    keyLength: effectiveKey.length,
    environment: runtime.environment,
    isVercel: runtime.isVercel,
    isValidFormat,
  };
}
