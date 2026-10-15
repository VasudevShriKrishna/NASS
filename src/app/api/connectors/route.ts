import { db } from "@/lib/db";
import { ok } from "@/lib/api";

export const dynamic = "force-dynamic";

/** /connectors — integration health (M23): freshness, retries, DLQ, quota, coverage. */
export async function GET() {
  const connectors = await db.connector.findMany({ orderBy: [{ status: "asc" }, { name: "asc" }] });
  return ok(connectors);
}
