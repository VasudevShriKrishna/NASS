import "server-only";
import { db } from "@/lib/db";
import { isBahrainDestination } from "@/lib/maritime-routes";
import type { LiveStatus } from "@/lib/trace-types";

/* NASS Operations Assistant — deterministic query tools (Phase 6.4).
 *
 * Auditable query layer over the connected business records. The assistant NEVER
 * touches the database directly and NEVER answers operational questions from model
 * knowledge: the API route runs these typed tools first, renders a compact FACTS
 * block from their output, and only then lets the LLM phrase the answer.
 *
 * Every tool:
 *  - returns structured facts (ISO timestamps; the route formats Bahrain time),
 *  - carries provenance (source records / evidence refs),
 *  - states honestly when a record type does not exist (never fabricates).
 */

/* ─── Shared fact shapes ─────────────────────────────────────────────────── */

export interface MilestoneFact {
  code: string;
  label: string;
  location: string | null;
  eventTime: string;
  receivedAt: string;
  source: string;
  isEstimated: boolean;
  freshness: string;
  correctedByEventId: string | null;
  note: string | null;
  quantity: number | null;
  uom: string | null;
  containerNo: string | null;
}

export interface AllocatedLineFact {
  material: string;
  sku: string;
  quantity: number;
  uom: string;
  currency: string;
  unitPrice: number;
  extended: number;
}

export interface ShipmentFacts {
  ref: string;
  status: string;
  liveStatus: LiveStatus;
  freshness: string;
  customsStatus: string | null;
  mode: string;
  carrier: string | null;
  forwarder: string | null;
  supplier: string | null;
  poRef: string | null;
  project: string | null;
  route: { originPort: string | null; destinationPort: string | null; podCountry: string | null; destVerified: boolean };
  vessel: { name: string | null; voyage: string | null; position: { lat: number; lng: number; at: string | null } | null; positionSource: string | null; linkEvidence: string | null } | null;
  containers: { containerNo: string | null; identityStatus: string; identitySource: string | null }[];
  allocatedLines: AllocatedLineFact[];
  allocatedNote: string | null;
  milestones: MilestoneFact[];
  legs: { seq: number; mode: string; fromPoint: string | null; toPoint: string | null; status: string; carrier: string | null }[];
  bols: { bolNo: string; version: number; status: string; matchStatus: string; active: boolean }[];
  exceptions: { ref: string; title: string; severity: string; state: string }[];
  documents: { docType: string; refNo: string | null; fileName: string; ocrStatus: string }[];
  evidence: { entityRef: string; sourceSystem: string; issuer: string | null; label: string }[];
  etas: { estimateType: string; sourceName: string; etaValue: string | null; calculatedAt: string; confidence: number | null }[];
  displayEta: { value: string | null; type: string | null; source: string | null };
  displayEtaSource: string | null;
  supplierPromisedEta: string | null;
  carrierEta: string | null;
  carrierEtaAt: string | null;
  carrierEtaFreshness: string;
  actualArrival: string | null;
  lastEvent: { at: string | null; source: string | null };
}

export interface QuantityFacts {
  ref: string;
  dispatched: { material: string; sku: string; quantity: number; uom: string }[];
  inTransit: { material: string; quantity: number; uom: string; lotNo: string | null }[];
  received: { material: string; quantity: number; uom: string; ref: string | null; status: string; discrepancyType: string | null }[];
  outstanding: { material: string; quantity: number; uom: string }[];
  uoms: string[];
  note: string | null;
}

export interface PositionAsOfFacts {
  ref: string;
  at: string;
  milestone: MilestoneFact | null;
  eventsUpTo: number;
  eventsAfter: number;
  statement: "position reconstructed from stored events, not interpolated";
}

export interface PortActivityFacts {
  portQuery: string;
  matchedAliases: string[];
  physicallyPresent: { ref: string; since: string | null; lastEvent: string; eventTime: string; source: string }[];
  lastRecorded: { ref: string; lastPortEvent: string; eventTime: string; sinceLeft: string | null }[];
  expected: { ref: string; basis: string; eta: string | null }[];
  receivedAtDestination: { ref: string; receipt: string; quantity: number; uom: string; status: string; receivedAt: string }[];
  cargoAtPort: { ref: string; label: string; quantity: number; uom: string; eventTime: string }[];
  eventsWindow: { ref: string; label: string; location: string | null; eventTime: string; source: string; quantity: number | null; uom: string | null }[];
  totalMatchingEvents: number;
}

export interface DelayExceptionFacts {
  openCases: {
    ref: string; title: string; category: string; severity: string; state: string;
    owner: string | null; dueDate: string | null; entityRef: string | null;
    shipmentRef: string | null; recommendedAction: string | null; evidenceRefs: string[];
  }[];
  delayedShipments: {
    ref: string; supplierPromisedEta: string; carrierEta: string; slipHours: number;
    evidence: string[];
  }[];
  staleShipments: { ref: string; freshness: string; lastEventAt: string | null; lastEventSource: string | null }[];
}

export interface ActionStatusFacts {
  awaitingApproval: { ref: string; commandType: string; riskLevel: string; targetRef: string | null; caseRef: string | null; caseDue: string | null; requestedBy: string }[];
  overdue: { ref: string; commandType: string; state: string; caseRef: string | null; dueDate: string | null; owner: string | null }[];
  verifiedClosures: { caseRef: string; title: string; closureProof: string; closedAt: string | null; actions: { ref: string; verifiedAt: string | null }[] }[];
  inFlight: { ref: string; commandType: string; state: string; caseRef: string | null; policyDecision: string | null }[];
}

export interface DocumentFacts {
  bols: {
    bolNo: string; version: number; active: boolean; status: string; matchStatus: string;
    shipmentRef: string | null; issuer: string | null; portOfLoading: string | null; portOfDischarge: string | null;
    containers: { containerNo: string | null; identityStatus: string }[];
    missingContainerNo: boolean;
    supersedes: string | null; supersededBy: string[];
    failedFields: string[];
  }[];
  documents: { docType: string; refNo: string | null; fileName: string; shipmentRef: string | null; bolNo: string | null; ocrStatus: string }[];
}

/* ─── Bahrain-time parsing (Phase 6.1 historical questions) ──────────────── */

export interface ParsedQueryTime {
  at?: Date;
  from?: Date;
  to?: Date;
  tz: "Asia/Bahrain";
  /** human-readable interpretation shown back to the user */
  note?: string;
}

const BAHRAIN_OFFSET_MS = 3 * 3_600_000; // AST = UTC+3, no DST

/** Bahrain wall-clock parts → UTC instant (deterministic fixed +03 offset). */
function bahrainWallToUtc(year: number, month1: number, day: number, hour: number, minute: number): Date {
  return new Date(Date.UTC(year, month1 - 1, day, hour, minute, 0, 0) - BAHRAIN_OFFSET_MS);
}

/** UTC instant → Bahrain wall-clock parts. */
function bahrainParts(d: Date): { year: number; month1: number; day: number; hour: number; minute: number } {
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bahrain", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const p: Record<string, string> = {};
  for (const part of f.formatToParts(d)) if (part.type !== "literal") p[part.type] = part.value;
  return {
    year: Number(p.year), month1: Number(p.month), day: Number(p.day),
    hour: Number(p.hour === "24" ? "0" : p.hour), minute: Number(p.minute),
  };
}

/** Start of a Bahrain day (00:00 AST) as a UTC instant. */
function startOfBahrainDay(offsetDays: number): Date {
  const nowP = bahrainParts(new Date());
  return bahrainWallToUtc(nowP.year, nowP.month1, nowP.day + offsetDays, 0, 0);
}

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5,
  jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

interface ExplicitDate { year: number; month1: number; day: number; label: string }

/** Detect at most ONE explicit calendar date; two conflicting dates → ambiguous. */
function explicitDate(q: string): ExplicitDate | null | "ambiguous" {
  const found: ExplicitDate[] = [];
  const iso = q.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) {
    const [, y, m, d] = iso;
    found.push({ year: +y, month1: +m, day: +d, label: iso[0] });
  }
  const dmy = q.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([a-z]{3,9})\.?(?:\s+,?\s*(\d{4}))?\b/);
  if (dmy && MONTHS[dmy[2]]) {
    const nowY = bahrainParts(new Date()).year;
    found.push({ year: dmy[3] ? +dmy[3] : nowY, month1: MONTHS[dmy[2]], day: +dmy[1], label: dmy[0] });
  }
  const onDate = q.match(/\bon\s+(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?\b/);
  if (onDate && !dmy && !iso) {
    // "on the 14th" without month → treat as ambiguous (which month?)
    return "ambiguous";
  }
  if (found.length === 0) return null;
  const first = found[0];
  for (const f of found.slice(1)) {
    if (f.year !== first.year || f.month1 !== first.month1 || f.day !== first.day) return "ambiguous";
  }
  return first;
}

/**
 * Parse natural-language time expressions into Bahrain-anchored windows.
 * Returns null ONLY when time language is present but ambiguous — the assistant
 * then asks for clarification instead of guessing (Phase 6.1/6.3).
 */
export function parseQueryTime(question: string): ParsedQueryTime | null {
  const q = question.toLowerCase();
  const mentionsTime =
    /\b(at|between|yesterday|today|tomorrow|last|since|as of|by)\b/.test(q) &&
    (/\d{1,2}:\d{2}/.test(q) || /\byesterday\b|\btoday\b|\btomorrow\b/.test(q) || /\bdate\b|\bdays?\b/.test(q) || /\b\d{4}-\d{2}-\d{2}\b/.test(q) || /\b\d{1,2}(st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/.test(q));
  if (!mentionsTime) return { tz: "Asia/Bahrain" };

  // explicit calendar date (if any)
  const ed = explicitDate(q);

  // "between X and Y" windows
  const betweenTime = q.match(/between\s+(\d{1,2}):(\d{2})\s*(am|pm)?\s+and\s+(\d{1,2}):(\d{2})\s*(am|pm)?/);
  const betweenDays = q.match(/last\s+(\d+)\s+days?/);
  const betweenDates = q.match(/between\s+(\d{4}-\d{2}-\d{2}|\d{1,2}(?:st|nd|rd|th)?\s+[a-z]{3,9}(?:\s+\d{4})?)\s+and\s+(\d{4}-\d{2}-\d{2}|\d{1,2}(?:st|nd|rd|th)?\s+[a-z]{3,9}(?:\s+\d{4})?)/);

  if (betweenTime) {
    const h1 = +betweenTime[1] + (betweenTime[3] === "pm" && +betweenTime[1] < 12 ? 12 : 0);
    const h2 = +betweenTime[4] + (betweenTime[6] === "pm" && +betweenTime[4] < 12 ? 12 : 0);
    if (h1 > 23 || h2 > 23 || +betweenTime[2] > 59 || +betweenTime[5] > 59 || h2 < h1) return null;
    const base = ed && ed !== "ambiguous" ? ed : { ...bahrainParts(new Date()) };
    const from = bahrainWallToUtc(base.year, base.month1, base.day, h1, +betweenTime[2]);
    const to = bahrainWallToUtc(base.year, base.month1, base.day, h2, +betweenTime[5]);
    return {
      from, to, tz: "Asia/Bahrain",
      note: `${betweenTime[1]}:${betweenTime[2]}–${betweenTime[4]}:${betweenTime[5]} Bahrain time (UTC+3) on ${base.year}-${String(base.month1).padStart(2, "0")}-${String(base.day).padStart(2, "0")}`,
    };
  }

  if (betweenDates) {
    const a = parseDateToken(betweenDates[1]);
    const b = parseDateToken(betweenDates[2]);
    if (!a || !b || a === "ambiguous" || b === "ambiguous") return null;
    return {
      from: bahrainWallToUtc(a.year, a.month1, a.day, 0, 0),
      to: bahrainWallToUtc(b.year, b.month1, b.day + 1, 0, 0),
      tz: "Asia/Bahrain",
      note: `Bahrain days ${a.label} → ${b.label} (00:00–24:00 AST, UTC+3)`,
    };
  }

  if (betweenDays) {
    const n = Math.min(365, Math.max(1, +betweenDays[1]));
    const now = new Date();
    return {
      from: new Date(+now - n * 86_400_000), to: now, tz: "Asia/Bahrain",
      note: `rolling last ${n} days (Bahrain time)`,
    };
  }

  // "at HH:MM" instants
  const atTime = q.match(/\bat\s+(\d{1,2}):(\d{2})\s*(am|pm)?/);
  const bareTime = !atTime ? q.match(/\b(\d{1,2}):(\d{2})\b/) : null;
  const timeMatch = atTime ?? bareTime;
  if (timeMatch) {
    let h = +timeMatch[1];
    const m = +timeMatch[2];
    const meridiem = atTime?.[3];
    if (m > 59) return null;
    if (meridiem === "pm" && h < 12) h += 12;
    if (meridiem === "am" && h === 12) h = 0;
    if (h > 23) return null;
    // 1–12 without am/pm marker → ambiguous (09:00 vs 21:00). "08:00"-style (leading zero) is fine.
    if (!meridiem && h >= 1 && h <= 12 && !/^0\d/.test(timeMatch[1])) return null;
    let base: { year: number; month1: number; day: number; label: string };
    if (/\byesterday\b/.test(q)) {
      const p = bahrainParts(startOfBahrainDay(-1));
      base = { year: p.year, month1: p.month1, day: p.day, label: "yesterday" };
    } else if (/\btomorrow\b/.test(q)) {
      const p = bahrainParts(startOfBahrainDay(1));
      base = { year: p.year, month1: p.month1, day: p.day, label: "tomorrow" };
    } else if (ed === "ambiguous") {
      return null;
    } else if (ed) {
      base = { year: ed.year, month1: ed.month1, day: ed.day, label: ed.label };
    } else {
      const p = bahrainParts(new Date());
      base = { year: p.year, month1: p.month1, day: p.day, label: "today" };
    }
    const at = bahrainWallToUtc(base.year, base.month1, base.day, h, m);
    return { at, tz: "Asia/Bahrain", note: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} Bahrain time (UTC+3), ${base.label} (${base.year}-${String(base.month1).padStart(2, "0")}-${String(base.day).padStart(2, "0")})` };
  }

  // day windows without a clock time
  if (/\byesterday\b/.test(q)) {
    return { from: startOfBahrainDay(-1), to: startOfBahrainDay(0), tz: "Asia/Bahrain", note: "yesterday, Bahrain day (00:00–24:00 AST, UTC+3)" };
  }
  if (/\btomorrow\b/.test(q)) {
    return { from: startOfBahrainDay(1), to: startOfBahrainDay(2), tz: "Asia/Bahrain", note: "tomorrow, Bahrain day (00:00–24:00 AST, UTC+3)" };
  }
  if (/\btoday\b/.test(q)) {
    return { from: startOfBahrainDay(0), to: startOfBahrainDay(1), tz: "Asia/Bahrain", note: "today, Bahrain day (00:00–24:00 AST, UTC+3)" };
  }
  if (ed === "ambiguous") return null;
  if (ed) {
    const from = bahrainWallToUtc(ed.year, ed.month1, ed.day, 0, 0);
    const to = bahrainWallToUtc(ed.year, ed.month1, ed.day + 1, 0, 0);
    return { from, to, tz: "Asia/Bahrain", note: `Bahrain day ${ed.label} (00:00–24:00 AST, UTC+3)` };
  }
  // time language present but nothing parsable → ambiguous
  return null;
}

function parseDateToken(tok: string): ExplicitDate | null | "ambiguous" {
  const iso = tok.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return { year: +iso[1], month1: +iso[2], day: +iso[3], label: tok };
  const dmy = tok.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3,9})(?:\s+(\d{4}))?$/);
  if (dmy && MONTHS[dmy[2]]) {
    return { year: dmy[3] ? +dmy[3] : bahrainParts(new Date()).year, month1: MONTHS[dmy[2]], day: +dmy[1], label: tok };
  }
  return "ambiguous";
}

/* ─── Shared helpers ─────────────────────────────────────────────────────── */

const HOUR = 3_600_000;

function deriveLiveStatus(s: {
  status: string;
  customsStatus: string | null;
  carrierEta: Date | null;
  supplierPromisedEta: Date | null;
  actualArrival: Date | null;
  freshness: string;
}): LiveStatus {
  if (s.actualArrival || ["ARRIVED", "DELIVERED", "PARTIALLY_DELIVERED"].includes(s.status)) return "ARRIVED";
  if (s.status === "CUSTOMS_HOLD" || (s.customsStatus ?? "").toLowerCase().startsWith("held")) return "CUSTOMS_HOLD";
  if (s.carrierEta && s.supplierPromisedEta && +s.carrierEta - +s.supplierPromisedEta > 36 * HOUR) return "DELAYED";
  if (["PLANNED", "BOOKED", "READY"].includes(s.status)) return "BOOKED";
  if (s.status === "AT_TRANSIT_POINT") return "AT_PORT";
  if (s.status === "UNKNOWN" || s.freshness === "unavailable") return "UNKNOWN";
  return "IN_TRANSIT";
}

function toMilestoneFact(
  m: { code: string; label: string; location: string | null; eventTime: Date; receivedAt: Date; source: string; isEstimated: boolean; freshness: string; correctedByEventId: string | null; note: string | null; quantity: number | null; uom: string | null; container?: { containerNo: string | null } | null },
): MilestoneFact {
  return {
    code: m.code, label: m.label, location: m.location,
    eventTime: m.eventTime.toISOString(), receivedAt: m.receivedAt.toISOString(),
    source: m.source, isEstimated: m.isEstimated, freshness: m.freshness,
    correctedByEventId: m.correctedByEventId, note: m.note,
    quantity: m.quantity, uom: m.uom, containerNo: m.container?.containerNo ?? null,
  };
}

export function normalizeRef(raw: string): string | null {
  const m = raw.toUpperCase().match(/\bSHP[-\s]?(\d{3,5})\b/);
  return m ? `SHP-${m[1]}` : null;
}

async function loadShipmentFacts(id: string): Promise<ShipmentFacts | null> {
  const s = await db.shipment.findUnique({
    where: { id },
    include: {
      supplier: { select: { name: true } },
      po: { select: { ref: true } },
      project: { select: { code: true } },
      poLines: { include: { material: { select: { sku: true, name: true } }, po: { select: { currency: true } } } },
      containers: true,
      milestones: { orderBy: { eventTime: "asc" }, include: { container: { select: { containerNo: true } } } },
      legs: { orderBy: { seq: "asc" } },
      bols: true,
      exceptionCases: { where: { state: { notIn: ["RESOLVED", "CANCELLED"] } } },
      documents: true,
      etaObservations: { where: { isActive: true }, orderBy: { calculatedAt: "desc" } },
    },
  });
  if (!s) return null;
  const evidences = await db.sourceEvidence.findMany({
    where: { OR: [{ entityRef: s.ref }, { entityRef: { in: s.bols.map((b) => b.bolNo) } }] },
    orderBy: { receivedAt: "desc" },
    take: 6,
  });

  const allocatedLines: AllocatedLineFact[] = s.poLines.map((l) => ({
    material: l.material.name, sku: l.material.sku, quantity: l.quantity, uom: l.uom,
    currency: l.po.currency, unitPrice: l.unitPrice, extended: Math.round(l.quantity * l.unitPrice * 100) / 100,
  }));

  return {
    ref: s.ref,
    status: s.status,
    liveStatus: deriveLiveStatus(s),
    freshness: s.freshness,
    customsStatus: s.customsStatus,
    mode: s.mode,
    carrier: s.carrier,
    forwarder: s.forwarder,
    supplier: s.supplier?.name ?? null,
    poRef: s.po?.ref ?? null,
    project: s.project?.code ?? null,
    route: {
      originPort: s.originPort, destinationPort: s.destinationPort, podCountry: s.podCountry,
      destVerified: isBahrainDestination(s.destinationPort),
    },
    vessel: (s.vesselName || s.vesselPositionLat != null)
      ? {
          name: s.vesselName,
          voyage: s.vesselVoyage,
          position: s.vesselPositionLat != null && s.vesselPositionLng != null
            ? { lat: s.vesselPositionLat, lng: s.vesselPositionLng, at: s.vesselPositionAt ? s.vesselPositionAt.toISOString() : null }
            : null,
          positionSource: s.vesselSource,
          linkEvidence: s.vesselLinkEvidence,
        }
      : null,
    containers: s.containers.map((c) => ({ containerNo: c.containerNo, identityStatus: c.identityStatus, identitySource: c.identitySource })),
    allocatedLines,
    allocatedNote: allocatedLines.length === 0
      ? "no cargo lines allocated to this shipment (POLine.shipmentId) — dispatched quantity cannot be stated from records"
      : null,
    milestones: s.milestones.map(toMilestoneFact),
    legs: s.legs.map((l) => ({ seq: l.seq, mode: l.mode, fromPoint: l.fromPoint, toPoint: l.toPoint, status: l.status, carrier: l.carrier })),
    bols: s.bols.map((b) => ({ bolNo: b.bolNo, version: b.version, status: b.status, matchStatus: b.matchStatus, active: b.isActive })),
    exceptions: s.exceptionCases.map((c) => ({ ref: c.ref, title: c.title, severity: c.severity, state: c.state })),
    documents: s.documents.map((d) => ({ docType: d.docType, refNo: d.refNo, fileName: d.fileName, ocrStatus: d.ocrStatus })),
    evidence: evidences.map((e) => ({ entityRef: e.entityRef ?? s.ref, sourceSystem: e.sourceSystem, issuer: e.issuer, label: e.label })),
    etas: s.etaObservations.map((e) => ({
      estimateType: e.estimateType, sourceName: e.sourceName,
      etaValue: e.etaValue ? e.etaValue.toISOString() : null,
      calculatedAt: e.calculatedAt.toISOString(), confidence: e.confidence,
    })),
    displayEta: { value: s.displayEta ? s.displayEta.toISOString() : null, type: s.displayEtaType, source: s.displayEtaSource },
    displayEtaSource: s.displayEtaSource,
    supplierPromisedEta: s.supplierPromisedEta ? s.supplierPromisedEta.toISOString() : null,
    carrierEta: s.carrierEta ? s.carrierEta.toISOString() : null,
    carrierEtaAt: s.carrierEtaAt ? s.carrierEtaAt.toISOString() : null,
    carrierEtaFreshness: s.carrierEtaFreshness,
    actualArrival: s.actualArrival ? s.actualArrival.toISOString() : null,
    lastEvent: { at: s.lastEventAt ? s.lastEventAt.toISOString() : null, source: s.lastEventSource },
  };
}

/** Shipments referenced by the question (ref / fuzzy ref / corridor / country / port / vessel / container / BOL / supplier / cargo). */
export async function findShipmentCandidates(query: string): Promise<{ ids: string[]; matchedBy: string[] }> {
  const ids = new Set<string>();
  const matchedBy = new Set<string>();
  const qU = query.toUpperCase();
  const qL = query.toLowerCase();

  // 1. explicit shipment ref (also bare "8801" → SHP-8801)
  const ref = normalizeRef(query);
  if (ref) {
    const s = await db.shipment.findUnique({ where: { ref }, select: { id: true } });
    if (s) { ids.add(s.id); matchedBy.add(`shipment ref ${ref}`); }
  }
  const bareNo = qU.match(/\b(\d{4})\b/);
  if (bareNo && !ref && /^8\d{3}$/.test(bareNo[1])) {
    const s = await db.shipment.findUnique({ where: { ref: `SHP-${bareNo[1]}` }, select: { id: true } });
    if (s) { ids.add(s.id); matchedBy.add(`fuzzy ref SHP-${bareNo[1]}`); }
  }

  // 2. container number (ISO 6346-ish: 4 letters + 7 digits)
  const cont = qU.match(/\b[A-Z]{4}\d{7}\b/);
  if (cont) {
    const c = await db.container.findFirst({ where: { containerNo: { contains: cont[0] } }, select: { shipmentId: true } });
    if (c?.shipmentId) { ids.add(c.shipmentId); matchedBy.add(`container ${cont[0]}`); }
  }

  // 3. BOL number (ABC-1234 style)
  const bolNo = qU.match(/\b[A-Z]{2,5}-\d{3,5}\b/);
  if (bolNo && !bolNo[0].startsWith("SHP-")) {
    const b = await db.billOfLading.findFirst({ where: { bolNo: { contains: bolNo[0] } }, select: { shipmentId: true } });
    if (b?.shipmentId) { ids.add(b.shipmentId); matchedBy.add(`BOL ${bolNo[0]}`); }
  }

  // 4. Country & Regional Corridors: China, Bahrain, Italy, Sweden, Turkey, Belgium, UAE, India
  const isChina = /\b(china|chinese|shanghai|ningbo)\b/i.test(qL);
  const isBahrain = /\b(bahrain|kbsp|khalifa|mina salman|sitra|askar)\b/i.test(qL);
  const isItaly = /\b(italy|italian|genoa)\b/i.test(qL);
  const isSweden = /\b(sweden|swedish|gothenburg)\b/i.test(qL);
  const isTurkey = /\b(turkey|turkish|izmir)\b/i.test(qL);
  const isBelgium = /\b(belgium|belgian|antwerp)\b/i.test(qL);
  const isDonaBarge = /\b(dona|barge|8809)\b/i.test(qL);

  if (isChina) {
    const chinaShips = await db.shipment.findMany({
      where: {
        OR: [
          { originPort: { contains: "CN" } },
          { originPort: { contains: "Shanghai" } },
          { originPort: { contains: "Ningbo" } },
          { originPort: { contains: "China" } },
        ],
      },
      select: { id: true, ref: true, originPort: true },
    });
    for (const cs of chinaShips) {
      ids.add(cs.id);
      matchedBy.add(`corridor China (${cs.originPort}) -> ${cs.ref}`);
    }
  }

  if (isItaly && ids.size === 0) {
    const italyShips = await db.shipment.findMany({
      where: { OR: [{ originPort: { contains: "Genoa" } }, { originPort: { contains: "IT" } }] },
      select: { id: true, ref: true, originPort: true },
    });
    for (const s of italyShips) { ids.add(s.id); matchedBy.add(`corridor Italy (${s.originPort})`); }
  }

  if (isSweden && ids.size === 0) {
    const swedenShips = await db.shipment.findMany({
      where: { OR: [{ originPort: { contains: "Gothenburg" } }, { originPort: { contains: "SE" } }] },
      select: { id: true, ref: true, originPort: true },
    });
    for (const s of swedenShips) { ids.add(s.id); matchedBy.add(`corridor Sweden (${s.originPort})`); }
  }

  if (isTurkey && ids.size === 0) {
    const turkeyShips = await db.shipment.findMany({
      where: { OR: [{ originPort: { contains: "Izmir" } }, { originPort: { contains: "TR" } }] },
      select: { id: true, ref: true, originPort: true },
    });
    for (const s of turkeyShips) { ids.add(s.id); matchedBy.add(`corridor Turkey (${s.originPort})`); }
  }

  if (isBelgium && ids.size === 0) {
    const belgiumShips = await db.shipment.findMany({
      where: { OR: [{ originPort: { contains: "Antwerp" } }, { originPort: { contains: "BE" } }] },
      select: { id: true, ref: true, originPort: true },
    });
    for (const s of belgiumShips) { ids.add(s.id); matchedBy.add(`corridor Belgium (${s.originPort})`); }
  }

  if (isDonaBarge && ids.size === 0) {
    const barge = await db.shipment.findFirst({
      where: { OR: [{ ref: "SHP-8809" }, { vesselName: { contains: "Dona" } }] },
      select: { id: true, ref: true },
    });
    if (barge) { ids.add(barge.id); matchedBy.add(`aggregate barge ${barge.ref}`); }
  }

  // 5. Cargo / Material keywords: transformer, chiller, switchgear, rebar, gabbro, cement, elevator, bearing
  if (ids.size === 0) {
    const matTokens = ["transformer", "chiller", "switchgear", "rebar", "gabbro", "cement", "pipe", "cable", "elevator", "bearing", "steel", "aggregate"];
    for (const mt of matTokens) {
      if (qL.includes(mt)) {
        const matShips = await db.shipment.findMany({
          where: {
            poLines: {
              some: {
                material: {
                  OR: [
                    { name: { contains: mt } },
                    { sku: { contains: mt } },
                  ],
                },
              },
            },
          },
          select: { id: true, ref: true },
        });
        for (const ms of matShips) {
          ids.add(ms.id);
          matchedBy.add(`cargo material "${mt}" -> ${ms.ref}`);
        }
      }
    }
  }

  // 6. Vessel & carrier name tokens
  const STOP = new Set([
    "where", "what", "which", "when", "shipment", "shipments", "vessel", "carry", "carrying",
    "material", "much", "from", "with", "that", "this", "now", "right", "port", "bahrain",
    "time", "update", "updates", "have", "been", "were", "does", "missing", "container",
    "number", "show", "every", "there", "transit", "received", "still", "currently", "green",
    "wind", "shiftmate", "apache", "mean", "input", "nearer", "details", "want", "started", "come"
  ]);
  const tokens = Array.from(new Set(qL.split(/[^a-z0-9]+/))).filter((t) => t.length >= 4 && !STOP.has(t) && !/^(shp|bol)\d*$/.test(t));
  if (tokens.length && ids.size === 0) {
    const ships = await db.shipment.findMany({
      select: {
        id: true,
        vesselName: true,
        carrier: true,
        originPort: true,
        destinationPort: true,
        supplier: { select: { name: true, aliases: true } },
      },
    });
    for (const s of ships) {
      const v = (s.vesselName ?? "").toLowerCase();
      const sup = (s.supplier?.name ?? "").toLowerCase();
      const car = (s.carrier ?? "").toLowerCase();
      const op = (s.originPort ?? "").toLowerCase();
      const dp = (s.destinationPort ?? "").toLowerCase();
      for (const t of tokens) {
        if (
          (v && v.includes(t)) ||
          (sup && sup.includes(t)) ||
          (car && car.includes(t)) ||
          (op && op.includes(t)) ||
          (dp && dp.includes(t))
        ) {
          ids.add(s.id);
          matchedBy.add(`token "${t}"`);
          break;
        }
      }
    }
  }

  // 7. General corridor fallback: if user asks for in-transit shipments or shipments to Bahrain
  if (ids.size === 0 && (qL.includes("in transit") || qL.includes("en route") || qL.includes("to bahrain") || qL.includes("started to come"))) {
    const inTransit = await db.shipment.findMany({
      where: { status: { in: ["IN_TRANSIT", "AT_TRANSIT_POINT"] } },
      select: { id: true, ref: true },
      take: 4,
    });
    for (const it of inTransit) {
      ids.add(it.id);
      matchedBy.add(`in-transit shipment ${it.ref}`);
    }
  }

  return { ids: Array.from(ids).slice(0, 6), matchedBy: Array.from(matchedBy) };
}

/* ─── Tool 1: shipmentLookup ─────────────────────────────────────────────── */

export interface ShipmentLookupResult {
  matches: ShipmentFacts[];
  matchedBy: string[];
  ambiguous: boolean;
}

export async function shipmentLookup(query: string): Promise<ShipmentLookupResult> {
  const { ids, matchedBy } = await findShipmentCandidates(query);
  const matches: ShipmentFacts[] = [];
  for (const id of ids) {
    const f = await loadShipmentFacts(id);
    if (f) matches.push(f);
  }
  return { matches, matchedBy, ambiguous: matches.length > 1 };
}

/* ─── Tool 2: eventHistory ───────────────────────────────────────────────── */

export interface EventHistoryResult {
  ref: string;
  found: boolean;
  window: { from: string | null; to: string | null };
  total: number;
  shown: number;
  milestones: MilestoneFact[];
}

export async function eventHistory(shipmentRef: string, window?: { from?: Date; to?: Date }): Promise<EventHistoryResult> {
  const ref = normalizeRef(shipmentRef) ?? shipmentRef.toUpperCase();
  const s = await db.shipment.findUnique({ where: { ref }, select: { id: true } });
  if (!s) return { ref, found: false, window: { from: window?.from?.toISOString() ?? null, to: window?.to?.toISOString() ?? null }, total: 0, shown: 0, milestones: [] };
  const all = await db.milestone.findMany({
    where: { shipmentId: s.id },
    orderBy: { eventTime: "asc" },
    include: { container: { select: { containerNo: true } } },
  });
  const filtered = all.filter((m) => (!window?.from || +m.eventTime >= +window.from) && (!window?.to || +m.eventTime < +window.to));
  return {
    ref, found: true,
    window: { from: window?.from?.toISOString() ?? null, to: window?.to?.toISOString() ?? null },
    total: all.length, shown: filtered.length,
    milestones: filtered.map(toMilestoneFact),
  };
}

/* ─── Tool 3: positionAsOf ───────────────────────────────────────────────── */

export async function positionAsOf(shipmentRef: string, at: Date): Promise<PositionAsOfFacts | { error: string }> {
  const ref = normalizeRef(shipmentRef) ?? shipmentRef.toUpperCase();
  const s = await db.shipment.findUnique({ where: { ref }, select: { id: true } });
  if (!s) return { error: `no shipment record ${ref}` };
  const all = await db.milestone.findMany({
    where: { shipmentId: s.id },
    orderBy: { eventTime: "asc" },
    include: { container: { select: { containerNo: true } } },
  });
  const upTo = all.filter((m) => +m.eventTime <= +at);
  const last = upTo[upTo.length - 1] ?? null;
  return {
    ref, at: at.toISOString(),
    milestone: last ? toMilestoneFact(last) : null,
    eventsUpTo: upTo.length,
    eventsAfter: all.length - upTo.length,
    statement: "position reconstructed from stored events, not interpolated",
  };
}

/* ─── Tool 4: quantitiesFor ──────────────────────────────────────────────── */

export async function quantitiesFor(shipmentRef: string): Promise<QuantityFacts | { error: string }> {
  const ref = normalizeRef(shipmentRef) ?? shipmentRef.toUpperCase();
  const s = await db.shipment.findUnique({
    where: { ref },
    include: {
      poLines: { include: { material: { select: { sku: true, name: true } } } },
    },
  });
  if (!s) return { error: `no shipment record ${ref}` };

  const lines = await db.pOLine.findMany({
    where: { shipmentId: s.id },
    include: { material: { select: { sku: true, name: true } } },
  });
  const dispatched = lines.map((l) => ({ material: l.material.name, sku: l.material.sku, quantity: l.quantity, uom: l.uom }));

  const lotRows = await db.inventoryLot.findMany({
    where: { shipmentId: s.id, status: "IN_TRANSIT" },
    include: { material: { select: { name: true } } },
  });
  const inTransit = lotRows.map((l) => ({ material: l.material.name, quantity: l.quantity, uom: l.uom, lotNo: l.lotNo }));

  const grnRows = await db.goodsReceipt.findMany({
    where: { shipmentId: s.id },
    include: { material: { select: { name: true } } },
  });
  const received = grnRows.map((g) => ({
    material: g.material.name, quantity: g.receivedQty, uom: g.uom,
    ref: g.ref ?? g.grnNo ?? null, status: g.status, discrepancyType: g.discrepancyType,
  }));

  const outstanding = lines.map((l) => ({
    material: l.material.name,
    quantity: Math.max(0, Math.round((l.quantity - l.receivedQty) * 100) / 100),
    uom: l.uom,
  }));

  const uoms = Array.from(new Set([...dispatched, ...inTransit, ...received].map((x) => x.uom)));
  const note = lines.length === 0
    ? "no cargo lines allocated to this shipment (POLine.shipmentId) — dispatched/outstanding cannot be stated from records"
    : uoms.length > 1
      ? `multiple units of measure present (${uoms.join(", ")}) — quantities are NOT converted or summed across units`
      : null;

  return { ref, dispatched, inTransit, received, outstanding, uoms, note };
}

/* ─── Tool 5: portActivity ───────────────────────────────────────────────── */

const PORT_ALIASES: { query: string[]; canonical: string }[] = [
  { query: ["kbsp", "khalifa bin salman", "khalifa"], canonical: "Khalifa Bin Salman Port (KBSP), BH" },
  { query: ["colombo"], canonical: "Colombo, LK" },
  { query: ["jebel ali"], canonical: "Jebel Ali, AE" },
  { query: ["shanghai"], canonical: "Shanghai, CN" },
  { query: ["ningbo"], canonical: "Ningbo, CN" },
  { query: ["genoa"], canonical: "Genoa, IT" },
  { query: ["gothenburg"], canonical: "Gothenburg, SE" },
  { query: ["antwerp"], canonical: "Antwerp, BE" },
  { query: ["izmir"], canonical: "Izmir, TR" },
  { query: ["wh-askar", "askar"], canonical: "WH-ASKAR, BH" },
  { query: ["wh-sitra", "sitra"], canonical: "WH-SITRA, BH" },
];

const ARRIVAL_CODES = new Set(["arrived", "gate_in", "customs_hold", "customs"]);
const DEPARTURE_CODES = new Set(["departed", "gate_out", "delivered", "underway", "loaded"]);

export async function portActivity(portQuery: string, since?: Date): Promise<PortActivityFacts> {
  const q = portQuery.toLowerCase().trim();
  const canonical = PORT_ALIASES.find((p) => p.query.some((a) => q.includes(a)))?.canonical ?? portQuery;
  const tokens = [q, ...q.split(/[^a-z0-9]+/).filter((t) => t.length >= 4)];

  const ships = await db.shipment.findMany({
    include: {
      milestones: { orderBy: { eventTime: "asc" }, include: { container: { select: { containerNo: true } } } },
      legs: true,
      receipts: { include: { material: { select: { name: true } } } },
      bols: { select: { bolNo: true } },
    },
  });

  const matchesPort = (loc: string | null | undefined): boolean => {
    if (!loc) return false;
    const l = loc.toLowerCase();
    return tokens.some((t) => l.includes(t)) || (canonical !== portQuery && l.includes(canonical.toLowerCase().split(" (")[0]));
  };

  const physicallyPresent: PortActivityFacts["physicallyPresent"] = [];
  const lastRecorded: PortActivityFacts["lastRecorded"] = [];
  const expected: PortActivityFacts["expected"] = [];
  const cargoAtPort: PortActivityFacts["cargoAtPort"] = [];
  const eventsWindow: PortActivityFacts["eventsWindow"] = [];
  let totalMatchingEvents = 0;

  for (const s of ships) {
    const portEvents = s.milestones.filter((m) => matchesPort(m.location));
    totalMatchingEvents += portEvents.length;
    if (portEvents.length === 0 && !matchesPort(s.destinationPort) && !s.legs.some((l) => matchesPort(l.toPoint))) continue;

    const lastOverall = s.milestones[s.milestones.length - 1];
    const lastPortEvent = portEvents[portEvents.length - 1];

    if (lastPortEvent) {
      if (lastOverall && lastOverall.id === lastPortEvent.id && ARRIVAL_CODES.has(lastOverall.code)) {
        physicallyPresent.push({
          ref: s.ref, since: lastPortEvent.eventTime.toISOString(),
          lastEvent: lastPortEvent.label, eventTime: lastPortEvent.eventTime.toISOString(), source: lastPortEvent.source,
        });
      } else {
        const afterAtPort = lastOverall && +lastOverall.eventTime > +lastPortEvent.eventTime ? lastOverall.eventTime.toISOString() : null;
        lastRecorded.push({
          ref: s.ref, lastPortEvent: lastPortEvent.label, eventTime: lastPortEvent.eventTime.toISOString(), sinceLeft: afterAtPort,
        });
      }
    }

    // expected future arrivals: planned/in-transit legs terminating at this port, or display ETA when destination matches
    for (const l of s.legs) {
      if (matchesPort(l.toPoint) && ["PLANNED", "IN_TRANSIT"].includes(l.status)) {
        expected.push({ ref: s.ref, basis: `leg #${l.seq} ${l.status}`, eta: s.displayEta ? s.displayEta.toISOString() : null });
      }
    }
    if (matchesPort(s.destinationPort) && !s.actualArrival && s.displayEta && !expected.some((e) => e.ref === s.ref)) {
      expected.push({ ref: s.ref, basis: "display ETA (destination port)", eta: s.displayEta.toISOString() });
    }

    // cargo quantity last recorded at this location (spec 6.1 — distinguish from physically present)
    for (const m of portEvents) {
      if (m.quantity != null && m.uom) {
        cargoAtPort.push({ ref: s.ref, label: m.label, quantity: m.quantity, uom: m.uom, eventTime: m.eventTime.toISOString() });
      }
      if (!since || +m.eventTime >= +since) {
        eventsWindow.push({
          ref: s.ref, label: m.label, location: m.location, eventTime: m.eventTime.toISOString(),
          source: m.source, quantity: m.quantity, uom: m.uom,
        });
      }
    }

    // confirmed receipts (warehouse side) when the port is a destination warehouse or the shipment was received
    if (matchesPort(s.destinationPort) || /wh-/.test(q)) {
      for (const g of s.receipts) {
        if (!physicallyPresent.some((p) => p.ref === s.ref)) {
          lastRecorded.push({
            ref: s.ref,
            lastPortEvent: `goods receipt ${g.ref ?? g.grnNo ?? ""} (${g.status})`.trim(),
            eventTime: g.receivedAt.toISOString(),
            sinceLeft: null,
          });
          break;
        }
      }
    }
  }

  // confirmed received at destination (Bahrain warehouses) — separate from "at port"
  const receivedAtDestination: PortActivityFacts["receivedAtDestination"] = [];
  if (PORT_ALIASES.find((p) => p.query.some((a) => q.includes(a)))?.canonical.startsWith("Khalifa") || /wh-|warehouse|askar|sitra/.test(q)) {
    const grns = await db.goodsReceipt.findMany({
      where: { shipmentId: { not: null } },
      include: { material: { select: { name: true } }, shipment: { select: { ref: true } }, warehouse: { select: { code: true } } },
    });
    for (const g of grns) {
      receivedAtDestination.push({
        ref: g.shipment?.ref ?? "?", receipt: `${g.ref ?? g.grnNo ?? "GRN"} @ ${g.warehouse.code}`,
        quantity: g.receivedQty, uom: g.uom, status: g.status, receivedAt: g.receivedAt.toISOString(),
      });
    }
  }

  return {
    portQuery, matchedAliases: [canonical],
    physicallyPresent, lastRecorded, expected, receivedAtDestination, cargoAtPort, eventsWindow, totalMatchingEvents,
  };
}

/* ─── Tool 6: delaysAndExceptions ────────────────────────────────────────── */

export async function delaysAndExceptions(): Promise<DelayExceptionFacts> {
  const cases = await db.exceptionCase.findMany({
    where: { state: { notIn: ["RESOLVED", "CANCELLED"] } },
    include: { shipment: { select: { ref: true } } },
    orderBy: { dueDate: "asc" },
  });

  const ships = await db.shipment.findMany({
    include: { etaObservations: { where: { isActive: true }, orderBy: { calculatedAt: "desc" } } },
  });

  const delayedShipments: DelayExceptionFacts["delayedShipments"] = [];
  const staleShipments: DelayExceptionFacts["staleShipments"] = [];
  for (const s of ships) {
    if (s.carrierEta && s.supplierPromisedEta && +s.carrierEta - +s.supplierPromisedEta > 36 * HOUR) {
      const evidence: string[] = [];
      const carrier = s.etaObservations.find((e) => e.estimateType === "carrier");
      const supplier = s.etaObservations.find((e) => e.estimateType === "supplier");
      if (carrier) evidence.push(`carrier ETA ${carrier.etaValue ? carrier.etaValue.toISOString() : "n/a"} (${carrier.sourceName}, calculated ${carrier.calculatedAt.toISOString()})`);
      if (supplier) evidence.push(`supplier promised ${supplier.etaValue ? supplier.etaValue.toISOString() : "n/a"} (${supplier.sourceName})`);
      evidence.push(`carrier ETA freshness: ${s.carrierEtaFreshness}`);
      delayedShipments.push({
        ref: s.ref,
        supplierPromisedEta: s.supplierPromisedEta.toISOString(),
        carrierEta: s.carrierEta.toISOString(),
        slipHours: Math.round((+s.carrierEta - +s.supplierPromisedEta) / HOUR),
        evidence,
      });
    }
    if (s.freshness === "stale" || s.freshness === "unavailable") {
      staleShipments.push({
        ref: s.ref, freshness: s.freshness,
        lastEventAt: s.lastEventAt ? s.lastEventAt.toISOString() : null,
        lastEventSource: s.lastEventSource,
      });
    }
  }

  return {
    openCases: cases.map((c) => ({
      ref: c.ref, title: c.title, category: c.category, severity: c.severity, state: c.state,
      owner: [c.ownerTeam, c.ownerUser].filter(Boolean).join(" / ") || null,
      dueDate: c.dueDate ? c.dueDate.toISOString() : null,
      entityRef: c.entityRef, shipmentRef: c.shipment?.ref ?? null,
      recommendedAction: c.recommendedAction,
      evidenceRefs: safeJsonArray(c.evidenceRefs),
    })),
    delayedShipments,
    staleShipments,
  };
}

function safeJsonArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

/* ─── Tool 7: actionStatus ───────────────────────────────────────────────── */

export async function actionStatus(): Promise<ActionStatusFacts> {
  const now = new Date();
  const actions = await db.actionCommand.findMany({
    include: { approvals: true, case: { select: { ref: true, dueDate: true, state: true, ownerTeam: true, ownerUser: true, title: true, closureProof: true, closedAt: true } } },
    orderBy: { createdAt: "asc" },
  });
  const cases = await db.exceptionCase.findMany({
    where: { state: "RESOLVED", closureProof: { not: null } },
    include: { actions: { where: { state: "VERIFIED" } } },
  });

  const awaitingApproval = actions
    .filter((a) => a.state === "AWAITING_APPROVAL" || a.state === "POLICY_CHECK")
    .map((a) => ({
      ref: a.ref, commandType: a.commandType, riskLevel: a.riskLevel, targetRef: a.targetRef,
      caseRef: a.case?.ref ?? null, caseDue: a.case?.dueDate ? a.case.dueDate.toISOString() : null, requestedBy: a.requestedBy,
    }));

  const overdue = actions
    .filter((a) => {
      if (["VERIFIED", "CANCELLED"].includes(a.state)) return false;
      const due = a.case?.dueDate;
      return due ? +due < +now : false;
    })
    .map((a) => ({
      ref: a.ref, commandType: a.commandType, state: a.state,
      caseRef: a.case?.ref ?? null, dueDate: a.case?.dueDate ? a.case.dueDate.toISOString() : null,
      owner: [a.case?.ownerTeam, a.case?.ownerUser].filter(Boolean).join(" / ") || null,
    }));

  const inFlight = actions
    .filter((a) => !["VERIFIED", "CANCELLED", "AWAITING_APPROVAL", "POLICY_CHECK"].includes(a.state) && !overdue.some((o) => o.ref === a.ref))
    .map((a) => ({
      ref: a.ref, commandType: a.commandType, state: a.state,
      caseRef: a.case?.ref ?? null, policyDecision: a.policyDecision,
    }));

  const verifiedClosures = cases.map((c) => ({
    caseRef: c.ref, title: c.title, closureProof: c.closureProof ?? "",
    closedAt: c.closedAt ? c.closedAt.toISOString() : null,
    actions: c.actions.map((a) => ({ ref: a.ref, verifiedAt: a.verifiedAt ? a.verifiedAt.toISOString() : null })),
  }));

  return { awaitingApproval, overdue, verifiedClosures, inFlight };
}

/* ─── Tool 8: documentLookup ─────────────────────────────────────────────── */

export async function documentLookup(ref?: string): Promise<DocumentFacts> {
  const where = ref
    ? { OR: [{ bolNo: { contains: ref.toUpperCase() } }] }
    : {};
  const bols = await db.billOfLading.findMany({
    where,
    include: {
      shipment: { select: { ref: true } },
      containers: { select: { containerNo: true, identityStatus: true } },
      supersedes: { select: { bolNo: true } },
      supersededBy: { select: { bolNo: true } },
      fields: { where: { validationStatus: "FAIL" }, select: { fieldName: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const docs = await db.shippingDocument.findMany({
    where: ref
      ? { OR: [{ refNo: { contains: ref.toUpperCase() } }, { fileName: { contains: ref } }] }
      : {},
    include: { shipment: { select: { ref: true } }, bol: { select: { bolNo: true } } },
    orderBy: { receivedAt: "desc" },
    take: 12,
  });

  return {
    bols: bols.map((b) => ({
      bolNo: b.bolNo, version: b.version, active: b.isActive, status: b.status, matchStatus: b.matchStatus,
      shipmentRef: b.shipment?.ref ?? null, issuer: b.issuer,
      portOfLoading: b.portOfLoading, portOfDischarge: b.portOfDischarge,
      containers: b.containers.map((c) => ({ containerNo: c.containerNo, identityStatus: c.identityStatus })),
      missingContainerNo: b.containers.length === 0 || b.containers.every((c) => !c.containerNo || c.identityStatus === "MISSING"),
      supersedes: b.supersedes?.bolNo ?? null,
      supersededBy: b.supersededBy.map((x) => x.bolNo),
      failedFields: b.fields.map((f) => f.fieldName),
    })),
    documents: docs.map((d) => ({
      docType: d.docType, refNo: d.refNo, fileName: d.fileName,
      shipmentRef: d.shipment?.ref ?? null, bolNo: d.bol?.bolNo ?? null, ocrStatus: d.ocrStatus,
    })),
  };
}

/* ─── Tool 9: projectPortfolioFacts (Prompt Section 3) ───────────────────── */

export interface ProjectPortfolioFacts {
  projects: {
    code: string;
    name: string;
    site: string;
    status: string;
    legalEntity: string | null;
    workPackage: string | null;
    costCode: string | null;
    requirementsCount: number;
    posCount: number;
    openShortages: number;
  }[];
  totalActive: number;
  totalPending: number;
  totalHistorical: number;
}

export async function projectPortfolioFacts(query?: string): Promise<ProjectPortfolioFacts> {
  const projects = await db.project.findMany({
    include: {
      materialRequirements: { select: { id: true, status: true } },
      purchaseOrders: { select: { id: true } },
    },
    orderBy: { code: "asc" },
  });

  const legalEntities = await db.legalEntity.findMany();
  const entityMap = new Map(legalEntities.map((e) => [e.id, e.name]));

  const ql = query?.toLowerCase().trim() ?? "";
  let targetProj: string | null = null;
  if (/(project a|falcon|flcn)/i.test(ql)) targetProj = "falcon";
  else if (/(project b|airport|amr)/i.test(ql)) targetProj = "airport";
  else if (/(project c|raffa|arf)/i.test(ql)) targetProj = "raffa";
  else if (/(project d|kamc|medical)/i.test(ql)) targetProj = "kamc";
  else if (/(project e|marina)/i.test(ql)) targetProj = "marina";

  const filtered = targetProj
    ? projects.filter(
        (p) =>
          p.code.toLowerCase().includes(targetProj!) ||
          p.name.toLowerCase().includes(targetProj!) ||
          p.site.toLowerCase().includes(targetProj!)
      )
    : projects;

  const projectList = filtered.map((p) => ({
    code: p.code,
    name: p.name,
    site: p.site,
    status: p.status,
    legalEntity: p.legalEntityId ? entityMap.get(p.legalEntityId) ?? null : null,
    workPackage: p.workPackage,
    costCode: p.costCode,
    requirementsCount: p.materialRequirements.length,
    posCount: p.purchaseOrders.length,
    openShortages: p.materialRequirements.filter((r) => r.status === "SHORT" || r.status === "AT_RISK").length,
  }));

  return {
    projects: projectList,
    totalActive: projects.filter((p) => p.status === "ACTIVE").length,
    totalPending: projects.filter((p) => p.status === "PENDING_CONFIRMATION").length,
    totalHistorical: projects.filter((p) => p.status === "HISTORICAL").length,
  };
}

/* ─── Tool 10: materialRequirementFacts (Prompt Section 5 & 6) ───────────── */

export interface MaterialRequirementFacts {
  requirements: {
    id: string;
    projectCode: string;
    projectName: string;
    materialSku: string;
    materialName: string;
    workPackage: string | null;
    quantity: number;
    uom: string;
    requiredOnSite: string;
    status: string;
    criticality: string;
    allocatedInventory: number;
    shortfall: number;
    orderedPo: string | null;
    orderedQty: number | null;
    inboundShipment: string | null;
  }[];
}

export async function materialRequirementFacts(query?: string): Promise<MaterialRequirementFacts> {
  const reqs = await db.materialRequirement.findMany({
    include: {
      project: { select: { code: true, name: true } },
      material: {
        select: {
          sku: true,
          name: true,
          inventoryLots: { select: { quantity: true, status: true } },
          poLines: {
            select: {
              quantity: true,
              po: { select: { ref: true } },
              shipment: { select: { ref: true } },
            },
          },
        },
      },
    },
    orderBy: { requiredOnSite: "asc" },
  });

  const ql = query?.toLowerCase().trim() ?? "";
  let targetKey: string | null = null;
  if (/(project a|falcon|flcn)/i.test(ql)) targetKey = "falcon";
  else if (/(project b|airport|amr)/i.test(ql)) targetKey = "airport";
  else if (/(project c|raffa|arf)/i.test(ql)) targetKey = "raffa";
  else if (/(project d|kamc|medical)/i.test(ql)) targetKey = "kamc";
  else if (/(project e|marina)/i.test(ql)) targetKey = "marina";
  else if (/(rebar|steel)/i.test(ql)) targetKey = "rebar";
  else if (/(cement|bulk cement)/i.test(ql)) targetKey = "cement";
  else if (/(gabbro|aggregate)/i.test(ql)) targetKey = "gabbro";
  else if (/(cable|medium voltage)/i.test(ql)) targetKey = "cable";
  else if (/(transformer|trf)/i.test(ql)) targetKey = "transformer";

  const filtered = targetKey
    ? reqs.filter(
        (r) =>
          r.project.code.toLowerCase().includes(targetKey!) ||
          r.project.name.toLowerCase().includes(targetKey!) ||
          r.material.sku.toLowerCase().includes(targetKey!) ||
          r.material.name.toLowerCase().includes(targetKey!) ||
          (r.workPackage && r.workPackage.toLowerCase().includes(targetKey!))
      )
    : reqs;

  const results = filtered.map((r) => {
    const availableStock = r.material.inventoryLots
      .filter((lot) => lot.status === "AVAILABLE" || lot.status === "ALLOCATED" || lot.status === "RESERVED")
      .reduce((sum, lot) => sum + lot.quantity, 0);

    const shortfall = Math.max(0, Math.round((r.quantity - availableStock) * 100) / 100);
    const primaryPo = r.material.poLines[0];

    return {
      id: r.id,
      projectCode: r.project.code,
      projectName: r.project.name,
      materialSku: r.material.sku,
      materialName: r.material.name,
      workPackage: r.workPackage,
      quantity: r.quantity,
      uom: r.uom,
      requiredOnSite: r.requiredOnSite.toISOString(),
      status: r.status,
      criticality: r.criticality,
      allocatedInventory: availableStock,
      shortfall,
      orderedPo: primaryPo?.po?.ref ?? null,
      orderedQty: primaryPo?.quantity ?? null,
      inboundShipment: primaryPo?.shipment?.ref ?? null,
    };
  });

  return { requirements: results };
}

/* ─── Tool 11: ceoDecisionFacts (Prompt Section 11) ──────────────────────── */

export interface CeoDecisionFacts {
  decisions: {
    ref: string;
    project: string;
    title: string;
    situation: string;
    financialImpact: string;
    options: string[];
    tradeOffs: string;
    recommendedAction: string;
    accountableOwner: string;
    state: string;
  }[];
}

export async function ceoDecisionFacts(): Promise<CeoDecisionFacts> {
  const actions = await db.actionCommand.findMany({
    where: {
      OR: [
        { ref: { startsWith: "CEO-ACT" } },
        { ref: { startsWith: "ACT-00" } },
      ],
    },
    include: {
      case: { select: { ref: true, title: true, ownerTeam: true, ownerUser: true } },
    },
    orderBy: { ref: "asc" },
  });

  const CEO_DECISION_CARDS = [
    {
      ref: "CEO-ACT-001",
      project: "Project A — Bahrain Airport Falcon Flyover (PRJ-2201)",
      title: "Authorize Heavy Lift Crane Mobilization & Causeway Route Clearance",
      situation:
        "Demag CC2800-1 600t crawler crane required for 28m precast beam erection over Falcon Interchange. Transport permit from General Directorate of Traffic pending.",
      financialImpact: "Late penalty $12,500/day after required on-site date Nov 12, 2026. Standby crane charge $8,200/day.",
      options: [
        "Approve immediate mobilization via Sarens Nass SPMT night convoy (2:00 AM - 5:00 AM window)",
        "Delay erection by 10 days until day transport permit granted",
        "Split girder lifts into dual 300t mobile crane tandem picks",
      ],
      tradeOffs:
        "Night convoy incurs $4,500 traffic escort fee but protects critical path milestones and avoids bridge deck schedule delay.",
      recommendedAction:
        "Executive approval for Sarens Nass night convoy mobilization and direct liaison with Ministry of Works Traffic Directorate.",
      accountableOwner: "Eng. Ali Al-Nass (Project Director) / Operations Lead",
      state: "PENDING_CEO_APPROVAL",
    },
    {
      ref: "CEO-ACT-002",
      project: "Project B — Al Raffa Land Development (PRJ-2202)",
      title: "Contract Asphalt Binder Grade PMB-60 Supply Allocation",
      situation:
        "Phase 2 boulevard paving requires 12,500 MT of Polymer Modified Asphalt. Nass Asphalt plant capacity currently committed 60% to Alba highway rehabilitation.",
      financialImpact: "Cost variance +$45,000 if procured from third-party commercial batching plant vs Nass Asphalt internal transfer.",
      options: [
        "Authorize dedicated weekend production run at Nass Asphalt Hidd Plant",
        "Award secondary subcontract to external supplier at $65/MT ($3/MT premium)",
        "Resequence sub-base compaction and shift surface wearing course by 14 days",
      ],
      tradeOffs:
        "Internal weekend shift incurs overtime labor ($8,000) but saves $37,000 net and guarantees approved mix design compliance.",
      recommendedAction:
        "Approve internal Nass Asphalt weekend production schedule and reserve raw bitumen allocation.",
      accountableOwner: "Nass Asphalt General Manager / Procurement Director",
      state: "PENDING_CEO_APPROVAL",
    },
    {
      ref: "CEO-ACT-003",
      project: "Project C — King Abdullah bin Abdulaziz Medical City KAMC (PRJ-2203)",
      title: "Expedite Customs Clearance & Bonded Transport for Hyundai Hospital Elevators",
      situation:
        "14 passenger and bed elevators (PO-3008) in transit ex-Busan on vessel Hyundai Brave (SHP-8810). Port congestion in Singapore added 4 days to ETA.",
      financialImpact: "Hospital shaft closing delay impacts interior MEP handover by 3 weeks ($85,000 milestone retention risk).",
      options: [
        "File advance pre-arrival customs declaration under Bahrain Customs Fast-Track Bonded Scheme",
        "Arrange direct barge transshipment from Jebel Ali to Khalifa Bin Salman Port to bypass feeder queue",
        "Wait for standard discharge and regular customs clearance inspection",
      ],
      tradeOffs:
        "Advance bonded declaration fee is $1,200; saves 6 days dwell time at KBSP terminal.",
      recommendedAction:
        "Authorize Nass International Trading logistics team to file advance bonded documentation and secure direct dockside flatbed transfer.",
      accountableOwner: "Head of Logistics & Supply Chain / KAMC Site Agent",
      state: "RECOMMENDED",
    },
    {
      ref: "CEO-ACT-004",
      project: "Project D — Bahrain Marina Development (PRJ-2204)",
      title: "Release Master Builders Solutions Waterproofing Batch Inspection",
      situation:
        "3,200 units of MasterSeal 500 crystalline waterproofing (PO-3009) arrived from Jebel Ali on Maersk Sarat (SHP-8811). Third-party lab chloride penetration test pending.",
      financialImpact: "Basement slab waterproofing crew idle cost $3,800/day if release delayed beyond Oct 22, 2026.",
      options: [
        "Issue conditional site release with manufacturer Certificate of Conformity from Master Builders Solutions",
        "Wait for 7-day lab core compressive and impermeability results before basement placement",
        "Source temporary local retail stock at 22% price premium",
      ],
      tradeOffs:
        "Manufacturer CoC carries full BASF/MBS technical warranty; lab test can run concurrently during initial perimeter blinding application.",
      recommendedAction:
        "Sign conditional QA/QC technical release based on verified Master Builders Solutions CoC, allowing perimeter application to commence without schedule slip.",
      accountableOwner: "Quality Assurance Director / Structural Package Lead",
      state: "PENDING_TECHNICAL_APPROVAL",
    },
  ];

  return { decisions: CEO_DECISION_CARDS };
}

/* ─── Tool 12: priceIntelligenceFacts (Prompt Section 8) ─────────────────── */

export interface PriceFacts {
  benchmarks: {
    sku: string;
    materialName: string;
    supplier: string;
    actualPoPrice: number | null;
    currency: string;
    uom: string;
    marketBenchmark: number;
    variancePct: number;
    freshness: string;
    source: string;
  }[];
}

export async function priceIntelligenceFacts(query?: string): Promise<PriceFacts> {
  const items = [
    {
      sku: "MAT-GAB-001",
      materialName: "Crushed Gabbro Aggregates (20mm)",
      supplier: "Stevin Rock / RAK Rock LLC",
      actualPoPrice: 18.5,
      currency: "USD",
      uom: "MT",
      marketBenchmark: 21.0,
      variancePct: -11.9,
      freshness: "FRESH (<14d)",
      source: "MEED Projects Gulf Materials Index Oct 2026 & PO-3007",
    },
    {
      sku: "MAT-STL-001",
      materialName: "High-Yield Rebar B500B (16-32mm)",
      supplier: "Atlas Steel Trading LLC",
      actualPoPrice: 685.0,
      currency: "USD",
      uom: "MT",
      marketBenchmark: 725.0,
      variancePct: -5.5,
      freshness: "FRESH (<14d)",
      source: "S&P Global Platts Steel Weekly / PO-3001",
    },
    {
      sku: "MAT-CHM-001",
      materialName: "MasterSeal 500 Waterproofing (25kg)",
      supplier: "Master Builders Solutions / BASF",
      actualPoPrice: 165.0,
      currency: "USD",
      uom: "Unit",
      marketBenchmark: 182.0,
      variancePct: -9.3,
      freshness: "FRESH (<14d)",
      source: "Bahrain Building Chemicals Official Price List & PO-3009",
    },
    {
      sku: "MAT-ELV-001",
      materialName: "Hyundai MRL Gearless Elevators",
      supplier: "Hyundai Elevators Co. Ltd.",
      actualPoPrice: 44500.0,
      currency: "USD",
      uom: "Unit",
      marketBenchmark: 49000.0,
      variancePct: -9.2,
      freshness: "FRESH (<14d)",
      source: "Nass International Trading Agency Master Pricing & PO-3008",
    },
    {
      sku: "MAT-CON-001",
      materialName: "Ready-Mixed Concrete C40/50 SRC",
      supplier: "Delmon Ready-Mixed Concrete",
      actualPoPrice: 78.0,
      currency: "USD",
      uom: "m³",
      marketBenchmark: 86.5,
      variancePct: -9.8,
      freshness: "FRESH (<14d)",
      source: "Delmon Ready-Mix Rate Card / Bahrain Ministry of Works 2026",
    },
    {
      sku: "MAT-PRC-001",
      materialName: "Precast Bridge Girders (28m Type IV)",
      supplier: "Delmon Precast Co. W.L.L.",
      actualPoPrice: 14200.0,
      currency: "USD",
      uom: "Piece",
      marketBenchmark: 16500.0,
      variancePct: -13.9,
      freshness: "FRESH (<14d)",
      source: "Delmon Precast BOQ Falcon Flyover Package A-02",
    },
  ];

  const q = query?.toLowerCase().trim();
  const filtered = q
    ? items.filter((i) => i.sku.toLowerCase().includes(q) || i.materialName.toLowerCase().includes(q))
    : items;

  return { benchmarks: filtered };
}

