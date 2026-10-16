"use client";

import { useMemo, useState } from "react";
import { Anchor, Container as ContainerIcon, FileText, MapPin, Plane, Ship, Siren, Truck } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { useApi } from "@/lib/client";
import { useAppStore } from "@/lib/app-state";
import {
  CaseStateBadge,
  EmptyState,
  ErrorState,
  FreshnessBadge,
  LoadingState,
  SectionCard,
  SeverityBadge,
  StatusPill,
  fmtDate,
  fmtDateTime,
  fmtRelative,
} from "@/components/app/shared";

/* ── payload types (mirror /api/shipments include) ─────────────────────────── */
interface LegRow {
  id: string;
  seq: number;
  mode: string;
  fromPoint: string | null;
  toPoint: string | null;
  status: string;
  carrier: string | null;
}
interface ContainerRow {
  id: string;
  containerNo: string | null;
  sizeType: string | null;
  sealNo: string | null;
  packageCount: number | null;
  identityStatus: string;
  identitySource: string | null;
  note: string | null;
}
interface EtaObsRow {
  id: string;
  estimateType: string;
  sourceName: string;
  etaValue: string | null;
  etaRangeFrom: string | null;
  etaRangeTo: string | null;
  calculatedAt: string;
  confidence: number | null;
  inputLineage: string | null;
  isActive: boolean;
  note: string | null;
}
interface MilestoneRow {
  id: string;
  code: string;
  label: string;
  location: string | null;
  eventTime: string;
  receivedAt: string;
  source: string;
  isEstimated: boolean;
  freshness: string;
  confidence: number | null;
  correctedByEventId: string | null;
  note: string | null;
}
interface DocRow {
  id: string;
  docType: string;
  refNo: string | null;
  issuer: string | null;
  note: string | null;
}
interface ShipmentRow {
  id: string;
  ref: string;
  importFileRef: string | null;
  mode: string;
  status: string;
  carrier: string | null;
  forwarder: string | null;
  originPort: string | null;
  destinationPort: string | null;
  supplierPromisedEta: string | null;
  carrierEtaFreshness: string;
  etaPrecedencePolicy: string;
  displayEta: string | null;
  displayEtaSource: string | null;
  displayEtaType: string | null;
  vesselName: string | null;
  vesselVoyage: string | null;
  vesselPositionLat: number | null;
  vesselPositionLng: number | null;
  vesselPositionAt: string | null;
  vesselSource: string | null;
  vesselLinkEvidence: string | null;
  lastEventAt: string | null;
  freshness: string;
  customsStatus: string | null;
  supplier: { code: string; name: string } | null;
  po: { ref: string } | null;
  legs: LegRow[];
  containers: ContainerRow[];
  bols: { id: string; bolNo: string; version: number; isActive: boolean; status: string }[];
  etaObservations: EtaObsRow[];
  milestones: MilestoneRow[];
  documents?: DocRow[];
  exceptionCases: { id: string; ref: string; state: string; severity: string; title: string }[];
}

/* ── small local atoms ─────────────────────────────────────────────────────── */
const CHIP =
  "inline-flex items-center whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide";
const ZINC_CHIP = `${CHIP} border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-400/25 dark:bg-zinc-900 dark:text-zinc-300`;
const ROSE_CALLOUT =
  "rounded-md border border-rose-300 bg-rose-50 p-2 text-[11px] leading-relaxed text-rose-800 dark:border-rose-400/25 dark:bg-rose-400/10/50 dark:text-rose-300";
const SCROLL =
  "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-300 [&::-webkit-scrollbar-track]:bg-transparent dark:[&::-webkit-scrollbar-thumb]:bg-zinc-700";

function ModeIcon({ mode }: { mode: string }) {
  const m = (mode ?? "").toUpperCase();
  if (m === "AIR") return <Plane className="h-3.5 w-3.5 text-zinc-500" aria-label="Air freight" />;
  if (m === "ROAD") return <Truck className="h-3.5 w-3.5 text-zinc-500" aria-label="Road freight" />;
  return <Ship className="h-3.5 w-3.5 text-zinc-500" aria-label="Ocean freight" />;
}

/** ETA estimate type badge — violet for manual (never imply authority), teal for model (Rule 15). */
function EtaTypeBadge({ type }: { type: string }) {
  const t = (type ?? "").toLowerCase();
  const cls =
    t === "manual"
      ? "border-violet-300 bg-violet-100 text-violet-800 dark:border-violet-400/25 dark:bg-violet-400/10 dark:text-violet-300"
      : t === "model"
        ? "border-teal-300 bg-teal-100 text-teal-800 dark:border-teal-400/25 dark:bg-teal-400/10 dark:text-teal-300"
        : ZINC_CHIP;
  return <span className={`${CHIP} ${cls}`}>{t || "unknown"}</span>;
}

/** Identity status colors per spec: RESOLVED emerald / UNRESOLVED rose / MISSING rose. */
function identityPillCls(status: string): string {
  if (status === "RESOLVED")
    return "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-300";
  return "border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-300";
}

/** Vessel position recency — stale when older than 12 h (M11 cadence). */
function vesselFreshness(at: string | null | undefined): string {
  if (!at) return "unavailable";
  const hrs = (Date.now() - new Date(at).getTime()) / 3_600_000;
  if (Number.isNaN(hrs)) return "unavailable";
  if (hrs <= 6) return "fresh";
  if (hrs <= 12) return "aging";
  return "stale";
}

function slipDays(displayEta: string | null, promised: string | null): number | null {
  if (!displayEta || !promised) return null;
  const ms = new Date(displayEta).getTime() - new Date(promised).getTime();
  if (!(ms > 0)) return null;
  return Math.ceil(ms / 86_400_000);
}

const DOT: Record<string, string> = {
  fresh: "bg-emerald-500",
  aging: "bg-amber-500",
  stale: "bg-orange-500",
  unavailable: "bg-zinc-400",
};

/* ── view ──────────────────────────────────────────────────────────────────── */
export function ImportTrackingView({ drillRef }: { drillRef?: string | null }) {
  const { data, loading, error } = useApi<ShipmentRow[]>("/api/shipments");
  const drillTo = useAppStore((s) => s.drillTo);
  const shipments = useMemo(() => data ?? [], [data]);
  /** user pick tagged with the drill context it was made in — a NEW drillRef supersedes it */
  const [pick, setPick] = useState<{ id: string; atDrill: string | null } | null>(null);

  // Fully derived selection (no effects): drill ref > valid user pick > SHP-8802 story > first record.
  const selected = useMemo(() => {
    if (pick && pick.atDrill === (drillRef ?? null)) {
      const picked = shipments.find((s) => s.id === pick.id);
      if (picked) return picked;
    }
    const byDrill = drillRef ? shipments.find((s) => s.ref === drillRef) : undefined;
    return byDrill ?? shipments.find((s) => s.ref === "SHP-8802") ?? shipments[0] ?? null;
  }, [shipments, drillRef, pick]);

  if (loading) return <LoadingState label="Loading shipments, milestones and ETA provenance…" />;
  if (error) return <ErrorState message={`Failed to load shipments: ${error}`} />;

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[380px_1fr]">
      {/* ── master list ── */}
      <section aria-label="Shipment list" className="rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Import shipments</h2>
          <span className="text-xs tabular-nums text-muted-foreground">{shipments.length} records</span>
        </div>
        <div className={`max-h-[460px] overflow-y-auto p-2 xl:max-h-[calc(100vh-140px)] ${SCROLL}`}>
          {shipments.length === 0 ? (
            <EmptyState message="No shipments found" />
          ) : (
            <ul className="space-y-1.5">
              {shipments.map((s) => {
                const slip = slipDays(s.displayEta, s.supplierPromisedEta);
                const isSel = s.id === selected?.id;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setPick({ id: s.id, atDrill: drillRef ?? null })}
                      aria-current={isSel ? "true" : undefined}
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${
                        isSel
                          ? "border-zinc-500 bg-muted/70 dark:border-zinc-300"
                          : "border-transparent hover:border-zinc-300 hover:bg-muted/40 dark:hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <ModeIcon mode={s.mode} />
                        <span className="font-mono text-sm font-bold">{s.ref}</span>
                        <span className="ml-auto flex items-center gap-1.5">
                          <StatusPill value={s.status} />
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {s.originPort ?? "?"} → {s.destinationPort ?? "?"}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] tabular-nums text-muted-foreground">
                          ETA {s.displayEta ? fmtDate(s.displayEta) : "—"}
                          {s.supplierPromisedEta ? ` · promised ${fmtDate(s.supplierPromisedEta)}` : ""}
                        </span>
                        {slip != null && (
                          <span className={`${CHIP} border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-300`}>
                            +{slip}d slip
                          </span>
                        )}
                        <FreshnessBadge value={s.freshness} />
                        {s.exceptionCases.length > 0 && (
                          <span className={`${CHIP} border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-400/25 dark:bg-rose-400/10/60 dark:text-rose-300`}>
                            <Siren className="mr-1 h-3 w-3" aria-hidden />
                            {s.exceptionCases.length} exception{s.exceptionCases.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* ── detail ── */}
      <section aria-label="Shipment detail" className="space-y-4">
        {!selected ? (
          <EmptyState message="Select a shipment" hint="Choose a shipment from the list to inspect provenance, milestones and exceptions." />
        ) : (
          <ShipmentDetail s={selected} onDrill={(view, ref) => drillTo(view, ref)} />
        )}
      </section>
    </div>
  );
}

/* ── detail panel ──────────────────────────────────────────────────────────── */
type ViewName = Parameters<ReturnType<typeof useAppStore.getState>["drillTo"]>[0];

function ShipmentDetail({ s, onDrill }: { s: ShipmentRow; onDrill: (v: ViewName, ref?: string) => void }) {
  const slip = slipDays(s.displayEta, s.supplierPromisedEta);
  const hasModelEta = s.etaObservations.some((o) => o.estimateType.toLowerCase() === "model");
  const documents = s.documents ?? [];
  const milestones = [...s.milestones].sort((a, b) => new Date(a.eventTime).getTime() - new Date(b.eventTime).getTime());
  const manualCustoms = (s.customsStatus ?? "").toLowerCase().includes("manually reported");

  return (
    <>
      {/* a) header */}
      <SectionCard
        title={<span className="font-mono">{s.ref}</span>}
        subtitle="Import tracking — provenance and freshness shown per source (M10/M11)"
        right={
          <span className="flex flex-wrap items-center justify-end gap-1.5">
            <StatusPill value={s.status} />
            <FreshnessBadge value={s.freshness} />
          </span>
        }
      >
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Route</dt>
            <dd className="text-sm">
              {s.originPort ?? "—"} <span className="text-zinc-400">→</span> {s.destinationPort ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Carrier / Forwarder</dt>
            <dd className="text-sm">
              {s.carrier ?? "—"}
              <span className="text-zinc-400"> · </span>
              {s.forwarder ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">PO</dt>
            <dd className="text-sm">
              {s.po ? (
                <button type="button" className="font-medium text-teal-700 underline-offset-2 hover:underline dark:text-teal-400" onClick={() => onDrill("procurement", s.po?.ref)}>
                  {s.po.ref}
                </button>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Supplier</dt>
            <dd className="text-sm">{s.supplier ? `${s.supplier.code} — ${s.supplier.name}` : "—"}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Import file ref</dt>
            <dd className="font-mono text-xs">{s.importFileRef ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Customs status</dt>
            <dd className="flex flex-wrap items-center gap-1.5 text-sm">
              {s.customsStatus ? (
                <>
                  <span className="text-xs">{s.customsStatus}</span>
                  {manualCustoms && (
                    <span className={`${CHIP} border-violet-300 bg-violet-100 text-violet-800 dark:border-violet-400/25 dark:bg-violet-400/10 dark:text-violet-300`}>
                      MANUAL SOURCE — never imply clearance
                    </span>
                  )}
                </>
              ) : (
                <span className="text-xs text-muted-foreground">not reported</span>
              )}
            </dd>
          </div>
          {s.bols.length > 0 && (
            <div className="sm:col-span-2">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Bills of lading</dt>
              <dd className="flex flex-wrap gap-1.5">
                {s.bols.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    title={`Open ${b.bolNo} in BOL Intelligence`}
                    onClick={() => onDrill("bol-intelligence", b.bolNo)}
                    className={`${CHIP} border-zinc-300 bg-zinc-100 font-mono text-zinc-700 hover:bg-zinc-200 dark:border-zinc-400/25 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800`}
                  >
                    {b.bolNo} v{b.version}
                    {!b.isActive && " (superseded)"}
                  </button>
                ))}
              </dd>
            </div>
          )}
        </dl>
      </SectionCard>

      {/* b) ETA provenance (M11) */}
      <SectionCard
        title="ETA provenance (M11)"
        subtitle="Separate values per source — precedence is visible, never silent"
        right={
          <code className="rounded-md border border-zinc-300 bg-zinc-100 px-2 py-1 font-mono text-[10px] font-semibold text-zinc-700 dark:border-zinc-400/25 dark:bg-zinc-900 dark:text-zinc-300">
            {s.etaPrecedencePolicy}
          </code>
        }
      >
        <div className="rounded-lg border bg-muted/40 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Display ETA</span>
            <span className="text-lg font-bold tabular-nums">{s.displayEta ? fmtDate(s.displayEta) : "not enough data"}</span>
            {s.displayEtaType ? <EtaTypeBadge type={s.displayEtaType} /> : null}
            <FreshnessBadge value={s.carrierEtaFreshness} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {s.displayEtaSource ? <span>src: {s.displayEtaSource}</span> : <span>src: —</span>}
            {s.supplierPromisedEta && (
              <span className="tabular-nums">
                supplier promised {fmtDate(s.supplierPromisedEta)}
                {slip != null && (
                  <span className={`ml-1.5 ${CHIP} border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-300`}>
                    +{slip}d slip vs PO commitment
                  </span>
                )}
              </span>
            )}
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {s.etaObservations.length === 0 ? (
            <EmptyState message="No ETA observations recorded" />
          ) : (
            s.etaObservations.map((o) => (
              <div key={o.id} className="rounded-lg border p-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <EtaTypeBadge type={o.estimateType} />
                  <span className="text-xs font-medium">{o.sourceName}</span>
                  <span className="ml-auto">
                    <span className={`${CHIP} ${o.isActive ? "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-300" : ZINC_CHIP}`}>
                      {o.isActive ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tabular-nums">
                  <span>
                    <span className="text-muted-foreground">ETA:</span>{" "}
                    <span className={`font-semibold ${o.etaValue ? "" : "italic text-muted-foreground"}`}>
                      {o.etaValue ? fmtDate(o.etaValue) : "not enough data"}
                    </span>
                  </span>
                  {o.etaRangeTo && (
                    <span className="text-muted-foreground">
                      range: {fmtDate(o.etaRangeFrom ?? o.etaValue)} – {fmtDate(o.etaRangeTo)}
                    </span>
                  )}
                  <span className="text-muted-foreground">calc {fmtRelative(o.calculatedAt)}</span>
                  {o.confidence != null && <span className="text-muted-foreground">conf {o.confidence.toFixed(2)}</span>}
                </div>
                {o.inputLineage && <p className="mt-1 text-[11px] text-muted-foreground">{o.inputLineage}</p>}
                {o.note && <p className="mt-0.5 text-[11px] italic text-muted-foreground">{o.note}</p>}
              </div>
            ))
          )}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          All ETA observations retained — never silently overwrite one source with another (Rule 9/M11).
        </p>
        {hasModelEta && (
          <p className="mt-1 text-[11px] text-teal-700 dark:text-teal-400">Forecast with uncertainty — not a guaranteed arrival (Rule 15).</p>
        )}
      </SectionCard>

      {/* c) vessel vs container */}
      <SectionCard title="Vessel vs container identity" subtitle="AIS vessel position is never claimed as container position (Rule 4 / M09)">
        <div className="grid gap-4 md:grid-cols-2">
          {/* vessel block */}
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Anchor className="h-4 w-4 text-zinc-500" aria-hidden />
              <h3 className="text-xs font-bold uppercase tracking-wide">Vessel</h3>
            </div>
            <p className="mt-2 text-sm font-semibold">
              {s.vesselName ?? "No vessel reported"}
              {s.vesselVoyage ? <span className="ml-1 font-mono text-xs font-normal text-muted-foreground">/ {s.vesselVoyage}</span> : null}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs tabular-nums">
              {s.vesselPositionLat != null && s.vesselPositionLng != null ? (
                <span>
                  position {s.vesselPositionLat.toFixed(2)}, {s.vesselPositionLng.toFixed(2)}
                </span>
              ) : (
                <span className="italic text-muted-foreground">no position reported</span>
              )}
              <FreshnessBadge value={vesselFreshness(s.vesselPositionAt)} />
              {s.vesselPositionAt && <span className="text-muted-foreground">at {fmtDateTime(s.vesselPositionAt)}</span>}
            </div>
            {s.vesselSource && <p className="mt-1 text-[11px] text-muted-foreground">src: {s.vesselSource}</p>}
            {s.vesselLinkEvidence ? (
              <p className="mt-2 text-[11px] leading-relaxed">
                <span className="font-semibold">Link evidence:</span> <span className="text-muted-foreground">{s.vesselLinkEvidence}</span>
              </p>
            ) : (
              <div className={`${ROSE_CALLOUT} mt-2`}>
                No evidenced container-to-vessel relationship — vessel position cannot be attributed to the container (Rule 4).
              </div>
            )}
          </div>

          {/* container block */}
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <ContainerIcon className="h-4 w-4 text-zinc-500" aria-hidden />
              <h3 className="text-xs font-bold uppercase tracking-wide">Containers</h3>
            </div>
            {s.containers.length === 0 ? (
              <p className="mt-2 text-xs italic text-muted-foreground">No containers recorded (e.g. LCL / break-bulk without container visibility).</p>
            ) : (
              <div className="mt-2 space-y-3">
                {s.containers.map((c) => {
                  const unresolved = c.identityStatus !== "RESOLVED";
                  return (
                    <div key={c.id} className="rounded-md border bg-muted/30 p-2.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`font-mono text-sm font-bold ${c.containerNo ? "" : "text-rose-700 dark:text-rose-400"}`}>
                          {c.containerNo ?? "MISSING"}
                        </span>
                        <StatusPill value={c.identityStatus} className={identityPillCls(c.identityStatus)} />
                      </div>
                      <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
                        {c.sizeType ?? "size/type —"} · seal {c.sealNo ?? "—"}
                        {c.packageCount != null ? ` · ${c.packageCount} packages` : ""}
                      </p>
                      <p className="text-[11px] text-muted-foreground">identity source: {c.identitySource ?? "none — unresolved"}</p>
                      {c.note && <p className="mt-1 text-[11px] italic text-muted-foreground">{c.note}</p>}
                      {unresolved && (
                        <div className={`${ROSE_CALLOUT} mt-2`}>
                          Container location unresolved — tracking starts only when a valid provider identifier/feed is available (M09/M11).
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      {/* d) milestone timeline */}
      <SectionCard title="Milestone timeline" subtitle="Event time and ingestion (received) time shown separately — corrections preserved">
        {s.freshness === "stale" && (
          <div className="mb-3 rounded-md border border-orange-300 bg-orange-50 p-2.5 text-xs leading-relaxed text-orange-900 dark:border-orange-400/25 dark:bg-orange-400/10/50 dark:text-orange-300">
            Carrier data STALE — last successful sync {fmtDateTime(s.lastEventAt)}. Last-known values shown; provider outage — bounded retries queued
            (failure matrix row 1).
          </div>
        )}
        {milestones.length === 0 ? (
          <EmptyState message="No milestones recorded" />
        ) : (
          <ol className={`max-h-[460px] space-y-4 overflow-y-auto border-l border-zinc-200 pl-5 ml-2 dark:border-zinc-800 ${SCROLL}`}>
            {milestones.map((m) => (
              <li key={m.id} className="relative">
                <span
                  className={`absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-card ${DOT[m.freshness] ?? DOT.unavailable}`}
                  aria-hidden
                />
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-medium">{m.label}</span>
                  <span className={`${CHIP} border-zinc-300 bg-zinc-100 font-mono text-zinc-600 dark:border-zinc-400/25 dark:bg-zinc-900 dark:text-zinc-400`}>
                    {m.code}
                  </span>
                  {m.isEstimated && (
                    <span className={`${CHIP} border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300`}>
                      ESTIMATED
                    </span>
                  )}
                  <FreshnessBadge value={m.freshness} />
                </div>
                {m.location && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" aria-hidden /> {m.location}
                  </p>
                )}
                <p className="mt-1 text-xs tabular-nums">
                  <span className="text-muted-foreground">event:</span> <span className="font-semibold">{fmtDateTime(m.eventTime)}</span>
                  <span className="mx-2 text-zinc-300 dark:text-zinc-700">|</span>
                  <span className="text-muted-foreground">received:</span> <span className="font-semibold">{fmtDateTime(m.receivedAt)}</span>
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className={`${CHIP} border-zinc-300 bg-zinc-100 font-mono text-zinc-600 dark:border-zinc-400/25 dark:bg-zinc-900 dark:text-zinc-400`}>
                    {m.source}
                  </span>
                  {m.confidence != null && (
                    <span className="text-[10px] tabular-nums text-muted-foreground">conf {m.confidence.toFixed(2)}</span>
                  )}
                  {m.correctedByEventId && (
                    <span className={`${CHIP} border-teal-300 bg-teal-100 font-mono text-teal-800 dark:border-teal-400/25 dark:bg-teal-400/10 dark:text-teal-300`}>
                      corrects {m.correctedByEventId}
                    </span>
                  )}
                </div>
                {m.note && <p className="mt-1 text-xs italic text-muted-foreground">{m.note}</p>}
              </li>
            ))}
          </ol>
        )}
      </SectionCard>

      {/* e) legs + documents */}
      <SectionCard title="Legs & documents" subtitle="Route legs and import dossier documents">
        {s.legs.length === 0 ? (
          <p className="py-2 text-xs italic text-muted-foreground">No legs recorded for this shipment.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-8 text-[10px] uppercase">Seq</TableHead>
                <TableHead className="h-8 text-[10px] uppercase">Mode</TableHead>
                <TableHead className="h-8 text-[10px] uppercase">From → To</TableHead>
                <TableHead className="h-8 text-[10px] uppercase">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.legs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="py-1.5 text-xs tabular-nums">{l.seq}</TableCell>
                  <TableCell className="py-1.5">
                    <span className="flex items-center gap-1 text-xs">
                      <ModeIcon mode={l.mode} /> {l.mode}
                    </span>
                  </TableCell>
                  <TableCell className="py-1.5 text-xs">
                    {l.fromPoint ?? "—"} <span className="text-zinc-400">→</span> {l.toPoint ?? "—"}
                    {l.carrier ? <span className="ml-1 text-muted-foreground">({l.carrier})</span> : null}
                  </TableCell>
                  <TableCell className="py-1.5">
                    <StatusPill value={l.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <Separator className="my-3" />
        {documents.length === 0 ? (
          <p className="py-1 text-xs italic text-muted-foreground">No dossier documents linked.</p>
        ) : (
          <ul className="space-y-1.5">
            {documents.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-2 text-xs">
                <FileText className="h-3.5 w-3.5 text-zinc-500" aria-hidden />
                <span className={`${CHIP} border-zinc-300 bg-zinc-100 font-mono uppercase text-zinc-600 dark:border-zinc-400/25 dark:bg-zinc-900 dark:text-zinc-400`}>
                  {d.docType}
                </span>
                <span className="font-mono font-medium">{d.refNo ?? "—"}</span>
                {d.issuer && <span className="text-muted-foreground">issued by {d.issuer}</span>}
                {d.note && <span className="w-full text-[11px] italic text-muted-foreground sm:w-auto">{d.note}</span>}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* f) linked exceptions */}
      <SectionCard title="Linked exceptions" subtitle="Closed-loop cases for this shipment — click to open in Exceptions">
        {s.exceptionCases.length === 0 ? (
          <EmptyState message="No exceptions linked to this shipment" />
        ) : (
          <ul className="space-y-1.5">
            {s.exceptionCases.map((ex) => (
              <li key={ex.id}>
                <button
                  type="button"
                  onClick={() => onDrill("exceptions", ex.ref)}
                  className="flex w-full flex-wrap items-center gap-2 rounded-lg border p-2.5 text-left transition-colors hover:bg-muted/50"
                >
                  <span className="font-mono text-xs font-bold">{ex.ref}</span>
                  <CaseStateBadge state={ex.state} />
                  <SeverityBadge value={ex.severity} />
                  <span className="text-xs">{ex.title}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </>
  );
}
