"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Anchor, RadioTower, RefreshCw, Ship, TimerReset } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/client";
import { EmptyState, ErrorState, FreshnessBadge, LoadingState, SectionCard, StatusPill, fmtDate, fmtDateTime } from "@/components/app/shared";
import { LiveClock, fmtCountdown, useNow } from "@/components/app/live-clock";
import { CountUp, PulsingDot } from "@/components/app/motion";
import { cn } from "@/lib/utils";

/* ── API types (mirror /api/shipments, /api/shipments/[ref], /api/audit) ──── */
interface ShipmentLite {
  ref: string;
  status: string;
  mode: string;
  carrier: string | null;
  vesselName: string | null;
  vesselVoyage: string | null;
  originPort: string | null;
  destinationPort: string | null;
  freshness: string;
  displayEta: string | null;
  displayEtaType: string | null;
  supplierPromisedEta: string | null;
  carrierEta: string | null;
  lastEventAt: string | null;
  created: string;
  actualArrival: string | null;
}
interface Milestone {
  id: string;
  code: string;
  label: string;
  location: string | null;
  eventTime: string;
  receivedAt: string | null;
  isEstimated: boolean;
  freshness: string;
  source: string;
  confidence: number | null;
}
interface ShipmentDetail extends ShipmentLite {
  milestones: Milestone[];
  etaPrecedencePolicy: string;
  displayEtaSource: string | null;
}
interface AuditRow {
  id: string;
  at: string;
  actor: string;
  actorType: string;
  action: string;
  entityType: string | null;
  entityRef: string | null;
  previousState: string | null;
  newState: string | null;
  correlationId: string | null;
}

const HOUR = 3_600_000;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/* ── Live countdown chip (ticks every second) ────────────────────────────── */
function EtaCountdown({ target, now, label }: { target: string | null; now: number; label: string }) {
  if (!target) return <span className="text-xs text-muted-foreground">{label}: —</span>;
  const diff = new Date(target).getTime() - now;
  const slipped = diff < 0;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className={cn("font-display text-sm font-semibold tabular-nums", slipped ? "text-rose-400" : "text-primary")}>
        {fmtCountdown(diff)}
      </span>
    </span>
  );
}

/* ── Journey route: time-proportional comet + milestone stations ─────────── */
function JourneyRoute({ detail, now }: { detail: ShipmentDetail; now: number }) {
  const ms = [...detail.milestones].sort((a, b) => +new Date(a.eventTime) - +new Date(b.eventTime));
  const start = ms.length ? +new Date(ms[0].eventTime) : +new Date(detail.created);
  const end = detail.actualArrival ? +new Date(detail.actualArrival) : detail.displayEta ? +new Date(detail.displayEta) : start + 30 * 24 * HOUR;
  const progress = clamp01((now - start) / Math.max(1, end - start));

  const stations = ms
    .map((m) => ({ ...m, pos: clamp01((+new Date(m.eventTime) - start) / Math.max(1, end - start)) * 100 }))
    .filter((m) => Number.isFinite(m.pos));

  return (
    <div className="pt-2">
      {/* ports */}
      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs">
        <span className="font-semibold">{detail.originPort ?? "Origin"}</span>
        <span className="hidden text-[10px] uppercase tracking-widest text-muted-foreground sm:inline">
          {detail.vesselName ?? detail.carrier ?? detail.mode} {detail.vesselVoyage ? `· ${detail.vesselVoyage}` : ""}
        </span>
        <span className="font-semibold">{detail.destinationPort ?? "Destination"}</span>
      </div>

      {/* track */}
      <div className="relative h-12">
        {/* base line (remaining) */}
        <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full border-b border-dashed border-zinc-500/40 dark:border-zinc-400/20" />
        {/* traveled line (gold gradient, grows in real time) */}
        <div
          className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-gradient-to-r from-[#8a6a1f] via-[#d4af37] to-[#f3dc8e] shadow-[0_0_12px_oklch(0.79_0.135_88/45%)]"
          style={{ width: `${progress * 100}%` }}
        />
        {/* milestone stations */}
        {stations.map((s) => {
          const done = +new Date(s.eventTime) <= now;
          return (
            <div
              key={s.id}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${s.pos}%` }}
              title={`${s.label} — ${fmtDateTime(s.eventTime)}${s.isEstimated ? " (estimated)" : ""}`}
            >
              <span
                className={cn(
                  "block h-3 w-3 rounded-full border-2",
                  done
                    ? "border-primary bg-primary shadow-[0_0_10px_oklch(0.79_0.135_88/70%)]"
                    : "border-zinc-400/50 bg-background"
                )}
              />
            </div>
          );
        })}
        {/* destination node */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2">
          <Anchor className={cn("h-4 w-4", progress >= 1 ? "text-primary" : "text-muted-foreground/60")} />
        </div>
        {/* comet — time-proportional, drifts slowly with real time */}
        <div
          className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${progress * 100}%` }}
        >
          <div className="relative">
            <span className="absolute -inset-3 -z-10 animate-pulse rounded-full bg-primary/25 blur-md" aria-hidden />
            <span className="relative block h-4 w-4 rounded-full bg-gradient-to-br from-[#f3dc8e] to-[#b8860b] shadow-[0_0_18px_oklch(0.79_0.135_88/80%)] ring-2 ring-background" />
            <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] tabular-nums text-primary">
              {(progress * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* route meta */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span>
          departed booking <span className="tabular-nums text-foreground">{fmtDate(ms.length ? ms[0].eventTime : detail.created)}</span>
        </span>
        <span>
          ETA <span className="tabular-nums text-foreground">{fmtDate(detail.displayEta)}</span>
          {detail.displayEtaType ? <span className="ml-1.5 rounded border border-primary/30 bg-primary/10 px-1 py-px text-[9px] font-semibold uppercase tracking-wide text-primary">{detail.displayEtaType}</span> : null}
        </span>
      </div>
    </div>
  );
}

/* ── 24-hour strip: hour ticks update live, NOW cursor slides slowly ─────── */
function HourStrip({ shipments, focusRef, now }: { shipments: ShipmentLite[]; focusRef: string | null; now: number }) {
  const windowStart = Math.floor(now / HOUR) * HOUR;
  const etaMarkers = shipments
    .filter((s) => s.displayEta)
    .map((s) => ({ ref: s.ref, t: +new Date(s.displayEta as string) }))
    .filter((m) => m.t >= windowStart && m.t <= windowStart + 24 * HOUR);

  const hours = Array.from({ length: 25 }, (_, i) => new Date(windowStart + i * HOUR));

  return (
    <div className="pt-1">
      <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>next 24 hours</span>
        <span className="normal-case tracking-normal">gold markers = arrival ETA within window</span>
      </div>
      <div className="relative h-14 overflow-hidden rounded-lg border border-border/70 bg-muted/30">
        {/* hour grid */}
        <div className="absolute inset-0 flex">
          {hours.slice(0, 24).map((h, i) => (
            <div key={i} className="relative flex-1 border-r border-border/40 last:border-r-0">
              <span className={cn("absolute bottom-1 left-1 text-[9px] tabular-nums text-muted-foreground", i % 3 !== 0 && "hidden sm:inline")}>
                {String(h.getHours()).padStart(2, "0")}:00
              </span>
            </div>
          ))}
        </div>
        {/* ETA markers */}
        {etaMarkers.map((m) => (
          <div
            key={m.ref}
            className="absolute top-2 -translate-x-1/2"
            style={{ left: `${clamp01((m.t - windowStart) / (24 * HOUR)) * 100}%` }}
            title={`${m.ref} ETA ${fmtDateTime(new Date(m.t).toISOString())}`}
          >
            <span
              className={cn(
                "block h-2.5 w-2.5 rotate-45 border",
                m.ref === focusRef
                  ? "border-primary bg-primary shadow-[0_0_10px_oklch(0.79_0.135_88/80%)]"
                  : "border-primary/40 bg-primary/30"
              )}
            />
          </div>
        ))}
        {/* NOW cursor — key on hour so it flashes softly on each hour update */}
        <motion.div
          key={new Date(windowStart).getHours()}
          className="absolute inset-y-0 z-10"
          style={{ left: `${clamp01((now - windowStart) / (24 * HOUR)) * 100}%` }}
          initial={{ opacity: 0.4 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2 }}
        >
          <div className="relative h-full w-px bg-primary/70 shadow-[0_0_8px_oklch(0.79_0.135_88/60%)]">
            <span className="absolute top-1 left-1/2 -translate-x-1/2 rounded-sm bg-primary px-1 text-[8px] font-bold text-primary-foreground">NOW</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* ── Live event stream (real audit records, replayed on a live cadence) ──── */
function EventStream({ events, now }: { events: AuditRow[]; now: number }) {
  const [cursor, setCursor] = useState(0);
  const len = events.length;
  useEffect(() => {
    if (len <= 6) return;
    const id = setInterval(() => setCursor((c) => c + 1), 4000);
    return () => clearInterval(id);
  }, [len]);

  const visible = useMemo(() => {
    if (len === 0) return [];
    const take = Math.min(6, len);
    return Array.from({ length: take }, (_, i) => events[(cursor + i) % len]);
  }, [cursor, events, len]);

  if (len === 0) return <EmptyState message="No audit events yet" />;

  return (
    <div className="flex flex-col gap-2">
      <AnimatePresence mode="popLayout" initial={false}>
        {visible.map((e) => (
          <motion.div
            key={`${cursor}-${e.id}`}
            layout
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -28 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-lg border border-border/70 bg-card/60 px-3 py-2"
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
              <span className="tabular-nums text-muted-foreground">
                {new Date(e.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
              </span>
              <span
                className={cn(
                  "rounded px-1 py-px text-[9px] font-bold uppercase tracking-wide",
                  e.actorType === "USER"
                    ? "bg-primary/15 text-primary"
                    : e.actorType === "SERVICE"
                      ? "bg-teal-400/15 text-teal-300"
                      : "bg-zinc-400/15 text-zinc-300"
                )}
              >
                {e.actorType}
              </span>
              <span className="font-mono text-[11px] font-bold">{e.action}</span>
              {e.entityRef ? <span className="font-mono text-muted-foreground">{e.entityType} {e.entityRef}</span> : null}
              {e.previousState || e.newState ? (
                <span className="tabular-nums">
                  {e.previousState ? <span className="text-rose-400/80">{e.previousState.replaceAll("_", " ")}</span> : <span className="text-muted-foreground">—</span>}
                  <span className="mx-1 text-muted-foreground">→</span>
                  {e.newState ? <span className="text-emerald-400">{e.newState.replaceAll("_", " ")}</span> : <span className="text-muted-foreground">—</span>}
                </span>
              ) : null}
              <span className="ml-auto text-[10px] tabular-nums text-muted-foreground/70">
                {Math.max(0, Math.round((now - +new Date(e.at)) / 60000))}m ago
              </span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      <p className="text-[10px] italic text-muted-foreground">real audit records · replayed on a live cadence · append-only (M22)</p>
    </div>
  );
}

/* ── Fleet strip: every active shipment with ticking countdown ───────────── */
function FleetCard({ s, now, active, onClick }: { s: ShipmentLite; now: number; active: boolean; onClick: () => void }) {
  const start = +new Date(s.lastEventAt ?? s.created);
  const end = s.actualArrival ? +new Date(s.actualArrival) : s.displayEta ? +new Date(s.displayEta) : start;
  const progress = clamp01((now - start) / Math.max(1, end - start));
  const slipped = !!(s.carrierEta && s.supplierPromisedEta && +new Date(s.carrierEta) > +new Date(s.supplierPromisedEta));

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "group relative w-[240px] shrink-0 rounded-xl border p-3 text-left transition-all duration-300",
        active
          ? "border-primary/60 bg-primary/10 shadow-[0_0_24px_oklch(0.79_0.135_88/15%)]"
          : "border-border/70 bg-card/60 hover:border-primary/35 hover:bg-card"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs font-bold">{s.ref}</span>
        <StatusPill value={s.status} />
      </div>
      <p className="mt-1 truncate text-[11px] text-muted-foreground">
        {s.originPort?.split(",").pop()?.trim() ?? "?"} → {s.destinationPort?.split(",").pop()?.trim() ?? "?"}
        {s.vesselName ? <span className="ml-1 text-primary/70">· {s.vesselName}</span> : null}
      </p>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#8a6a1f] via-[#d4af37] to-[#f3dc8e]"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <EtaCountdown target={s.displayEta} now={now} label="eta" />
        {slipped ? <span className="text-[9px] font-bold text-rose-400">SLIP</span> : null}
      </div>
    </button>
  );
}

/* ── View ────────────────────────────────────────────────────────────────── */
export function LiveTraceabilityView({ drillRef }: { drillRef?: string | null }) {
  const { data: shipments, loading, error, refresh, syncedAt } = useApi<ShipmentLite[]>("/api/shipments", [], 60_000);
  const now = useNow(1000); // number | null — ticks every second

  const list = shipments ?? [];
  const [picked, setPicked] = useState<string | null>(null);
  const focus = picked ?? drillRef ?? list.find((s) => s.status === "IN_TRANSIT")?.ref ?? list[0]?.ref ?? null;
  const { data: detail } = useApi<ShipmentDetail>(focus ? `/api/shipments/${focus}` : null, [focus]);

  const { data: audit } = useApi<AuditRow[]>("/api/audit", [], 60_000);
  // derived sync pulse — no effect state needed (view re-renders every second)
  const syncPulse = now !== null && syncedAt > 0 && now - syncedAt < 1200;

  const upcoming = useMemo(() => {
    if (!detail || now === null) return [];
    return [...detail.milestones]
      .filter((m) => +new Date(m.eventTime) > now)
      .sort((a, b) => +new Date(a.eventTime) - +new Date(b.eventTime))
      .slice(0, 3);
  }, [detail, now]);

  const lastDone = useMemo(() => {
    if (!detail || now === null) return null;
    const done = detail.milestones.filter((m) => +new Date(m.eventTime) <= now).sort((a, b) => +new Date(b.eventTime) - +new Date(a.eventTime));
    return done[0] ?? null;
  }, [detail, now]);

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-xl font-semibold tracking-wide">Live Traceability</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
            <PulsingDot /> Live
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LiveClock
            prefix="ops time"
            className="rounded-md border border-border/70 bg-card/60 px-2.5 py-1 text-xs font-semibold"
          />
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-semibold transition-colors duration-700",
              syncPulse ? "border-primary/60 bg-primary/15 text-primary" : "border-border/70 bg-card/60 text-muted-foreground"
            )}
          >
            <RadioTower className="h-3 w-3" /> auto-sync 60s
          </span>
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="h-4 w-4" /> Sync now
          </Button>
        </div>
      </div>

      {loading && !shipments ? <LoadingState label="Linking to live feeds…" /> : null}
      {error ? <ErrorState message={error} /> : null}

      {list.length === 0 && !loading ? <EmptyState message="No shipments to trace" /> : null}

      {!now ? <LoadingState label="Starting operational clock…" /> : null}

      {/* fleet strip */}
      {list.length > 0 && now ? (
        <div className="relative">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {list.map((s) => (
              <FleetCard key={s.ref} s={s} now={now} active={s.ref === focus} onClick={() => setPicked(s.ref)} />
            ))}
          </div>
        </div>
      ) : null}

      {/* journey + stream */}
      {now ? (
        <div className="grid gap-4 xl:grid-cols-[1fr_400px]">
        <SectionCard
          title={
            <span className="inline-flex items-center gap-2">
              <Ship className="h-3.5 w-3.5 text-primary/70" /> Journey — {focus ?? "no focus"}
            </span>
          }
          subtitle="position is time-proportional to the evidenced route — it drifts slowly, in real time"
        >
          {detail ? (
            <div className="space-y-5">
              <JourneyRoute detail={detail} now={now} />

              {/* big ETA countdown */}
              <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-transparent to-transparent p-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Arrival countdown</p>
                  <p className="mt-1 font-display text-4xl font-bold tabular-nums text-gold-grad">
                    {detail.displayEta ? fmtCountdown(+new Date(detail.displayEta) - now) : "—"}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    ETA {fmtDateTime(detail.displayEta)} · source {detail.displayEtaSource ?? "—"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 text-right">
                  <EtaCountdown target={detail.supplierPromisedEta} now={now} label="supplier promise" />
                  <FreshnessBadge value={detail.freshness} />
                  {detail.carrierEta && detail.supplierPromisedEta && +new Date(detail.carrierEta) > +new Date(detail.supplierPromisedEta) ? (
                    <span className="rounded border border-rose-400/25 bg-rose-400/10 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">ETA SLIPPED vs PROMISE</span>
                  ) : null}
                </div>
              </div>

              {/* hour strip */}
              <HourStrip shipments={list} focusRef={focus} now={now} />

              {/* milestone rail */}
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg border border-border/70 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Last completed</p>
                  {lastDone ? (
                    <div className="mt-1.5 text-sm">
                      <p className="font-medium">{lastDone.label} <span className="ml-1 text-xs text-muted-foreground">{lastDone.location}</span></p>
                      <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                        event {fmtDateTime(lastDone.eventTime)} · received {fmtDateTime(lastDone.receivedAt)}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-1.5 text-xs text-muted-foreground">none yet</p>
                  )}
                </div>
                <div className="rounded-lg border border-border/70 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Upcoming</p>
                  <div className="mt-1.5 flex flex-col gap-1.5">
                    {upcoming.length === 0 ? (
                      <p className="text-xs text-muted-foreground">no estimated milestones ahead</p>
                    ) : (
                      upcoming.map((m) => (
                        <div key={m.id} className="flex items-center justify-between gap-2 text-xs">
                          <span className="truncate font-medium">{m.label}</span>
                          <span className="whitespace-nowrap font-mono text-[11px] tabular-nums text-primary">{fmtCountdown(+new Date(m.eventTime) - now)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <LoadingState label="Loading journey…" />
          )}
        </SectionCard>

        {/* live stream + stats */}
        <div className="space-y-4">
          <SectionCard
            title={
              <span className="inline-flex items-center gap-2">
                <TimerReset className="h-3.5 w-3.5 text-primary/70" /> Live event stream
              </span>
            }
            subtitle="audit trail replayed as it happened"
          >
            <EventStream events={audit ?? []} now={now} />
          </SectionCard>

          <SectionCard title="Network pulse" subtitle="operational snapshot, refreshed every 60 s">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border/70 p-3 text-center">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">In transit</p>
                <p className="mt-1 font-display text-3xl font-semibold text-primary tabular-nums">
                  <CountUp value={list.filter((s) => s.status === "IN_TRANSIT").length} />
                </p>
              </div>
              <div className="rounded-lg border border-border/70 p-3 text-center">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Fresh feeds</p>
                <p className="mt-1 font-display text-3xl font-semibold text-emerald-400 tabular-nums">
                  <CountUp value={list.filter((s) => s.freshness === "fresh").length} />
                </p>
              </div>
              <div className="col-span-2 rounded-lg border border-border/70 p-3 text-center">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Tracing</p>
                <p className="mt-1 font-display text-3xl font-semibold tabular-nums">
                  <CountUp value={list.length} />
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  synced {syncedAt ? `${Math.max(0, Math.round((now - syncedAt) / 1000))}s ago` : "—"}
                </p>
              </div>
            </div>
          </SectionCard>
        </div>
        </div>
      ) : null}
    </div>
  );
}
