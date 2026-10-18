import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api";
import { generatePdfReport, type ReportOptions } from "@/lib/pdf-reports-generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/reports/generate
 * On-demand generation of luxury black-gold PDF reports:
 *  - type=project&ref=PRJ-FLCN (Project dossier)
 *  - type=shipment&ref=SHP-8803 (Shipment trace)
 *  - type=ceo-summary (Executive Decision Briefing)
 *  - type=procurement (PO & Material cost report)
 *  - type=inventory (Stock and warehouse report)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = (searchParams.get("type") ?? "ceo-summary") as ReportOptions["type"];
    const targetRef = searchParams.get("ref") ?? searchParams.get("code") ?? undefined;

    const report = await generatePdfReport({ type, targetRef });

    const isInline = searchParams.get("inline") === "true" || searchParams.get("inline") === "1";
    const disposition = isInline ? `inline; filename="${report.filename}"` : `attachment; filename="${report.filename}"`;

    return new Response(report.buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": disposition,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return err("PDF_GENERATION_FAILED", `Failed to generate PDF report: ${String(e)}`, 500);
  }
}

/** POST /api/reports/generate — programmatic export request returning metadata and download link */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Partial<ReportOptions>;
    const type = (body.type ?? "ceo-summary") as ReportOptions["type"];
    const targetRef = body.targetRef;

    const report = await generatePdfReport({ type, targetRef, filters: body.filters });
    const downloadUrl = `/api/reports/generate?type=${encodeURIComponent(type)}${targetRef ? `&ref=${encodeURIComponent(targetRef)}` : ""}`;

    return ok({
      title: report.title,
      filename: report.filename,
      downloadUrl,
      sizeBytes: report.buffer.length,
      format: "pdf",
      as_of: new Date().toISOString(),
    });
  } catch (e) {
    return err("REPORT_FAILED", `Failed to prepare report: ${String(e)}`, 500);
  }
}
