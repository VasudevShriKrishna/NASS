"use client";

import { useMemo } from "react";

/* Ambient gold field — slow drifting glow blobs + fine floating specks.
 * Pure CSS animation (zero JS per frame), sits behind all content,
 * disabled under prefers-reduced-motion.                                  */

const BLOBS = [
  { cls: "ambient-field absolute -top-48 left-1/2 h-[560px] w-[880px] -translate-x-1/2 rounded-full", bg: "bg-[radial-gradient(closest-side,oklch(0.79_0.135_88/0.08),transparent)]", anim: "animate-[ambient-drift-a_26s_ease-in-out_infinite_alternate]" },
  { cls: "ambient-field absolute bottom-[-220px] left-[-160px] h-[460px] w-[560px] rounded-full", bg: "bg-[radial-gradient(closest-side,oklch(0.68_0.1_75/0.07),transparent)]", anim: "animate-[ambient-drift-b_34s_ease-in-out_infinite_alternate]" },
  { cls: "ambient-field absolute right-[-180px] top-1/3 h-[420px] w-[520px] rounded-full", bg: "bg-[radial-gradient(closest-side,oklch(0.79_0.135_88/0.06),transparent)]", anim: "animate-[ambient-drift-c_30s_ease-in-out_infinite_alternate]" },
] as const;

export function AmbientGoldField() {
  const specks = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        left: `${(i * 61 + 13) % 100}%`,
        top: `${18 + ((i * 37) % 64)}%`,
        delay: `${(i * 1.7) % 12}s`,
        dur: `${9 + (i % 5) * 2.6}s`,
        size: i % 4 === 0 ? 3 : 2,
      })),
    []
  );

  return (
    <div aria-hidden className="ambient-field pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {BLOBS.map((b, i) => (
        <div key={i} className={`${b.cls} ${b.bg} ${b.anim}`} />
      ))}
      {specks.map((s, i) => (
        <span
          key={i}
          className="ambient-field absolute rounded-full bg-primary/50 shadow-[0_0_6px_oklch(0.79_0.135_88/60%)]"
          style={{ left: s.left, top: s.top, width: s.size, height: s.size, animation: `speck-float ${s.dur} ease-in-out ${s.delay} infinite` }}
        />
      ))}
    </div>
  );
}
