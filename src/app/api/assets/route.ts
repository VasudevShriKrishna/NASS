import { db } from "@/lib/db";
import { ok } from "@/lib/api";

export const dynamic = "force-dynamic";

/** /assets — asset registry with exposed monitoring classes (M15):
 *  REGISTRY_ONLY | INSPECTION_MONITORED | TELEMETRY_CONNECTED | LOCATION_TRACKED. */
export async function GET() {
  const assets = await db.asset.findMany({
    orderBy: { tag: "asc" },
    include: {
      telemetry: { orderBy: { eventTime: "desc" }, take: 12 },
      inspections: { orderBy: { dueDate: "desc" } },
      workOrders: { orderBy: { createdAt: "desc" } },
    },
  });
  return ok(assets);
}
