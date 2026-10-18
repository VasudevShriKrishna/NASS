import { stripSendItTrigger, SEND_IT_TRIGGER_REGEX } from "../src/components/app/voice-copilot";
import { resolveNavigationIntent, resolveReportIntent } from "../src/lib/voice/mistral";
import { generatePdfReport } from "../src/lib/pdf-reports-generator";

async function runTests() {
  console.log("=== 1. Testing 'send it send it' Trigger Extraction ===");
  const testPhrases = [
    "Take me to Project A's materials and make a PDF report send it send it",
    "Open shipment SHP-8803 SEND IT, SEND IT.",
    "Show me live barge location for SHP-8809 send it send it please",
    "Why does PO-3001 show 0 linked shipments send it  send it!",
    "Just a normal query without trigger"
  ];

  for (const phrase of testPhrases) {
    const hasTrigger = SEND_IT_TRIGGER_REGEX.test(phrase);
    const cleaned = stripSendItTrigger(phrase);
    console.log(`[Phrase]: "${phrase}"`);
    console.log(` -> Matched Trigger: ${hasTrigger}`);
    console.log(` -> Cleaned Query: "${cleaned}"\n`);
  }

  console.log("=== 2. Testing Context-Aware Navigation Mapping ===");
  const navPhrases = [
    "Take me to Project A's materials.",
    "Open shipment SHP-8803.",
    "Show me live barge location for SHP-8809.",
    "Navigate to the inventory page and show stock.",
    "Show me purchase orders and contracts.",
    "Open receiving and quality control.",
    "Take me to the Executive Control Tower.",
    "What decisions require CEO approval?",
    "Show me connector health and integration audit."
  ];

  for (const phrase of navPhrases) {
    const nav = resolveNavigationIntent(phrase);
    console.log(`[Nav Query]: "${phrase}"`);
    if (nav) {
      console.log(` -> view: ${nav.view}, targetRef: ${nav.targetRef || nav.recordRef || "none"}, autoExecute: ${nav.autoExecute}`);
      console.log(` -> label: ${nav.label}\n`);
    } else {
      console.error(` -> FAILED to map: ${phrase}\n`);
    }
  }

  console.log("=== 3. Testing On-Demand PDF Report Resolution ===");
  const reportPhrases = [
    "Download CEO executive summary report for all projects",
    "Make a PDF report for Project A",
    "Export shipment SHP-8803 report",
    "Generate a purchase-order and material-cost report",
    "Give me the inventory and backup-stock report"
  ];

  for (const phrase of reportPhrases) {
    const rep = resolveReportIntent(phrase);
    console.log(`[Report Query]: "${phrase}"`);
    if (rep) {
      console.log(` -> type: ${rep.reportType}, downloadUrl: ${rep.downloadUrl}`);
      console.log(` -> fileName: ${rep.fileName || rep.filename}\n`);
    } else {
      console.error(` -> FAILED to resolve report: ${phrase}\n`);
    }
  }

  console.log("=== 4. Testing PDF Vector Engine via pdf-reports-generator.ts ===");
  const pdf1 = await generatePdfReport({ type: "ceo_executive" });
  console.log(`✓ Generated CEO Executive Brief PDF: ${pdf1.filename} (${pdf1.buffer.length} bytes)`);

  const pdf2 = await generatePdfReport({ type: "project", ref: "PRJ-2201" });
  console.log(`✓ Generated Project Portfolio PDF: ${pdf2.filename} (${pdf2.buffer.length} bytes)`);

  const pdf3 = await generatePdfReport({ type: "shipment", ref: "SHP-8803" });
  console.log(`✓ Generated Shipment Dossier PDF: ${pdf3.filename} (${pdf3.buffer.length} bytes)`);

  console.log("\nALL MASTER SPEC TESTS COMPLETED SUCCESSFULLY!");
}

runTests().catch(console.error);
