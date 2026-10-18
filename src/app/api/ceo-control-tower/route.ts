import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  nassProjectPortfolio,
  nassPriceBenchmarkComparison,
  nassShipmentWeightAudit,
  nassPartnerAndTradeRoutes,
  nassCeoDecisionBrief,
} from "@/lib/operational-tools";

export const dynamic = "force-dynamic";

/**
 * GET /api/ceo-control-tower
 * Aggregates all live CEO Decision Control Tower intelligence modules:
 * - Executive Project Portfolio (Confirmed Active vs Historical Reference)
 * - Price Benchmarking & Landed Cost Engine
 * - Cargo Weight Hierarchy & Weighbridge Discrepancies
 * - Heavy Machinery & Equipment Fleet
 * - NASS 18 Business Units & Verified Partner Brands
 * - 10-Point Structured CEO Decision Recommendations
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectFilter = searchParams.get("project") || undefined;
    const materialFilter = searchParams.get("material") || undefined;
    const shipmentFilter = searchParams.get("shipment") || undefined;

    const [portfolio, priceIntel, weightAudit, partners, decisions, equipment] = await Promise.all([
      nassProjectPortfolio({ projectCode: projectFilter }),
      nassPriceBenchmarkComparison(materialFilter),
      nassShipmentWeightAudit(shipmentFilter),
      nassPartnerAndTradeRoutes(),
      nassCeoDecisionBrief(),
      db.equipmentAsset.findMany({ orderBy: { tag: "asc" } }),
    ]);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      governanceNotice: "Authoritative NASS Enterprise Control Tower. Data segregated into Authoritative Internal DB, Market Benchmarks, Calculated Landed Costs, and Historical Archives.",
      data: {
        portfolio,
        priceIntelligence: priceIntel,
        shipmentWeightAudit: weightAudit,
        partnerDirectory: partners,
        equipmentFleet: equipment,
        ceoDecisions: decisions,
      },
    });
  } catch (err: any) {
    console.error("[CEO Control Tower API GET Error]", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch CEO Control Tower data." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ceo-control-tower
 * Executive Decision Execution & State Transition
 * Updates decision status (APPROVED, REJECTED, EXECUTED) and appends an immutable audit event.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { decisionRef, action, actor = "Executive Committee", notes = "" } = body;

    if (!decisionRef || !action) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: decisionRef and action are mandatory." },
        { status: 400 }
      );
    }

    const decision = await db.ceoDecisionRecommendation.findUnique({
      where: { ref: decisionRef },
    });

    if (!decision) {
      return NextResponse.json(
        { success: false, error: `Decision recommendation ${decisionRef} not found.` },
        { status: 404 }
      );
    }

    let nextStatus = "PENDING_CEO_REVIEW";
    if (action === "APPROVE") nextStatus = "APPROVED";
    else if (action === "REJECT") nextStatus = "REJECTED";
    else if (action === "EXECUTE") nextStatus = "EXECUTED";
    else {
      return NextResponse.json(
        { success: false, error: `Invalid action '${action}'. Allowed: APPROVE, REJECT, EXECUTE.` },
        { status: 400 }
      );
    }

    const prevStatus = decision.status;

    // Update Decision
    const updated = await db.ceoDecisionRecommendation.update({
      where: { ref: decisionRef },
      data: {
        status: nextStatus,
        approvedBy: actor,
        approvedAt: new Date(),
      },
    });

    // Append Immutable Audit Event (Closed-Loop Governance)
    await db.auditEvent.create({
      data: {
        actor,
        actorType: "USER",
        action: `CEO_DECISION_${action}`,
        entityType: "ceo_decision_recommendation",
        entityId: decision.id,
        entityRef: decision.ref,
        previousState: prevStatus,
        newState: nextStatus,
        diff: JSON.stringify({
          decisionRef,
          title: decision.title,
          action,
          notes,
          timestamp: new Date().toISOString(),
        }),
        reason: notes || `Executive decision status transitioned from ${prevStatus} to ${nextStatus}`,
        ruleVersion: "CEO_GOVERNANCE_v2.0",
        at: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Decision ${decisionRef} successfully updated to ${nextStatus}.`,
      data: updated,
    });
  } catch (err: any) {
    console.error("[CEO Control Tower API POST Error]", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to process executive decision." },
      { status: 500 }
    );
  }
}
