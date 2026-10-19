import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api";
import { generateMultiFormatReport, type ExportFormat } from "@/lib/export-engine";
import { type ReportOptions } from "@/lib/pdf-reports-generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/reports/generate
 * On-demand generation of multi-format enterprise reports:
 *  - format=pdf (default, luxury black-gold PDFKit report)
 *  - format=csv (UTF-8 BOM CSV compatible with Excel)
 *  - format=xlsx (SpreadsheetML XML workbook)
 *  - format=docx (Microsoft Word document)
 *  - format=json (Structured JSON record)
 * 
 *  - type=project&ref=PRJ-2201
 *  - type=shipment&ref=SHP-8801
 *  - type=inventory&ref=MAT-REBAR-B500B
 *  - type=ceo-summary
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = (searchParams.get("type") ?? "ceo-summary") as ReportOptions["type"];
    const targetRef = searchParams.get("ref") ?? searchParams.get("code") ?? undefined;
    const format = (searchParams.get("format") ?? "pdf").toLowerCase() as ExportFormat;

    const report = await generateMultiFormatReport({ type, targetRef, format });

    const isInline = searchParams.get("inline") === "true" || searchParams.get("inline") === "1";
    const disposition = isInline ? `inline; filename="${report.filename}"` : `attachment; filename="${report.filename}"`;

    return new Response(report.buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": report.mimeType,
        "Content-Disposition": disposition,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return err("REPORT_GENERATION_FAILED", `Failed to generate report: ${String(e)}`, 500);
  }
}

/** POST /api/reports/generate — programmatic export request returning metadata and download link */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Partial<ReportOptions> & { format?: ExportFormat };
    const type = (body.type ?? "ceo-summary") as ReportOptions["type"];
    const targetRef = body.targetRef;
    const format = (body.format ?? "pdf").toLowerCase() as ExportFormat;

    const report = await generateMultiFormatReport({ type, targetRef, format });
    const downloadUrl = `/api/reports/generate?type=${encodeURIComponent(type)}${targetRef ? `&ref=${encodeURIComponent(targetRef)}` : ""}&format=${encodeURIComponent(format)}`;

    return ok({
      filename: report.filename,
      downloadUrl,
      sizeBytes: report.buffer.length,
      format,
      rowCount: report.rowCount,
      as_of: new Date().toISOString(),
    });
  } catch (e) {
    return err("REPORT_FAILED", `Failed to prepare report: ${String(e)}`, 500);
  }
}
