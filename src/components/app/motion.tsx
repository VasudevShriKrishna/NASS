"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ── View transition: every view mounts through this ─────────────────────── */
export function PageFade({ viewKey, children }: { viewKey: string; children: ReactNode }) {
  return (
    <motion.div
      key={viewKey}
      initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ── Staggered rise for card grids ───────────────────────────────────────── */
export function Rise({ delay = 0, children, className }: { delay?: number; children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ── Animated number count-up (luxury odometer feel) ─────────────────────── */
export function CountUp({ value, className, decimals = 0 }: { value: number; className?: string; decimals?: number }) {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 60, damping: 18, mass: 0.8 });
  const text = useTransform(spring, (v) => v.toLocaleString("en-US", { maximumFractionDigits: decimals, minimumFractionDigits: decimals }));
  useEffect(() => {
    mv.set(value);
  }, [value, mv]);
  return <motion.span className={className}>{text}</motion.span>;
}

/* ── Live pulse dot (broadcast feel) ─────────────────────────────────────── */
export function PulsingDot({ className, tone = "gold" }: { className?: string; tone?: "gold" | "emerald" | "rose" }) {
  const c = tone === "gold" ? "bg-primary" : tone === "emerald" ? "bg-emerald-400" : "bg-rose-400";
  const shadow = tone === "gold" ? "shadow-[0_0_10px_oklch(0.79_0.135_88/80%)]" : tone === "emerald" ? "shadow-[0_0_10px_rgba(52,211,153,.7)]" : "shadow-[0_0_10px_rgba(251,113,133,.7)]";
  return (
    <span className={cn("relative inline-flex h-2 w-2", className)} aria-hidden>
      <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping", c)} />
      <span className={cn("relative inline-flex h-2 w-2 rounded-full", c, shadow)} />
    </span>
  );
}
