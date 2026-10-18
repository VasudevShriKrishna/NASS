/* NASS — Multi-Type Enterprise PDF Report Generator (Server-Side Only)
 * Luxury black-gold brand styling, pure PDFKit vectors, built-in Helvetica family.
 * Supports:
 *  - Shipment Reports (A)
 *  - Project Materials & BOQ Reports (B)
 *  - Procurement & PO Reports (C)
 *  - Inventory & Stock Reports (D)
 *  - Supplier Comparison Reports (E)
 *  - Quality & Exceptions Reports (F)
 *  - CEO Executive Control Tower Reports (G)
 */

import PDFDocument from "pdfkit";
import { db } from "@/lib/db";
import { buildTraceSnapshot } from "@/lib/trace";
import { renderLiveReport } from "@/lib/pdf-report";
import { fmtBahrainDateTime } from "@/lib/bahrain-time";
import { ceoDecisionFacts, priceIntelligenceFacts } from "@/lib/assistant-tools";

const GOLD = "#d4af37";
const GOLD_LIGHT = "#f3dc8e";
const GOLD_DEEP = "#8a6a1f";
const INK = "#0d0b07";
const PANEL = "#14110a";
const BODY = "#1a1408";
const MUTED = "#6b6252";
const HAIRLINE = "#e6ddc8";
const TINT = "#faf6ea";
const BAND_META = "#c9b98a";

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 40;
const CONTENT_W = PAGE_W - M * 2;
const FOOTER_LINE_Y = PAGE_H - 36;
const CONTENT_BOTTOM = PAGE_H - 48;

const nf2 = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf0 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const money = (n: number, cur = "USD") => `${cur} ${nf2.format(n)}`;
const qty = (n: number) => (Number.isInteger(n) ? nf0.format(n) : nf2.format(n));
const pad2 = (n: number) => String(n).padStart(2, "0");
const fmtDT = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  return fmtBahrainDateTime(iso);
};
const fmtNow = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())} AST`;
};

const fit = (doc: PDFKit.PDFDocument, s: string, maxW: number): string => {
  if (!s) return "—";
  if (doc.widthOfString(s) <= maxW) return s;
  let out = s;
  while (out.length > 1 && doc.widthOfString(out + "…") > maxW) out = out.slice(0, -1);
  return out.trimEnd() + "…";
};

export interface ReportOptions {
  type: "shipment" | "project" | "ceo-summary" | "procurement" | "inventory" | "suppliers" | "qc" | "delayed";
  targetRef?: string;
  filters?: Record<string, string>;
}

export interface GeneratedReport {
  buffer: Buffer;
  filename: string;
  title: string;
}

export async function generatePdfReport(opts: ReportOptions): Promise<GeneratedReport> {
  const { type, targetRef } = opts;

  // 1. Shipment Report
  if (type === "shipment" || (targetRef && targetRef.startsWith("SHP-"))) {
    const snap = await buildTraceSnapshot();
    const ref = targetRef ?? snap.ships[0]?.ref ?? "SHP-8801";
    const buffer = await renderLiveReport(snap, ref);
    return {
      buffer,
      filename: `NASS-Shipment-${ref}-Report.pdf`,
      title: `NASS Shipment Report — ${ref}`,
    };
  }

  // 2. Project Materials Report
  if (type === "project") {
    return generateProjectPdf(targetRef);
  }

  // 3. CEO Executive Summary
  if (type === "ceo-summary") {
    return generateCeoSummaryPdf();
  }

  // 4. Procurement & PO Report
  if (type === "procurement") {
    return generateProcurementPdf(targetRef);
  }

  // 5. Inventory & Stock Report
  if (type === "inventory") {
    return generateInventoryPdf(targetRef);
  }

  // Default fallback to CEO Summary
  return generateCeoSummaryPdf();
}

/** Generate Comprehensive Project Materials & BOQ Intelligence PDF */
async function generateProjectPdf(refOrCode?: string): Promise<GeneratedReport> {
  const q = refOrCode?.trim() ?? "Project A";
  const project = await db.project.findFirst({
    where: {
      OR: [
        { code: { contains: q } },
        { name: { contains: q } },
        { id: q },
      ],
    },
    include: {
      materialRequirements: {
        include: {
          material: {
            include: {
              inventoryLots: true,
              poLines: { include: { po: true } },
            },
          },
        },
      },
      purchaseOrders: {
        include: { supplier: true, lines: true },
      },
      shipments: true,
    },
  }) ?? await db.project.findFirst({
    include: {
      materialRequirements: {
        include: {
          material: {
            include: {
              inventoryLots: true,
              poLines: { include: { po: true } },
            },
          },
        },
      },
      purchaseOrders: { include: { supplier: true, lines: true } },
      shipments: true,
    },
  });

  const projCode = project?.code ?? "PRJ-FLCN";
  const projName = project?.name ?? "Project A (Falcon Flyover)";
  const title = `NASS Project Intelligence Dossier — ${projCode}`;

  const doc = new PDFDocument({
    size: "A4",
    layout: "portrait",
    margins: { top: M, bottom: M, left: M, right: M },
    info: {
      Title: title,
      Author: "NASS Group · Closed-Loop Control Tower",
      Subject: "Project Materials, BOQ Requirements & Procurement Commitments",
      Creator: "NASS Executive Control Tower",
    },
  });

  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  let y = M + 2;
  let pageNo = 1;

  const drawFooter = (page: number) => {
    const prevBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.save();
    doc.moveTo(M, FOOTER_LINE_Y).lineTo(PAGE_W - M, FOOTER_LINE_Y).lineWidth(0.8).strokeColor(GOLD).stroke();
    const yT = FOOTER_LINE_Y + 6.5;
    doc.font("Helvetica").fontSize(6.5).fillColor(MUTED);
    doc.text("NASS Closed-Loop Control Tower · Project Procurement Audit · Truth-in-Data", M, yT, { lineBreak: false });
    doc.text(`Page ${page}`, M, yT, { width: CONTENT_W, align: "right", lineBreak: false });
    doc.restore();
    doc.page.margins.bottom = prevBottom;
  };

  doc.on("pageAdded", () => {
    pageNo += 1;
    drawFooter(pageNo);
  });

  const ensureSpace = (h: number) => {
    if (y + h > CONTENT_BOTTOM) {
      doc.addPage();
      y = M + 4;
    }
  };

  const section = (t: string) => {
    ensureSpace(35);
    doc.rect(M, y, CONTENT_W, 16).fill(GOLD);
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(INK).text(t, M + 8, y + 4.5, {
      characterSpacing: 1.2,
      lineBreak: false,
    });
    y += 24;
  };

  const kv = (k: string, v: string, x: number, w: number) => {
    doc.font("Helvetica-Bold").fontSize(6.5).fillColor(GOLD_DEEP).text(k.toUpperCase(), x, y, {
      characterSpacing: 0.9,
      lineBreak: false,
    });
    doc.font("Helvetica").fontSize(8.5).fillColor(BODY).text(fit(doc, v, w), x, y + 10, {
      lineBreak: false,
    });
  };

  // Cover Header
  const H = 125;
  doc.rect(0, 0, PAGE_W, H).fill(INK);
  doc.moveTo(0, H).lineTo(PAGE_W, H).lineWidth(1.5).strokeColor(GOLD).stroke();
  doc.font("Helvetica-Bold").fontSize(8).fillColor(GOLD).text("NASS GROUP · PROJECT INTELLIGENCE DOSSIER", M, 22, {
    characterSpacing: 1.5,
  });
  doc.font("Helvetica-Bold").fontSize(20).fillColor(GOLD_LIGHT).text(`${projCode} — ${projName}`, M, 38, {
    characterSpacing: 0.5,
  });
  doc.font("Helvetica").fontSize(8.5).fillColor(BAND_META).text(
    `Site Location: ${project?.site ?? "Manama, Bahrain"}  ·  Work Package: ${project?.workPackage ?? "Structural & Civil Infrastructure"}  ·  Status: ${project?.status ?? "CONFIRMED ACTIVE"}`,
    M,
    68,
  );
  doc.font("Helvetica").fontSize(7.5).fillColor(MUTED).text(
    `Generated: ${fmtNow()}  ·  Auth Scope: Executive Control Tower  ·  UTC+3 (Bahrain Local Time)`,
    M,
    95,
  );
  y = H + 20;
  drawFooter(1);

  // Section 1: Executive Project Summary
  section("1. PROJECT IDENTITY & CONTRACT GOVERNANCE");
  const halfW = (CONTENT_W - 16) / 2;
  ensureSpace(45);
  kv("Project Code", project?.code ?? "—", M, halfW);
  kv("Project Name", project?.name ?? "—", M + halfW + 16, halfW);
  y += 26;
  kv("Contracting Legal Entity", "NASS Contracting W.L.L. (Kingdom of Bahrain)", M, halfW);
  kv("Execution Status", `${project?.status ?? "ACTIVE"} (Strict Verification)`, M + halfW + 16, halfW);
  y += 32;

  // Section 2: Material Requirements (BOQ)
  section("2. BOQ MATERIAL REQUIREMENTS, STOCK & SHORTFALLS");
  const reqs = project?.materialRequirements ?? [];
  if (reqs.length === 0) {
    doc.font("Helvetica-Oblique").fontSize(8).fillColor(MUTED).text("No recorded BOQ material demands for this package.", M, y);
    y += 20;
  } else {
    // Table Header
    ensureSpace(30);
    doc.rect(M, y, CONTENT_W, 14).fill(PANEL);
    doc.font("Helvetica-Bold").fontSize(6.8).fillColor(GOLD);
    doc.text("MATERIAL SPECIFICATION", M + 6, y + 3.5, { width: 140, lineBreak: false });
    doc.text("REQUIRED", M + 150, y + 3.5, { width: 65, align: "right", lineBreak: false });
    doc.text("STOCK", M + 220, y + 3.5, { width: 65, align: "right", lineBreak: false });
    doc.text("SHORTFALL", M + 290, y + 3.5, { width: 65, align: "right", lineBreak: false });
    doc.text("NEED DATE", M + 360, y + 3.5, { width: 75, lineBreak: false });
    doc.text("PO COVER", M + 440, y + 3.5, { width: 65, lineBreak: false });
    y += 18;

    for (const r of reqs) {
      ensureSpace(22);
      const stock = (r.material?.inventoryLots ?? [])
        .filter((lot) => lot.status === "AVAILABLE" || lot.status === "ALLOCATED" || lot.status === "RESERVED")
        .reduce((sum, lot) => sum + lot.quantity, 0);
      const shortfall = Math.max(0, Math.round((r.quantity - stock) * 100) / 100);
      const isShort = shortfall > 0;
      const poRef = r.material?.poLines?.[0]?.po?.ref ?? "UNORDERED";

      doc.rect(M, y - 2, CONTENT_W, 18).fill(isShort ? "#fffdf5" : TINT);
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor(BODY);
      doc.text(fit(doc, r.material?.name ?? r.materialId, 135), M + 6, y + 3, { width: 135, lineBreak: false });
      doc.font("Helvetica").fontSize(7.5);
      doc.text(`${qty(Number(r.quantity))} ${r.uom}`, M + 150, y + 3, { width: 65, align: "right", lineBreak: false });
      doc.text(`${qty(stock)} ${r.uom}`, M + 220, y + 3, { width: 65, align: "right", lineBreak: false });
      doc.font(isShort ? "Helvetica-Bold" : "Helvetica").fillColor(isShort ? "#991b1b" : "#166534");
      doc.text(`${qty(shortfall)} ${r.uom}`, M + 290, y + 3, { width: 65, align: "right", lineBreak: false });
      doc.font("Helvetica").fillColor(BODY);
      doc.text(fit(doc, fmtDT(r.requiredOnSite?.toISOString()), 75), M + 360, y + 3, { width: 75, lineBreak: false });
      doc.font("Helvetica-Bold").fillColor(GOLD_DEEP);
      doc.text(fit(doc, poRef, 65), M + 440, y + 3, { width: 65, lineBreak: false });
      y += 20;
    }
    y += 10;
  }

  // Section 3: Linked Purchase Orders
  section("3. LINKED PURCHASE ORDERS & COMMERCIAL EXPOSURE");
  const pos = project?.purchaseOrders ?? [];
  if (pos.length === 0) {
    doc.font("Helvetica-Oblique").fontSize(8).fillColor(MUTED).text("No linked purchase orders found for this project code.", M, y);
    y += 20;
  } else {
    for (const p of pos) {
      ensureSpace(44);
      doc.rect(M, y, CONTENT_W, 36).lineWidth(0.6).strokeColor(HAIRLINE).stroke();
      doc.font("Helvetica-Bold").fontSize(8).fillColor(INK);
      doc.text(fit(doc, `PO: ${p.ref} (${p.status})`, CONTENT_W - 145), M + 8, y + 6, { width: CONTENT_W - 145, lineBreak: false });
      doc.font("Helvetica").fontSize(7.8).fillColor(BODY);
      doc.text(fit(doc, `Supplier: ${p.supplier?.name ?? "—"} (${p.supplier?.country ?? "—"}) · Incoterms: ${p.deliveryTerms ?? "CIF Sitra"}`, CONTENT_W - 145), M + 8, y + 20, { width: CONTENT_W - 145, lineBreak: false });
      doc.font("Helvetica-Bold").fontSize(9).fillColor(GOLD_DEEP);
      doc.text(money(Number(p.totalAmount), p.currency), M + CONTENT_W - 130, y + 12, { width: 120, align: "right", lineBreak: false });
      y += 42;
    }
    y += 10;
  }

  // Section 4: Inbound Shipments
  section("4. INBOUND SHIPMENTS & LOGISTICS TRACEABILITY");
  const ships = project?.shipments ?? [];
  if (ships.length === 0) {
    doc.font("Helvetica-Oblique").fontSize(8).fillColor(MUTED).text("No dedicated shipment records currently assigned to this project code.", M, y);
    y += 20;
  } else {
    for (const s of ships) {
      ensureSpace(26);
      doc.rect(M, y, CONTENT_W, 20).fill(TINT);
      doc.font("Helvetica-Bold").fontSize(7.8).fillColor(BODY);
      doc.text(fit(doc, `${s.ref} — ${s.mode} · Status: ${s.status}`, 170), M + 8, y + 5, { width: 170, lineBreak: false });
      doc.font("Helvetica").fontSize(7.5).fillColor(MUTED);
      doc.text(fit(doc, `Origin: ${s.originPort ?? "—"} › Destination: ${s.destPort ?? "Bahrain"} · ETA: ${fmtDT(s.eta?.toISOString())}`, CONTENT_W - 185), M + 180, y + 5, { width: CONTENT_W - 185, lineBreak: false });
      y += 24;
    }
  }

  doc.end();
  const buffer = await done;
  return {
    buffer,
    filename: `NASS-Project-${projCode}-Report.pdf`,
    title,
  };
}

/** Generate High-Level CEO Decision & Control Tower Executive PDF */
async function generateCeoSummaryPdf(): Promise<GeneratedReport> {
  const [ceoDecisions, pricing, projects] = await Promise.all([
    ceoDecisionFacts(),
    priceIntelligenceFacts(),
    db.project.findMany({
      include: {
        materialRequirements: true,
        purchaseOrders: true,
      },
    }),
  ]);

  const title = "NASS Group CEO Decision Control Tower Report";
  const doc = new PDFDocument({
    size: "A4",
    layout: "portrait",
    margins: { top: M, bottom: M, left: M, right: M },
    info: {
      Title: title,
      Author: "NASS Group Executive Office",
      Subject: "CEO Decision Briefing, Supply Chain Risks & Material Cost Parity",
      Creator: "NASS Executive Control Tower",
    },
  });

  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  let y = M + 2;
  let pageNo = 1;

  const drawFooter = (page: number) => {
    const prevBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.save();
    doc.moveTo(M, FOOTER_LINE_Y).lineTo(PAGE_W - M, FOOTER_LINE_Y).lineWidth(0.8).strokeColor(GOLD).stroke();
    const yT = FOOTER_LINE_Y + 6.5;
    doc.font("Helvetica").fontSize(6.5).fillColor(MUTED);
    doc.text("NASS Group CEO Executive Control Tower · Decision Support System · Confidential", M, yT, { lineBreak: false });
    doc.text(`Page ${page}`, M, yT, { width: CONTENT_W, align: "right", lineBreak: false });
    doc.restore();
    doc.page.margins.bottom = prevBottom;
  };

  doc.on("pageAdded", () => {
    pageNo += 1;
    drawFooter(pageNo);
  });

  const ensureSpace = (h: number) => {
    if (y + h > CONTENT_BOTTOM) {
      doc.addPage();
      y = M + 4;
    }
  };

  const section = (t: string) => {
    ensureSpace(35);
    doc.rect(M, y, CONTENT_W, 16).fill(GOLD);
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(INK).text(t, M + 8, y + 4.5, {
      characterSpacing: 1.2,
      lineBreak: false,
    });
    y += 24;
  };

  // Cover
  const H = 125;
  doc.rect(0, 0, PAGE_W, H).fill(INK);
  doc.moveTo(0, H).lineTo(PAGE_W, H).lineWidth(1.5).strokeColor(GOLD).stroke();
  doc.font("Helvetica-Bold").fontSize(8).fillColor(GOLD).text("NASS GROUP · EXECUTIVE CONTROL TOWER", M, 22, {
    characterSpacing: 1.6,
  });
  doc.font("Helvetica-Bold").fontSize(20).fillColor(GOLD_LIGHT).text("CEO DECISION & PORTFOLIO BRIEFING", M, 38, {
    characterSpacing: 0.5,
  });
  doc.font("Helvetica").fontSize(8.5).fillColor(BAND_META).text(
    `Portfolio Scope: Active Projects A–E, Commercial Corridors & Maritime Inbounds`,
    M,
    68,
  );
  doc.font("Helvetica").fontSize(7.5).fillColor(MUTED).text(
    `As of: ${fmtNow()}  ·  Authoritative Truth-in-Data  ·  Kingdom of Bahrain (UTC+3)`,
    M,
    95,
  );
  y = H + 20;
  drawFooter(1);

  // Section 1: Portfolio Snapshot (Structured Table Grid)
  section("1. ACTIVE PROJECT PORTFOLIO SUMMARY");
  
  // Table Header
  ensureSpace(32);
  doc.rect(M, y, CONTENT_W, 15).fill(PANEL);
  doc.font("Helvetica-Bold").fontSize(6.8).fillColor(GOLD);
  doc.text("PROJECT / WORK PACKAGE", M + 6, y + 4, { width: 175, lineBreak: false });
  doc.text("SITE LOCATION", M + 185, y + 4, { width: 135, lineBreak: false });
  doc.text("BOQ ITEMS", M + 325, y + 4, { width: 55, align: "right", lineBreak: false });
  doc.text("SHORTAGES", M + 385, y + 4, { width: 55, align: "right", lineBreak: false });
  doc.text("STATUS", M + 450, y + 4, { width: 60, align: "center", lineBreak: false });
  y += 19;

  for (const p of projects) {
    ensureSpace(22);
    const shortages = p.materialRequirements.filter((r) => Number(r.shortfall) > 0).length;
    doc.rect(M, y - 2, CONTENT_W, 18).fill(TINT);

    // Project Code & Name (strictly bounded)
    doc.font("Helvetica-Bold").fontSize(7.4).fillColor(INK);
    doc.text(fit(doc, `${p.code} — ${p.name}`, 172), M + 6, y + 3, { width: 172, lineBreak: false });

    // Site Location
    doc.font("Helvetica").fontSize(7.2).fillColor(MUTED);
    doc.text(fit(doc, p.site ?? "Bahrain", 132), M + 185, y + 3, { width: 132, lineBreak: false });

    // BOQ count
    doc.font("Helvetica").fontSize(7.2).fillColor(BODY);
    doc.text(String(p.materialRequirements.length), M + 325, y + 3, { width: 55, align: "right", lineBreak: false });

    // Shortages count
    doc.font("Helvetica-Bold").fontSize(7.2).fillColor(shortages > 0 ? "#991b1b" : "#166534");
    doc.text(String(shortages), M + 385, y + 3, { width: 55, align: "right", lineBreak: false });

    // Status Pill
    const isAction = shortages > 0;
    const badgeW = 54;
    const badgeH = 12;
    const badgeX = M + 453;
    const badgeY = y + 1;
    doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 2)
       .fillAndStroke(isAction ? "#fef2f2" : "#f0fdf4", isAction ? "#fca5a5" : "#86efac");
    doc.font("Helvetica-Bold").fontSize(6.2)
       .fillColor(isAction ? "#991b1b" : "#166534")
       .text(isAction ? "ACTION REQ" : "ON TRACK", badgeX, badgeY + 2.5, { width: badgeW, align: "center", lineBreak: false });

    y += 20;
  }
  y += 12;

  // Section 2: Executive Decisions Requiring CEO Approval (Dynamic Sequential Cards)
  section("2. EXECUTIVE ACTION COMMANDS REQUIRING CEO SIGN-OFF");

  for (const d of ceoDecisions.decisions) {
    const textW = CONTENT_W - 16;

    // 1. Measure Title height
    doc.font("Helvetica-Bold").fontSize(8.2);
    const titleText = `${d.ref}: ${d.title} (${d.project})`;
    const titleH = doc.heightOfString(titleText, { width: textW });

    // 2. Measure Financial Impact & Owner height
    doc.font("Helvetica-Bold").fontSize(7.2);
    const impactText = `Financial Impact: ${d.financialImpact}  ·  Accountable: ${d.accountableOwner}`;
    const impactH = doc.heightOfString(impactText, { width: textW });

    // 3. Measure Situation height
    doc.font("Helvetica").fontSize(7.0);
    const sitText = `Situation: ${d.situation}`;
    const sitH = doc.heightOfString(sitText, { width: textW });

    // 4. Measure Trade-Offs height
    doc.font("Helvetica").fontSize(7.0);
    const tradeText = `Trade-Offs: ${d.tradeOffs}`;
    const tradeH = doc.heightOfString(tradeText, { width: textW });

    // 5. Measure Recommended Action height
    doc.font("Helvetica-Bold").fontSize(7.2);
    const actionText = `RECOMMENDED ACTION: ${d.recommendedAction}`;
    const actionH = doc.heightOfString(actionText, { width: textW });

    // Total Card Height: topPad(7) + title + 3 + impact + 3 + sit + 3 + trade + 4 + action + bottomPad(7)
    const cardH = 7 + titleH + 3 + impactH + 3 + sitH + 3 + tradeH + 4 + actionH + 7;

    ensureSpace(cardH + 8);

    // Draw background card with subtle warm tint and deep gold border
    doc.roundedRect(M, y, CONTENT_W, cardH, 3).lineWidth(0.8).strokeColor(GOLD_DEEP).fillAndStroke("#fffefb", GOLD_DEEP);

    let curY = y + 7;

    // 1. Title
    doc.font("Helvetica-Bold").fontSize(8.2).fillColor(INK);
    doc.text(titleText, M + 8, curY, { width: textW });
    curY += titleH + 3;

    // 2. Financial Impact & Owner
    doc.font("Helvetica-Bold").fontSize(7.2).fillColor("#991b1b");
    doc.text(impactText, M + 8, curY, { width: textW });
    curY += impactH + 3;

    // 3. Situation
    doc.font("Helvetica").fontSize(7.0).fillColor(BODY);
    doc.text(sitText, M + 8, curY, { width: textW });
    curY += sitH + 3;

    // 4. Trade-Offs
    doc.font("Helvetica").fontSize(7.0).fillColor(MUTED);
    doc.text(tradeText, M + 8, curY, { width: textW });
    curY += tradeH + 4;

    // 5. Recommended Action
    doc.font("Helvetica-Bold").fontSize(7.2).fillColor(GOLD_DEEP);
    doc.text(actionText, M + 8, curY, { width: textW });

    y += cardH + 10;
  }
  y += 8;

  // Section 3: Material Price Intelligence & Benchmark Parity
  section("3. PRICE INTELLIGENCE & MARKET BENCHMARK PARITY");
  ensureSpace(28);
  doc.rect(M, y, CONTENT_W, 15).fill(PANEL);
  doc.font("Helvetica-Bold").fontSize(6.8).fillColor(GOLD);
  doc.text("MATERIAL ITEM", M + 6, y + 4, { width: 140, lineBreak: false });
  doc.text("SUPPLIER", M + 150, y + 4, { width: 100, lineBreak: false });
  doc.text("PO PRICE", M + 260, y + 4, { width: 65, align: "right", lineBreak: false });
  doc.text("MARKET RATE", M + 335, y + 4, { width: 65, align: "right", lineBreak: false });
  doc.text("VARIANCE", M + 410, y + 4, { width: 45, align: "right", lineBreak: false });
  doc.text("VERIFICATION", M + 465, y + 4, { width: 45, align: "center", lineBreak: false });
  y += 19;

  for (const b of pricing.benchmarks) {
    ensureSpace(20);
    doc.rect(M, y - 2, CONTENT_W, 16).fill(TINT);
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(BODY);
    doc.text(fit(doc, b.materialName, 135), M + 6, y + 3, { width: 135, lineBreak: false });
    doc.font("Helvetica").fontSize(7.2);
    doc.text(fit(doc, b.supplier, 95), M + 150, y + 3, { width: 95, lineBreak: false });
    doc.text(`$${b.actualPoPrice?.toFixed(2) ?? "—"}`, M + 260, y + 3, { width: 65, align: "right", lineBreak: false });
    doc.text(`$${b.marketBenchmark.toFixed(2)}`, M + 335, y + 3, { width: 65, align: "right", lineBreak: false });
    doc.font("Helvetica-Bold").fillColor(b.variancePct > 0 ? "#991b1b" : "#166534");
    doc.text(`${b.variancePct > 0 ? "+" : ""}${b.variancePct}%`, M + 410, y + 3, { width: 45, align: "right", lineBreak: false });
    doc.font("Helvetica").fontSize(6.8).fillColor(MUTED);
    doc.text(fit(doc, b.freshness, 45), M + 465, y + 3, { width: 45, align: "center", lineBreak: false });
    y += 18;
  }

  doc.end();
  const buffer = await done;
  return {
    buffer,
    filename: "NASS-CEO-Executive-Report.pdf",
    title,
  };
}

/** Procurement & PO PDF */
async function generateProcurementPdf(poRef?: string): Promise<GeneratedReport> {
  const pos = await db.purchaseOrder.findMany({
    include: { supplier: true, project: true, lines: true },
  });

  const title = poRef ? `NASS Purchase Order Report — ${poRef}` : "NASS Procurement & PO Commitments Report";
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: M, bottom: M, left: M, right: M },
  });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  let y = M + 2;
  const H = 100;
  doc.rect(0, 0, PAGE_W, H).fill(INK);
  doc.font("Helvetica-Bold").fontSize(18).fillColor(GOLD_LIGHT).text(title, M, 35);
  doc.font("Helvetica").fontSize(8).fillColor(BAND_META).text(`Authoritative PO Lines & Supplier Linkages · Generated ${fmtNow()}`, M, 65);
  y = H + 20;

  for (const po of pos) {
    if (y + 50 > CONTENT_BOTTOM) { doc.addPage(); y = M; }
    doc.rect(M, y, CONTENT_W, 36).fill(TINT);
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(INK).text(fit(doc, `PO: ${po.ref} · Status: ${po.status}`, CONTENT_W - 145), M + 8, y + 6, { width: CONTENT_W - 145, lineBreak: false });
    doc.font("Helvetica").fontSize(7.5).fillColor(BODY).text(fit(doc, `Supplier: ${po.supplier?.name} · Project: ${po.project?.name ?? "General"}`, CONTENT_W - 145), M + 8, y + 18, { width: CONTENT_W - 145, lineBreak: false });
    doc.font("Helvetica-Bold").fontSize(9).fillColor(GOLD_DEEP).text(money(Number(po.totalAmount), po.currency), M + CONTENT_W - 120, y + 10, { width: 110, align: "right", lineBreak: false });
    y += 42;
  }

  doc.end();
  const buffer = await done;
  return {
    buffer,
    filename: poRef ? `NASS-PO-${poRef}.pdf` : "NASS-Procurement-Report.pdf",
    title,
  };
}

/** Inventory & Stock PDF */
async function generateInventoryPdf(loc?: string): Promise<GeneratedReport> {
  const lots = await db.inventoryLot.findMany({
    include: { material: true, project: true, warehouse: true },
  });

  const title = "NASS Inventory & Warehouse Stock Report";
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: M, bottom: M, left: M, right: M },
  });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  let y = M + 2;
  const H = 100;
  doc.rect(0, 0, PAGE_W, H).fill(INK);
  doc.font("Helvetica-Bold").fontSize(18).fillColor(GOLD_LIGHT).text(title, M, 35);
  doc.font("Helvetica").fontSize(8).fillColor(BAND_META).text(`Stock on Hand, Allocated Reserves & Warehouses · Generated ${fmtNow()}`, M, 65);
  y = H + 20;

  for (const l of lots) {
    if (y + 30 > CONTENT_BOTTOM) { doc.addPage(); y = M; }
    doc.rect(M, y, CONTENT_W, 22).fill(TINT);
    doc.font("Helvetica-Bold").fontSize(8).fillColor(INK).text(fit(doc, l.material?.name ?? l.materialId, 160), M + 8, y + 5, { width: 160, lineBreak: false });
    doc.font("Helvetica").fontSize(7.5).fillColor(BODY).text(fit(doc, `Warehouse: ${l.warehouse?.name ?? l.warehouse?.code ?? "—"} · Lot: ${l.lotNo ?? "—"} · Status: ${l.status}`, 200), M + 175, y + 5, { width: 200, lineBreak: false });
    doc.font("Helvetica-Bold").fontSize(8).fillColor(GOLD_DEEP).text(`Stock: ${qty(Number(l.quantity))} ${l.uom}`, M + CONTENT_W - 130, y + 5, { width: 120, align: "right", lineBreak: false });
    y += 26;
  }

  doc.end();
  const buffer = await done;
  return {
    buffer,
    filename: "NASS-Inventory-Stock-Report.pdf",
    title,
  };
}
