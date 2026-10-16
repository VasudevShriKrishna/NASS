import { NextResponse } from "next/server";

/** Standard API helpers — every endpoint returns correlation id + consistent errors (§11.1). */
export function corrId(): string {
  return `corr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ok<T>(data: T, init?: number) {
  return NextResponse.json({ ok: true, data, correlation_id: corrId(), as_of: new Date().toISOString() }, { status: init ?? 200 });
}

export function err(code: string, message: string, status = 400, retryable = false) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        error_code: code,
        message,
        retryable,
        correlation_id: corrId(),
      },
      as_of: new Date().toISOString(),
    },
    { status }
  );
}

export function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
