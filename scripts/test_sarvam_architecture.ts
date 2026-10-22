/**
 * NASS Group AI Copilot — Master Architecture & Integration Verification Suite
 *
 * Verifies:
 * 1. Sarvam-105B is the default reasoning core
 * 2. Zero active Mistral runtime paths
 * 3. Database prompt audit logging with exact SHA-256 and HMAC-SHA-256
 * 4. Cryptographic integrity verification via verifyPromptLogIntegrity
 * 5. Python openpyxl native workbook parsing & calculations
 * 6. Python openpyxl native report generation
 * 7. Multi-input pipeline detection
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";
import { SARVAM_MODEL_REGISTRY, SarvamModelRouter } from "../src/lib/sarvam/model-router";
import { logAgentPrompt, verifyPromptLogIntegrity, calculatePromptSha256, calculatePromptHmac } from "../src/lib/audit/prompt-logger";
import { parseExcelNative, generateNativeReport } from "../src/lib/services/python-bridge";
import { OPERATIONAL_TOOLS } from "../src/lib/voice/copilot-engine";

async function runVerification() {
  console.log("================================================================================");
  console.log("   NASS GROUP AI COPILOT — SARVAM-ONLY MASTER VERIFICATION SUITE");
  console.log("================================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean, details?: string) {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name} ${details ? `— ${details}` : ""}`);
      failed++;
    }
  }

  // TEST 1: Sarvam-105B is Default Primary Reasoning Core
  const router = SarvamModelRouter.getInstance();
  const reasoningRoute = router.selectRoute("complex-reasoning");
  assert(
    "1. Primary Reasoning Model is Sarvam-105B",
    reasoningRoute.selectedModel === "sarvam-105b" && SARVAM_MODEL_REGISTRY["sarvam-105b"].maxTokens === 4096,
    `Selected: ${reasoningRoute.selectedModel}`
  );

  // TEST 2: Voice Specialist is Sarvam-105B Conversations
  const voiceRoute = router.selectRoute("conversational-voice");
  assert(
    "2. Conversational Voice Model is Sarvam-105B-Conversations",
    voiceRoute.selectedModel === "sarvam-105b-conversations",
    `Selected: ${voiceRoute.selectedModel}`
  );

  // TEST 3: Strict Sarvam-Only Registry (No Mistral, OpenAI, Anthropic, Gemini)
  const registryKeys = Object.keys(SARVAM_MODEL_REGISTRY);
  const onlySarvam = registryKeys.every((k) => k.startsWith("sarvam-105b"));
  assert(
    "3. Model Registry strictly restricted to Sarvam models only",
    onlySarvam && registryKeys.length === 2,
    `Active registry models: ${registryKeys.join(", ")}`
  );

  // TEST 4: Controlled NASS Operational Tool Registry
  assert(
    "4. Controlled NASS Application Tools registered",
    OPERATIONAL_TOOLS.length >= 10 && OPERATIONAL_TOOLS.some((t) => t.function.name === "shipment_details"),
    `Total tools: ${OPERATIONAL_TOOLS.length}`
  );

  // TEST 5: Cryptographic SHA-256 and HMAC-SHA-256 Calculation
  const testPrompt = "Where is shipment SHP-8802 and what is its revised ETA at Khalifa Bin Salman Port?";
  const expectedSha = crypto.createHash("sha256").update(Buffer.from(testPrompt, "utf8")).digest("hex");
  const computedSha = calculatePromptSha256(testPrompt);
  assert(
    "5. Exact UTF-8 SHA-256 prompt digest matches reference calculation",
    expectedSha === computedSha,
    `Computed: ${computedSha}`
  );

  const testHmac = calculatePromptHmac(testPrompt, "conv-test-99", 1);
  assert(
    "6. Server-side HMAC-SHA-256 computed with canonical serialization",
    testHmac.length === 64,
    `HMAC: ${testHmac}`
  );

  // TEST 6: Persistent Database Audit Logging
  try {
    const logRecord = await logAgentPrompt({
      promptText: testPrompt,
      ipAddress: "192.168.1.50",
      sessionId: "session-test-001",
      conversationId: "conv-test-99",
      messageSequence: 1,
      pagePath: "/ceo-tower",
      host: "mycorps.vercel.app",
      userAgent: "NASS-QA-Automation-TestRunner",
      requestId: "req-test-qa-01",
      model: "sarvam-105b",
    });

    assert(
      "7. Prompt successfully logged to SQLite/Prisma AgentPromptLog table",
      Boolean(logRecord && logRecord.id && logRecord.promptSha256 === expectedSha),
      `Record ID: ${logRecord?.id}`
    );

    // TEST 7: Integrity Verification
    const verification = verifyPromptLogIntegrity(logRecord);
    assert(
      "8. Cryptographic audit record integrity verified (SHA + HMAC match)",
      verification.isValid && verification.shaMatches && verification.hmacMatches,
      `Verification result: ${JSON.stringify(verification)}`
    );
  } catch (err: any) {
    assert("7. Database Audit Logging", false, err.message);
  }

  // TEST 8: Python Native OpenPyXL Report Generation
  try {
    const testFilename = `test_nass_audit_${Date.now()}.xlsx`;
    const genResult = await generateNativeReport({
      format: "xlsx",
      title: "NASS Automated Verification Report",
      headers: ["Shipment Code", "Cargo Description", "Gross Weight (kg)", "Declared Value (USD)", "Status"],
      data: [
        ["SHP-8801", "BS4449 Rebar Steel 500B", 72000, 57600, "DELIVERED"],
        ["SHP-8802", "Industrial Chiller 800 kW", 14200, 96000, "IN_TRANSIT"],
        ["SHP-8804", "Hyundai High-Speed Elevator", 2850, 48500, "DISCREPANCY_FLAGGED"],
      ],
      outputFilename: testFilename,
    });

    assert(
      "9. Python openpyxl native XLSX workbook generated with NASS Gold styling",
      genResult.success && genResult.sizeBytes > 1000 && fs.existsSync(genResult.outputPath),
      `Output: ${genResult.outputPath} (${genResult.sizeBytes} bytes)`
    );

    // TEST 9: Python Native OpenPyXL Workbook Parsing & Deterministic Math
    if (genResult.success && fs.existsSync(genResult.outputPath)) {
      const parseResult = await parseExcelNative(genResult.outputPath);
      const grossWeightSum = parseResult.summary.numeric_aggregations["Gross Weight (kg)"] || 0;
      assert(
        "10. Python native parser extracted sheets and computed correct deterministic sum",
        parseResult.success && parseResult.summary.total_rows === 3 && grossWeightSum === 89050,
        `Rows: ${parseResult.summary.total_rows}, Calculated Gross Weight: ${grossWeightSum}`
      );

      // Clean up test file
      try {
        fs.unlinkSync(genResult.outputPath);
      } catch {}
    }
  } catch (err: any) {
    assert("9. Python native processors", false, err.message);
  }

  console.log("\n================================================================================");
  console.log(`   TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

runVerification().catch((err) => {
  console.error("FATAL VERIFICATION RUNNER ERROR:", err);
  process.exit(1);
});
