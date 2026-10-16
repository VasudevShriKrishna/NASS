import { buildTraceSnapshot } from "@/lib/trace";
import { ok, err } from "@/lib/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/live-trace — live scenario snapshot for the command view map.
 *  ?ref=SHP-8801 returns just that ship's dossier payload.               */
export async function GET(req: Request) {
  try {
    const snap = await buildTraceSnapshot();
    const ref = new URL(req.url).searchParams.get("ref");
    if (ref) {
      const ship = snap.ships.find((s) => s.ref === ref);
      if (!ship) return err("NOT_FOUND", `Shipment ${ref} not found`, 404);
      return ok({ ...snap, ships: [ship] });
    }
    return ok(snap);
  } catch (e) {
    return err("SNAPSHOT_FAILED", String(e), 500, true);
  }
}
