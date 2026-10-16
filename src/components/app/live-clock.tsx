"use client";

import { useEffect, useState } from "react";

/* Ticking operational clock — updates every second (hour/minute/second live). */
export function LiveClock({ className, showSeconds = true, prefix }: { className?: string; showSeconds?: boolean; prefix?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setNow(Date.now());
    // async first tick (lint-clean) — fires right after mount paint
    const t0 = setTimeout(update, 0);
    const id = setInterval(update, 1000);
    return () => {
      clearTimeout(t0);
      clearInterval(id);
    };
  }, []);

  // Render placeholder on server / first paint to avoid hydration mismatch
  if (now === null) {
    return <span className={className} suppressHydrationWarning>--:--{showSeconds ? ":--" : ""}</span>;
  }

  const d = new Date(now);
  const pad = (n: number) => String(n).padStart(2, "0");
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}${showSeconds ? `:${pad(d.getSeconds())}` : ""}`;
  const date = d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" });

  return (
    <span className={className} suppressHydrationWarning>
      {prefix ? `${prefix} ` : ""}
      <span className="tabular-nums">{time}</span>
      <span className="ml-1.5 text-muted-foreground">· {date}</span>
    </span>
  );
}

/* Live seconds ticker hook — shared `now` for countdowns / moving cursors.
 * Returns null until mounted (prevents SSR/hydration mismatch). */
export function useNow(intervalMs = 1000): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setNow(Date.now());
    const t0 = setTimeout(update, 0);
    const id = setInterval(update, intervalMs);
    return () => {
      clearTimeout(t0);
      clearInterval(id);
    };
  }, [intervalMs]);
  return now;
}

export function fmtCountdown(ms: number): string {
  if (ms <= 0) return "arrived / due now";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${String(m).padStart(2, "0")}m ${String(sec).padStart(2, "0")}s`;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m ${String(sec).padStart(2, "0")}s`;
  return `${m}m ${String(sec).padStart(2, "0")}s`;
}
