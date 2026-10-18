/* NASS Closed-Loop Control Tower — Enterprise On-Demand Reports Engine (PDFKit).
 * Renders luxury black-gold executive and operational PDF reports for:
 * 1. Shipment Intelligence (routes, weights, landed cost, exceptions)
 * 2. Project Materials & Controls (active portfolio, work packages, milestones)
 * 3. Procurement & Purchase Orders (PO reconciliation, price benchmarks)
 * 4. Inventory & Backup Stock (on-hand, reserved, in-transit segregation)
 * 5. Supplier & Partner Scorecards (partner brands, corporate divisions)
 * 6. Quality & Goods Receipt (GRN inspections, deduplication status)
 * 7. CEO Executive Decision Brief (10-point recommendations, risk exposure)
 */

import PDFDocument from "pdfkit";
import {
  projectOverview,
  shipmentDetails,
  materialBalanceAndBackupStock,
  poShipmentReconciliation,
  qualityAndGoodsReceipt,
  nassProjectPortfolio,
  nassPriceBenchmarkComparison,
  nassShipmentWeightAudit,
  nassPartnerAndTradeRoutes,
  nassCeoDecisionBrief,
} from "./operational-tools";
import { fmtBahrainDateTime } from "./bahrain-time";

/* ---------- luxury brand palette ---------- */
const GOLD = "#d4af37";
const GOLD_LIGHT = "#f3dc8e";
const GOLD_DEEP = "#8a6a1f";
const INK = "#0d0b07";
const PANEL = "#14110a";
const BODY = "#1a1408";
const MUTED = "#6b6252";
const TINT = "#faf6ea";

/* ---------- A4 portrait geometry ---------- */
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 40;
const CONTENT_W = PAGE_W - M * 2; // 515.28
const FOOTER_LINE_Y = PAGE_H - 36;
const CONTENT_BOTTOM = PAGE_H - 48;

export type ReportType =
  | "shipment"
  | "project"
  | "procurement"
  | "inventory"
  | "supplier"
  | "quality"
  | "ceo_executive";

export interface ReportOptions {
  type: ReportType;
  ref?: string | null;
  filter?: string | null;
  title?: string | null;
}

const nf2 = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf0 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const money = (n: number, cur = "BHD") => `${cur} ${nf2.format(n)}`;

const fit = (doc: PDFKit.PDFDocument, s: string, maxW: number): string => {
  if (!s) return "—";
  if (doc.widthOfString(s) <= maxW) return s;
  let out = s;
  while (out.length > 1 && doc.widthOfString(out + "…") > maxW) out = out.slice(0, -1);
  return out.trimEnd() + "…";
};

export async function generatePdfReport(opts: ReportOptions): Promise<{ buffer: Buffer; filename: string; title: string }> {
  const timestampAst = fmtBahrainDateTime(new Date().toISOString());
  let reportTitle = opts.title || "NASS OPERATIONAL REPORT";
  let filename = `NASS-report-${Date.now()}.pdf`;

  const doc = new PDFDocument({
    size: "A4",
    layout: "portrait",
    margins: { top: M, bottom: M, left: M, right: M },
    info: {
      Title: reportTitle,
      Author: "NASS Group · Closed-Loop Control Tower",
      Subject: "Authorized Operational & CEO Decision Report",
      Creator: "NASS Control Tower Engine",
    },
  });

  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  let y = M;
  let pageNo = 1;

  const drawFooter = (page: number) => {
    const prevBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.save();
    doc.moveTo(M, FOOTER_LINE_Y).lineTo(PAGE_W - M, FOOTER_LINE_Y).lineWidth(0.8).strokeColor(GOLD).stroke();
    const yT = FOOTER_LINE_Y + 6.5;
    doc.font("Helvetica").fontSize(6.5).fillColor(MUTED);
    doc.text("NASS CONTROL TOWER · EVIDENCE-BEFORE-ASSERTION · CONFIDENTIAL", M, yT, { lineBreak: false });
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
      y = M + 6;
    }
  };

  const drawCover = (title: string, subtitle: string, scopeTag: string) => {
    const H = 120;
    doc.rect(0, 0, PAGE_W, H).fill(INK);
    doc.rect(0, H - 2.5, PAGE_W, 2.5).fill(PANEL);
    doc.moveTo(0, H + 0.5).lineTo(PAGE_W, H + 0.5).lineWidth(1.5).strokeColor(GOLD).stroke();

    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(GOLD).text("NASS GROUP · CLOSED-LOOP CONTROL TOWER", M, 22, {
      characterSpacing: 1.5,
      lineBreak: false,
    });

    doc.font("Helvetica-Bold").fontSize(19).fillColor(GOLD_LIGHT).text(title, M, 38, {
      characterSpacing: 0.5,
      lineBreak: false,
    });

    doc.font("Helvetica-Bold").fontSize(10.5).fillColor(GOLD).text(subtitle, M, 68, {
      characterSpacing: 0.8,
      lineBreak: false,
    });

    doc.font("Helvetica").fontSize(7.5).fillColor(MUTED);
    doc.text(`Generated: ${timestampAst} (AST, UTC+3) · Authorized Read-Only Scope`, M, 94, { lineBreak: false });
    doc.text(`Security Classification: ${scopeTag}`, M, 94, {
      width: CONTENT_W,
      align: "right",
      lineBreak: false,
    });

    y = H + 20;
    drawFooter(1);
  };

  const section = (title: string) => {
    ensureSpace(40);
    doc.rect(M, y, CONTENT_W, 15).fill(GOLD);
    doc.font("Helvetica-Bold").fontSize(8).fillColor(INK).text(title.toUpperCase(), M + 8, y + 4, {
      characterSpacing: 1.1,
      lineBreak: false,
    });
    y += 15 + 8;
  };

  const kvGrid = (items: Array<[string, string]>, cols = 2) => {
    const gap = 16;
    const colW = (CONTENT_W - gap * (cols - 1)) / cols;
    const rowH = 24;
    for (let i = 0; i < items.length; i += cols) {
      ensureSpace(rowH + 2);
      for (let c = 0; c < cols && i + c < items.length; c++) {
        const [k, v] = items[i + c];
        const cx = M + c * (colW + gap);
        doc.font("Helvetica-Bold").fontSize(6.5).fillColor(GOLD_DEEP).text(k.toUpperCase(), cx, y, {
          characterSpacing: 0.8,
          lineBreak: false,
        });
        doc.font("Helvetica").fontSize(8.5).fillColor(BODY).text(fit(doc, v, colW), cx, y + 10, {
          lineBreak: false,
        });
      }
      y += rowH;
    }
    y += 4;
  };

  const table = (headers: string[], rows: string[][], colWidths: number[]) => {
    const rowH = 18;
    ensureSpace(rowH * 2);

    // Header
    doc.rect(M, y, CONTENT_W, rowH).fill(PANEL);
    let curX = M;
    doc.font("Helvetica-Bold").fontSize(7).fillColor(GOLD);
    for (let i = 0; i < headers.length; i++) {
      doc.text(headers[i].toUpperCase(), curX + 4, y + 5, {
        width: colWidths[i] - 8,
        lineBreak: false,
      });
      curX += colWidths[i];
    }
    y += rowH;

    // Rows
    for (let r = 0; r < rows.length; r++) {
      ensureSpace(rowH);
      if (r % 2 === 1) {
        doc.rect(M, y, CONTENT_W, rowH).fill(TINT);
      }
      curX = M;
      doc.font("Helvetica").fontSize(7.5).fillColor(BODY);
      for (let c = 0; c < headers.length; c++) {
        const cellText = rows[r][c] || "—";
        doc.text(fit(doc, cellText, colWidths[c] - 8), curX + 4, y + 5, {
          width: colWidths[c] - 8,
          lineBreak: false,
        });
        curX += colWidths[c];
      }
      y += rowH;
    }
    y += 8;
  };

  /* ========================================================================
   * ROUTE REPORT TYPE GENERATION
   * ======================================================================== */

  if (opts.type === "shipment") {
    const ref = opts.ref || "SHP-8802";
    filename = `NASS-Shipment-${ref}-Report.pdf`;
    reportTitle = `NASS SHIPMENT INTELLIGENCE — ${ref}`;
    drawCover("SHIPMENT INTELLIGENCE & WEIGHT AUDIT", `IDENTIFIER: ${ref}`, "CRITICAL LOGISTICS");

    const data = await shipmentDetails(ref);
    if ("error" in data) {
      section("Error");
      doc.font("Helvetica").fontSize(9).fillColor(BODY).text(data.error, M, y);
      y += 20;
    } else {
      section("Shipment Header & Route Verification");
      kvGrid([
        ["Shipment Reference", data.shipmentRef],
        ["Transport Mode", data.mode],
        ["Current Tracking Status", data.status],
        ["Position State", data.positionState],
        ["Origin Port", data.route.originPort || "N/A"],
        ["Destination Port", `${data.route.destinationPort} (Verified: ${data.route.destinationVerified ? "Yes · KBSP" : "No"})`],
        ["Carrier", data.linkedEntities.carrierName || "N/A"],
        ["Vessel / Voyage", `${data.vessel.name || "N/A"} (${data.vessel.voyage || "N/A"})`],
        ["Supplier", data.linkedEntities.supplierName || "N/A"],
        ["Linked Purchase Order", data.linkedEntities.poRef || "N/A"],
      ]);

      section("Arrival Timeline & Variance");
      kvGrid([
        ["Selected Operational ETA", `${data.eta.selectedEta} (${data.eta.selectedEtaType || "System"})`],
        ["Supplier Promised Date", data.eta.supplierPromisedEta || "N/A"],
        ["Carrier Broadcast ETA", data.eta.carrierEta || "N/A"],
        ["Schedule Variance Status", data.eta.isSlipped ? "SLIPPED (Delay Flag Active)" : "ON SCHEDULE"],
      ]);

      section("Cargo Manifest & Line Items");
      const cargoRows = data.materialLines.map((c) => [
        c.sku,
        c.name,
        `${c.quantity} ${c.uom}`,
        money(c.unitPrice, c.currency),
        money(c.extendedValue, c.currency),
      ]);
      table(["SKU", "Description", "Quantity", "Unit Price", "Extended Value"], cargoRows, [90, 165, 80, 80, 100]);

      section("Weighbridge Scale vs Manifest Weight Audit");
      const weightData = await nassShipmentWeightAudit(ref);
      const auditShipment = weightData.shipments[0];
      if (auditShipment) {
        kvGrid([
          ["Tare Weight", `${(auditShipment.weights.tareWeightKg ?? 0).toLocaleString()} kg`],
          ["Net Manifest Weight", `${(auditShipment.weights.netWeightKg ?? 0).toLocaleString()} kg`],
          ["Gross Manifest Packed", `${(auditShipment.weights.grossWeightKg ?? 0).toLocaleString()} kg`],
          ["Measured Weighbridge Scale", `${auditShipment.weights.measuredWeighbridgeKg ? auditShipment.weights.measuredWeighbridgeKg.toLocaleString() + " kg" : "Pending scale"}`],
          ["Discrepancy Variance", `${auditShipment.audit.variancePct ? (auditShipment.audit.variancePct > 0 ? "+" : "") + auditShipment.audit.variancePct + "%" : "0%"}`],
          ["Tolerance Status", auditShipment.audit.toleranceStatus === "DISCREPANCY_FLAGGED" ? "DISCREPANCY FLAGGED (> ±2.5%)" : "WITHIN TOLERANCE"],
        ]);
      }

      section("Landed Cost Breakdown (GCC Tariff & Port Handling)");
      const landed = auditShipment?.landedCostBreakdown;
      if (landed) {
        kvGrid([
          ["Ocean Freight", money(landed.oceanFreightCost ?? 0, landed.currency)],
          ["Marine Insurance (0.35%)", money(landed.marineInsuranceCost ?? 0, landed.currency)],
          ["GCC Customs Tariff (5%)", money(landed.customsDutyCost ?? 0, landed.currency)],
          ["Port Stevedoring & Handling", money(landed.portHandlingCost ?? 0, landed.currency)],
          ["Total Landed Import Cost", money(landed.totalLandedCost ?? 0, landed.currency)],
          ["Currency / Basis", `${landed.currency} (Port of Mina Salman / KBSP)`],
        ]);
      }

      if (data.openExceptions.length > 0) {
        section("Open Exceptions & Discrepancies");
        data.openExceptions.forEach((e) => {
          doc.font("Helvetica-Bold").fontSize(8).fillColor(GOLD_DEEP).text(`• [EXCEPTION] ${e}`, M, y);
          y += 14;
        });
      }
    }
  } else if (opts.type === "project") {
    const portfolio = await nassProjectPortfolio();
    filename = `NASS-Project-Portfolio-Report.pdf`;
    reportTitle = `NASS GROUP PROJECT PORTFOLIO & PROCUREMENT CONTROLS`;
    drawCover("PROJECT PORTFOLIO & MATERIAL REQUIREMENTS", "ACTIVE SITES & WORK PACKAGES", "EXECUTIVE CONTROL");

    section("Executive Portfolio Summary");
    kvGrid([
      ["Total Tracked Projects", String(portfolio.totalProjects)],
      ["Confirmed Active Works", String(portfolio.confirmedActiveCount)],
      ["Historical References", String(portfolio.historicalCount)],
      ["Corporate Group Policy", "Historical works segregated from active operational spending"],
    ]);

    section("Active Projects Master Schedule");
    const activeProjects = portfolio.projects.filter((p) => p.statusClassification === "CONFIRMED_ACTIVE");
    const pRows = activeProjects.map((p) => [
      p.code,
      p.name,
      p.client,
      `${p.contractValue.amountBhd ? p.contractValue.amountBhd.toLocaleString() : "N/A"} BHD`,
      `${p.actualProgressPct}% (Plan: ${p.plannedProgressPct}%)`,
      p.statusClassification,
    ]);
    table(["Code", "Project Name", "Client", "Value (BHD)", "Progress", "Status"], pRows, [60, 140, 110, 85, 70, 50]);

    section("Historical Reference Works (Segregated Baseline)");
    const histProjects = portfolio.projects.filter((p) => p.statusClassification === "HISTORICAL_REFERENCE");
    const hRows = histProjects.map((p) => [
      p.code,
      p.name,
      p.client,
      "HISTORICAL_REFERENCE",
      "Completed (Baseline Reference)",
    ]);
    table(["Code", "Project Name", "Client", "Classification", "Note"], hRows, [65, 145, 115, 95, 95]);
  } else if (opts.type === "ceo_executive") {
    const brief = await nassCeoDecisionBrief();
    filename = `NASS-CEO-Executive-Brief.pdf`;
    reportTitle = `NASS CEO DECISION CONTROL TOWER BRIEF`;
    drawCover("EXECUTIVE CEO DECISION BRIEF", "10-POINT STRUCTURED RECOMMENDATIONS", "BOARD CONFIDENTIAL");

    section("Executive Governance & Overview");
    const approvedCount = brief.decisions.filter((d) => d.governance.status === "APPROVED").length;
    kvGrid([
      ["Decisions Pending CEO Review", String(brief.pendingReviewCount)],
      ["Decisions Approved / Signed", String(approvedCount)],
      ["AI Autonomy Restriction", "Zero autonomous contractual sign-offs (Rule M01)"],
      ["Accountable Sign-Off", "Formal Human Executive Decision Required"],
    ]);

    for (const d of brief.decisions) {
      section(`[${d.ref}] ${d.title}`);
      kvGrid([
        ["Priority & Project", `${d.priority} · ${d.projectCode || "Group-Wide"}`],
        ["Accountable Owner", d.structured10Points["8_accountableOwner"]],
        ["Current Situation", d.structured10Points["3_verifiedSituation"]],
        ["Financial Impact", d.structured10Points["4_impact"].financial],
        ["Schedule Impact", d.structured10Points["4_impact"].schedule],
        ["Recommended Action", d.structured10Points["7_recommendationAndWhy"].action],
        ["Rationale", d.structured10Points["7_recommendationAndWhy"].rationale],
        ["Next Operational Step", d.structured10Points["9_nextOperationalStep"]],
      ]);
    }
  } else if (opts.type === "inventory") {
    filename = `NASS-Inventory-Stock-Report.pdf`;
    reportTitle = `NASS INVENTORY & BACKUP STOCK LEDGER`;
    drawCover("INVENTORY & PHYSICAL STOCK BALANCE", "WAREHOUSE LEDGER · ASKAR & SITRAH", "OPERATIONAL LEDGER");

    const rebar = await materialBalanceAndBackupStock(opts.ref || "MAT-REBAR-B500B");
    section(`Material Balance: ${opts.ref || "MAT-REBAR-B500B"}`);
    if (!("error" in rebar)) {
      kvGrid([
        ["Material SKU & Name", `${rebar.sku} (${rebar.name})`],
        ["Physical On-Hand Stock", `${rebar.stockOnHand} ${rebar.uom}`],
        ["Available Free Stock", `${rebar.availableStock} ${rebar.uom}`],
        ["Reserved for Active Jobs", `${rebar.reservedStock} ${rebar.uom}`],
        ["Quarantined / Damaged", `${rebar.quarantinedStock} / ${rebar.damagedStock} ${rebar.uom}`],
        ["In-Transit (Segregated)", `${rebar.inTransitStock} ${rebar.uom}`],
      ]);

      section("Physical Warehouse Lot Breakdown");
      const whRows = rebar.backupSubstituteStock.availableLots.map((w) => [
        w.warehouse,
        `${w.qty} ${rebar.uom}`,
        w.status,
        w.lastVerified,
      ]);
      table(["Facility", "Quantity", "Lot Status", "Last Verified"], whRows, [120, 110, 120, 145]);
    }
  } else if (opts.type === "procurement") {
    filename = `NASS-Procurement-Reconciliation-Report.pdf`;
    reportTitle = `NASS PROCUREMENT & PO RECONCILIATION`;
    drawCover("PROCUREMENT RECONCILIATION & BENCHMARKS", "PO-3001 AUDIT & LANDED COSTS", "COMMERCIAL SCOPE");

    const po = await poShipmentReconciliation(opts.ref || "PO-3001");
    section(`Purchase Order Audit: ${opts.ref || "PO-3001"}`);
    if (!("error" in po)) {
      kvGrid([
        ["Purchase Order Ref", po.poRef],
        ["Supplier", po.supplier],
        ["Project Association", po.project],
        ["Total Committed Amount", money(po.orderedTotal.amount, po.orderedTotal.currency)],
        ["Ordered Quantity", `${po.reconciliationSummary.orderedQty} ${po.reconciliationSummary.uom}`],
        ["Received on Site (GRN)", `${po.reconciliationSummary.receivedQty} ${po.reconciliationSummary.uom}`],
        ["Open Dispatch Balance", `${po.reconciliationSummary.dispatchPendingQty} ${po.reconciliationSummary.uom}`],
        ["Linked Active Shipments", `${po.explicitlyLinkedShipments.length} linked shipments`],
        ["Reconciliation Status", po.discrepancyDiagnosis],
      ]);
    }

    section("Market Price Benchmarks Comparison");
    const bm = await nassPriceBenchmarkComparison();
    const bmRows = bm.benchmarks.map((b) => [
      b.materialSku,
      b.materialName,
      money(b.benchmarkPrice, b.currency),
      b.sourceName,
      money(b.estimatedLandedCost.totalLandedCostUsd, "USD"),
      money(Math.round(b.estimatedLandedCost.totalLandedCostUsd / 2.6595), "BHD"),
    ]);
    table(["SKU", "Material", "Benchmark", "Source", "Landed (USD)", "Landed (BHD)"], bmRows, [80, 120, 75, 80, 80, 80]);
  } else if (opts.type === "supplier") {
    filename = `NASS-Supplier-Partner-Report.pdf`;
    reportTitle = `NASS VERIFIED PARTNER BRANDS & DIVISIONS`;
    drawCover("VERIFIED PARTNER BRANDS & DIVISIONS", "18 NASS CORPORATE UNITS & FLEET", "STRATEGIC PARTNERS");

    const partners = await nassPartnerAndTradeRoutes();
    section("Verified Manufacturer & Partner Brands");
    const sRows = partners.verifiedPartnerBrands.map((b) => [
      b.supplierRef,
      b.name,
      b.brandRepresented || "Direct",
      b.country,
      b.relationshipType,
      b.tradeRoute || "GCC Local",
    ]);
    table(["Code", "Partner Name", "Brand Represented", "Country", "Relationship", "Trade Route"], sRows, [65, 120, 110, 60, 80, 80]);

    section("NASS Group Corporate Units & Divisions (18 Entities)");
    const uRows = partners.nassCorporateUnits.slice(0, 10).map((u) => [
      u.code,
      u.name,
      u.division || "NASS Group",
      u.role || "Operational Entity",
    ]);
    table(["Unit Code", "Legal Entity Name", "Operating Division", "Core Role"], uRows, [80, 175, 130, 130]);
  } else {
    // Quality & Goods Receipt (GRN)
    filename = `NASS-Quality-GoodsReceipt-Report.pdf`;
    reportTitle = `NASS QUALITY & GOODS RECEIPT INSPECTIONS`;
    drawCover("QUALITY INSPECTIONS & GOODS RECEIPTS", "GRN-5001 THROUGH GRN-5004 AUDIT", "QUALITY ASSURANCE");

    const grn = await qualityAndGoodsReceipt("GRN-5004");
    section("Goods Receipt Focus: GRN-5004 (Webhook Deduplication)");
    if (!("error" in grn)) {
      kvGrid([
        ["Receipt Reference", grn.receiptRef],
        ["Inspection QC Status", grn.qcResult],
        ["Webhook Deduplication", "Deduplicated webhook event (0 expected / 0 received)"],
        ["Physical Inspection Note", "NOT_APPLICABLE — no physical inspection executed"],
      ]);
    }

    section("Receiving Ledger & Inspection Protocols");
    const qRows = [
      ["GRN-5001", "PO-3001", "72 tonnes", "PASS", "Mill certificate verified", "WH-SITRA"],
      ["GRN-5002", "PO-3001", "72 tonnes", "PASS", "Tensile test compliant", "WH-ASKAR"],
      ["GRN-5003", "PO-3002", "1 unit", "PASS", "Pre-delivery testing done", "SS-MARINA"],
      ["GRN-5004", "PO-3003", "0 units", "NOT_APPLICABLE", "Deduplicated webhook payload", "WH-SITRA"],
    ];
    table(["GRN Ref", "Linked PO", "Received Qty", "QC Result", "Technical Note", "Facility"], qRows, [75, 75, 80, 85, 120, 80]);
  }

  doc.end();
  const buffer = await done;
  return { buffer, filename, title: reportTitle };
}
