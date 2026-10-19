import { runCopilotReasoning } from "../src/lib/voice/mistral";

const ACCEPTANCE_TESTS = [
  {
    id: 1,
    name: "Latest public announcement from NASS Group",
    prompt: "Search the web for the latest public announcement from NASS Group.",
  },
  {
    id: 2,
    name: "News in last 24 hours about Bahrain Prime Minister",
    prompt: "Find news published in the last 24 hours about Bahrain's Prime Minister.",
  },
  {
    id: 3,
    name: "Research a public figure with sourced biography",
    prompt: "Research a public figure and provide a sourced biography of Abdulla Ahmed Nass.",
  },
  {
    id: 4,
    name: "Construction material procurement market updates in Bahrain",
    prompt: "Find the latest construction-material procurement market updates in Bahrain.",
  },
  {
    id: 5,
    name: "Current publicly announced infrastructure projects relevant to NASS",
    prompt: "Find current publicly announced infrastructure projects relevant to NASS.",
  },
  {
    id: 6,
    name: "Historical NASS marine-operation announcement",
    prompt: "Search for a historical NASS marine-operation announcement.",
  },
  {
    id: 7,
    name: "Compare public news report with authorized internal record",
    prompt: "Compare a public news report with an authorized internal project record.",
  },
  {
    id: 8,
    name: "Return results in text with source URLs, not a PDF",
    prompt: "Search the web for Bahrain maritime infrastructure and return the results in text with source URLs, not a PDF.",
  },
];

async function runAcceptanceSuite() {
  console.log("================================================================================");
  console.log("       STARTING NASS AI COPILOT EXTERNAL WEB & NEWS SEARCH ACCEPTANCE SUITE     ");
  console.log("================================================================================\n");

  const resultsSummary: any[] = [];

  for (const test of ACCEPTANCE_TESTS) {
    console.log(`[TEST ${test.id}] "${test.name}"`);
    console.log(`Prompt: "${test.prompt}"`);

    const start = Date.now();
    try {
      const res = await runCopilotReasoning({
        userMessage: test.prompt,
        history: [],
      });

      const elapsed = Date.now() - start;
      const text = res.answerText || res.answer || "";
      const hasTools = res.toolsUsed && res.toolsUsed.length > 0;
      const ranSearch = res.toolsUsed.some((t) => t.includes("search") || t.includes("news") || t.includes("web"));
      const hasEvidence = text.includes("### Evidence") || text.includes("http") || res.sources.some((s) => s.startsWith("web:") || s.startsWith("news:"));
      const hasUrls = /https?:\/\/[^\s)]+/.test(text) || (res.sources && res.sources.length > 0);
      const isNotPdf = !res.report;

      const passed = ranSearch && (hasEvidence || hasUrls) && (test.id !== 8 || isNotPdf);

      console.log(`  -> Status: ${passed ? "PASSED ✓" : "FAILED ✗"} (${elapsed}ms)`);
      console.log(`  -> Tools Used: ${JSON.stringify(res.toolsUsed)}`);
      console.log(`  -> Sources (${res.sources.length}): ${res.sources.slice(0, 3).join(", ")}${res.sources.length > 3 ? "..." : ""}`);
      console.log(`  -> PDF Triggered: ${res.report ? "YES (Report)" : "NO (Pure Text)"}`);
      console.log(`  -> Sample Output Preview:\n${text.slice(0, 260)}...\n`);

      resultsSummary.push({
        id: test.id,
        name: test.name,
        passed,
        elapsed,
        toolsUsed: res.toolsUsed,
        sourcesCount: res.sources.length,
        isNotPdf,
      });
    } catch (e: any) {
      console.error(`  -> Status: EXCEPTION ✗ (${e.message})`);
      resultsSummary.push({
        id: test.id,
        name: test.name,
        passed: false,
        error: e.message,
      });
    }
  }

  console.log("================================================================================");
  console.log("                         ACCEPTANCE SUITE SUMMARY REPORT                        ");
  console.log("================================================================================");
  console.table(resultsSummary);

  const allPassed = resultsSummary.every((r) => r.passed);
  console.log(`\nOverall Result: ${allPassed ? "ALL 8 ACCEPTANCE TESTS PASSED SUCCESSFULLY! ✓" : "SOME TESTS FAILED"}`);
}

runAcceptanceSuite();
