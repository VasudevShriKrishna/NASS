"use client";

import { useCallback, useEffect, useState } from "react";

/** Minimal fetch hook with refresh — reads standard { ok, data } envelope from /api. */
export function useApi<T>(url: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [asOf, setAsOf] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const r = await fetch(url);
        const j = await r.json();
        if (cancelled) return;
        if (j.ok) {
          setData(j.data as T);
          setAsOf(j.as_of ?? null);
          setError(null);
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

  return { data, loading, error, asOf, refresh };
}

export async function postJson<T = unknown>(url: string, body: unknown): Promise<{ ok: boolean; data?: T; error?: { message: string } }> {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}
