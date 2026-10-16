"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CountUp } from "@/components/app/motion";
import { AlertTriangle, CircleCheck, Clock, CloudOff, Database, FileWarning, Loader2 } from "lucide-react";
import type { ReactNode } from "react";

/* ── Freshness classes (Rule 9 / M11): fresh | aging | stale | unavailable ── */
export function FreshnessBadge({ value, className }: { value: string | null | undefined; className?: string }) {
  const v = (value ?? "unavailable").toLowerCase();
  const map: Record<string, { cls: string; icon: ReactNode; label: string }> = {
    fresh: {
      cls: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-400/10 dark:text-emerald-300 dark:border-emerald-400/25",
      icon: <CircleCheck className="h-3 w-3" />, label: "FRESH",
    },
    aging: {
      cls: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-400/10 dark:text-amber-300 dark:border-amber-400/25",
      icon: <Clock className="h-3 w-3" />, label: "AGING",
    },
    stale: {
      cls: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-400/10 dark:text-orange-300 dark:border-orange-400/25",
      icon: <AlertTriangle className="h-3 w-3" />, label: "STALE",
    },
    unavailable: {
      cls: "bg-zinc-100 text-zinc-600 border-zinc-300 dark:bg-zinc-400/10 dark:text-zinc-400 dark:border-zinc-400/25",
      icon: <CloudOff className="h-3 w-3" />, label: "UNAVAILABLE",
    },
  };
  const m = map[v] ?? map.unavailable;
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide", m.cls, className)} title={`Freshness class: ${v}`}>
      {m.icon}
      {m.label}
    </span>
  );
}

/* ── Evidence labels (Rule 2) ── */
export function EvidenceBadge({ label, className }: { label: string | null | undefined; className?: string }) {
  const map: Record<string, string> = {
    "PUBLICLY EVIDENCED": "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-400/10 dark:text-emerald-300 dark:border-emerald-400/25",
    "PROPOSED TARGET CAPABILITY": "bg-amber-100 text-amber-800 border-amber-300 dark:bg-primary/10 dark:text-primary dark:border-primary/30",
    "REQUIRES CUSTOMER DATA/INTEGRATION": "bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-400/10 dark:text-violet-300 dark:border-violet-400/25",
    "REQUIRES DEMO/VALIDATION": "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-400/10 dark:text-amber-300 dark:border-amber-400/25",
    "NOT CONFIRMED": "bg-zinc-100 text-zinc-600 border-zinc-300 dark:bg-zinc-400/10 dark:text-zinc-400 dark:border-zinc-400/25",
  };
  const l = label ?? "NOT CONFIRMED";
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide", map[l] ?? map["NOT CONFIRMED"], className)}>
      {l}
    </span>
  );
}

/* ── Reconciliation result: PASS | WARN | FAIL | NOT_CHECKED ── */
export function ReconciliationBadge({ result, className }: { result: string; className?: string }) {
  const map: Record<string, string> = {
    PASS: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-400/10 dark:text-emerald-300 dark:border-emerald-400/25",
    WARN: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-400/10 dark:text-amber-300 dark:border-amber-400/25",
    FAIL: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-400/10 dark:text-rose-300 dark:border-rose-400/25",
    NOT_CHECKED: "bg-zinc-100 text-zinc-600 border-zinc-300 dark:bg-zinc-400/10 dark:text-zinc-400 dark:border-zinc-400/25",
  };
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[10px] font-bold", map[result] ?? map.NOT_CHECKED, className)}>{result === "NOT_CHECKED" ? "NOT CHECKED (≠ PASS)" : result}</span>;
}

/* ── Closed-loop case state badge (M17) ── */
const CASE_STATE_STYLE: Record<string, string> = {
  DETECTED: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-400/10 dark:text-rose-300 dark:border-rose-400/25",
  TRIAGED: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-400/10 dark:text-orange-300 dark:border-orange-400/25",
  ASSIGNED: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-400/10 dark:text-amber-300 dark:border-amber-400/25",
  INVESTIGATING: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-400/10 dark:text-yellow-300 dark:border-yellow-400/25",
  ACTION_PROPOSED: "bg-lime-100 text-lime-800 border-lime-300 dark:bg-lime-400/10 dark:text-lime-300 dark:border-lime-400/25",
  AWAITING_APPROVAL: "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-400/10 dark:text-teal-300 dark:border-teal-400/25",
  ACTION_SUBMITTED: "bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-400/10 dark:text-cyan-300 dark:border-cyan-400/25",
  OUTCOME_PENDING_VERIFICATION: "bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-400/10 dark:text-violet-300 dark:border-violet-400/25",
  RESOLVED: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-400/10 dark:text-emerald-300 dark:border-emerald-400/25",
  CANCELLED: "bg-zinc-100 text-zinc-600 border-zinc-300 dark:bg-zinc-400/10 dark:text-zinc-400 dark:border-zinc-400/25",
};
export function CaseStateBadge({ state, className }: { state: string; className?: string }) {
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[10px] font-bold tracking-wide", CASE_STATE_STYLE[state] ?? CASE_STATE_STYLE.CANCELLED, className)}>{state.replaceAll("_", " ")}</span>;
}

/* ── Generic status pill for domain states ── */
export function StatusPill({ value, className }: { value: string | null | undefined; className?: string }) {
  const v = value ?? "UNKNOWN";
  const tone =
    /VERIFIED|PASS|HEALTHY|APPROVED|FULFILLED|RECEIVED|CLOSED|COMPLETED|DELIVERED|RELEASED|AVAILABLE|MATCHED|ACTIVE|SENT/i.test(v)
      ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-400/10 dark:text-emerald-300 dark:border-emerald-400/25"
      : /FAIL|REJECT|OUTAGE|HOLD|DAMAGED|FAULT|SHORT|BLACKLISTED|CANCELLED|SUPERSEDED|BOUNCED|DEGRADED|NEEDS_REVIEW|NEEDS_INFO|RECONCILIATION_FAILED|QUARANTINED|CRITICAL/i.test(v)
        ? "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-400/10 dark:text-rose-300 dark:border-rose-400/25"
        : /PENDING|WAIT|REVIEW|AGING|STALE|SOURCING|PARTIAL|IN_TRANSIT|IN_PROGRESS|SUBMITTED|OPEN|UNRESOLVED|UNMATCHED|MISSING|PENDING_VERIFICATION|EXPIRING|DRAFT|PLANNED|BOOKED|READY|AT_TRANSIT_POINT|QUEUED|EXPIRED|REJECTED|FAILED|AWAITING/i.test(v)
          ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-400/10 dark:text-amber-300 dark:border-amber-400/25"
          : "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-400/10 dark:text-zinc-300 dark:border-zinc-400/25";
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide", tone, className)}>{v.replaceAll("_", " ")}</span>;
}

/* ── Severity ── */
export function SeverityBadge({ value }: { value: string }) {
  const map: Record<string, string> = {
    CRITICAL: "bg-rose-600/90 text-white border-rose-400/40 shadow-[0_0_10px_oklch(0.65_0.2_25/25%)]",
    HIGH: "bg-orange-500/90 text-white border-orange-400/40",
    MEDIUM: "bg-amber-400/90 text-amber-950 border-amber-300/50",
    LOW: "bg-zinc-300 text-zinc-700 border-zinc-400 dark:bg-zinc-500/20 dark:text-zinc-300 dark:border-zinc-400/30",
    INFO: "bg-zinc-200 text-zinc-700 border-zinc-400 dark:bg-zinc-500/15 dark:text-zinc-300 dark:border-zinc-400/25",
  };
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[10px] font-bold tracking-wide", map[value] ?? map.INFO)}>{value}</span>;
}

/* ── KPI tile with drill hint (M21: every tile drills to row-level records) ── */
export function KpiTile({ label, value, sub, tone = "default", onClick, icon, index = 0 }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "default" | "good" | "warn" | "bad"; onClick?: () => void; icon?: ReactNode; index?: number }) {
  const toneCls = {
    default: "text-foreground",
    good: "text-emerald-600 dark:text-emerald-300",
    warn: "text-amber-600 dark:text-amber-300",
    bad: "text-rose-600 dark:text-rose-300",
  }[tone];
  return (
    <motion.div
      className="min-w-0"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.05, 0.4), ease: [0.22, 1, 0.36, 1] }}
      whileHover={onClick ? { y: -3 } : undefined}
      whileTap={onClick ? { scale: 0.985 } : undefined}
    >
      <Card
        className={cn(
          "relative h-full min-w-0 overflow-hidden p-4 transition-all duration-200",
          onClick && "cursor-pointer hover:border-primary/40 hover:shadow-[0_0_24px_oklch(0.79_0.135_88/12%)]"
        )}
        onClick={onClick}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      >
        {/* corner gold glow */}
        <div className="pointer-events-none absolute -right-8 -top-12 h-24 w-24 rounded-full bg-primary/10 blur-2xl" aria-hidden />
        <div className="relative flex items-start justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
          {icon ? <span className="text-primary/70">{icon}</span> : null}
        </div>
        <p className={cn("relative mt-1.5 font-display text-[26px] font-semibold leading-none tabular-nums", toneCls)}>
          {typeof value === "number" ? <CountUp value={value} /> : value}
        </p>
        {sub ? <p className="relative mt-1.5 text-[11px] leading-snug text-muted-foreground">{sub}</p> : null}
      </Card>
    </motion.div>
  );
}

/* ── Section card ── */
export function SectionCard({ title, subtitle, right, children, className, bodyClass }: { title: ReactNode; subtitle?: ReactNode; right?: ReactNode; children: ReactNode; className?: string; bodyClass?: string }) {
  return (
    <motion.div
      className="min-w-0"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className={cn("min-w-0", className)}>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 border-b border-border/70 py-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-[13px] font-semibold tracking-wide">
              <span className="inline-block h-3.5 w-0.5 rounded-full bg-primary/70" aria-hidden />
              {title}
            </CardTitle>
            {subtitle ? <p className="mt-1 pl-3 text-xs text-muted-foreground">{subtitle}</p> : null}
          </div>
          {right ? <div className="shrink-0">{right}</div> : null}
        </CardHeader>
        <CardContent className={cn("pt-4", bodyClass)}>{children}</CardContent>
      </Card>
    </motion.div>
  );
}

/* ── Loading / empty / error states ── */
export function LoadingState({ label = "Loading source records…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin text-primary/80" /> {label}
    </div>
  );
}
export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2 py-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  );
}
export function EmptyState({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 py-8 text-center">
      <Database className="h-5 w-5 text-muted-foreground/60" />
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
      {hint ? <p className="text-xs text-muted-foreground/70">{hint}</p> : null}
    </div>
  );
}
export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 py-6 text-sm text-destructive">
      <FileWarning className="h-4 w-4" /> {message}
    </div>
  );
}

/* ── Truthful value with freshness + provenance (Rule 3/9/15) ── */
export function ProvenanceValue({ value, source, at, freshness, className }: { value: ReactNode; source?: string | null; at?: string | null; freshness?: string | null; className?: string }) {
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5", className)}>
      <span className="font-medium">{value}</span>
      {freshness ? <FreshnessBadge value={freshness} /> : null}
      {source ? <span className="text-[10px] text-muted-foreground">src: {source}</span> : null}
      {at ? <span className="text-[10px] text-muted-foreground">as of {fmtDateTime(at)}</span> : null}
    </span>
  );
}

/* ── Formatting helpers ── */
export function fmtDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
}
export function fmtDate(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
export function fmtRelative(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const diffMs = Date.now() - d.getTime();
  const past = diffMs >= 0;
  const m = Math.round(Math.abs(diffMs) / 60000);
  const label = m < 1 ? "now" : m < 60 ? `${m}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`;
  return past ? `${label} ago` : `in ${label}`;
}
export function daysUntil(iso: string | Date | null | undefined): number | null {
  if (!iso) return null;
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}
export function parseArr(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map((x) => (typeof x === "string" ? x : JSON.stringify(x))) : [];
  } catch {
    return [];
  }
}
export function parseObj<T = Record<string, unknown>>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/* ── Scrollable record table wrapper (long lists max-h with scroll) ──
 * Plain overflow-auto clip (NOT Radix ScrollArea): wide tables inside Radix
 * viewports bleed over sibling sections. overflow-auto guarantees clipping
 * in both axes with native gold scrollbars.                            */
export function ScrollTable({ children, maxHeight = "max-h-[420px]" }: { children: ReactNode; maxHeight?: string }) {
  return (
    <div className={cn("w-full overflow-auto rounded-md", maxHeight)}>
      <div className="min-w-full pb-1">{children}</div>
    </div>
  );
}

export { Badge };
