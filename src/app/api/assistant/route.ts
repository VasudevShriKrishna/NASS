import { NextRequest } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { db } from "@/lib/db";
import { ok, err } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * M20 — Grounded conversational operations assistant.
 * Query contract: retrieve source records FIRST, build a grounded context, then let the
 * LLM explain. State "unknown/unavailable" when source coverage is absent. Answer carries
 * as_of time, sources used, and caveats. The LLM has NO write path and CANNOT invent data —
 * it may only cite records present in the retrieved context.
 */
function fmtDate(d: Date | null | undefined): string {
  if (!d) return "not available";
  return d.toISOString();
}

async function retrieveContext(q: string) {
  const ql = q.toLowerCase();
  const refs = q.toUpperCase();
  const chunks: string[] = [];
  const sourcesUsed: string[] = [];

  // Shipment-centric retrieval
  const shipments = await db.shipment.findMany({
    include: {
      supplier: { select: { name: true } },
      po: { select: { ref: true } },
      containers: true,
      milestones: { orderBy: { eventTime: "desc" }, take: 3 },
      etaObservations: { where: { isActive: true }, orderBy: { calculatedAt: "desc" } },
      bols: { select: { bolNo: true, version: true, status: true, isActive: true } },
    },
  });
  const matched = shipments.filter((s) =>
    refs.includes(s.ref.toUpperCase()) ||
    (s.vesselName && ql.includes(s.vesselName.toLowerCase().split(" ")[0])) ||
    (s.supplier?.name && ql.includes(s.supplier.name.toLowerCase().split(" ")[0])) ||
    /shipment|container|eta|vessel|import|transit|delivery|delay/i.test(q)
  ).slice(0, 4);
  for (const s of matched) {
    const latestMilestone = s.milestones[0];
    const containerInfo = s.containers
      .map((c) => `container ${c.containerNo ?? "MISSING/UNRESOLVED"} (identity: ${c.identityStatus})`)
      .join("; ");
    const etas = s.etaObservations
      .map((e) => `${e.estimateType} ETA ${fmtDate(e.etaValue)} (source ${e.sourceName}, calculated ${fmtDate(e.calculatedAt)}${e.confidence ? `, confidence ${e.confidence}` : ""})`)
      .join(" | ") || "no active ETA observations";
    chunks.push(
      `SHIPMENT ${s.ref}: status ${s.status}, freshness ${s.freshness}. Supplier: ${s.supplier?.name ?? "unlinked"}. PO: ${s.po?.ref ?? "unlinked"}. Route ${s.originPort ?? "?"} → ${s.destinationPort ?? "?"}. Latest milestone: ${latestMilestone ? `${latestMilestone.label} at ${latestMilestone.location ?? "?"} (event time ${fmtDate(latestMilestone.eventTime)}, received ${fmtDate(latestMilestone.receivedAt)}, source ${latestMilestone.source})` : "none"}. Vessel: ${s.vesselName ?? "not evidenced"}${s.vesselPositionLat ? `, vessel position ${s.vesselPositionLat}/${s.vesselPositionLng} at ${fmtDate(s.vesselPositionAt)} — VESSEL position only, not container position` : ", no AIS position"}. Containers: ${containerInfo || "none evidenced"}. ETA observations: ${etas}. Display ETA: ${fmtDate(s.displayEta)} (${s.displayEtaType ?? "none"}). Supplier promised ETA: ${fmtDate(s.supplierPromisedEta)}. BOLs: ${s.bols.map((b) => `${b.bolNo} v${b.version} ${b.status}${b.isActive ? " (active)" : " (superseded)"}`).join(", ") || "none"}.`
    );
    sourcesUsed.push(`shipment:${s.ref}`);
  }

  // BOL-centric retrieval
  if (/bol|bill of lading|document|packing list/i.test(q) || /BOL|MSC-|PMC-|ONEY-|HLC-/.test(refs)) {
    const bols = await db.billOfLading.findMany({ include: { fields: true, reconciliations: true, shipment: { select: { ref: true } } }, take: 8 });
    for (const b of bols.slice(0, 6)) {
      const failed = b.fields.filter((f) => f.validationStatus === "FAIL");
      chunks.push(
        `BOL ${b.bolNo} v${b.version}${b.isActive ? " (active)" : " (SUPERSEDED)"}: status ${b.status}, match ${b.matchStatus}${b.shipment ? `, linked shipment ${b.shipment.ref}` : ", NO matching shipment"}. Failed fields: ${failed.map((f) => `${f.fieldName} (${f.validationNote ?? "validation failed"})`).join("; ") || "none"}. Reconciliations: ${b.reconciliations.map((r) => `${r.ruleCode}=${r.result}`).join(", ") || "none"}.`
      );
      sourcesUsed.push(`bol:${b.bolNo}`);
    }
  }

  // Exceptions retrieval
  if (/exception|case|alert|sla|issue|open/i.test(q)) {
    const cases = await db.exceptionCase.findMany({ where: { state: { notIn: ["RESOLVED", "CANCELLED"] } }, take: 8 });
    if (cases.length) {
      chunks.push(`OPEN EXCEPTION CASES: ${cases.map((c) => `${c.ref} [${c.severity}] ${c.state} — ${c.title}`).join(" | ")}`);
      sourcesUsed.push("exceptions:open");
    }
  }

  // Inventory retrieval
  if (/stock|inventory|available|warehouse|quarantin|reserved|in.?transit/i.test(q)) {
    const lots = await db.inventoryLot.findMany({ include: { material: { select: { sku: true, name: true, uom: true } }, warehouse: { select: { code: true } } } });
    const agg: Record<string, { name: string; uom: string; available: number; reserved: number; quarantined: number; inTransit: number; damaged: number }> = {};
    for (const l of lots) {
      agg[l.material.sku] ??= { name: l.material.name, uom: l.material.uom, available: 0, reserved: 0, quarantined: 0, inTransit: 0, damaged: 0 };
      if (l.status === "AVAILABLE") agg[l.material.sku].available += l.quantity;
      else if (l.status === "RESERVED") agg[l.material.sku].reserved += l.quantity;
      else if (l.status === "QUARANTINED") agg[l.material.sku].quarantined += l.quantity;
      else if (l.status === "IN_TRANSIT") agg[l.material.sku].inTransit += l.quantity;
      else if (l.status === "DAMAGED") agg[l.material.sku].damaged += l.quantity;
    }
    const lines = Object.entries(agg).map(([sku, v]) => `${sku} (${v.name}): available ${v.available} ${v.uom}, reserved ${v.reserved}, quarantined ${v.quarantined}, damaged ${v.damaged}, in-transit ${v.inTransit} (in-transit is NOT on-site stock)`);
    chunks.push(`STOCK POSITIONS: ${lines.join(" | ")}`);
    sourcesUsed.push("inventory:lots");
  }

  // Assets retrieval
  if (/asset|equipment|telemetry|sensor|maintenance|work order|inspection|crane|pump|chiller|ahu|generator/i.test(q)) {
    const assets = await db.asset.findMany({ include: { workOrders: { where: { status: { notIn: ["CLOSED", "CANCELLED"] } } }, telemetry: { orderBy: { eventTime: "desc" }, take: 2 } }, take: 8 });
    for (const a of assets) {
      chunks.push(
        `ASSET ${a.tag} (${a.name}): class ${a.assetClass}, condition ${a.condition}, telemetry ${a.telemetryStale ? "STALE — data-quality issue, condition not asserted" : `last reading ${fmtDate(a.lastTelemetryAt)}`}${a.telemetry[0] ? `, latest ${a.telemetry[0].metric}=${a.telemetry[0].value} ${a.telemetry[0].unit} at ${fmtDate(a.telemetry[0].eventTime)}` : ""}. Open work orders: ${a.workOrders.map((w) => `${w.ref} (${w.status})`).join(", ") || "none"}.`
      );
      sourcesUsed.push(`asset:${a.tag}`);
    }
  }

  if (chunks.length === 0) {
    chunks.push("NO MATCHING SOURCE RECORDS RETRIEVED for this question in the connected operational store.");
  }
  return { context: chunks.join("\n\n"), sourcesUsed: Array.from(new Set(sourcesUsed)) };
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { question?: string } | null;
  const question = body?.question?.trim();
  if (!question) return err("BAD_REQUEST", "question is required", 400);
  if (question.length > 2000) return err("BAD_REQUEST", "question too long", 400);

  const asOf = new Date().toISOString();
  const { context, sourcesUsed } = await retrieveContext(question);

  const system = [
    "You are the NASS Closed-Loop Supply Chain Operations Assistant.",
    "RULES (non-negotiable):",
    "1. Ground every statement in the CONTEXT below. Cite record references (e.g. SHP-8802, BOL MSC-4471).",
    "2. If the context lacks the data, answer exactly: 'Unknown/unavailable in connected source records' and say which record type would be needed. Never invent ETAs, container locations, stock levels, scores, or conditions.",
    "3. A vessel AIS position is NOT a container position. Never claim a container is aboard unless the context shows a RESOLVED container identity with an evidenced link.",
    "4. Report freshness: stale/unavailable data must be labeled stale/unavailable, not current.",
    "5. You cannot execute actions. For consequential steps, name the owner/approval required.",
    "6. Keep answers compact (<= 180 words), then list 'Caveats' (max 2) and 'Sources'.",
    "",
    `CONTEXT (retrieved ${asOf}):`,
    context,
  ].join("\n");

  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: system },
        { role: "user", content: question },
      ],
      thinking: { type: "disabled" },
    });
    const answer = completion.choices[0]?.message?.content ?? "Unknown/unavailable in connected source records.";
    return ok({ answer, as_of: asOf, sources: sourcesUsed });
  } catch (e) {
    // Degrade safely (Rule 10): model unavailable → deterministic fallback, workflow not blocked.
    return ok({
      answer: `Assistant model unavailable (deterministic fallback). Retrieved sources: ${sourcesUsed.join(", ") || "none"}. Context excerpt: ${context.slice(0, 400)}…`,
      as_of: asOf,
      sources: sourcesUsed,
      degraded: true,
    });
  }
}
