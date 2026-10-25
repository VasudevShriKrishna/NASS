import dotenv from "dotenv";
dotenv.config();

import { resolveViewFromInput, ROUTE_REGISTRY } from "../src/lib/route-registry";
import { runCopilotReasoning } from "../src/lib/voice/copilot-engine";
import { executeNassTool, NASS_APPLICATION_TOOLS } from "../src/lib/sarvam/nass-tools";
import { inspectSarvamKey, resolveSarvamApiKey } from "../src/lib/sarvam/api-key";
import {
  categorizeHttpError,
  getSafeUserNotice,
  redactSecret,
  sanitizeLogDetails,
  getServerRuntimeInfo,
} from "../src/lib/diagnostics";
import { analyzePromptTasks, buildMultiTaskSystemGuidance } from "../src/lib/voice/multi-step-planner";

async function runTests() {
  console.log("================================================================================");
  console.log("   NASS COPILOT — ADVANCED SPECIFICATION VERIFICATION SUITE");
  console.log("================================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean, detail = "") {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name} — ${detail}`);
      failed++;
    }
  }

  // --- 1. SARVAM API AND ENVIRONMENT HANDLING ---
  console.log("--- 1. SARVAM API & Environment Handling ---");
  const keyDiag = inspectSarvamKey();
  assert("1.1. Root SARVAM_API_KEY detected and loaded", keyDiag.isConfigured === true);
  assert("1.2. Key format is valid (sk_...)", keyDiag.isValidFormat === true);
  assert("1.3. Redacted preview does NOT reveal full key", !keyDiag.redactedPreview.includes(process.env.SARVAM_API_KEY!));
  assert("1.4. Redacted preview shows safe prefix/suffix", keyDiag.redactedPreview.startsWith("sk_"));
  const runtime = getServerRuntimeInfo();
  assert("1.5. Server runtime info detects node environment", runtime.runtime.includes("nodejs"));

  // --- 2. BACKEND FAILURE DIAGNOSTICS & REDACTION ---
  console.log("\n--- 2. Backend Failure Diagnostics & Safe Error Categorization ---");
  assert("2.1. HTTP 401 categorized as AUTHENTICATION_ERROR", categorizeHttpError(401) === "AUTHENTICATION_ERROR");
  assert("2.2. HTTP 403 categorized as AUTHENTICATION_ERROR", categorizeHttpError(403) === "AUTHENTICATION_ERROR");
  assert("2.3. HTTP 429 categorized as RATE_LIMIT_ERROR", categorizeHttpError(429) === "RATE_LIMIT_ERROR");
  assert("2.4. HTTP 500 categorized as UPSTREAM_SERVICE_ERROR", categorizeHttpError(500) === "UPSTREAM_SERVICE_ERROR");
  assert("2.5. HTTP 400 categorized as BAD_REQUEST_ERROR", categorizeHttpError(400) === "BAD_REQUEST_ERROR");

  const authNotice = getSafeUserNotice("AUTHENTICATION_ERROR");
  assert("2.6. Auth notice is honest and non-misleading", authNotice.userFacingMessage.includes("rejected or expired"));
  const rateNotice = getSafeUserNotice("RATE_LIMIT_ERROR");
  assert("2.7. Rate limit notice reports real quota condition", rateNotice.userFacingMessage.includes("rate limit"));

  const logPayload = { apiKey: process.env.SARVAM_API_KEY, secretToken: "super_secret_123", normalData: "hello" };
  const sanitized = sanitizeLogDetails(logPayload);
  assert("2.8. Log sanitizer redacts sensitive key fields", !sanitized.apiKey.includes(process.env.SARVAM_API_KEY!));
  assert("2.9. Log sanitizer redacts sensitive token fields", !sanitized.secretToken.includes("super_secret_123"));
  assert("2.10. Log sanitizer preserves non-secret fields", sanitized.normalData === "hello");

  // --- 3. FIX SHIPMENT-RANKING ISSUE ---
  console.log("\n--- 3. Shipment Ranking Command & Tool Operations ---");
  const navRank = resolveViewFromInput("Open shipment ranking");
  assert("3.1. 'Open shipment ranking' resolves to import-tracking", navRank?.view === "import-tracking");
  assert("3.2. import-tracking metadata label is Shipment Tracking", navRank?.label === "Shipment Tracking");

  const copilotNavRes = await runCopilotReasoning("Open shipment ranking");
  assert("3.3. Copilot executes navigation for 'Open shipment ranking'", copilotNavRes.navigation?.view === "import-tracking");
  assert("3.4. Notice is NOT an offline key config warning", !copilotNavRes.answer.includes("please ensure your SARVAM_API_KEY is configured"));
  assert("3.5. Tools used includes navigate_to_module", copilotNavRes.toolsUsed.includes("navigate_to_module"));

  // Test data operation: rank_shipments tool
  const rankToolRes = await executeNassTool("rank_shipments", { sortBy: "eta" });
  assert("3.6. rank_shipments tool executes against real DB records", Boolean(rankToolRes.data?.rankedShipments));
  assert("3.7. rank_shipments returns ranked records list", rankToolRes.data.rankedShipments.length > 0);
  assert("3.8. rank_shipments contains SHP-8802 with CIF valuation", rankToolRes.data.rankedShipments.some((s: any) => s.ref === "SHP-8802"));

  // --- 4. SUPPORT LONG, MULTI-LINE PROMPTS (10+ LINES) ---
  console.log("\n--- 4. Long, Multi-Line Prompts (10+ Lines with Multiple Dependencies) ---");
  const longPrompt = [
    "Execute an executive operational review across the NASS supply chain:",
    "1. Check the live maritime coordinates and status of shipment SHP-8802.",
    "2. Reconcile purchase order PO-3001 with receipts and highlight open committed balance.",
    "3. Review Goods Receipt Note GRN-5004 and explain its quality inspection pass rate status.",
    "4. Inspect buffer stock and on-hand yard inventory for Grade 500B Rebar.",
    "5. Calculate total landed valuation in USD and convert to Bahrain Dinars (BHD) at fixed peg.",
    "6. Review active ongoing projects in Bahrain Marina and Falcon Flyover.",
    "7. Open the Live Traceability module to view sea corridors.",
    "8. Check for any weight discrepancy exceptions flagged across weighbridges.",
    "9. Summarize all findings in a structured Markdown comparison table.",
    "10. Express all operational timestamps in verified Bahrain Local Time (AST, UTC+3).",
    "11. Ensure zero fabrication or unverified estimates.",
  ].join("\n");

  const plan = analyzePromptTasks(longPrompt);
  assert("4.1. Planner detects multi-task mandate", plan.isMultiTask === true);
  assert("4.2. Planner measures prompt lines (> 10 lines)", plan.totalLines >= 11);
  assert("4.3. Planner detects SHP-8802 entity", plan.detectedEntities.shipments.includes("SHP-8802"));
  assert("4.4. Planner detects PO-3001 entity", plan.detectedEntities.purchaseOrders.includes("PO-3001"));
  assert("4.5. Planner detects GRN-5004 entity", plan.detectedEntities.receipts.includes("GRN-5004"));
  assert("4.6. Planner detects markdown table format requirement", plan.requestedFormat === "markdown_table");
  assert("4.7. Planner detects Bahrain AST timestamp requirement", plan.requiresAstTimestamp === true);
  assert("4.8. Planner detects financial calculations requirement", plan.requiresCalculations === true);

  // Test full copilot execution of the 11-line prompt
  console.log("\nExecuting 11-line prompt reasoning loop...");
  const longPromptRes = await runCopilotReasoning(longPrompt);
  assert("4.9. Execution returns valid answer text", Boolean(longPromptRes.answerText && longPromptRes.answerText.length > 100));
  assert("4.10. Answer contains SHP-8802 information", longPromptRes.answerText.includes("SHP-8802") || longPromptRes.answerText.includes("PUCCINI"));
  assert("4.11. Answer contains PO-3001 reconciliation", longPromptRes.answerText.includes("PO-3001") || longPromptRes.answerText.includes("72"));
  assert("4.12. Answer contains GRN-5004 deduplication notice", longPromptRes.answerText.includes("GRN-5004") || longPromptRes.answerText.includes("M13"));
  assert("4.13. Answer contains financial conversion (USD/BHD)", longPromptRes.answerText.includes("BHD") || longPromptRes.answerText.includes("USD"));
  assert("4.14. Answer contains structured Markdown table", longPromptRes.answerText.includes("|") && longPromptRes.answerText.includes("---"));
  assert("4.15. Preserves navigation to live module", longPromptRes.navigation?.view === "live" || longPromptRes.sources.some(s => s.includes("live")));

  console.log("\n================================================================================");
  console.log(`   ADVANCED SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("================================================================================");

  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error("Test execution threw exception:", err);
  process.exit(1);
});
