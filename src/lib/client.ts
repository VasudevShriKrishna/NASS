"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Minimal fetch hook with refresh + optional polling — reads standard { ok, data } envelope from /api. */
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
        const r = await fetch(url);
        const j = await r.json();
        if (cancelled) return;
        if (j.ok) {
          setData(j.data as T);
          setAsOf(j.as_of ?? null);
          setError(null);
          lastSyncedAt.current = Date.now();
          setSyncedAt(lastSyncedAt.current);
        } else {
          setError(j?.error?.message ?? "Request failed");
        }
      } catch (e) {
        if (!cancelled) setError(String(e));
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

export async function postJson<T = unknown>(url: string, body: unknown): Promise<{ ok: boolean; data?: T; error?: { message: string } }> {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}
