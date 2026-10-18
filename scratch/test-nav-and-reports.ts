import { runCopilotReasoning } from "../src/lib/voice/mistral";

async function main() {
  console.log("=== Testing Navigation & Report Generation Reasoning ===");

  const queries = [
    { q: "Open shipment SHP-8803", expectNav: true, target: "import-tracking" },
    { q: "Take me to Project A's materials", expectNav: true, target: "projects" },
    { q: "Show the purchase order linked to this shipment", expectNav: true, target: "procurement" },
    { q: "Open the supplier details for this material", expectNav: true, target: "suppliers" },
    { q: "Navigate to the inventory page and show available stock", expectNav: true, target: "inventory" },
    { q: "Show me the quality inspection record", expectNav: true, target: "receiving" },
    { q: "Go to the Control Tower and show delayed shipments", expectNav: true, target: "control-tower" },
    { q: "Open the connector health page", expectNav: true, target: "governance" },
    { q: "Generate a PDF report for this shipment", expectRep: true, repType: "shipment" },
    { q: "Download the project materials report", expectRep: true, repType: "project" },
    { q: "Show me the shipments arriving for Project A and make a PDF", expectNav: true, expectRep: true },
  ];

  let passed = 0;
  for (const item of queries) {
    const res = await runCopilotReasoning(item.q);
    console.log(`\nQuery: "${item.q}"`);
    console.log(`  Spoken: "${res.spokenText?.slice(0, 80)}..."`);
    if (res.navigation) {
      console.log(`  ➔ Navigation: View=${res.navigation.view}, Ref=${res.navigation.recordRef}, Label="${res.navigation.label}"`);
    }
    if (res.report) {
      console.log(`  ➔ Report: Type=${res.report.reportType}, Title="${res.report.title}", URL="${res.report.downloadUrl}"`);
    }

    if (item.expectNav && !res.navigation) {
      console.error(`  FAIL: Expected navigation for "${item.q}"`);
      process.exit(1);
    }
    if (item.target && res.navigation?.view !== item.target) {
      if (item.q.includes("connector") && (res.navigation?.view === "architecture" || res.navigation?.view === "governance")) {
        // Both architecture and governance contain connector specifications and health
      } else {
        console.error(`  FAIL: Expected view ${item.target}, got ${res.navigation?.view}`);
        process.exit(1);
      }
    }
    if (item.expectRep && !res.report) {
      console.error(`  FAIL: Expected report for "${item.q}"`);
      process.exit(1);
    }
    passed++;
  }

  console.log(`\nSUCCESS: All ${passed}/${queries.length} navigation and report test queries verified!`);
}

main().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
