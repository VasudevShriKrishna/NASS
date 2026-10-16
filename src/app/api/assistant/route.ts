import { NextRequest } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { db } from "@/lib/db";
import { ok, err } from "@/lib/api";
import { fmtBahrainDateTime } from "@/lib/bahrain-time";
import type { AssistantResponse, AssistantSection, AssistantStructured } from "@/lib/assistant-types";
import {
  parseQueryTime,
  shipmentLookup,
  eventHistory,
  positionAsOf,
  quantitiesFor,
  portActivity,
  delaysAndExceptions,
  actionStatus,
  documentLookup,
  normalizeRef,
  type ShipmentFacts,
  type QuantityFacts,
  type PositionAsOfFacts,
  type PortActivityFacts,
  type DelayExceptionFacts,
  type ActionStatusFacts,
  type DocumentFacts,
  type ParsedQueryTime,
  type EventHistoryResult,
} from "@/lib/assistant-tools";

export const dynamic = "force-dynamic";

/**
 * M20 / Phase 6 — NASS Operations Assistant.
 * Query contract: deterministic query tools FIRST (assistant-tools.ts), then a
 * compact FACTS block, then the LLM phrases the answer under a strict structured
 * format. The model has NO write path and CANNOT invent data; the response also
 * carries a deterministic `structured` payload built purely from tool output so
 * the UI can render grounded cards even if the model is unavailable (Rule 10).
 */

const FACTS_CAP = 4500;

const B = (iso: string | null | undefined): string => (iso ? fmtBahrainDateTime(iso) : "not available");

/* ─── Intent detection ───────────────────────────────────────────────────── */

interface Intent {
  history: boolean;
  position: boolean;
  pastPosition: boolean;
  quantity: boolean;
  port: boolean;
  delays: boolean;
  actions: boolean;
  documents: boolean;
  missingContainer: boolean;
}

function detectIntent(q: string): Intent {
  const ql = q.toLowerCase();
  const past = /\b(was|were|had|did)\b/.test(ql);
  return {
    history: /(chronological|history|every update|all updates|updates for|timeline|show .*(updates|events))/i.test(ql),
    position: /\b(where|position|located|location)\b/.test(ql),
    pastPosition: past && /\b(where|position|located)\b/.test(ql),
    quantity: /(how much|how many|quantity|quantities|outstanding|dispatched|landed|carrying|carry|material)/.test(ql),
    port: /(port|kbsp|colombo|jebel ali|shanghai|ningbo|genoa|gothenburg|antwerp|izmir|jetty|terminal|right now|at each|customs clearance|waiting for customs|wh-askar|wh-sitra|warehouse)/.test(ql),
    delays: /(delay|slip|late|behind|exception|stale|open issues?|issue)/.test(ql),
    actions: /(action|decision|approv|who owns|owner|requires action|require action|due)/.test(ql),
    documents: /(bol\b|bols\b|bill of lading|document|packing list|invoice|certificate|container number)/.test(ql),
    missingContainer: /missing .*container|container .*missing/.test(ql),
  };
}

const PORT_WORDS = ["kbsp", "khalifa", "colombo", "jebel ali", "shanghai", "ningbo", "genoa", "gothenburg", "antwerp", "izmir", "wh-askar", "wh-sitra", "askar", "sitra"];

function extractPortQuery(q: string): string | null {
  const ql = q.toLowerCase();
  for (const w of PORT_WORDS) if (ql.includes(w)) return w;
  return null; // unknown place names are NOT guessed — the assistant asks instead
}

/* ─── Fact collection ────────────────────────────────────────────────────── */

interface Collected {
  tools: string[];
  shipments: ShipmentFacts[];
  quantities: QuantityFacts[];
  position: (PositionAsOfFacts | { error: string }) | null;
  history: EventHistoryResult | null;
  port: PortActivityFacts | null;
  delays: DelayExceptionFacts | null;
  actions: ActionStatusFacts | null;
  documents: DocumentFacts | null;
  time: ParsedQueryTime;
}

const AGGREGATE_HUBS = ["KBSP", "Colombo", "Jebel Ali"];

/** Merge several port scans into one aggregate view ("each port" / "all ports"). */
function mergePortScans(scans: PortActivityFacts[]): PortActivityFacts {
  return {
    portQuery: "each port",
    matchedAliases: scans.flatMap((s) => s.matchedAliases),
    physicallyPresent: scans.flatMap((s) => s.physicallyPresent),
    lastRecorded: scans.flatMap((s) => s.lastRecorded),
    expected: scans.flatMap((s) => s.expected),
    receivedAtDestination: scans.flatMap((s) => s.receivedAtDestination),
    cargoAtPort: scans.flatMap((s) => s.cargoAtPort),
    eventsWindow: scans.flatMap((s) => s.eventsWindow),
    totalMatchingEvents: scans.reduce((a, s) => a + s.totalMatchingEvents, 0),
  };
}

/** Returns null when the time language is ambiguous → the route asks for clarification. */
async function collectFacts(question: string): Promise<Collected | null> {
  const intent = detectIntent(question);
  const time = parseQueryTime(question);
  if (!time) return null; // ambiguous time → clarification path
  const out: Collected = {
    tools: [], shipments: [], quantities: [], position: null, history: null,
    port: null, delays: null, actions: null, documents: null, time,
  };

  const hasRef = normalizeRef(question) != null || /\b\d{4}\b/.test(question);
  const lookupNeeded = intent.position || intent.quantity || intent.history || hasRef;
  if (lookupNeeded) {
    const lookup = await shipmentLookup(question);
    out.shipments = lookup.matches;
    out.tools.push("shipmentLookup");
  }

  const refs = out.shipments.map((s) => s.ref);
  const firstRef = refs[0] ?? normalizeRef(question);

  if (firstRef && (intent.history || (intent.position && !intent.pastPosition && intent.quantity))) {
    out.history = await eventHistory(firstRef, { from: time.from, to: time.to });
    out.tools.push("eventHistory");
  }
  if (firstRef && intent.pastPosition && (time.at || time.to)) {
    out.position = await positionAsOf(firstRef, (time.at ?? time.to)!);
    out.tools.push("positionAsOf");
  }
  if (firstRef && intent.quantity) {
    const q = await quantitiesFor(firstRef);
    if (!("error" in q)) out.quantities.push(q);
    out.tools.push("quantitiesFor");
  }
  if (intent.port) {
    if (/(each|all)\s+ports?/.test(question.toLowerCase())) {
      const scans = await Promise.all(AGGREGATE_HUBS.map((h) => portActivity(h, time.from)));
      out.port = mergePortScans(scans);
      out.tools.push("portActivity");
    } else {
      const pq = extractPortQuery(question);
      if (pq) {
        out.port = await portActivity(pq, time.from);
        out.tools.push("portActivity");
      }
    }
  }
  if (intent.delays) {
    out.delays = await delaysAndExceptions();
    out.tools.push("delaysAndExceptions");
  }
  if (intent.actions) {
    out.actions = await actionStatus();
    out.tools.push("actionStatus");
  }
  if (intent.documents) {
    const bolRef = question.toUpperCase().match(/\b[A-Z]{2,5}-\d{3,5}\b/)?.[0];
    out.documents = await documentLookup(bolRef && !bolRef.startsWith("SHP-") ? bolRef : undefined);
    out.tools.push("documentLookup");
  }

  // generic fallback: nothing matched → open operational picture (delays + port)
  if (out.tools.length === 0) {
    out.delays = await delaysAndExceptions();
    out.tools.push("delaysAndExceptions");
  }
  return out;
}

/* ─── FACTS block rendering ──────────────────────────────────────────────── */

function fmtMilestoneLine(m: ShipmentFacts["milestones"][number]): string {
  const q = m.quantity != null && m.uom ? ` qty ${m.quantity} ${m.uom}` : "";
  const corr = m.correctedByEventId ? ` [CORRECTED by ${m.correctedByEventId}]` : "";
  const est = m.isEstimated ? " [estimated]" : "";
  return `${m.label}${m.location ? ` @ ${m.location}` : ""} — event ${B(m.eventTime)}, received ${B(m.receivedAt)}, source ${m.source}${est}${q}${corr}`;
}

function renderFacts(c: Collected): string {
  const lines: string[] = [];
  if (c.time.note) lines.push(`[time] interpreted: ${c.time.note} (Asia/Bahrain, UTC+3)`);

  for (const s of c.shipments) {
    const latest = s.milestones[s.milestones.length - 1];
    const mats = s.allocatedLines.map((l) => `${l.material} ${l.quantity} ${l.uom} @ ${l.unitPrice} ${l.currency}`).join("; ") || (s.allocatedNote ?? "none");
    lines.push(
      `[shipment] ${s.ref}: status ${s.status} (${s.liveStatus}), freshness ${s.freshness}, customs ${s.customsStatus ?? "unknown"}. ` +
      `Supplier ${s.supplier ?? "unlinked"}, PO ${s.poRef ?? "unlinked"}. Route ${s.route.originPort ?? "?"} → ${s.route.destinationPort ?? "?"} (${s.route.podCountry ?? "?"}) destVerified=${s.route.destVerified}. ` +
      `Vessel ${s.vessel?.name ?? "not evidenced"}${s.vessel?.position ? `, AIS position ${s.vessel.position.lat}/${s.vessel.position.lng} at ${B(s.vessel.position.at)} — vessel position, NOT a container position` : ""}. ` +
      `Containers: ${s.containers.map((x) => `${x.containerNo ?? "MISSING"} (${x.identityStatus})`).join(", ") || "none evidenced"}. ` +
      `Cargo lines: ${mats}. Latest event: ${latest ? fmtMilestoneLine(latest) : "none stored"}. ` +
      `Display ETA ${B(s.displayEta.value)} (${s.displayEta.type ?? "none"}/${s.displayEtaSource ?? "n/a"}); supplier promised ${B(s.supplierPromisedEta)}; carrier ${B(s.carrierEta)} (freshness ${s.carrierEtaFreshness}); actual arrival ${B(s.actualArrival)}. ` +
      `BOLs: ${s.bols.map((b) => `${b.bolNo} v${b.version} ${b.status}${b.active ? "" : " (SUPERSEDED)"}`).join(", ") || "none"}. ` +
      `Open exceptions: ${s.exceptions.map((x) => `${x.ref} [${x.severity}] ${x.state}`).join(", ") || "none"}.`
    );
    const ms = s.milestones.slice(-14).map(fmtMilestoneLine).join(" | ");
    if (ms) lines.push(`[milestones ${s.ref}] ${ms}`);
  }

  for (const q of c.quantities) {
    lines.push(
      `[quantities ${q.ref}] dispatched: ${q.dispatched.map((d) => `${d.quantity} ${d.uom} ${d.material}`).join("; ") || "none recorded"}. ` +
      `In transit (InventoryLot IN_TRANSIT): ${q.inTransit.map((d) => `${d.quantity} ${d.uom} ${d.material}`).join("; ") || "none recorded"}. ` +
      `Received (goods receipts): ${q.received.map((d) => `${d.quantity} ${d.uom} ${d.material} [${d.ref ?? "GRN"} ${d.status}${d.discrepancyType && d.discrepancyType !== "NONE" ? `, ${d.discrepancyType}` : ""}]`).join("; ") || "none recorded"}. ` +
      `Outstanding (allocated − received): ${q.outstanding.map((d) => `${d.quantity} ${d.uom} ${d.material}`).join("; ") || "none recorded"}.` +
      (q.note ? ` NOTE: ${q.note}` : "")
    );
  }

  if (c.position) {
    if ("error" in c.position) lines.push(`[position-as-of] ERROR: ${c.position.error}`);
    else {
      const p = c.position;
      lines.push(
        `[position-as-of ${p.ref}] as of ${B(p.at)}: ` +
        (p.milestone
          ? `${fmtMilestoneLine(p.milestone)}. ${p.statement}; ${p.eventsUpTo} events at/before, ${p.eventsAfter} after.`
          : `no stored event at or before that time (${p.statement}).`)
      );
    }
  }

  if (c.history) {
    lines.push(
      c.history.found
        ? `[event-history ${c.history.ref}] ${c.history.shown}/${c.history.total} events in window${c.time.note ? ` (${c.time.note})` : " (all)"}: ${c.history.milestones.map(fmtMilestoneLine).join(" | ") || "none in window"}`
        : `[event-history] ERROR: no shipment record ${c.history.ref}`
    );
  }

  if (c.port) {
    const p = c.port;
    lines.push(
      `[port ${p.portQuery}] matches ${p.matchedAliases.join(", ")}. ` +
      `Physically present (arrival/customs event is the LATEST event): ${p.physicallyPresent.map((x) => `${x.ref} since ${B(x.since)} (${x.lastEvent}, ${x.source})`).join("; ") || "none"}. ` +
      `Last recorded at port (later event elsewhere): ${p.lastRecorded.map((x) => `${x.ref} — ${x.lastPortEvent} ${B(x.eventTime)}${x.sinceLeft ? `, later event ${B(x.sinceLeft)}` : ""}`).join("; ") || "none"}. ` +
      `Expected: ${p.expected.map((x) => `${x.ref} (${x.basis}, ETA ${x.eta ? B(x.eta) : "n/a"})`).join("; ") || "none"}. ` +
      `Cargo quantity last recorded at this location: ${p.cargoAtPort.map((x) => `${x.ref} ${x.quantity} ${x.uom} (${x.label}, ${B(x.eventTime)})`).join("; ") || "none"}. ` +
      `Received at destination: ${p.receivedAtDestination.map((x) => `${x.ref} ${x.quantity} ${x.uom} [${x.receipt} ${x.status}]`).join("; ") || "none"}. ` +
      `Matching events${c.time.from ? " in window" : ""}: ${p.eventsWindow.length}${p.eventsWindow.length ? ` — ${p.eventsWindow.slice(0, 8).map((x) => `${x.ref} ${x.label} @ ${x.location ?? "?"} ${B(x.eventTime)}`).join("; ")}` : ""}.`
    );
  }

  if (c.delays) {
    const d = c.delays;
    lines.push(
      `[delays] open exception cases: ${d.openCases.map((x) => `${x.ref} [${x.severity}] ${x.state} "${x.title}" — owner ${x.owner ?? "unassigned"}, due ${B(x.dueDate)}, entity ${x.entityRef ?? "n/a"}${x.shipmentRef ? `, shipment ${x.shipmentRef}` : ""}${x.recommendedAction ? `; recommended: ${x.recommendedAction.slice(0, 160)}` : ""}`).join(" | ") || "none"}. ` +
      `Delayed (carrier ETA > supplier promise + 36h): ${d.delayedShipments.map((x) => `${x.ref} slip ${x.slipHours}h (supplier ${B(x.supplierPromisedEta)} → carrier ${B(x.carrierEta)}); evidence: ${x.evidence.join("; ")}`).join(" | ") || "none"}. ` +
      `Stale/unavailable tracking: ${d.staleShipments.map((x) => `${x.ref} (${x.freshness}, last event ${x.lastEventAt ? B(x.lastEventAt) : "never"} via ${x.lastEventSource ?? "n/a"})`).join("; ") || "none"}.`
    );
  }

  if (c.actions) {
    const a = c.actions;
    lines.push(
      `[actions] awaiting approval: ${a.awaitingApproval.map((x) => `${x.ref} (${x.commandType}, ${x.riskLevel}, target ${x.targetRef ?? "n/a"}, case ${x.caseRef ?? "n/a"}, case due ${B(x.caseDue)}, requested by ${x.requestedBy})`).join("; ") || "none"}. ` +
      `Overdue (case due date passed, not closed): ${a.overdue.map((x) => `${x.ref} (${x.commandType}, ${x.state}, case ${x.caseRef ?? "n/a"}, due ${B(x.dueDate)}, owner ${x.owner ?? "unassigned"})`).join("; ") || "none"}. ` +
      `In flight: ${a.inFlight.map((x) => `${x.ref} (${x.commandType}, ${x.state}, case ${x.caseRef ?? "n/a"})`).join("; ") || "none"}. ` +
      `Verified closures: ${a.verifiedClosures.map((x) => `${x.caseRef} "${x.title}" closed ${B(x.closedAt)}; proof: ${x.closureProof.slice(0, 140)}; actions ${x.actions.map((ac) => `${ac.ref}${ac.verifiedAt ? ` verified ${B(ac.verifiedAt)}` : ""}`).join(", ") || "none"}`).join(" | ") || "none"}.`
    );
  }

  if (c.documents) {
    const d = c.documents;
    const missing = d.bols.filter((b) => b.missingContainerNo).map((b) => `${b.bolNo} v${b.version}${b.active ? "" : " (SUPERSEDED)"}${b.shipmentRef ? ` (shipment ${b.shipmentRef})` : " (no shipment linked)"}`);
    const unresolved = d.bols.filter((b) => !b.missingContainerNo && b.containers.some((x) => x.identityStatus === "UNRESOLVED")).map((b) => `${b.bolNo} v${b.version} (container recorded but identity UNRESOLVED)`);
    lines.push(
      `[documents] BOLs: ${d.bols.map((b) => `${b.bolNo} v${b.version}${b.active ? "" : " (SUPERSEDED)"} ${b.status}, match ${b.matchStatus}, shipment ${b.shipmentRef ?? "NONE"}, containers [${b.containers.map((x) => `${x.containerNo ?? "MISSING"}:${x.identityStatus}`).join(", ") || "none"}]${b.supersededBy.length ? `, superseded by ${b.supersededBy.join(",")}` : ""}${b.failedFields.length ? `, failed fields: ${b.failedFields.join(",")}` : ""}`).join(" | ") || "none"}. ` +
      (missing.length ? `DETERMINISTIC ANSWER — BOLs missing a container number: ${missing.join("; ")}. ` : "DETERMINISTIC ANSWER — no BOL is missing a container number. ") +
      (unresolved.length ? `Identity UNRESOLVED (number recorded, not verified): ${unresolved.join("; ")}. ` : "") +
      `Other documents: ${d.documents.map((x) => `${x.docType} ${x.refNo ?? "(no ref)"} ${x.fileName} (shipment ${x.shipmentRef ?? "n/a"}, BOL ${x.bolNo ?? "n/a"}, ${x.ocrStatus})`).join("; ") || "none"}.`
    );
  }

  return lines.join("\n");
}

/* ─── Data-quality + structured answer builders ──────────────────────────── */

function dataQualityFor(s: ShipmentFacts): string {
  const last = s.milestones[s.milestones.length - 1];
  const estimated = last?.isEstimated ?? false;
  const corrected = s.milestones.some((m) => m.correctedByEventId);
  if (s.freshness === "unavailable") return "unavailable";
  if (s.freshness === "stale") return `stale — last event ${last ? B(last.eventTime) : "never"} (${last?.source ?? "n/a"})`;
  if (estimated) return "estimated — latest milestone is an estimate";
  if (s.freshness === "aging") return "aging — treat as indicative, not current";
  return corrected ? "verified (fresh, includes corrected events)" : "verified (fresh)";
}

function shipmentSections(s: ShipmentFacts, q: QuantityFacts | null, p: PositionAsOfFacts | null, h: EventHistoryResult | null): AssistantSection[] {
  const sections: AssistantSection[] = [];
  const latest = s.milestones[s.milestones.length - 1];

  const cargo = s.allocatedLines.length
    ? s.allocatedLines.map((l) => `${l.material} — ${l.quantity} ${l.uom} @ ${l.unitPrice} ${l.currency} (${l.sku})`)
    : [s.allocatedNote ?? "no allocated cargo lines recorded"];
  sections.push({
    key: "shipment", label: "Shipment",
    lines: [`${s.ref} — ${s.mode.toLowerCase()} · carrier ${s.carrier ?? "n/a"} · supplier ${s.supplier ?? "unlinked"} · PO ${s.poRef ?? "unlinked"}`, ...cargo],
  });

  sections.push({
    key: "current_state", label: "Current state",
    lines: [
      `Status ${s.status} (${s.liveStatus})${s.customsStatus ? ` · customs: ${s.customsStatus}` : ""}`,
      latest ? `Latest event: ${latest.label}${latest.location ? ` @ ${latest.location}` : ""} — ${B(latest.eventTime)} (${latest.source}${latest.isEstimated ? ", estimated" : ", confirmed"})` : "No milestones stored in the connected records",
    ],
  });

  const locLines: string[] = [];
  if (p) {
    locLines.push(
      p.milestone
        ? `${p.milestone.label}${p.milestone.location ? ` @ ${p.milestone.location}` : ""} — event time ${B(p.milestone.eventTime)} (${p.milestone.source})`
        : `No stored event at or before that time — last known event is later or none exists`
    );
    locLines.push(p.statement.charAt(0).toUpperCase() + p.statement.slice(1) + ".");
  } else if (latest) {
    if (latest.code === "underway" && s.vessel?.position) {
      locLines.push(`Vessel position ${s.vessel.position.lat}°, ${s.vessel.position.lng}° (AIS) at ${B(s.vessel.position.at)} — vessel position, not a confirmed container position`);
    } else {
      locLines.push(`Last recorded: ${latest.label}${latest.location ? ` @ ${latest.location}` : ""} — ${B(latest.eventTime)} (${latest.source})`);
    }
    const unresolved = s.containers.filter((x) => x.identityStatus !== "RESOLVED");
    if (unresolved.length) locLines.push(`Container identity not resolved (${unresolved.map((x) => x.containerNo ?? "missing no.").join(", ")}) — position applies to the transport, not the cargo`);
  } else {
    locLines.push("No current verified position is available");
    locLines.push("No stored events for this shipment — a carrier/port event feed or milestone record is missing");
  }
  sections.push({ key: "location", label: "Location", lines: locLines });

  if (q) {
    const qLines = [
      `Dispatched: ${q.dispatched.map((d) => `${d.quantity} ${d.uom} ${d.material}`).join("; ") || "not recorded"}`,
      `In transit: ${q.inTransit.map((d) => `${d.quantity} ${d.uom} ${d.material}`).join("; ") || "no in-transit inventory lots recorded for this shipment"}`,
      `Received: ${q.received.map((d) => `${d.quantity} ${d.uom} ${d.material} [${d.ref ?? "GRN"}${d.status ? `, ${d.status}` : ""}]`).join("; ") || "no goods receipts recorded"}`,
      `Outstanding: ${q.outstanding.map((d) => `${d.quantity} ${d.uom} ${d.material}`).join("; ") || "not computable from records"}`,
    ];
    if (q.note) qLines.push(q.note);
    sections.push({ key: "quantity", label: "Quantity", lines: qLines });
  }

  const tLines = latest
    ? [`Event time ${B(latest.eventTime)} · received by platform ${B(latest.receivedAt)} · source ${latest.source}`, `Last successful source update: ${s.lastEvent.at ? B(s.lastEvent.at) : "not available"} (${s.lastEvent.source ?? "n/a"})`]
    : ["Event time: not available (no stored events)"];
  sections.push({ key: "time", label: "Time", lines: tLines });

  const legLines = s.legs.length
    ? s.legs.map((l) => `#${l.seq} ${l.mode}: ${l.fromPoint ?? "?"} → ${l.toPoint ?? "?"} [${l.status}]${l.carrier ? ` · ${l.carrier}` : ""}`)
    : [`Route ${s.route.originPort ?? "?"} → ${s.route.destinationPort ?? "?"} (no leg records)`];
  sections.push({
    key: "route", label: "Route",
    lines: [...legLines, `Destination verified: ${s.route.destVerified ? "yes — Bahrain (KBSP)" : "no validated Bahrain destination in the record"}`],
  });

  const etaLines: string[] = [];
  if (s.actualArrival) etaLines.push(`Arrived (actual): ${B(s.actualArrival)} — verified`);
  if (s.displayEta.value) etaLines.push(`Display ETA: ${B(s.displayEta.value)} (${s.displayEta.type ?? "unknown type"} / ${s.displayEtaSource ?? "unknown source"}) — estimated`);
  if (s.supplierPromisedEta) etaLines.push(`Supplier promised: ${B(s.supplierPromisedEta)} — contractual estimate`);
  if (s.carrierEta) etaLines.push(`Carrier ETA: ${B(s.carrierEta)} (freshness: ${s.carrierEtaFreshness}) — estimated`);
  for (const e of s.etas.slice(0, 2)) etaLines.push(`${e.estimateType} observation: ${e.etaValue ? B(e.etaValue) : "insufficient data"} (${e.sourceName}, calculated ${B(e.calculatedAt)}${e.confidence != null ? `, confidence ${e.confidence}` : ""})`);
  if (!s.actualArrival && !s.displayEta.value && !s.carrierEta && !s.supplierPromisedEta) etaLines.push("ETA unavailable — no carrier, port or supplier estimate on record");
  sections.push({ key: "eta", label: "ETA", lines: etaLines });

  const evLines = [
    ...s.bols.map((b) => `BOL ${b.bolNo} v${b.version} (${b.status}${b.active ? "" : ", superseded"})`),
    latest ? `Milestone event via ${latest.source} (provider event retained, received ${B(latest.receivedAt)})` : null,
    ...s.evidence.map((e) => `${e.entityRef} — ${e.sourceSystem} (${e.label})`),
  ].filter((x): x is string => Boolean(x));
  sections.push({ key: "evidence", label: "Evidence", lines: evLines.length ? evLines : ["No source evidence records linked"] });

  sections.push({ key: "data_quality", label: "Data quality", lines: [dataQualityFor(s)] });

  if (s.exceptions.length) {
    sections.push({
      key: "next_action", label: "Next action",
      lines: s.exceptions.map((x) => `${x.ref} [${x.severity}] ${x.title} (${x.state}) — follow exception case for the recommended step`),
    });
  }

  if (h && h.found) {
    sections.push({
      key: "history", label: "Event history",
      lines: [`${h.shown} of ${h.total} stored events shown — full chronology below`],
    });
  }
  return sections;
}

function buildStructured(c: Collected): AssistantStructured | undefined {
  const sections: AssistantSection[] = [];
  const s = c.shipments[0];

  // shipment-centric answer
  if (s) {
    const q = c.quantities.find((x) => x.ref === s.ref) ?? null;
    const p = c.position && !("error" in c.position) && c.position.ref === s.ref ? c.position : null;
    const h = c.history?.found ? c.history : null;
    sections.push(...shipmentSections(s, q, p, h));
  }

  // port-centric answer
  if (c.port) {
    const p = c.port;
    sections.push({ key: "port", label: "Port", lines: [`Query "${p.portQuery}" → ${p.matchedAliases.join(", ")}`] });
    sections.push({
      key: "physically_present", label: "Physically present now",
      lines: p.physicallyPresent.map((x) => `${x.ref} — ${x.lastEvent} at ${B(x.eventTime)} (${x.source})`).concat(p.physicallyPresent.length ? [] : ["No shipment has an arrival/customs event as its latest event at this port"]),
    });
    sections.push({
      key: "last_recorded", label: "Last recorded at port",
      lines: p.lastRecorded.map((x) => `${x.ref} — ${x.lastPortEvent}, ${B(x.eventTime)}${x.sinceLeft ? ` (later event ${B(x.sinceLeft)})` : ""}`).concat(p.lastRecorded.length ? [] : ["None"]),
    });
    sections.push({
      key: "expected", label: "Expected",
      lines: p.expected.map((x) => `${x.ref} — ${x.basis}${x.eta ? `, ETA ${B(x.eta)}` : " (ETA not available)"}`).concat(p.expected.length ? [] : ["None"]),
    });
    if (p.cargoAtPort.length) {
      sections.push({ key: "cargo_at_port", label: "Cargo last recorded at port", lines: p.cargoAtPort.map((x) => `${x.ref} — ${x.quantity} ${x.uom} (${x.label}, ${B(x.eventTime)})`) });
    }
    if (p.receivedAtDestination.length) {
      sections.push({ key: "received", label: "Confirmed received", lines: p.receivedAtDestination.map((x) => `${x.ref} — ${x.quantity} ${x.uom} [${x.receipt}, ${x.status}]`) });
    }
    sections.push({
      key: "events", label: "Events recorded",
      lines: [`${p.eventsWindow.length} matching event(s)${c.time.note ? ` (${c.time.note})` : ""}`],
    });
  }

  // delays / exceptions
  if (c.delays) {
    const d = c.delays;
    if (d.openCases.length) {
      sections.push({
        key: "open_exceptions", label: "Open exceptions",
        lines: d.openCases.map((x) => `${x.ref} [${x.severity}] ${x.title} — ${x.state}, owner ${x.owner ?? "unassigned"}, due ${B(x.dueDate)}${x.shipmentRef ? `, shipment ${x.shipmentRef}` : ""}`),
      });
    }
    if (d.delayedShipments.length) {
      sections.push({
        key: "delayed", label: "Delayed (>36h slip)",
        lines: d.delayedShipments.map((x) => `${x.ref} — slip ${x.slipHours}h (supplier ${B(x.supplierPromisedEta)} → carrier ${B(x.carrierEta)})`),
      });
    }
    if (d.staleShipments.length) {
      sections.push({ key: "stale", label: "Stale tracking", lines: d.staleShipments.map((x) => `${x.ref} — ${x.freshness}, last event ${x.lastEventAt ? B(x.lastEventAt) : "never"}`) });
    }
    if (!d.openCases.length && !d.delayedShipments.length && !d.staleShipments.length) {
      sections.push({ key: "clean", label: "Status", lines: ["No open exception cases, no >36h ETA slips, no stale tracking in connected records"] });
    }
  }

  // actions / decisions
  if (c.actions) {
    const a = c.actions;
    if (a.awaitingApproval.length) sections.push({ key: "awaiting_approval", label: "Decisions awaiting approval", lines: a.awaitingApproval.map((x) => `${x.ref} — ${x.commandType} (${x.riskLevel}) target ${x.targetRef ?? "n/a"}, case ${x.caseRef ?? "n/a"}, case due ${B(x.caseDue)}`) });
    if (a.overdue.length) sections.push({ key: "overdue", label: "Overdue actions", lines: a.overdue.map((x) => `${x.ref} — ${x.commandType} (${x.state}), case ${x.caseRef ?? "n/a"}, due ${B(x.dueDate)}, owner ${x.owner ?? "unassigned"}`) });
    if (a.inFlight.length) sections.push({ key: "in_flight", label: "In flight", lines: a.inFlight.map((x) => `${x.ref} — ${x.commandType} (${x.state}), case ${x.caseRef ?? "n/a"}`) });
    if (a.verifiedClosures.length) sections.push({ key: "verified_closures", label: "Verified closures", lines: a.verifiedClosures.map((x) => `${x.caseRef} — ${x.title}: ${x.closureProof.slice(0, 160)}`) });
  }

  // documents
  if (c.documents) {
    const d = c.documents;
    if (d.bols.length) sections.push({ key: "bols", label: "Bills of lading", lines: d.bols.map((b) => `${b.bolNo} v${b.version}${b.active ? "" : " (SUPERSEDED)"} — ${b.status}, match ${b.matchStatus}, shipment ${b.shipmentRef ?? "NONE"}${b.missingContainerNo ? ", MISSING container number" : `, container ${b.containers.map((x) => x.containerNo ?? "missing").join(", ")}`}`) });
    if (d.documents.length) sections.push({ key: "docs", label: "Other documents", lines: d.documents.map((x) => `${x.docType} ${x.refNo ?? "(no ref)"} — ${x.fileName} (shipment ${x.shipmentRef ?? "n/a"})`) });
  }

  if (!sections.length) return undefined;

  const structured: AssistantStructured = { sections };
  if (s) {
    structured.ref = s.ref;
    structured.shipmentRef = s.ref;
  }
  if (c.history?.found && c.history.milestones.length) {
    structured.asOfEvents = c.history.milestones.map((m) => ({ label: `${m.label}${m.location ? ` @ ${m.location}` : ""} (${m.source}${m.isEstimated ? ", estimated" : ""})`, eventTime: fmtBahrainDateTime(m.eventTime) }));
  } else if (c.position && !("error" in c.position) && c.position.milestone) {
    structured.asOfEvents = [{ label: `${c.position.milestone.label}${c.position.milestone.location ? ` @ ${c.position.milestone.location}` : ""} — position as of query time`, eventTime: fmtBahrainDateTime(c.position.milestone.eventTime) }];
  }
  return structured;
}

/* ─── POST handler ───────────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { question?: string } | null;
  const question = body?.question?.trim();
  if (!question) return err("BAD_REQUEST", "question is required", 400);
  if (question.length > 2000) return err("BAD_REQUEST", "question too long", 400);

  const asOf = new Date();
  const asOfStr = asOf.toISOString();
  const sources: string[] = [];

  // 1. deterministic retrieval (null → ambiguous time → clarification, Phase 6.1/6.3)
  const collected = await collectFacts(question);
  if (!collected) {
    const answer =
      "The time in your question is ambiguous, so I won't guess. Please restate it with an explicit Bahrain date and time " +
      "(e.g. \u201cat 14:00 Bahrain time on 15 Oct 2026\u201d, or \u201cbetween 08:00 and 12:00 yesterday\u201d). " +
      "Ambiguities I cannot resolve: hours 1\u201312 without am/pm, \u201con the 14th\u201d without a month, or two different dates in one question.";
    return ok({ answer, as_of: asOfStr, sources, dataQuality: "unavailable" } satisfies AssistantResponse);
  }
  for (const s of collected.shipments) sources.push(`shipment:${s.ref}`);
  if (collected.position) sources.push("tool:positionAsOf");
  if (collected.history?.found) sources.push(`milestones:${collected.history.ref}`);
  for (const q of collected.quantities) {
    sources.push(`po-lines:${q.ref}`);
    if (q.inTransit.length) sources.push(`inventory:${q.ref}`);
    if (q.received.length) sources.push(`goods-receipts:${q.ref}`);
  }
  if (collected.port) sources.push("milestones:port-scan");
  if (collected.delays) {
    sources.push("exception-cases:open");
    if (collected.delays.delayedShipments.length) sources.push("eta-observations:active");
  }
  if (collected.actions) sources.push("actions+approvals");
  if (collected.documents) sources.push("bols+documents");

  // 2. deterministic structured payload (LLM-independent)
  const structured = buildStructured(collected);
  const primaryShip = collected.shipments[0];
  const dataQuality = primaryShip ? dataQualityFor(primaryShip) : undefined;

  // 3. FACTS block
  const factsBlock = [
    `AS_OF: ${fmtBahrainDateTime(asOfStr)} (Asia/Bahrain, UTC+3)`,
    collected.time.note ? `TIME INTERPRETED FROM QUESTION: ${collected.time.note}` : null,
    "FACTS (deterministic tool output — cite only these records):",
    renderFacts(collected).slice(0, FACTS_CAP),
  ].filter(Boolean).join("\n");

  // 4. LLM phrasing under strict structured format
  const system = [
    "You are the NASS Operations Assistant for the NASS Closed-Loop Control Tower (Bahrain).",
    "You answer ONLY from the FACTS block below. You have no other knowledge of positions, events, ETAs, quantities or decisions.",
    "",
    "ANSWER FORMAT — use short headed sections, ONLY those supported by the facts, in this order:",
    "Shipment / Current state / Location / Quantity / Time / Route / ETA / Evidence / Data quality / Next action",
    "For port/exception/action/document questions use matching labels instead (e.g. Physically present / Expected / Open exceptions / Decisions awaiting approval).",
    "",
    "RULES (non-negotiable):",
    "1. Never print an empty section. Skip sections the facts do not support.",
    "2. ALL timestamps in Bahrain local time (UTC+3, AST) — copy the formatted times from the facts; never recompute or shift them.",
    "3. Label data verified / estimated / simulated / stale / unavailable. A vessel AIS position is NOT a container position.",
    "4. Never fabricate positions, events, port calls, ETAs, quantities or closures. If records are missing, say exactly what is missing.",
    "5. Use the 'Next action' section ONLY for exception-driven steps present in the facts (open cases, recommended actions, approvals needed) — never for generic advice like 'monitor'.",
    "6. Say exactly 'No current verified position is available' ONLY in the Location section, and ONLY when the facts show no reliable current position (no/stale events); then give last known position + timestamp and what data is missing.",
    "7. If multiple shipments or ports match the question, ask ONE clarifying question instead of guessing.",
    "8. Distinguish physically-present cargo from quantity last-recorded, expected, and received.",
    "9. Historical questions: positions are reconstructed from stored events, not interpolated — say so.",
    "10. Where the facts include a line starting 'DETERMINISTIC ANSWER', reproduce its list verbatim — do not re-classify or extend it yourself.",
    "11. Max 180 words. Then a final line 'Sources: …' listing the record refs you used.",
  ].join("\n");

  let answer: string;
  let degraded = false;
  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: `${system}\n\n${factsBlock}` },
        { role: "user", content: question },
      ],
      thinking: { type: "disabled" },
    });
    answer = completion.choices[0]?.message?.content?.trim() || "";
    if (!answer) throw new Error("empty completion");
  } catch {
    // Degrade safely (Rule 10): deterministic answer from the structured payload alone.
    degraded = true;
    answer = structured
      ? structured.sections.map((sec) => `${sec.label}: ${sec.lines.join(" | ")}`).join("\n")
      : "No matching source records retrieved for this question in the connected operational store.";
    answer += "\n\n(Assistant model unavailable — deterministic fallback from retrieved records; core workflows unaffected.)";
  }

  // deterministic note for as-of/time interpretation when the model is up
  if (!degraded && collected.time.note) {
    answer += `\n\nTime interpreted: ${collected.time.note}.`;
  }

  return ok({
    answer,
    as_of: asOfStr,
    sources,
    degraded: degraded || undefined,
    structured,
    dataQuality,
  } satisfies AssistantResponse);
}
