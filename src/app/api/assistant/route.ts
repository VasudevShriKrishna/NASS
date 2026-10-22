/**
 * ============================================================================
 * [HIDDEN & COMMENTED OUT] NASS Operations Assistant -- API Endpoint (/api/assistant)
 * ============================================================================
 * The Operations Assistant chatbot has been removed and its API endpoint is disabled.
 * All original endpoint logic, facts-block generation, and tool router are preserved
 * below in commented form.
 */
// import { NextRequest } from "next/server";
// import { db } from "@/lib/db";
// import { ok, err } from "@/lib/api";
// import { fmtBahrainDateTime } from "@/lib/bahrain-time";
// import type {
//   AssistantResponse,
//   AssistantSection,
//   AssistantStructured,
//   AssistantNavigationAction,
//   AssistantReportAction,
// } from "@/lib/assistant-types";
// import {
//   parseQueryTime,
//   shipmentLookup,
//   eventHistory,
//   positionAsOf,
//   quantitiesFor,
//   portActivity,
//   delaysAndExceptions,
//   actionStatus,
//   documentLookup,
//   normalizeRef,
//   projectPortfolioFacts,
//   materialRequirementFacts,
//   ceoDecisionFacts,
//   priceIntelligenceFacts,
//   type ShipmentFacts,
//   type QuantityFacts,
//   type PositionAsOfFacts,
//   type PortActivityFacts,
//   type DelayExceptionFacts,
//   type ActionStatusFacts,
//   type DocumentFacts,
//   type ParsedQueryTime,
//   type EventHistoryResult,
//   type ProjectPortfolioFacts,
//   type MaterialRequirementFacts,
//   type CeoDecisionFacts,
//   type PriceFacts,
// } from "@/lib/assistant-tools";
// 
// export const dynamic = "force-dynamic";
// 
// /**
//  * M20 / Phase 6 â€” NASS Operations & Executive Control Tower Assistant.
//  * Query contract: deterministic query tools FIRST (assistant-tools.ts), then a
//  * compact FACTS block, then the LLM phrases the answer under a strict structured
//  * format. The model has NO write path and CANNOT invent data; the response also
//  * carries a deterministic `structured` payload built purely from tool output so
//  * the UI can render grounded cards even if the model is unavailable (Rule 10).
//  */
// 
// const FACTS_CAP = 5500;
// 
// const B = (iso: string | null | undefined): string => (iso ? fmtBahrainDateTime(iso) : "not available");
// 
// /* â”€â”€â”€ Intent detection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
// 
// interface Intent {
//   history: boolean;
//   position: boolean;
//   pastPosition: boolean;
//   quantity: boolean;
//   port: boolean;
//   delays: boolean;
//   actions: boolean;
//   documents: boolean;
//   missingContainer: boolean;
//   projects: boolean;
//   materials: boolean;
//   ceoDecisions: boolean;
//   pricing: boolean;
//   shipments: boolean;
// }
// 
// function detectIntent(q: string): Intent {
//   const ql = q.toLowerCase();
//   const past = /\b(was|were|had|did)\b/.test(ql);
//   return {
//     history: /(chronological|history|every update|all updates|updates for|timeline|show .*(updates|events))/i.test(ql),
//     position: /\b(where|position|located|location|radar|coordinates)\b/.test(ql),
//     pastPosition: past && /\b(where|position|located)\b/.test(ql),
//     quantity: /(how much|how many|quantity|quantities|outstanding|dispatched|landed|carrying|carry|units|tonnes)/.test(ql),
//     port: /(port|kbsp|colombo|jebel ali|shanghai|ningbo|genoa|gothenburg|antwerp|izmir|jetty|terminal|right now|at each|customs clearance|waiting for customs|wh-askar|wh-sitra|warehouse)/.test(ql),
//     delays: /(delay|slip|late|behind|exception|stale|open issues?|issue)/.test(ql),
//     actions: /(action|decision|approv|who owns|owner|requires action|require action|due)/.test(ql),
//     documents: /(bol\b|bols\b|bill of lading|document|packing list|invoice|certificate|container number)/.test(ql),
//     missingContainer: /missing .*container|container .*missing/.test(ql),
//     projects: /(project|portfolio|active project|falcon|airport|al raffa|raffa|kamc|medical city|marina|bahrain marina|rcsi|campus|alba|historical project|what is nass building)/i.test(ql),
//     materials: /(material|boq|requirement|shortage|on hand|stockout|gabbro|rebar|cement|asphalt|elevator|chemicals|waterproofing|bearing)/i.test(ql),
//     ceoDecisions: /(ceo|executive decision|recommendation|decision tower|approval needed|executive approval|action command|ceo approval)/i.test(ql),
//     pricing: /(price|pricing|benchmark|landed cost|unit price|po price|market rate|cost impact|variance)/i.test(ql),
//     shipments: /(shipment|shipments|vessel|vessels|barge|cargo|container|freight|transit|china|shanghai|ningbo|genoa|gothenburg|izmir|antwerp|corridor|route|inbound|consignment|started to come|on the way|en route|track ship|which ship|what ship|all details|open this|open that)/i.test(ql),
//     traceability: /(traceability|live trace|traditional duty|duty data|tresa disability|treasa|disability data|all live|all data|telemetry|track all|tracking data)/i.test(ql),
//     reportSummary: /(pdf|report|download|export|print|dossier|document|summary)/i.test(ql),
//   };
// }
// 
// const PORT_WORDS = ["kbsp", "khalifa", "colombo", "jebel ali", "shanghai", "ningbo", "genoa", "gothenburg", "antwerp", "izmir", "wh-askar", "wh-sitra", "askar", "sitra"];
// 
// function extractPortQuery(q: string): string | null {
//   const ql = q.toLowerCase();
//   for (const w of PORT_WORDS) if (ql.includes(w)) return w;
//   return null;
// }
// 
// /* â”€â”€â”€ Fact collection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
// 
// interface Collected {
//   tools: string[];
//   shipments: ShipmentFacts[];
//   quantities: QuantityFacts[];
//   position: (PositionAsOfFacts | { error: string }) | null;
//   history: EventHistoryResult | null;
//   port: PortActivityFacts | null;
//   delays: DelayExceptionFacts | null;
//   actions: ActionStatusFacts | null;
//   documents: DocumentFacts | null;
//   projects: ProjectPortfolioFacts | null;
//   materials: MaterialRequirementFacts | null;
//   ceoDecisions: CeoDecisionFacts | null;
//   pricing: PriceFacts | null;
//   time: ParsedQueryTime;
// }
// 
// const AGGREGATE_HUBS = ["KBSP", "Colombo", "Jebel Ali"];
// 
// function mergePortScans(scans: PortActivityFacts[]): PortActivityFacts {
//   return {
//     portQuery: "each port",
//     matchedAliases: scans.flatMap((s) => s.matchedAliases),
//     physicallyPresent: scans.flatMap((s) => s.physicallyPresent),
//     lastRecorded: scans.flatMap((s) => s.lastRecorded),
//     expected: scans.flatMap((s) => s.expected),
//     receivedAtDestination: scans.flatMap((s) => s.receivedAtDestination),
//     cargoAtPort: scans.flatMap((s) => s.cargoAtPort),
//     eventsWindow: scans.flatMap((s) => s.eventsWindow),
//     totalMatchingEvents: scans.reduce((a, s) => a + s.totalMatchingEvents, 0),
//   };
// }
// 
// async function collectFacts(question: string): Promise<Collected | null> {
//   const intent = detectIntent(question);
//   const time = parseQueryTime(question);
//   if (!time) return null;
//   const out: Collected = {
//     tools: [], shipments: [], quantities: [], position: null, history: null,
//     port: null, delays: null, actions: null, documents: null,
//     projects: null, materials: null, ceoDecisions: null, pricing: null,
//     time,
//   };
// 
//   const hasRef = normalizeRef(question) != null || /\b\d{4}\b/.test(question);
//   const lookupNeeded = intent.shipments || intent.position || intent.quantity || intent.history || hasRef || /(which|what|show|find|list|track).*shipment/i.test(question);
//   if (lookupNeeded) {
//     const lookup = await shipmentLookup(question);
//     out.shipments = lookup.matches;
//     out.tools.push("shipmentLookup");
//   }
// 
//   const refs = out.shipments.map((s) => s.ref);
//   const firstRef = refs[0] ?? normalizeRef(question);
// 
//   if (firstRef && (intent.history || (intent.position && !intent.pastPosition && intent.quantity))) {
//     out.history = await eventHistory(firstRef, { from: time.from, to: time.to });
//     out.tools.push("eventHistory");
//   }
//   if (firstRef && intent.pastPosition && (time.at || time.to)) {
//     out.position = await positionAsOf(firstRef, (time.at ?? time.to)!);
//     out.tools.push("positionAsOf");
//   }
//   const wantsDetails = /(detail|details|info|all details|what is carrying|cargo)/i.test(question);
//   if (out.shipments.length && (intent.quantity || wantsDetails)) {
//     for (const s of out.shipments.slice(0, 3)) {
//       const q = await quantitiesFor(s.ref);
//       if (!("error" in q)) out.quantities.push(q);
//     }
//     out.tools.push("quantitiesFor");
//   }
//   if (intent.port) {
//     if (/(each|all)\s+ports?/.test(question.toLowerCase())) {
//       const scans = await Promise.all(AGGREGATE_HUBS.map((h) => portActivity(h, time.from)));
//       out.port = mergePortScans(scans);
//       out.tools.push("portActivity");
//     } else {
//       const pq = extractPortQuery(question);
//       if (pq) {
//         out.port = await portActivity(pq, time.from);
//         out.tools.push("portActivity");
//       }
//     }
//   }
//   if (intent.delays) {
//     out.delays = await delaysAndExceptions();
//     out.tools.push("delaysAndExceptions");
//   }
//   if (intent.actions) {
//     out.actions = await actionStatus();
//     out.tools.push("actionStatus");
//   }
//   if (intent.documents) {
//     const bolRef = question.toUpperCase().match(/\b[A-Z]{2,5}-\d{3,5}\b/)?.[0];
//     out.documents = await documentLookup(bolRef && !bolRef.startsWith("SHP-") ? bolRef : undefined);
//     out.tools.push("documentLookup");
//   }
// 
//   // Add-on Executive Tools
//   if (intent.projects) {
//     out.projects = await projectPortfolioFacts(question);
//     out.tools.push("projectPortfolioFacts");
//   }
//   if (intent.materials) {
//     out.materials = await materialRequirementFacts(question);
//     out.tools.push("materialRequirementFacts");
//   }
//   if (intent.ceoDecisions) {
//     out.ceoDecisions = await ceoDecisionFacts();
//     out.tools.push("ceoDecisionFacts");
//   }
//   if (intent.pricing) {
//     out.pricing = await priceIntelligenceFacts(question);
//     out.tools.push("priceIntelligenceFacts");
//   }
// 
//   // Comprehensive Traceability & Report Summaries
//   if (intent.traceability || (intent.reportSummary && !intent.projects && !out.shipments.length)) {
//     if (!out.ceoDecisions) {
//       out.ceoDecisions = await ceoDecisionFacts();
//       out.tools.push("ceoDecisionFacts");
//     }
//     if (!out.projects) {
//       out.projects = await projectPortfolioFacts("all projects");
//       out.tools.push("projectPortfolioFacts");
//     }
//     if (!out.delays) {
//       out.delays = await delaysAndExceptions();
//       out.tools.push("delaysAndExceptions");
//     }
//     if (!out.shipments.length) {
//       const lookup = await shipmentLookup("inbound shipments");
//       out.shipments = lookup.matches;
//       out.tools.push("shipmentLookup");
//     }
//     if (!out.pricing) {
//       out.pricing = await priceIntelligenceFacts("material pricing");
//       out.tools.push("priceIntelligenceFacts");
//     }
//   }
// 
//   // fallback
//   if (out.tools.length === 0) {
//     out.delays = await delaysAndExceptions();
//     out.tools.push("delaysAndExceptions");
//     out.ceoDecisions = await ceoDecisionFacts();
//     out.tools.push("ceoDecisionFacts");
//   }
//   return out;
// }
// 
// /* â”€â”€â”€ FACTS block rendering â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
// 
// function fmtMilestoneLine(m: ShipmentFacts["milestones"][number]): string {
//   const q = m.quantity != null && m.uom ? ` qty ${m.quantity} ${m.uom}` : "";
//   const corr = m.correctedByEventId ? ` [CORRECTED by ${m.correctedByEventId}]` : "";
//   const est = m.isEstimated ? " [estimated]" : "";
//   return `${m.label}${m.location ? ` @ ${m.location}` : ""} â€” event ${B(m.eventTime)}, received ${B(m.receivedAt)}, source ${m.source}${est}${q}${corr}`;
// }
// 
// function renderFacts(c: Collected): string {
//   const lines: string[] = [];
//   if (c.time.note) lines.push(`[time] interpreted: ${c.time.note} (Asia/Bahrain, UTC+3)`);
// 
//   // Projects facts
//   if (c.projects) {
//     const p = c.projects;
//     lines.push(
//       `[projects] Portfolio status â€” Confirmed Active: ${p.totalActive}, Pending Confirmation: ${p.totalPending}, Historical: ${p.totalHistorical}. ` +
//       p.projects.map((x) => `${x.code}: "${x.name}" [status: ${x.status}] @ ${x.site} (contract entity: ${x.legalEntity ?? "NASS Group"}, work package: ${x.workPackage ?? "n/a"}, BOQ items: ${x.requirementsCount}, open shortages: ${x.openShortages}, PO count: ${x.posCount})`).join(" | ")
//     );
//   }
// 
//   // Material requirements facts
//   if (c.materials) {
//     const m = c.materials;
//     lines.push(
//       `[material-requirements] ${m.requirements.map((r) => `${r.projectCode} -> ${r.materialName} (${r.materialSku}): needed ${r.quantity} ${r.uom} by ${B(r.requiredOnSite)}, status: ${r.status} (${r.criticality}), allocated stock: ${r.allocatedInventory} ${r.uom}, shortfall: ${r.shortfall} ${r.uom}${r.orderedPo ? `, PO: ${r.orderedPo} (ordered ${r.orderedQty ?? "?"})` : ", NO PO PLACED"}${r.inboundShipment ? `, inbound shipment: ${r.inboundShipment}` : ""}`).join(" | ") || "none recorded"}`
//     );
//   }
// 
//   // CEO decisions facts
//   if (c.ceoDecisions) {
//     const cd = c.ceoDecisions;
//     lines.push(
//       `[ceo-decisions] Active executive action recommendations: ` +
//       cd.decisions.map((d) => `${d.ref} "${d.title}" for ${d.project} [state: ${d.state}]: SITUATION: ${d.situation}. FINANCIAL IMPACT: ${d.financialImpact}. OPTIONS: ${d.options.join("; ")}. TRADE-OFFS: ${d.tradeOffs}. RECOMMENDED ACTION: ${d.recommendedAction}. ACCOUNTABLE: ${d.accountableOwner}`).join(" || ")
//     );
//   }
// 
//   // Price benchmarks facts
//   if (c.pricing) {
//     const pr = c.pricing;
//     lines.push(
//       `[pricing] Material benchmark comparison: ` +
//       pr.benchmarks.map((b) => `${b.sku} "${b.materialName}" via ${b.supplier}: Actual PO $${b.actualPoPrice != null ? b.actualPoPrice.toFixed(2) : "n/a"} / ${b.uom} vs Market Benchmark $${b.marketBenchmark.toFixed(2)} / ${b.uom} (variance: ${b.variancePct}%, freshness: ${b.freshness}) [source: ${b.source}]`).join(" | ")
//     );
//   }
// 
//   // Shipments facts
//   for (const s of c.shipments) {
//     const latest = s.milestones[s.milestones.length - 1];
//     const mats = s.allocatedLines.map((l) => `${l.material} ${l.quantity} ${l.uom} @ ${l.unitPrice} ${l.currency}`).join("; ") || (s.allocatedNote ?? "none");
//     lines.push(
//       `[shipment] ${s.ref}: status ${s.status} (${s.liveStatus}), freshness ${s.freshness}, customs ${s.customsStatus ?? "unknown"}. ` +
//       `Supplier ${s.supplier ?? "unlinked"}, PO ${s.poRef ?? "unlinked"}. Route ${s.route.originPort ?? "?"} â†’ ${s.route.destinationPort ?? "?"} (${s.route.podCountry ?? "?"}) destVerified=${s.route.destVerified}. ` +
//       `Vessel ${s.vessel?.name ?? "not evidenced"}${s.vessel?.position ? `, AIS position ${s.vessel.position.lat}/${s.vessel.position.lng} at ${B(s.vessel.position.at)} â€” vessel position, NOT a container position` : ""}. ` +
//       `Containers: ${s.containers.map((x) => `${x.containerNo ?? "MISSING"} (${x.identityStatus})`).join(", ") || "none evidenced"}. ` +
//       `Cargo lines: ${mats}. Latest event: ${latest ? fmtMilestoneLine(latest) : "none stored"}. ` +
//       `Display ETA ${B(s.displayEta.value)} (${s.displayEta.type ?? "none"}/${s.displayEtaSource ?? "n/a"}); supplier promised ${B(s.supplierPromisedEta)}; carrier ${B(s.carrierEta)} (freshness ${s.carrierEtaFreshness}); actual arrival ${B(s.actualArrival)}. ` +
//       `BOLs: ${s.bols.map((b) => `${b.bolNo} v${b.version} ${b.status}${b.active ? "" : " (SUPERSEDED)"}`).join(", ") || "none"}. ` +
//       `Open exceptions: ${s.exceptions.map((x) => `${x.ref} [${x.severity}] ${x.state}`).join(", ") || "none"}.`
//     );
//     const ms = s.milestones.slice(-14).map(fmtMilestoneLine).join(" | ");
//     if (ms) lines.push(`[milestones ${s.ref}] ${ms}`);
//   }
// 
//   for (const q of c.quantities) {
//     lines.push(
//       `[quantities ${q.ref}] dispatched: ${q.dispatched.map((d) => `${d.quantity} ${d.uom} ${d.material}`).join("; ") || "none recorded"}. ` +
//       `In transit: ${q.inTransit.map((d) => `${d.quantity} ${d.uom} ${d.material}`).join("; ") || "none recorded"}. ` +
//       `Received: ${q.received.map((d) => `${d.quantity} ${d.uom} ${d.material} [${d.ref ?? "GRN"} ${d.status}]`).join("; ") || "none recorded"}. ` +
//       `Outstanding: ${q.outstanding.map((d) => `${d.quantity} ${d.uom} ${d.material}`).join("; ") || "none recorded"}.` +
//       (q.note ? ` NOTE: ${q.note}` : "")
//     );
//   }
// 
//   if (c.position) {
//     if ("error" in c.position) lines.push(`[position-as-of] ERROR: ${c.position.error}`);
//     else {
//       const p = c.position;
//       lines.push(
//         `[position-as-of ${p.ref}] as of ${B(p.at)}: ` +
//         (p.milestone
//           ? `${fmtMilestoneLine(p.milestone)}. ${p.statement}; ${p.eventsUpTo} events at/before, ${p.eventsAfter} after.`
//           : `no stored event at or before that time (${p.statement}).`)
//       );
//     }
//   }
// 
//   if (c.history) {
//     lines.push(
//       c.history.found
//         ? `[event-history ${c.history.ref}] ${c.history.shown}/${c.history.total} events shown`
//         : `[event-history] ERROR: no shipment record ${c.history.ref}`
//     );
//   }
// 
//   if (c.port) {
//     const p = c.port;
//     lines.push(
//       `[port ${p.portQuery}] matches ${p.matchedAliases.join(", ")}. ` +
//       `Physically present: ${p.physicallyPresent.map((x) => `${x.ref} since ${B(x.since)}`).join("; ") || "none"}. ` +
//       `Expected: ${p.expected.map((x) => `${x.ref} (${x.basis}, ETA ${x.eta ? B(x.eta) : "n/a"})`).join("; ") || "none"}.`
//     );
//   }
// 
//   if (c.delays) {
//     const d = c.delays;
//     lines.push(
//       `[delays] open exception cases: ${d.openCases.map((x) => `${x.ref} [${x.severity}] ${x.state} "${x.title}" â€” owner ${x.owner ?? "unassigned"}`).join(" | ") || "none"}. ` +
//       `Delayed shipments: ${d.delayedShipments.map((x) => `${x.ref} slip ${x.slipHours}h`).join(" | ") || "none"}.`
//     );
//   }
// 
//   if (c.actions) {
//     const a = c.actions;
//     lines.push(
//       `[actions] awaiting approval: ${a.awaitingApproval.map((x) => `${x.ref} (${x.commandType}, ${x.riskLevel})`).join("; ") || "none"}. ` +
//       `Overdue: ${a.overdue.map((x) => `${x.ref} (${x.commandType})`).join("; ") || "none"}.`
//     );
//   }
// 
//   if (c.documents) {
//     const d = c.documents;
//     lines.push(
//       `[documents] BOLs: ${d.bols.map((b) => `${b.bolNo} v${b.version} ${b.status}`).join(" | ") || "none"}.`
//     );
//   }
// 
//   return lines.join("\n");
// }
// 
// /* â”€â”€â”€ Structured answer builders â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
// 
// function dataQualityFor(s: ShipmentFacts): string {
//   const last = s.milestones[s.milestones.length - 1];
//   const estimated = last?.isEstimated ?? false;
//   const corrected = s.milestones.some((m) => m.correctedByEventId);
//   if (s.freshness === "unavailable") return "unavailable";
//   if (s.freshness === "stale") return `stale â€” last event ${last ? B(last.eventTime) : "never"} (${last?.source ?? "n/a"})`;
//   if (estimated) return "estimated â€” latest milestone is an estimate";
//   if (s.freshness === "aging") return "aging â€” treat as indicative, not current";
//   return corrected ? "verified (fresh, includes corrected events)" : "verified (fresh)";
// }
// 
// function buildStructured(c: Collected): AssistantStructured | undefined {
//   const sections: AssistantSection[] = [];
//   const s = c.shipments[0];
// 
//   // projects portfolio
//   if (c.projects) {
//     const p = c.projects;
//     sections.push({
//       key: "portfolio_status",
//       label: "Projects Portfolio Status",
//       lines: [
//         `Confirmed Active: ${p.totalActive} projects (Projects A through E, Infrastructure Corridor)`,
//         `Pending Confirmation: ${p.totalPending} projects`,
//         `Historical Archive: ${p.totalHistorical} projects (Alba Potline 6 expansion)`,
//       ],
//     });
//     sections.push({
//       key: "project_records",
//       label: "Project Commitments",
//       lines: p.projects.map(
//         (x) => `${x.code}: ${x.name} [${x.status}] @ ${x.site} Â· Work Package: ${x.workPackage ?? "General"} Â· ${x.openShortages} material shortage(s)`
//       ),
//     });
//   }
// 
//   // material requirements
//   if (c.materials) {
//     const m = c.materials;
//     const critical = m.requirements.filter((r) => r.criticality === "CRITICAL" || r.status === "SHORT");
//     sections.push({
//       key: "material_shortages",
//       label: "Critical Material Requirements & Shortages",
//       lines: (critical.length ? critical : m.requirements.slice(0, 5)).map(
//         (r) => `${r.projectCode} Â· ${r.materialName} (${r.materialSku}): needed ${r.quantity} ${r.uom} by ${B(r.requiredOnSite)} Â· Shortfall: ${r.shortfall} ${r.uom} Â· ${r.orderedPo ? `Covered by ${r.orderedPo}` : "UNORDERED"}`
//       ),
//     });
//   }
// 
//   // CEO decisions
//   if (c.ceoDecisions) {
//     const cd = c.ceoDecisions;
//     sections.push({
//       key: "ceo_recommendations",
//       label: "CEO Decision Recommendations",
//       lines: cd.decisions.map(
//         (d) => `${d.ref}: ${d.title} (${d.project}) Â· Recommended: ${d.recommendedAction} Â· Owner: ${d.accountableOwner} Â· Financial Impact: ${d.financialImpact}`
//       ),
//     });
//   }
// 
//   // pricing
//   if (c.pricing) {
//     const pr = c.pricing;
//     sections.push({
//       key: "price_intelligence",
//       label: "Price Intelligence & Benchmark Parity",
//       lines: pr.benchmarks.map(
//         (b) => `${b.materialName} (${b.sku}): Actual PO $${b.actualPoPrice?.toFixed(2) ?? "â€”"} vs Market $${b.marketBenchmark.toFixed(2)} / ${b.uom} (${b.variancePct}% variance) Â· Source: ${b.source}`
//       ),
//     });
//   }
// 
//   // Multi-shipment corridor list
//   if (c.shipments.length > 1) {
//     sections.push({
//       key: "corridor_shipments",
//       label: `Inbound Corridor Shipments (${c.shipments.length} matching records)`,
//       lines: c.shipments.map((ship) => {
//         const cargo = ship.allocatedLines.map((l) => `${l.quantity} ${l.uom} ${l.material}`).join(", ") || "General Cargo";
//         const eta = ship.displayEta.value ? B(ship.displayEta.value) : (ship.carrierEta ? B(ship.carrierEta) : "ETA Pending");
//         return `${ship.ref}: ${ship.vessel?.name ?? "Vessel Assigned"} (${ship.route.originPort} â†’ ${ship.route.destinationPort}) Â· ${cargo} Â· Status: ${ship.status} Â· Carrier ETA: ${eta}`;
//       }),
//     });
//   }
// 
//   // primary shipment detailed breakdown
//   if (s) {
//     const q = c.quantities.find((x) => x.ref === s.ref) ?? null;
//     const p = c.position && !("error" in c.position) && c.position.ref === s.ref ? c.position : null;
//     const latest = s.milestones[s.milestones.length - 1];
// 
//     sections.push({
//       key: "shipment", label: `Shipment ${s.ref}`,
//       lines: [`${s.ref} â€” ${s.mode.toLowerCase()} Â· carrier ${s.carrier ?? "n/a"} Â· supplier ${s.supplier ?? "unlinked"} Â· PO ${s.poRef ?? "unlinked"}`],
//     });
//     sections.push({
//       key: "current_state", label: "Current State & Location",
//       lines: [
//         `Status ${s.status} (${s.liveStatus})${s.customsStatus ? ` Â· customs: ${s.customsStatus}` : ""}`,
//         s.vessel?.position ? `AIS Coordinates: ${s.vessel.position.lat}, ${s.vessel.position.lng} (${s.vessel.name})` : "Vessel AIS position tracking",
//         latest ? `Latest event: ${latest.label}${latest.location ? ` @ ${latest.location}` : ""} â€” ${B(latest.eventTime)} (${latest.source})` : "No milestones stored",
//       ],
//     });
//     if (q) {
//       sections.push({
//         key: "quantity", label: "Quantity",
//         lines: [
//           `Dispatched: ${q.dispatched.map((d) => `${d.quantity} ${d.uom} ${d.material}`).join("; ") || "not recorded"}`,
//           `Received: ${q.received.map((d) => `${d.quantity} ${d.uom} ${d.material}`).join("; ") || "none recorded"}`,
//           `Outstanding: ${q.outstanding.map((d) => `${d.quantity} ${d.uom} ${d.material}`).join("; ") || "none"}`,
//         ],
//       });
//     }
//   }
// 
//   if (!sections.length) return undefined;
//   return { sections };
// }
// 
// /* â”€â”€â”€ POST handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
// 
// export async function POST(req: NextRequest) {
//   const body = (await req.json().catch(() => null)) as { question?: string } | null;
//   const question = body?.question?.trim();
//   if (!question) return err("BAD_REQUEST", "question is required", 400);
//   if (question.length > 2000) return err("BAD_REQUEST", "question too long", 400);
// 
//   const asOf = new Date();
//   const asOfStr = asOf.toISOString();
//   const sources: string[] = [];
// 
//   // 1. deterministic retrieval
//   const collected = await collectFacts(question);
//   if (!collected) {
//     const answer =
//       "The time in your question is ambiguous, so I won't guess. Please restate it with an explicit Bahrain date and time " +
//       "(e.g. â€œat 14:00 Bahrain time on 15 Oct 2026â€).";
//     return ok({ answer, as_of: asOfStr, sources, dataQuality: "unavailable" } satisfies AssistantResponse);
//   }
// 
//   for (const s of collected.shipments) sources.push(`shipment:${s.ref}`);
//   if (collected.projects) sources.push("projects:portfolio");
//   if (collected.materials) sources.push("boq:requirements");
//   if (collected.ceoDecisions) sources.push("ceo:decisions");
//   if (collected.pricing) sources.push("pricing:benchmarks");
//   if (collected.delays?.openCases.length) sources.push("exceptions:open");
// 
//   // 2. deterministic structured payload (LLM-independent)
//   const structured = buildStructured(collected);
//   const primaryShip = collected.shipments[0];
//   const dataQuality = primaryShip ? dataQualityFor(primaryShip) : undefined;
// 
//   // 3. FACTS block
//   const factsBlock = [
//     `AS_OF: ${fmtBahrainDateTime(asOfStr)} (Asia/Bahrain, UTC+3)`,
//     collected.time.note ? `TIME INTERPRETED FROM QUESTION: ${collected.time.note}` : null,
//     "FACTS (deterministic tool output â€” cite only these records):",
//     renderFacts(collected).slice(0, FACTS_CAP),
//   ].filter(Boolean).join("\n");
// 
//   // 4. LLM phrasing under executive synthesis
//   const system = [
//     "You are the NASS Operations Assistant and CEO Control Tower Copilot (Bahrain).",
//     "You answer ONLY from the FACTS block below. You have NO other knowledge of projects, orders, positions, events, ETAs, quantities or decisions.",
//     "",
//     "SPEECH, PHONETIC CORRECTION & REPORT INTENT RULES:",
//     "- Live voice dictation frequently introduces phonetic distortions, stumbles, and transcription noise. Always map them to verified NASS logistics concepts:",
//     "  * 'traditional duty data' or 'Tresa disability data' or 'treasa' or 'disability data' -> PHONETIC MISHEARINGS FOR 'TRACEABILITY DATA' or 'CUSTOMS / DUTY DATA'.",
//     "  * 'green shipment', 'wind shiftmate', 'bare input', 'Apache', 'I mean...' -> SPEECH TRANSCRIPTION ARTIFACTS (DISCARD).",
//     "- NEVER echo garbled words back into your response. NEVER output negative disclaimers such as:",
//     "  * 'No records identify traditional duty data, PDF generation, downloads, or historical live Tresa disability data.'",
//     "  * 'No records identify Apache or green shipment.'",
//     "- When the user asks to generate, download, or export a PDF or report (e.g. 'create a PDF of all live data', 'download report'):",
//     "  * The application automatically generates and attaches the official luxury PDF report card directly below your message.",
//     "  * DO NOT say 'No records identify PDF generation or downloads'.",
//     "  * Affirm that the official PDF dossier is prepared and summarize the active portfolio, key shipments, and executive decisions from FACTS in crisp bullet points:",
//     "    'The authoritative NASS Executive Control Tower & Traceability Report has been generated for instant download below. Executive Briefing from verified records:'",
//     "",
//     "EXECUTIVE ANSWER FORMAT:",
//     "- Provide concise, fluent, and polished executive intelligence based directly on verified FACTS.",
//     "- NEVER output repetitive empty negative boilerplate (e.g., avoid lines like 'Location / Quantity / Time: No data provided' or 'Evidence: None'). Only present details supported by retrieved records.",
//     "- For Inbound Shipments / Corridors (e.g., China to Bahrain):",
//     "  * Clearly summarize EACH matching shipment with its Ref, Vessel Name & Voyage, Origin Port, Destination Port, Assigned Project, Cargo/Materials, Live Status, AIS Coordinates (if in transit at sea), and Display/Carrier ETA.",
//     "  * If multiple shipments are in transit on the corridor (e.g. SHP-8801, SHP-8802, SHP-8804), present them in clean, distinct executive bullet points so the director has complete visibility.",
//     "- For Projects & BOQ: Outline Confirmed Active Projects (Projects A-E), Work Packages, Site Locations, Shortages, and PO commitments.",
//     "- For CEO Decisions: Present the Situation, Financial Exposure, Trade-Off Options, and Recommended CEO Action.",
//     "- For Pricing & Benchmarks: Highlight PO price vs market rate and variance percentage.",
//     "",
//     "RULES (non-negotiable):",
//     "1. Strict Truth-in-Data: Cite only verified records from FACTS. Do not invent tracking numbers or dates.",
//     "2. All timestamps in Bahrain local time (AST, UTC+3). Copy formatted times from facts; never recompute or shift.",
//     "3. Keep the synthesis concise, punchy, and executive-ready (max 220 words).",
//     "4. Final line: 'Sources: â€¦' listing the record refs you used.",
//   ].join("\n");
// 
//   /* â”€â”€â”€ Navigation & Report Resolution â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
//   const navigation = resolveNavigation(question, collected);
//   const report = resolveReport(question, collected);
// 
//   /* â”€â”€â”€ LLM Execution: Sarvam 105b Primary + Mistral Fallback â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
//   let answer: string;
//   let degraded = false;
//   let provider = "Deterministic Engine";
//   let model = "grounded-facts";
// 
//   const llmResult = await callCopilotLLM(system, factsBlock, question, req);
// 
//   if (llmResult) {
//     answer = llmResult.text;
//     provider = llmResult.provider;
//     model = llmResult.model;
// 
//     // Defensive Speech Sanitization: Remove negative meta-disclaimers triggered by speech mishearings
//     const speechDisclaimerRegex = /No records (identify|found for|indicate|contain)\s+(traditional duty|tresa disability|treasa|disability data|pdf generation|downloads|apache|green shipment)[^.\n]*[.\n]?/gi;
//     if (speechDisclaimerRegex.test(answer)) {
//       answer = answer.replace(speechDisclaimerRegex, "").trim();
//       if (!answer || answer.startsWith("Sources:")) {
//         answer = "The authoritative NASS Executive Control Tower & Traceability Report has been generated for instant download below.\n\n" + (answer || "");
//       }
//     }
//   } else {
//     degraded = true;
//     answer = structured
//       ? structured.sections.map((sec) => `${sec.label}:\n${sec.lines.map((l) => `â€¢ ${l}`).join("\n")}`).join("\n\n")
//       : "No matching source records retrieved for this question in the connected operational store.";
//     answer += "\n\n(Deterministic fallback from authoritative records; core operational workflows active.)";
//   }
// 
//   if (navigation && !answer.toLowerCase().includes(navigation.label.toLowerCase())) {
//     answer += `\n\nNavigation Target: Ready to open ${navigation.label}.`;
//   }
// 
//   if (report && !answer.toLowerCase().includes("pdf")) {
//     answer += `\n\nPDF Report: ${report.title} prepared for instant download.`;
//   }
// 
//   if (!degraded && collected.time.note) {
//     answer += `\n\nTime interpreted: ${collected.time.note}.`;
//   }
// 
//   return ok({
//     answer,
//     as_of: asOfStr,
//     sources,
//     degraded: degraded || undefined,
//     structured,
//     dataQuality,
//     provider,
//     model,
//     navigation,
//     report,
//   } satisfies AssistantResponse);
// }
// 
// /* â”€â”€â”€ Copilot LLM Engine (Sarvam 105b + Mistral AI) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
// 
// interface LLMResult {
//   text: string;
//   provider: string;
//   model: string;
// }
// 
// async function callCopilotLLM(
//   system: string,
//   factsBlock: string,
//   userPrompt: string,
//   req: NextRequest
// ): Promise<LLMResult | null> {
//   // All credentials operate strictly from .env SARVAM_API_KEY (with header/cookie fallback)
//   const sarvamKey =
//     process.env.SARVAM_API_KEY?.trim() ||
//     req.cookies.get("sarvam_key")?.value?.trim() ||
//     req.headers.get("x-sarvam-key")?.trim();
// 
//   // EXCLUSIVE AI PROVIDER: Sarvam AI 105B Core (sarvam-105b / sarvam-105b-conversations)
//   // All other third-party LLM APIs (Mistral, ZAI, etc.) are commented out and disabled per architectural directive
//   /*
//   const mistralKey = process.env.MISTRAL_API_KEY?.trim();
//   // Mistral fallback disabled: Only Sarvam API is authorized.
//   */
// 
//   // 1. Primary Reasoning Core: Sarvam AI with sarvam-105b-conversations / sarvam-105b
//   if (sarvamKey) {
//     try {
//       const res = await fetch("https://api.sarvam.ai/v1/chat/completions", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           "api-subscription-key": sarvamKey,
//         },
//         body: JSON.stringify({
//           model: "sarvam-105b-conversations",
//           messages: [
//             { role: "system", content: `${system}\n\n${factsBlock}` },
//             { role: "user", content: userPrompt },
//           ],
//           temperature: 0.2,
//         }),
//       });
// 
//       if (res.ok) {
//         const data = await res.json();
//         const text = data.choices?.[0]?.message?.content?.trim();
//         if (text) {
//           return {
//             text,
//             provider: "Sarvam AI",
//             model: "sarvam-105b-conversations",
//           };
//         }
//       }
//     } catch (e) {
//       console.warn("[Sarvam 105B Reasoning Exception]", e);
//     }
//   }
// 
//   // 2. All other third-party APIs (Mistral, etc.) are strictly commented out and prohibited:
//   /*
//   // DISABLED BY DIRECTIVE: USE ONLY SARVAM API
//   if (mistralKey) {
//     try {
//       const res = await fetch("https://api.mistral.ai/v1/chat/completions", { ... });
//     } catch (e) {}
//   }
//   */
// 
//   return null;
// }
// 
// /* â”€â”€â”€ Navigation & Report Resolvers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
// 
// function resolveNavigation(q: string, collected: Collected): AssistantNavigationAction | undefined {
//   const ql = q.toLowerCase();
//   const isNav = /(take me to|open|go to|navigate to|show me|show|switch to|view|find|track|details|all details|filter|see|pull up|jump to|drill to|control|display|take me)\b/i.test(ql);
// 
//   // 0. Direct Contextual Trigger: "open this", "open that", "open destination", "open it"
//   if (/(open this|open that|open destination|open it|open record|take me there|go there)/i.test(ql)) {
//     const ref = collected.shipments[0]?.ref ?? "SHP-8801";
//     return {
//       view: "import-tracking",
//       label: `Shipment Tracking â€” ${ref}`,
//       targetRef: ref,
//       filter: ref,
//       description: `Direct UI Control: Opening destination record ${ref} in Shipment Tracking module.`,
//       autoExecute: true,
//     };
//   }
// 
//   // 1. Live Traceability Map
//   if (/(live map|live traceability|find a live traceability|barge position|ais map|track ship on map)/i.test(ql)) {
//     const shipRef = collected.shipments[0]?.ref ?? (ql.includes("8809") ? "SHP-8809" : undefined);
//     return {
//       view: "live",
//       label: shipRef ? `Live Traceability â€” ${shipRef}` : "Live Traceability Command Map",
//       targetRef: shipRef,
//       description: "Opening Live Traceability maritime command map with AIS vessel telemetry and verified arrival corridors.",
//       autoExecute: isNav,
//     };
//   }
// 
//   // 2. Project Materials & BOQ
//   if (/(project a|project b|project c|project d|project e|falcon|flyover|materials for project|project materials|boq)/i.test(ql)) {
//     let projCode = "PRJ-FLCN";
//     let label = "Project A (Falcon Flyover)";
//     if (ql.includes("project b") || ql.includes("airport")) { projCode = "PRJ-AMR"; label = "Project B (Airport Terminal Expansion)"; }
//     else if (ql.includes("project c") || ql.includes("raffa")) { projCode = "PRJ-ARF"; label = "Project C (Al Raffa Mixed-Use)"; }
//     else if (ql.includes("project d") || ql.includes("kamc") || ql.includes("medical")) { projCode = "PRJ-KMC"; label = "Project D (KAMC Medical City)"; }
//     else if (ql.includes("project e") || ql.includes("marina")) { projCode = "PRJ-BM"; label = "Project E (Bahrain Marina Phase 2)"; }
//     return {
//       view: "projects",
//       label: `${label} Materials & Shortages`,
//       targetRef: projCode,
//       filter: projCode,
//       description: `Opening Project Materials view with BOQ requirements, allocated stock, and shortfall tracking for ${label}.`,
//       autoExecute: isNav,
//     };
//   }
// 
//   // 3. Shipment Tracking
//   const explicitRef = q.toUpperCase().match(/\bSHP-\d{4}\b/)?.[0] ?? collected.shipments[0]?.ref;
//   if (explicitRef || /(shipment|tracking|carrier|container|china|vessel|barge|corridor)/i.test(ql)) {
//     const ref = explicitRef ?? (collected.shipments[0]?.ref ?? "SHP-8801");
//     const count = collected.shipments.length;
//     const label = count > 1 
//       ? `Shipment Tracking â€” ${ref} (${count} matching records)` 
//       : `Shipment Tracking â€” ${ref}`;
//     return {
//       view: "import-tracking",
//       label,
//       targetRef: ref,
//       filter: ref,
//       description: `Opening Shipment Tracking module filtered to ${ref} with milestone history and route verification.`,
//       autoExecute: isNav,
//     };
//   }
// 
//   // 4. Procurement & Purchase Orders
//   if (/(purchase order|po\b|rfq|contract|procurement|pr line)/i.test(ql)) {
//     const poMatch = q.toUpperCase().match(/\bPO-\d{4,}\b/)?.[0];
//     return {
//       view: "procurement",
//       label: poMatch ? `Purchase Order ${poMatch}` : "Procurement & Purchase Orders",
//       targetRef: poMatch,
//       description: "Opening PR Â· RFQ Â· PO Â· Contracts module with approved commitments and Incoterms.",
//       autoExecute: isNav,
//     };
//   }
// 
//   // 5. Suppliers
//   if (/(supplier|vendor|scorecard|partner|rating)/i.test(ql)) {
//     return {
//       view: "suppliers",
//       label: "Suppliers & Scorecards",
//       description: "Opening Suppliers & Scorecards directory with verified vendors and historical ratings.",
//       autoExecute: isNav,
//     };
//   }
// 
//   // 6. Inventory & Stock
//   if (/(inventory|stock|warehouse|on hand|storage|wh-askar|wh-sitra)/i.test(ql)) {
//     return {
//       view: "inventory",
//       label: "Warehouse Inventory & Stock",
//       description: "Opening Inventory view with stock on hand, allocated reservations, and location telemetry.",
//       autoExecute: isNav,
//     };
//   }
// 
//   // 7. Receiving & QC
//   if (/(receiving|quality|qc|inspection|grn|receipt|damaged|rejected)/i.test(ql)) {
//     return {
//       view: "receiving",
//       label: "Receiving & Quality Control (QC)",
//       description: "Opening Receiving & QC ledger with goods receipt inspection records and QA dispositions.",
//       autoExecute: isNav,
//     };
//   }
// 
//   // 8. Control Tower
//   if (/(control tower|delayed shipments|kpi|overview|network summary|executive tower)/i.test(ql)) {
//     return {
//       view: "control-tower",
//       label: "Executive Control Tower",
//       description: "Opening Control Tower with KPI telemetry, delivery slips, and network risk summaries.",
//       autoExecute: isNav,
//     };
//   }
// 
//   // 9. Decisions / CEO Actions
//   if (/(ceo|decision|action command|executive decision|approval)/i.test(ql)) {
//     return {
//       view: "actions",
//       label: "Decision Management",
//       description: "Opening Decision Management console with trade-off analysis and approval workflows.",
//       autoExecute: isNav,
//     };
//   }
// 
//   // 10. Exceptions
//   if (/(exception|slip|discrepancy|open issue)/i.test(ql)) {
//     return {
//       view: "exceptions",
//       label: "Exceptions Closed Loop",
//       description: "Opening Exceptions Closed Loop view with active dispute cases and ownership tracking.",
//       autoExecute: isNav,
//     };
//   }
// 
//   // 11. BOL Intelligence
//   if (/(bol|bill of lading)/i.test(ql)) {
//     return {
//       view: "bol-intelligence",
//       label: "BOL Intelligence",
//       description: "Opening Bill of Lading Intelligence view with multi-version BOL audit trails.",
//       autoExecute: isNav,
//     };
//   }
// 
//   // 12. Governance & Health
//   if (/(connector|health|audit|governance|evidence)/i.test(ql)) {
//     return {
//       view: "governance",
//       label: "Audit, Evidence & Health",
//       description: "Opening Governance & Audit dashboard with connector health and hash-chained logs.",
//       autoExecute: isNav,
//     };
//   }
// 
//   return undefined;
// }
// 
// function resolveReport(q: string, collected: Collected): AssistantReportAction | undefined {
//   const ql = q.toLowerCase();
//   const isReport = /(pdf|report|download|export|print|dossier|document)/i.test(ql);
//   if (!isReport) return undefined;
// 
//   // Project Report
//   if (/(project|materials report|falcon|boq)/i.test(ql)) {
//     let projCode = "PRJ-FLCN";
//     let projName = "Project A (Falcon Flyover)";
//     if (ql.includes("project b") || ql.includes("airport")) { projCode = "PRJ-AMR"; projName = "Project B (Airport Terminal)"; }
//     else if (ql.includes("project c") || ql.includes("raffa")) { projCode = "PRJ-ARF"; projName = "Project C (Al Raffa)"; }
//     else if (ql.includes("project d") || ql.includes("kamc")) { projCode = "PRJ-KMC"; projName = "Project D (KAMC Medical)"; }
//     else if (ql.includes("project e") || ql.includes("marina")) { projCode = "PRJ-BM"; projName = "Project E (Bahrain Marina)"; }
//     return {
//       type: "project",
//       targetRef: projCode,
//       title: `NASS Project Materials Report â€” ${projName}`,
//       downloadUrl: `/api/reports/generate?type=project&ref=${encodeURIComponent(projCode)}`,
//       format: "pdf",
//     };
//   }
// 
//   // Shipment Report
//   const explicitRef = q.toUpperCase().match(/\bSHP-\d{4}\b/)?.[0] ?? collected.shipments[0]?.ref;
//   if (explicitRef || /(shipment|cargo|vessel)/i.test(ql)) {
//     const ref = explicitRef ?? "SHP-8803";
//     return {
//       type: "shipment",
//       targetRef: ref,
//       title: `NASS Shipment Traceability Report â€” ${ref}`,
//       downloadUrl: `/api/reports/generate?type=shipment&ref=${encodeURIComponent(ref)}`,
//       format: "pdf",
//     };
//   }
// 
//   // CEO Summary & Comprehensive Traceability Report
//   if (/(ceo|executive|summary|all projects|portfolio|traditional duty|tresa disability|traceability|duty data|all live|all data)/i.test(ql)) {
//     return {
//       type: "ceo-summary",
//       title: "NASS Executive Control Tower & Traceability Report",
//       downloadUrl: "/api/reports/generate?type=ceo-summary",
//       format: "pdf",
//     };
//   }
// 
//   // Procurement
//   if (/(purchase order|po|procurement|cost)/i.test(ql)) {
//     return {
//       type: "procurement",
//       title: "NASS Procurement & PO Commitments Report",
//       downloadUrl: "/api/reports/generate?type=procurement",
//       format: "pdf",
//     };
//   }
// 
//   // Inventory
//   if (/(inventory|stock|warehouse)/i.test(ql)) {
//     return {
//       type: "inventory",
//       title: "NASS Inventory & Stock Status Report",
//       downloadUrl: "/api/reports/generate?type=inventory",
//       format: "pdf",
//     };
//   }
// 
//   // Default to CEO Summary & Traceability Report
//   return {
//     type: "ceo-summary",
//     title: "NASS Executive Control Tower & Traceability Report",
//     downloadUrl: "/api/reports/generate?type=ceo-summary",
//     format: "pdf",
//   };
// }
// 
// Inactive stub endpoint satisfying Next.js App Router method validation while returning 404
export async function POST() {
  return new Response(JSON.stringify({ error: "Operations Assistant chatbot is disabled" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
}