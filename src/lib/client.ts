"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: {
    error_code?: string;
    message: string;
    retryable?: boolean;
    correlation_id?: string;
  };
  as_of?: string;
  correlation_id?: string;
}

/**
 * Robust response body parser that strictly enforces:
 * 1. Safe handling of 204 No Content without invoking JSON parsing.
 * 2. Safe handling of empty response bodies (0 bytes).
 * 3. Content-Type inspection (avoids crashing on HTML error pages or proxy timeouts).
 * 4. Preservation of backend error messages and HTTP status codes.
 */
export async function safeParseResponse<T = unknown>(r: Response): Promise<ApiResponse<T>> {
  // 1. HTTP 204 No Content
  if (r.status === 204) {
    return { ok: true, data: undefined };
  }

  // 2. Read raw response text once to avoid consuming the stream multiple times
  let text = "";
  try {
    text = await r.text();
  } catch (err: any) {
    return {
      ok: false,
      error: {
        error_code: "NETWORK_READ_ERROR",
        message: `Failed to read network response stream: ${err?.message || String(err)}`,
      },
    };
  }

  // 3. Handle empty response body
  if (!text || text.trim() === "") {
    if (r.ok) {
      return { ok: true, data: undefined };
    }
    return {
      ok: false,
      error: {
        error_code: `HTTP_${r.status}`,
        message: `Server returned HTTP ${r.status} ${r.statusText || "Error"} with an empty response body.`,
      },
    };
  }

  // 4. Inspect Content-Type and inspect if payload resembles JSON
  const contentType = r.headers.get("content-type") || "";
  const trimmed = text.trim();
  const isLikelyJson =
    contentType.includes("application/json") ||
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"));

  if (!isLikelyJson) {
    const snippet = trimmed.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").slice(0, 140).trim();
    return {
      ok: false,
      error: {
        error_code: `HTTP_${r.status}`,
        message: !r.ok
          ? `Server Error (${r.status}): ${snippet || r.statusText || "Non-JSON response"}`
          : `Unexpected non-JSON response from server (Content-Type: ${contentType || "unknown"})`,
      },
    };
  }

  // 5. Safe JSON parsing with descriptive syntax error recovery
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch (parseErr: any) {
    return {
      ok: false,
      error: {
        error_code: "JSON_PARSE_ERROR",
        message: `Invalid JSON received from server (HTTP ${r.status}): ${parseErr?.message || "Syntax error in response"}`,
      },
    };
  }

  // 6. Handle HTTP error status codes where server returned JSON error envelope
  if (!r.ok) {
    const errorMsg =
      parsed?.error?.message ||
      parsed?.message ||
      `Request failed with status HTTP ${r.status} ${r.statusText}`;
    return {
      ok: false,
      error: {
        error_code: parsed?.error?.error_code || `HTTP_${r.status}`,
        message: errorMsg,
        retryable: parsed?.error?.retryable,
        correlation_id: parsed?.correlation_id || parsed?.error?.correlation_id,
      },
      as_of: parsed?.as_of,
    };
  }

  // 7. Standard success response envelope check
  if (typeof parsed === "object" && parsed !== null && "ok" in parsed) {
    return parsed as ApiResponse<T>;
  }

  // Direct JSON payload fallback
  return {
    ok: true,
    data: parsed as T,
  };
}

/** Robust fetch hook with refresh + optional polling — reads standard { ok, data } envelope from /api with cookies. */
export function useApi<T>(url: string | null, deps: unknown[] = [], pollMs = 0) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [asOf, setAsOf] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const lastSyncedAt = useRef<number>(0);
  const [syncedAt, setSyncedAt] = useState<number>(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetch(url, { credentials: "include" });
        if (cancelled) return;

        const result = await safeParseResponse<T>(r);
        if (cancelled) return;

        if (result.ok) {
          setData(result.data !== undefined ? (result.data as T) : null);
          setAsOf(result.as_of ?? null);
          setError(null);
          lastSyncedAt.current = Date.now();
          setSyncedAt(lastSyncedAt.current);
        } else {
          setError(result.error?.message ?? "Request failed");
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [url, tick, ...deps]);

  // Optional background polling — silent refresh (no loading flicker)
  useEffect(() => {
    if (!url || !pollMs) return;
    const id = setInterval(() => setTick((t) => t + 1), pollMs);
    return () => clearInterval(id);
  }, [url, pollMs]);

  return { data, loading, error, asOf, refresh, syncedAt };
}

export async function postJson<T = unknown>(
  url: string,
  body: unknown,
  init?: RequestInit
): Promise<{ ok: boolean; data?: T; error?: { message: string } }> {
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...init?.headers },
      credentials: "include",
      body: JSON.stringify(body),
      ...init,
    });
    const parsed = await safeParseResponse<T>(r);
    return {
      ok: parsed.ok,
      data: parsed.data,
      error: parsed.error ? { message: parsed.error.message } : undefined,
    };
  } catch (err: any) {
    return {
      ok: false,
      error: { message: err?.message || "Network request failed" },
    };
  }
}

export async function postFormData<T = unknown>(
  url: string,
  formData: FormData
): Promise<{ ok: boolean; data?: T; error?: { message: string } }> {
  try {
    const r = await fetch(url, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    const parsed = await safeParseResponse<T>(r);
    return {
      ok: parsed.ok,
      data: parsed.data,
      error: parsed.error ? { message: parsed.error.message } : undefined,
    };
  } catch (err: any) {
    return {
      ok: false,
      error: { message: err?.message || "Network request failed" },
    };
  }
}

/** Set a persistent browser cookie (e.g. for sarvam_key or auth tokens). */
export function setCookie(name: string, value: string, days = 365) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

/** Read a cookie value by name. */
export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^|;\\s*)(${name})=([^;]*)`));
  return match ? decodeURIComponent(match[3]) : null;
}
