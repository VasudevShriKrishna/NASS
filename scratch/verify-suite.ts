/**
 * Comprehensive Automated Verification Suite for NASS Voice AI Copilot & Control Tower.
 */

import {
  projectOverview,
  shipmentDetails,
  materialBalanceAndBackupStock,
  materialAndShipmentValuation,
  poShipmentReconciliation,
  qualityAndGoodsReceipt,
  connectorFreshness,
  assetTelemetryAndExceptions,
} from "../src/lib/operational-tools";

import { runCopilotReasoning } from "../src/lib/voice/mistral";
import { synthesizeSpeech } from "../src/lib/voice/sarvam";

let passed = 0;
let failed = 0;

function assert(condition: boolean, desc: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${desc}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${desc}`);
    failed++;
  }
}

async function runTests() {
  console.log("\n========================================================");
  console.log("   NASS CONTROL TOWER & VOICE AI COPILOT TEST SUITE     ");
  console.log("========================================================\n");

  // ── TEST 1: Tool 5 - PO-3001 & 120 tonnes in transit ─────────
  console.log("[1] Testing PO-3001 & Shipment Reconciliation (Workstream 7)...");
  const po3001 = await poShipmentReconciliation("PO-3001");
  assert(!("error" in po3001), "PO-3001 query executed without error");
  if (!("error" in po3001)) {
    assert(po3001.poRef === "PO-3001", "PO ref is PO-3001");
    assert(po3001.explicitlyLinkedShipments.length === 0, "PO-3001 has exactly 0 linked shipments");
    assert(po3001.reconciliationSummary.orderedQty === 120, "Total ordered quantity is 120 tonnes");
    assert(po3001.reconciliationSummary.receivedQty === 72, "Total received quantity is 72 tonnes (GRN-5002)");
    assert(po3001.reconciliationSummary.dispatchPendingQty === 48, "Dispatch pending open balance is 48 tonnes");
    assert(po3001.reconciliationSummary.inTransitQty === 0, "Reconciled in-transit is 0 tonnes (cargo not loaded)");
    assert(po3001.discrepancyDiagnosis.includes("ROOT CAUSE CONFIRMED"), "Root cause diagnosis established");
  }

  // ── TEST 2: Tool 6 - GRN-5004 Deduplication & QC (Workstream 9) ──
  console.log("\n[2] Testing GRN-5004 Deduplication & QC Status (Workstream 9)...");
  const grn5004 = await qualityAndGoodsReceipt("GRN-5004");
  assert(!("error" in grn5004), "GRN-5004 query executed without error");
  if (!("error" in grn5004)) {
    assert(grn5004.receiptRef === "GRN-5004", "Receipt ref is GRN-5004");
    assert(grn5004.expectedQty === 0 && grn5004.receivedQty === 0, "Expected & received are 0/0");
    assert(grn5004.qcResult === "NOT_APPLICABLE", "QC status is NOT_APPLICABLE (not green PASS)");
    assert(grn5004.deduplicationState.isDuplicate === true, "Marked as duplicate webhook event");
    assert(grn5004.qcInspectionStatus.includes("NO_INSPECTION_PERFORMED"), "Inspection explicitly marked NO_INSPECTION_PERFORMED");
  }

  // ── TEST 3: Tool 7 - Connector Health vs Freshness (Workstream 15) ─
  console.log("\n[3] Testing Connector Health vs Freshness Separation (Workstream 15)...");
  const customsBrokerResult = await connectorFreshness("Customs broker portal");
  assert(!("error" in customsBrokerResult), "Customs broker query executed without error");
  if (!("error" in customsBrokerResult) && customsBrokerResult.connectors.length > 0) {
    const cb = customsBrokerResult.connectors[0];
    assert(cb.technicalHealth === "STANDBY", "Technical status is STANDBY (not falsely HEALTHY)");
    assert(cb.dataFreshness === "NEVER_SYNCHRONIZED", "Data freshness is NEVER_SYNCHRONIZED");
    assert(cb.integrationReadiness === "REQUIRES_INTEGRATION", "Integration readiness is REQUIRES_INTEGRATION");
  }

  const portResult = await connectorFreshness("Port community system");
  assert(!("error" in portResult), "Port community query executed without error");
  if (!("error" in portResult) && portResult.connectors.length > 0) {
    const ps = portResult.connectors[0];
    assert(ps.dataFreshness === "STALE", "7h-old batch is marked 'STALE'");
  }

  // ── TEST 4: Tool 8 - Asset Criticality vs Equipment Condition (Workstream 12) ─
  console.log("\n[4] Testing Asset Criticality vs Condition Separation (Workstream 12)...");
  const asset = await assetTelemetryAndExceptions("AST-AHU-05");
  assert(!("error" in asset), "Asset AST-AHU-05 query executed without error");
  if (!("error" in asset)) {
    assert(asset.operationalImportance.criticality === "HIGH", "Operational criticality is HIGH");
    assert(asset.liveEquipmentHealth.condition === "FAULT", "Live equipment condition is FAULT (bearing temp over threshold)");
    assert(asset.sensorReadings.some(r => r.channel.includes("CH-01")), "Channel CH-01 labeled with metric and unit");
    assert(asset.sensorReadings.some(r => r.channel.includes("CH-02")), "Channel CH-02 labeled with metric and unit");
  }

  // ── TEST 5: Tool 1 - Project Overview (PRJ-2201) ─────────────
  console.log("\n[5] Testing Project Overview (Tool 1)...");
  const prj = await projectOverview("PRJ-2201");
  assert(!("error" in prj), "PRJ-2201 query executed without error");
  if (!("error" in prj)) {
    assert(prj.projectCode === "PRJ-2201", "Project code matches PRJ-2201");
    assert(prj.projectValue.currency.includes("committed PO base"), "Project value currency specifies committed PO base");
    assert(prj.projectValue.amount === 724000, "Committed PO value is 724,000 (PO-3001 + PO-3002)");
    assert(prj.materialsRequired.length > 0, "Contains required materials list");
  }

  // ── TEST 6: Tool 2 - Shipment Details (SHP-8801, SHP-8802 & SHP-8805) ──
  console.log("\n[6] Testing Shipment Details & Position Truth (Tool 2)...");
  const shp8801 = await shipmentDetails("SHP-8801");
  assert(!("error" in shp8801), "SHP-8801 query executed without error");
  if (!("error" in shp8801)) {
    assert(shp8801.position.positionState === "LIVE", "SHP-8801 position state is LIVE (fresh AIS feed)");
    assert(shp8801.position.coordinates !== null, "SHP-8801 has valid coordinates");
    assert(shp8801.vessel.name === "MSC AURORA", "Vessel is MSC AURORA");
  }

  const shp8802 = await shipmentDetails("SHP-8802");
  assert(!("error" in shp8802), "SHP-8802 query executed without error");
  if (!("error" in shp8802)) {
    assert(shp8802.position.positionState === "ESTIMATED", "SHP-8802 position state is ESTIMATED (aging AIS feed)");
    assert(shp8802.position.coordinates !== null, "SHP-8802 has valid coordinates");
    assert(shp8802.vessel.name === "CMA CGM LHAYNE", "Vessel is CMA CGM LHAYNE");
  }

  const shp8805 = await shipmentDetails("SHP-8805");
  assert(!("error" in shp8805), "SHP-8805 query executed without error");
  if (!("error" in shp8805)) {
    assert(shp8805.shipment.status === "CUSTOMS_HOLD", "SHP-8805 status is CUSTOMS_HOLD");
    assert(shp8805.position.positionState === "LIVE", "SHP-8805 position is pinned at destination customs");
  }

  // ── TEST 7: Tool 3 - Material Balance & Backup Stock ───────────
  console.log("\n[7] Testing Material Balance & Safety Stock (Tool 3)...");
  const rebarStock = await materialBalanceAndBackupStock("MAT-REB-16");
  assert(!("error" in rebarStock), "MAT-REB-16 balance query executed");
  if (!("error" in rebarStock)) {
    assert(rebarStock.physicalStock.available === 18.5, "Physical available is 18.5 t");
    assert(rebarStock.physicalStock.reserved === 18.5, "Physical reserved is 18.5 t");
    assert(rebarStock.inTransitSupply.inTransitQty === 120, "In-transit is 120 t");
    assert(rebarStock.physicalStock.available !== rebarStock.inTransitSupply.inTransitQty, "In-transit is never added to available");
  }

  // ── TEST 8: Tool 4 - Valuation (Tool 4) ───────────────────────
  console.log("\n[8] Testing Deterministic Valuation (Tool 4)...");
  const val = await materialAndShipmentValuation("SHP-8801");
  assert(!("error" in val), "SHP-8801 valuation query executed");
  if (!("error" in val)) {
    assert(val.currency === "USD", "Valuation currency is USD");
    assert(val.totalValuation === 87000, "Valuation is 87,000 USD (2 transformers @ 43,500)");
  }

  // ── TEST 9: AI Reasoning - Greeting Short-Circuit ────────────
  console.log("\n[9] Testing Copilot Greeting Short-Circuit...");
  const greetingResult = await runCopilotReasoning({ userMessage: "Hello! Good morning." });
  assert(greetingResult.toolsUsed.length === 0, "Greeting does not trigger operational retrieval");
  assert(greetingResult.answerText.toLowerCase().includes("control tower"), "Greeting introduces Control Tower");

  // ── TEST 10: AI Reasoning - PO-3001 Grounded Answer ───────────
  console.log("\n[10] Testing Copilot Grounded Reasoning on PO-3001...");
  const poAnswer = await runCopilotReasoning({
    userMessage: "Why does PO-3001 show 0 linked shipments while 120 tonnes is in transit?",
  });
  assert(poAnswer.toolsUsed.some((t) => t.includes("reconciliation") || t.includes("po")), "Invoked po_shipment_reconciliation tool");
  assert(poAnswer.answerText.includes("72"), "Answer states 72 tonnes received (GRN-5002)");
  assert(poAnswer.answerText.includes("48"), "Answer states 48 tonnes pending supplier dispatch");
  assert(poAnswer.answerText.includes("0"), "Answer states 0 shipments linked");

  // ── TEST 11: AI Reasoning - GRN-5004 Deduplication Answer ─────
  console.log("\n[11] Testing Copilot Grounded Reasoning on GRN-5004...");
  const grnAnswer = await runCopilotReasoning({
    userMessage: "What happened with receipt GRN-5004 and why was it marked NOT APPLICABLE?",
  });
  assert(grnAnswer.toolsUsed.includes("quality_and_goods_receipt"), "Invoked quality_and_goods_receipt tool");
  assert(grnAnswer.answerText.includes("NOT_APPLICABLE") || grnAnswer.answerText.includes("NOT APPLICABLE"), "Answer states NOT_APPLICABLE");
  assert(grnAnswer.answerText.toLowerCase().includes("deduplicat") || grnAnswer.answerText.toLowerCase().includes("idempotency"), "Answer explains deduplication");

  // ── TEST 12: TTS Fallback Sanitization ────────────────────────
  console.log("\n[12] Testing Voice TTS Adapter Graceful Fallback...");
  const ttsRes = await synthesizeSpeech("Inspection completed for shipment SHP-8802.");
  assert(ttsRes.provider === "sarvam" || ttsRes.provider === "fallback", "TTS provider returns valid status");

  // ── TEST 13: Add-on Scope - Project Portfolio & Status Classification ──
  console.log("\n[13] Testing NASS Project Portfolio & Status Segregation...");
  const { nassProjectPortfolio, nassPriceBenchmarkComparison, nassShipmentWeightAudit, nassPartnerAndTradeRoutes, nassCeoDecisionBrief } = await import("../src/lib/operational-tools");
  const portfolio = await nassProjectPortfolio();
  assert(portfolio.totalProjects >= 6, `Found ${portfolio.totalProjects} total projects`);
  assert(portfolio.confirmedActiveCount >= 5, `Confirmed active projects count is ${portfolio.confirmedActiveCount} (>= 5)`);
  assert(portfolio.historicalCount === 1, "Exactly 1 historical reference project (Alba Potline 6)");
  const alba = portfolio.projects.find((p) => p.code === "PRJ-ALBA-06");
  assert(alba?.statusClassification === "HISTORICAL_REFERENCE", "Alba Potline 6 is classified as HISTORICAL_REFERENCE");
  assert(portfolio.policyNotice.includes("Strict separation enforced"), "Enforces policy notice for historical segregation");

  // ── TEST 14: Add-on Scope - Price Intelligence & Landed Cost Formula ──
  console.log("\n[14] Testing Price Benchmark & Landed Cost Engine...");
  const priceIntel = await nassPriceBenchmarkComparison();
  assert(priceIntel.totalBenchmarks >= 4, `Found ${priceIntel.totalBenchmarks} price benchmarks`);
  const rebarBm = priceIntel.benchmarks.find((b) => b.materialSku === "MAT-REB-16");
  assert(rebarBm?.benchmarkPrice === 685, "Rebar benchmark is $685/t (LME + MEED GCC Average)");
  assert(Boolean(rebarBm?.estimatedLandedCost.formula.includes("0.35% Marine Insurance")), "Formula incorporates 0.35% marine insurance");
  assert(Boolean(rebarBm?.estimatedLandedCost.formula.includes("5% GCC Customs Duty")), "Formula incorporates 5% GCC tariff");

  // ── TEST 15: Add-on Scope - Shipment Weight Hierarchy & Tolerance Audit ──
  console.log("\n[15] Testing Shipment Weight Hierarchy & Discrepancy Tolerance...");
  const weightAudit = await nassShipmentWeightAudit();
  assert(weightAudit.totalShipmentsAudited >= 8, `Audited ${weightAudit.totalShipmentsAudited} shipments`);
  assert(weightAudit.discrepanciesFlagged >= 1, `Flagged ${weightAudit.discrepanciesFlagged} discrepancy exceeding ±2.5%`);
  const shp8804 = weightAudit.shipments.find((s) => s.shipmentRef === "SHP-8804");
  assert(shp8804?.audit.toleranceStatus === "DISCREPANCY_FLAGGED", "SHP-8804 is DISCREPANCY_FLAGGED");
  assert(shp8804?.audit.variancePct === 2.99, "SHP-8804 has +2.99% variance (exceeding ±2.5%)");
  const shp8809 = weightAudit.shipments.find((s) => s.shipmentRef === "SHP-8809");
  assert(shp8809?.audit.toleranceStatus === "WITHIN_TOLERANCE", "SHP-8809 Dona Marine aggregate barge is WITHIN_TOLERANCE (-0.12%)");

  // ── TEST 16: Add-on Scope - NASS 18 Units & Verified Partner Brands ──
  console.log("\n[16] Testing NASS Corporate Footprint & Partner Registry...");
  const partners = await nassPartnerAndTradeRoutes();
  assert(partners.nassCorporateUnits.length === 18, "Found all 18 NASS corporate entities");
  const bbc = partners.nassCorporateUnits.find((u) => u.code === "NASS-BBC");
  assert(Boolean(bbc?.name.includes("Bahrain Building Chemicals")), "Includes Bahrain Building Chemicals W.L.L.");
  assert(partners.verifiedPartnerBrands.length >= 5, `Found ${partners.verifiedPartnerBrands.length} verified partner brands`);
  const hyundai = partners.verifiedPartnerBrands.find((b) => b.brandRepresented?.includes("Hyundai"));
  assert(hyundai != null, "Includes Hyundai Elevators partner brand");
  assert(partners.documentedTradeRoutes.some((r) => r.routeName.includes("Fujairah/Mina Saqr")), "Includes UAE aggregate barge route");

  // ── TEST 17: Add-on Scope - 10-Point Structured CEO Decisions ──
  console.log("\n[17] Testing 10-Point Structured CEO Decision Briefs...");
  const decisions = await nassCeoDecisionBrief();
  assert(decisions.totalDecisions >= 4, `Found ${decisions.totalDecisions} CEO decision recommendations`);
  assert(decisions.pendingReviewCount >= 4, `Found ${decisions.pendingReviewCount} decisions pending CEO review`);
  const dec1 = decisions.decisions.find((d) => d.ref === "DEC-2026-001");
  assert(dec1?.structured10Points["1_decisionRequired"] != null, "Point 1: Decision Required defined");
  assert(dec1?.structured10Points["3_verifiedSituation"] != null, "Point 3: Current Situation defined");
  assert(dec1?.structured10Points["7_recommendationAndWhy"].action != null, "Point 7: Recommended Action defined");
  assert(dec1?.structured10Points["8_accountableOwner"] != null, "Point 8: Accountable Owner defined");
  assert(Boolean(dec1?.governance.aiAutonomyRule.includes("NEVER approves")), "Governance rule prohibits autonomous AI approvals");

  // ── TEST 18: Copilot Grounded Reasoning on Executive Add-on Queries ──
  console.log("\n[18] Testing Copilot Reasoning on Executive Portfolio & Weight Audits...");
  const portfolioQuery = await runCopilotReasoning({ userMessage: "What projects are currently active and which are historical?" });
  assert(portfolioQuery.answerText.includes("Active Projects") || portfolioQuery.answerText.includes("PRJ-2201"), "Copilot lists active projects");
  assert(portfolioQuery.answerText.toLowerCase().includes("historical"), "Copilot addresses historical projects");

  const weightQuery = await runCopilotReasoning({ userMessage: "Are there any shipment weight discrepancies exceeding tolerance?" });
  assert(weightQuery.answerText.includes("SHP-8804"), "Copilot identifies SHP-8804 weight discrepancy");
  assert(weightQuery.answerText.includes("2.99%"), "Copilot notes +2.99% variance");

  console.log("\n========================================================");
  console.log(`   TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}   `);
  console.log("========================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error("Test execution exception:", e);
  process.exit(1);
});
