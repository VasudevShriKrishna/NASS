/* NASS — Freight Traceability PDF report renderer (server-side only).
 * Luxury black-gold brand, pure PDFKit vectors, built-in Helvetica family only
 * (no font files registered, no raster images). Consumes the TraceSnapshot
 * built by src/lib/trace.ts.
 *
 * Glyph note: built-in fonts use WinAnsi encoding — "→" and "≠" have zero
 * width there, so route direction uses "›" and the footer "≠" is drawn as a
 * tiny vector glyph. */

import PDFDocument from "pdfkit";
import type { TraceShip, TraceSnapshot } from "@/lib/trace-types";

/* ---------- brand palette (mirrors the app's black-gold theme) ---------- */
const GOLD = "#d4af37";
const GOLD_LIGHT = "#f3dc8e";
const GOLD_DEEP = "#8a6a1f";
const INK = "#0d0b07";
const PANEL = "#14110a";
const BODY = "#1a1408";
const MUTED = "#6b6252";
const HAIRLINE = "#e6ddc8";
const TINT = "#faf6ea"; // ultra-light gold wash for striping / tiles
const BAND_META = "#c9b98a"; // meta text on the dark cover band

/* ---------- A4 portrait geometry ---------- */
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 40;
const CONTENT_W = PAGE_W - M * 2; // 515.28
const FOOTER_LINE_Y = PAGE_H - 36;
const CONTENT_BOTTOM = PAGE_H - 48;

/* ---------- formatting ---------- */
const nf2 = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf0 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const money = (n: number, cur: string) => `${cur} ${nf2.format(n)}`;
const money0 = (n: number, cur: string) => `${cur} ${nf0.format(n)}`;
const qty = (n: number) => (Number.isInteger(n) ? nf0.format(n) : nf2.format(n));
const pad2 = (n: number) => String(n).padStart(2, "0");
const fmtDT = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};
const fmtNow = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
};
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** truncate a single-line string to maxW under the currently-set font */
const fit = (doc: PDFKit.PDFDocument, s: string, maxW: number): string => {
  if (!s) return "—";
  if (doc.widthOfString(s) <= maxW) return s;
  let out = s;
  while (out.length > 1 && doc.widthOfString(out + "…") > maxW) out = out.slice(0, -1);
  return out.trimEnd() + "…";
};

/* ======================================================================== */

export async function renderLiveReport(snap: TraceSnapshot, ref?: string | null): Promise<Buffer> {
  // Defensive: the caller normally pre-filters snap.ships to `ref`, but resolve
  // the target ship by ref anyway so the report can never cover the wrong ship.
  const pool = ref ? snap.ships.filter((s) => s.ref === ref) : snap.ships;
  const perShip = Boolean(ref) && pool.length > 0;
  const ship = perShip ? pool[0] : null;

  const doc = new PDFDocument({
    size: "A4",
    layout: "portrait",
    margins: { top: M, bottom: M, left: M, right: M },
    info: {
      Title: perShip ? `NASS Live Report — ${ship?.ref ?? ref}` : "NASS Live Scenario Report",
      Author: "NASS · Closed-Loop Control Tower",
      Subject: "Live traceability snapshot report",
      Creator: "NASS control tower",
    },
  });

  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  let y = M + 2;
  let pageNo = 1;

  /* ---------- footer (every page) ---------- */
  const MOTTO_L = "evidence-before-assertion · vessel ";
  const MOTTO_R = " container · verified outcomes only";
  const drawFooter = (page: number) => {
    // The footer sits inside the bottom margin zone (below pdfkit's maxY).
    // While drawing it we zero the page's bottom margin, otherwise doc.text
    // would auto-add a page from inside the pageAdded handler → recursion.
    const prevBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.save();
    doc.moveTo(M, FOOTER_LINE_Y).lineTo(PAGE_W - M, FOOTER_LINE_Y).lineWidth(0.8).strokeColor(GOLD).stroke();
    const yT = FOOTER_LINE_Y + 6.5;
    doc.font("Helvetica").fontSize(6.4).fillColor(MUTED);
    const wL = doc.widthOfString(MOTTO_L);
    doc.text(MOTTO_L, M, yT, { lineBreak: false });
    // vector "≠" (not encodable in WinAnsi Helvetica)
    const nx = M + wL + 1;
    doc
      .moveTo(nx, yT + 2.1)
      .lineTo(nx + 6, yT + 2.1)
      .moveTo(nx, yT + 4.7)
      .lineTo(nx + 6, yT + 4.7)
      .moveTo(nx + 1.1, yT + 5.6)
      .lineTo(nx + 4.9, yT + 1.2);
    doc.lineWidth(0.7).strokeColor(MUTED).stroke();
    doc.text(MOTTO_R, nx + 7.5, yT, { lineBreak: false });
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

  /* ---------- shared drawing primitives ---------- */
  const diamond = (cx: number, cy: number, r: number, fill: string, stroke?: string) => {
    doc.save();
    doc.moveTo(cx, cy - r).lineTo(cx + r, cy).lineTo(cx, cy + r).lineTo(cx - r, cy).closePath();
    if (stroke) doc.fillAndStroke(fill, stroke);
    else doc.fill(fill);
    doc.restore();
  };

  const section = (title: string) => {
    ensureSpace(78);
    doc.rect(M, y, CONTENT_W, 15.5).fill(GOLD);
    doc.font("Helvetica-Bold").fontSize(8).fillColor(INK).text(title, M + 8, y + 4.2, {
      characterSpacing: 1.2,
      lineBreak: false,
    });
    y += 15.5 + 9;
  };

  const subLabel = (t: string) => {
    ensureSpace(18);
    diamond(M + 2.5, y + 5, 2.2, GOLD);
    doc.font("Helvetica-Bold").fontSize(7).fillColor(GOLD_DEEP).text(t, M + 9, y + 2, {
      characterSpacing: 1.3,
      lineBreak: false,
    });
    y += 14;
  };

  const kvGrid = (items: Array<[string, string]>, cols = 2) => {
    const gap = 18;
    const colW = (CONTENT_W - gap * (cols - 1)) / cols;
    const rowH = 25;
    for (let i = 0; i < items.length; i += cols) {
      ensureSpace(rowH + 2);
      for (let c = 0; c < cols && i + c < items.length; c++) {
        const [k, v] = items[i + c];
        const cx = M + c * (colW + gap);
        doc.font("Helvetica-Bold").fontSize(6.3).fillColor(GOLD_DEEP).text(k.toUpperCase(), cx, y, {
          characterSpacing: 0.9,
          lineBreak: false,
        });
        doc.font("Helvetica").fontSize(8.7).fillColor(BODY).text(fit(doc, v, colW), cx, y + 10.5, {
          lineBreak: false,
        });
      }
      y += rowH;
    }
    y += 5;
  };

  const para = (
    text: string,
    o?: { size?: number; bold?: boolean; oblique?: boolean; color?: string; indent?: number; gap?: number },
  ) => {
    const size = o?.size ?? 8.4;
    doc
      .font(o?.bold ? "Helvetica-Bold" : o?.oblique ? "Helvetica-Oblique" : "Helvetica")
      .fontSize(size)
      .fillColor(o?.color ?? BODY);
    const indent = o?.indent ?? 0;
    const w = CONTENT_W - indent;
    const h = doc.heightOfString(text, { width: w });
    const gap = o?.gap ?? 3.5;
    ensureSpace(h + gap);
    doc.text(text, M + indent, y, { width: w });
    y += h + gap;
  };

  const bullet = (text: string, o?: { indent?: number; size?: number; color?: string }) => {
    const indent = o?.indent ?? 10;
    const size = o?.size ?? 8.2;
    doc.font("Helvetica").fontSize(size).fillColor(o?.color ?? BODY);
    const w = CONTENT_W - indent;
    const h = doc.heightOfString(text, { width: w });
    ensureSpace(h + 3);
    diamond(M + indent - 6.5, y + size * 0.58, 2.1, GOLD);
    doc.text(text, M + indent, y, { width: w });
    y += h + 3;
  };

  /* ---------- cover band ---------- */
  const drawCover = () => {
    const H = 130;
    doc.rect(0, 0, PAGE_W, H).fill(INK);
    doc.rect(0, H - 2.5, PAGE_W, 2.5).fill(PANEL); // subtle depth strip
    doc.moveTo(0, H + 0.75).lineTo(PAGE_W, H + 0.75).lineWidth(1.5).strokeColor(GOLD).stroke();

    doc.font("Helvetica-Bold").fontSize(8).fillColor(GOLD).text("NASS · CLOSED-LOOP CONTROL TOWER", M, 24, {
      characterSpacing: 1.6,
      lineBreak: false,
    });
    // brand mark: small gold diamond, right edge
    diamond(PAGE_W - M - 3, 28, 4.2, GOLD, GOLD_LIGHT);

    doc.font("Helvetica-Bold").fontSize(23).fillColor(GOLD_LIGHT).text("FREIGHT TRACEABILITY REPORT", M, 42, {
      characterSpacing: 0.6,
      lineBreak: false,
    });

    const line2 = perShip
      ? `${ship?.ref ?? ref} · ${ship?.vesselName ?? ship?.mode ?? ""}${
          ship?.vesselVoyage ? ` / ${ship.vesselVoyage}` : ""
        }`
      : "FULL NETWORK LIVE SCENARIO";
    doc.font("Helvetica-Bold").fontSize(12).fillColor(GOLD).text(line2, M, 74, {
      characterSpacing: 1,
      lineBreak: false,
    });

    const hourLabel = snap.snapshotHourLabel.replace(/\s+block$/, "");
    doc.font("Helvetica").fontSize(7.5).fillColor(BAND_META);
    doc.text(`Generated at ${fmtNow()}`, M, 102, { lineBreak: false });
    doc.text(`Hourly snapshot block · ${hourLabel} · Destination: ${snap.destination.port}, Bahrain`, M, 102, {
      width: CONTENT_W,
      align: "right",
      lineBreak: false,
    });

    y = H + 22;
  };

  /* ==================== PER-SHIP REPORT SECTIONS ==================== */

  const routeDiagram = (s: TraceShip) => {
    ensureSpace(52);
    const yLine = y + 14;
    const x0 = M + 8;
    const x1 = M + CONTENT_W - 8;
    const p = clamp01(s.progress);
    const px = x0 + (x1 - x0) * p;

    doc.save();
    doc.moveTo(x0, yLine).lineTo(x1, yLine).lineWidth(1).strokeColor(HAIRLINE).stroke();
    doc.moveTo(x0, yLine).lineTo(px, yLine).lineWidth(1.8).strokeColor(GOLD).stroke();
    doc.restore();

    doc.circle(x0, yLine, 3.2);
    doc.fillAndStroke("#ffffff", GOLD_DEEP);
    doc.circle(x1, yLine, 3.2);
    doc.fillAndStroke(GOLD, GOLD_DEEP);

    doc.circle(px, yLine, 6.6).fill("#ffffff"); // halo so the comet head pops
    diamond(px, yLine, 4.4, GOLD, INK);

    doc.font("Helvetica-Bold").fontSize(7).fillColor(GOLD_DEEP).text(`${Math.round(p * 100)}%`, px - 16, yLine - 16, {
      width: 32,
      align: "center",
      lineBreak: false,
    });

    doc.font("Helvetica-Bold").fontSize(6.6).fillColor(MUTED);
    doc.text(fit(doc, `${s.originPort} (${s.originCountry})`, 190), x0 - 8, yLine + 8, { lineBreak: false });
    doc.text(fit(doc, `${s.destPort} (${s.destCountry})`, 190), x1 - 182, yLine + 8, {
      width: 190,
      align: "right",
      lineBreak: false,
    });

    y += 42;
  };

  const vesselSection = (s: TraceShip) => {
    section("VESSEL & ROUTE");
    routeDiagram(s);

    const slip =
      s.carrierEta && s.supplierPromisedEta && +new Date(s.carrierEta) - +new Date(s.supplierPromisedEta) > 36 * 3_600_000;
    kvGrid([
      ["Status", `${s.status} · ${s.liveStatus}`],
      ["Mode", s.mode],
      ["Carrier", s.carrier ?? "—"],
      ["Forwarder", s.forwarder ?? "—"],
      [
        "Vessel / Voyage",
        `${s.vesselName ?? "—"}${s.vesselVoyage ? ` / ${s.vesselVoyage}` : ""}`,
      ],
      [
        "Origin › Destination",
        `${s.originPort} (${s.originCountry}) › ${s.destPort} (${s.destCountry})`,
      ],
      ["Departure", fmtDT(s.departure)],
      [
        "ETA",
        `${fmtDT(s.eta)}${s.etaType ? ` · ${s.etaType}` : ""}${s.etaSource ? ` / ${s.etaSource}` : ""}`,
      ],
      [
        "Supplier promise vs carrier ETA",
        `${fmtDT(s.supplierPromisedEta)} vs ${fmtDT(s.carrierEta)}${slip ? "  — SLIPPED" : ""}`,
      ],
      ["Progress", `${Math.round(clamp01(s.progress) * 100)} %`],
      ["Speed", s.speedKn != null ? `${s.speedKn} kn` : "—"],
      ["Freshness", s.freshness],
      ["Destination", s.destVerified ? `VERIFIED — ${s.destPort} (${s.destCountry})` : `NOT VERIFIED — ${s.destNote ?? "missing destination"}`],
      ["Route provenance", `${s.routeProvenance === "estimated-corridor" ? "estimated corridor (waypoint geometry)" : s.routeProvenance === "land-leg" ? "land leg" : "no validated route"}${s.routeDistanceNm ? ` · ${s.routeDistanceNm} nm` : ""}${s.routeVia.length ? ` · via ${s.routeVia.join(", ")}` : ""}`],
      [
        "Last event",
        `${fmtDT(s.lastEventAt)}${s.lastEventSource ? ` · ${s.lastEventSource}` : ""}`,
      ],
    ]);
  };

  const MAT_COLS = [
    { label: "SKU", w: 68, align: "left" as const },
    { label: "Material", w: 152, align: "left" as const },
    { label: "Country of origin", w: 82, align: "left" as const },
    { label: "Qty", w: 46, align: "right" as const },
    { label: "UoM", w: 34, align: "left" as const },
    { label: "Unit price", w: 64, align: "right" as const },
    { label: "Line value", w: 69.28, align: "right" as const },
  ];

  const materialsSection = (s: TraceShip) => {
    section("MATERIALS & IMPORT VALUE");
    const headH = 15;
    const rowH = 16.5;

    ensureSpace(headH + rowH * 2 + 24);
    let cx = M;
    doc.rect(M, y, CONTENT_W, headH).fill(GOLD);
    doc.font("Helvetica-Bold").fontSize(6.6).fillColor(INK);
    for (const c of MAT_COLS) {
      const tx = c.align === "right" ? cx + c.w - 5 : cx + 5;
      doc.text(c.label.toUpperCase(), tx, y + 4.6, {
        width: c.w - 10,
        align: c.align,
        characterSpacing: 0.4,
        lineBreak: false,
      });
      cx += c.w;
    }
    y += headH;

    if (!s.materials.length) {
      ensureSpace(rowH + 2);
      doc.font("Helvetica-Oblique").fontSize(7.4).fillColor(MUTED).text("No material lines on this shipment's PO.", M + 5, y + 4.5, {
        lineBreak: false,
      });
      doc.moveTo(M, y + rowH).lineTo(M + CONTENT_W, y + rowH).lineWidth(0.5).strokeColor(HAIRLINE).stroke();
      y += rowH;
    }

    s.materials.forEach((m, i) => {
      ensureSpace(rowH + 2);
      if (i % 2 === 1) doc.rect(M, y, CONTENT_W, rowH).fill(TINT);
      doc.moveTo(M, y + rowH).lineTo(M + CONTENT_W, y + rowH).lineWidth(0.5).strokeColor(HAIRLINE).stroke();
      doc.font("Helvetica").fontSize(7.4).fillColor(BODY);
      const cells = [
        m.sku,
        m.name,
        m.countryOfOrigin,
        qty(m.quantity),
        m.uom,
        nf2.format(m.unitPrice),
        nf2.format(m.extended),
      ];
      let tx = M;
      MAT_COLS.forEach((c, j) => {
        const v = fit(doc, cells[j], c.w - 10);
        doc.text(v, c.align === "right" ? tx + c.w - 5 : tx + 5, y + 4.8, {
          width: c.w - 10,
          align: c.align,
          lineBreak: false,
        });
        tx += c.w;
      });
      y += rowH;
    });

    ensureSpace(rowH + 4);
    doc.rect(M, y, CONTENT_W, rowH + 2).fill(GOLD_LIGHT);
    doc.font("Helvetica-Bold").fontSize(7.8).fillColor(INK);
    doc.text("TOTAL IMPORT VALUE", M + 5, y + 5, { characterSpacing: 0.8, lineBreak: false });
    const w6 = MAT_COLS.slice(0, 6).reduce((a, c) => a + c.w, 0);
    doc.text(money(s.importValue, s.currency), M + w6, y + 5, {
      width: MAT_COLS[6].w - 5,
      align: "right",
      lineBreak: false,
    });
    y += rowH + 2;
    doc.font("Helvetica-Oblique").fontSize(6.8).fillColor(MUTED);
    doc.text(
      `Values in PO currency${s.currency !== "USD" ? ` — USD equivalent USD ${nf2.format(s.importValueUsd)} at documented corporate FX (as of ${snap.fx.asOf.slice(0, 10)})` : ""} · derived from shipment-allocated PO lines`,
      M,
      y,
      { lineBreak: false },
    );
    y += 10;
  };

  const whereToUseSection = (s: TraceShip) => {
    section("WHERE TO USE");
    const p = s.project;
    const w = s.destinationWarehouse;
    kvGrid([
      ["Project", p ? `${p.code} — ${p.name}` : "—"],
      ["Project site", p?.site ?? "—"],
      ["Destination warehouse", w ? `${w.code} — ${w.name}` : "—"],
      ["Warehouse site", w?.site ?? "—"],
      ["PO delivery location", s.po?.deliveryLocation ?? "—"],
    ]);

    subLabel("WORK PACKAGE ASSIGNMENTS");
    const withWp = s.materials.filter((m) => m.workPackage);
    if (withWp.length) {
      for (const m of withWp) bullet(`${m.sku} · ${m.name} — ${m.workPackage}`);
    } else {
      para("No work-package assignments recorded for this project.", { oblique: true, color: MUTED, size: 8 });
    }
    y += 4;
  };

  const procurementSection = (s: TraceShip) => {
    section("PROCUREMENT");
    if (s.supplier) {
      subLabel("SUPPLIER");
      kvGrid([
        ["Supplier", `${s.supplier.code} — ${s.supplier.name}`],
        ["Supplier status", s.supplier.status],
        ["Country / city", `${s.supplier.country}${s.supplier.city ? ` · ${s.supplier.city}` : ""}`],
        ["Incoterms", s.supplier.incoterms ?? "—"],
      ]);
    } else {
      para("No supplier linked to this shipment.", { oblique: true, color: MUTED, size: 8 });
    }

    if (s.po) {
      subLabel("PURCHASE ORDER");
      kvGrid([
        ["PO reference", s.po.ref],
        ["PO status", s.po.status],
        ["Currency", s.po.currency],
        ["PO total amount", money(s.po.totalAmount, s.po.currency)],
        ["Delivery terms (Incoterms)", s.po.deliveryTerms ?? "—"],
        ["Promised date", fmtDT(s.po.promisedDate)],
        ["Contracts", s.po.contracts.length ? s.po.contracts.join(", ") : "—"],
      ]);
    } else {
      para("No purchase order linked to this shipment.", { oblique: true, color: MUTED, size: 8 });
    }
    y += 4;
  };

  const complianceSection = (s: TraceShip) => {
    section("COMPLIANCE");
    const c = s.compliance;

    kvGrid([
      [
        "Customs status",
        `${c.customsStatus ?? "not reported"}${c.customsHold ? " · HOLD" : ""}`,
      ],
      ["Import file ref", c.importFileRef ?? "—"],
    ]);

    subLabel("BILL(S) OF LADING");
    if (c.bol.length) {
      for (const b of c.bol)
        bullet(
          `${b.bolNo} v${b.version} — ${b.status} — match ${b.matchStatus} — ${b.active ? "active" : "inactive"}`,
        );
    } else {
      para("No BOLs recorded.", { oblique: true, color: MUTED, size: 8 });
    }

    subLabel("RECONCILIATION");
    ensureSpace(16);
    const r = c.reconciliation;
    doc.font("Helvetica").fontSize(8.4).fillColor(BODY);
    const s1 = `PASS ${r.PASS} · WARN ${r.WARN} · FAIL ${r.FAIL} · NOT_CHECKED ${r.NOT_CHECKED}`;
    doc.text(s1, M, y, { lineBreak: false });
    doc.font("Helvetica-Bold").fontSize(8.4).fillColor(GOLD_DEEP);
    doc.text(`   —  Overall: ${c.overallReconciliation}`, M + doc.widthOfString(s1), y, { lineBreak: false });
    y += 14;

    subLabel("EXCEPTIONS");
    if (c.exceptions.length) {
      for (const ex of c.exceptions)
        bullet(`${ex.severity.toUpperCase()} — ${ex.ref} — ${ex.title} — ${ex.state}`);
    } else {
      para("No open exception cases.", { oblique: true, color: MUTED, size: 8 });
    }

    subLabel("RISK SIGNALS");
    if (c.risks.length) {
      for (const rk of c.risks) bullet(`${rk.signalCode} / ${rk.severity.toUpperCase()} — ${rk.fact}`);
    } else {
      para("No active risk signals.", { oblique: true, color: MUTED, size: 8 });
    }

    subLabel("EVIDENCE BUNDLE");
    if (c.evidence.length) {
      for (const ev of c.evidence) bullet(`${ev.sourceSystem} — ${ev.issuer} — ${ev.label}`);
    } else {
      para("No evidence bundles recorded.", { oblique: true, color: MUTED, size: 8 });
    }
    y += 4;
  };

  /* ==================== FULL-SCENARIO REPORT ==================== */

  const totalsStrip = () => {
    const t = snap.totals;
    const tiles: Array<[string, string, boolean]> = [
      ["Ships", nf0.format(t.ships), false],
      ["In transit", nf0.format(t.inTransit), false],
      ["At port", nf0.format(t.atPort), false],
      ["Customs hold", nf0.format(t.customsHold), false],
      ["Delayed", nf0.format(t.delayed), false],
      ["Arrived", nf0.format(t.arrived), false],
      ["Booked", nf0.format(t.booked), false],
      ["Fleet value (USD eq.)", money0(t.importValueUsd, "USD"), true],
    ];
    const gap = 4;
    const tw = (CONTENT_W - gap * 7) / 8;
    const th = 44;
    tiles.forEach(([label, val, isMoney], i) => {
      const x = M + i * (tw + gap);
      doc.rect(x, y, tw, th).fill(TINT);
      doc.rect(x, y, tw, 1.8).fill(GOLD);
      doc.rect(x, y, tw, th).lineWidth(0.75).strokeColor(HAIRLINE).stroke();
      doc.font("Helvetica-Bold").fontSize(isMoney ? 7.4 : 11.5).fillColor(isMoney ? GOLD_DEEP : INK);
      doc.text(fit(doc, val, tw - 6), x + 3, y + (isMoney ? 14 : 11), {
        width: tw - 6,
        align: "center",
        lineBreak: false,
      });
      doc.font("Helvetica-Bold").fontSize(5.2).fillColor(MUTED);
      doc.text(label.toUpperCase(), x + 2, y + th - 10, {
        width: tw - 4,
        align: "center",
        characterSpacing: 0.5,
        lineBreak: false,
      });
    });
    y += th + 18;
  };

  const FLEET_COLS = [
    { label: "Ref", w: 58, align: "left" as const },
    { label: "Vessel", w: 106, align: "left" as const },
    { label: "Route", w: 130, align: "left" as const },
    { label: "Status", w: 62, align: "left" as const },
    { label: "Prog %", w: 36, align: "right" as const },
    { label: "ETA", w: 70, align: "left" as const },
    { label: "Import value", w: 53.28, align: "right" as const },
  ];

  const fleetSummary = () => {
    section("FLEET SUMMARY");
    const headH = 14;
    const rowH = 15;

    ensureSpace(headH + rowH * 2 + 20);
    let cx = M;
    doc.rect(M, y, CONTENT_W, headH).fill(GOLD);
    doc.font("Helvetica-Bold").fontSize(6.4).fillColor(INK);
    for (const c of FLEET_COLS) {
      const tx = c.align === "right" ? cx + c.w - 5 : cx + 5;
      doc.text(c.label.toUpperCase(), tx, y + 4.2, {
        width: c.w - 10,
        align: c.align,
        characterSpacing: 0.4,
        lineBreak: false,
      });
      cx += c.w;
    }
    y += headH;

    if (!snap.ships.length) {
      ensureSpace(rowH + 2);
      doc.font("Helvetica-Oblique").fontSize(7.4).fillColor(MUTED).text("No shipments in snapshot.", M + 5, y + 4, {
        lineBreak: false,
      });
      y += rowH;
    }

    snap.ships.forEach((s, i) => {
      ensureSpace(rowH + 2);
      if (i % 2 === 1) doc.rect(M, y, CONTENT_W, rowH).fill(TINT);
      doc.moveTo(M, y + rowH).lineTo(M + CONTENT_W, y + rowH).lineWidth(0.5).strokeColor(HAIRLINE).stroke();
      doc.font("Helvetica").fontSize(7.2).fillColor(BODY);
      const statusColor = s.liveStatus === "DELAYED" || s.liveStatus === "CUSTOMS_HOLD" ? GOLD_DEEP : BODY;
      const cells = [
        s.ref,
        fit(doc, s.vesselName ?? "—", FLEET_COLS[1].w - 10),
        fit(doc, `${s.originPort} › ${s.destPort}`, FLEET_COLS[2].w - 10),
        s.liveStatus,
        `${Math.round(clamp01(s.progress) * 100)}%`,
        fmtDT(s.eta),
        money0(s.importValue, s.currency),
      ];
      let tx = M;
      FLEET_COLS.forEach((c, j) => {
        if (j === 3) doc.fillColor(statusColor).font("Helvetica-Bold");
        else doc.fillColor(BODY).font("Helvetica");
        doc.text(cells[j], c.align === "right" ? tx + c.w - 5 : tx + 5, y + 4.2, {
          width: c.w - 10,
          align: c.align,
          lineBreak: false,
        });
        tx += c.w;
      });
      y += rowH;
    });
    y += 10;
  };

  const shipBlock = (s: TraceShip) => {
    const headH = 15.5;
    const padT = 6;
    const gap = 3.5;
    const wInner = CONTENT_W - 12;

    const vesselLine = [
      s.vesselName
        ? `Vessel ${s.vesselName}${s.vesselVoyage ? ` / ${s.vesselVoyage}` : ""} (${s.mode})`
        : `Mode ${s.mode}`,
      s.carrier ? `carrier ${s.carrier}` : null,
      s.forwarder ? `forwarder ${s.forwarder}` : null,
      `${s.originPort} (${s.originCountry}) › ${s.destPort} (${s.destCountry})`,
      `dep ${fmtDT(s.departure)}`,
      `ETA ${fmtDT(s.eta)}${s.etaType ? ` (${s.etaType})` : ""}`,
      `${Math.round(clamp01(s.progress) * 100)}% complete`,
      `freshness ${s.freshness}`,
    ]
      .filter(Boolean)
      .join("  ·  ");

    const mats = s.materials;
    const topM = mats.slice(0, 3).map((m) => `${m.sku} ×${qty(m.quantity)}`).join(", ");
    const matLine =
      `Materials: ${mats.length ? `${topM}${mats.length > 3 ? ` (+${mats.length - 3} more)` : ""}` : "none on PO"}` +
      ` — Import value ${money(s.importValue, s.currency)}`;

    const procLine =
      `Supplier ${s.supplier ? `${s.supplier.code} — ${s.supplier.name} (${s.supplier.country})` : "not linked"}` +
      (s.po
        ? ` · PO ${s.po.ref} (${s.po.status}) ${money(s.po.totalAmount, s.po.currency)}` +
          ` · Incoterms ${s.po.deliveryTerms ?? "—"}` +
          ` · Contracts ${s.po.contracts.length ? s.po.contracts.join(", ") : "—"}`
        : " · PO not linked");

    const r = s.compliance.reconciliation;
    const compLine =
      `Customs ${s.compliance.customsStatus ?? "not reported"}` +
      ` · BOLs ${s.compliance.bol.length}${s.compliance.bol.length ? ` (${s.compliance.bol.filter((b) => b.active).length} active)` : ""}` +
      ` · Recon ${s.compliance.overallReconciliation} (P${r.PASS}/W${r.WARN}/F${r.FAIL}/NC${r.NOT_CHECKED})` +
      ` · Exceptions ${s.compliance.exceptions.length} · Risks ${s.compliance.risks.length}` +
      ` · Evidence ${s.compliance.evidence.length}`;

    const lines = [vesselLine, matLine, procLine, compLine];
    doc.font("Helvetica").fontSize(8);
    const hs = lines.map((l) => doc.heightOfString(l, { width: wInner }));
    const bodyH = padT + hs.reduce((a, b) => a + b, 0) + gap * (lines.length - 1) + 8;
    ensureSpace(headH + bodyH);

    doc.rect(M, y, CONTENT_W, headH).fill(GOLD);
    doc
      .font("Helvetica-Bold")
      .fontSize(7.8)
      .fillColor(INK)
      .text(
        fit(
          doc,
          `${s.ref} — ${s.vesselName ?? s.mode} · ${s.liveStatus} · ${Math.round(clamp01(s.progress) * 100)}%`,
          CONTENT_W - 16,
        ),
        M + 8,
        y + 4.2,
        { characterSpacing: 0.6, lineBreak: false },
      );
    y += headH;
    doc.rect(M, y, CONTENT_W, bodyH).lineWidth(0.6).strokeColor(HAIRLINE).stroke();
    y += padT;
    lines.forEach((l, i) => {
      doc.font(i === 0 ? "Helvetica-Bold" : "Helvetica").fontSize(8).fillColor(i === 0 ? BODY : BODY);
      doc.text(l, M + 6, y, { width: wInner });
      y += hs[i] + gap;
    });
    y += 10;
  };

  /* ==================== ASSEMBLY ==================== */
  drawCover();
  drawFooter(1);

  if (perShip && ship) {
    vesselSection(ship);
    materialsSection(ship);
    whereToUseSection(ship);
    procurementSection(ship);
    complianceSection(ship);
  } else {
    totalsStrip();
    fleetSummary();
    section("SHIP DETAIL BLOCKS");
    for (const s of snap.ships) shipBlock(s);
  }

  ensureSpace(18);
  doc
    .font("Helvetica-Oblique")
    .fontSize(7)
    .fillColor(MUTED)
    .text("— END OF REPORT — NASS live traceability · evidence-before-assertion", M, y + 4, {
      width: CONTENT_W,
      align: "center",
      lineBreak: false,
    });

  doc.end();
  return done;
}
