import { db } from "@/lib/db";
import { ok } from "@/lib/api";

export const dynamic = "force-dynamic";

/** /evidence — source evidence registry (8.1 #21, M22): provenance + evidence labels. */
export async function GET() {
  const evidence = await db.sourceEvidence.findMany({ orderBy: { receivedAt: "desc" } });
  return ok(evidence);
}
