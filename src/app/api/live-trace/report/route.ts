import { buildTraceSnapshot } from "@/lib/trace";
import { err } from "@/lib/api";
import { renderLiveReport } from "@/lib/pdf-report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/live-trace/report — luxury black-gold PDF report.
 *  ?ref=SHP-8801 → per-ship live report; no ref → full network live scenario. */
export async function GET(req: Request) {
  try {
    const ref = new URL(req.url).searchParams.get("ref");
    const snap = await buildTraceSnapshot();

    let ships = snap.ships;
    if (ref) {
      const ship = snap.ships.find((s) => s.ref === ref);
      if (!ship) return err("NOT_FOUND", `Shipment ${ref} not found`, 404);
      ships = [ship];
    }

    const buffer = await renderLiveReport({ ...snap, ships }, ref);
    const filename = ref ? `NASS-${ref}-live-report.pdf` : "NASS-live-scenario-report.pdf";

    return new Response(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return err("PDF_FAILED", String(e), 500);
  }
}
