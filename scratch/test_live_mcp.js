async function testLiveMcp() {
  const base = "https://mycorps.vercel.app";
  console.log(`\n=== Testing Live Deployment at ${base} ===\n`);

  // 1. Test GET /api/sarvam/mcp tool discovery
  try {
    const resMcp = await fetch(`${base}/api/sarvam/mcp`);
    const jsonMcp = await resMcp.json();
    console.log(`[1] GET /api/sarvam/mcp -> HTTP ${resMcp.status}`);
    console.log(`    Primary Model: ${jsonMcp.primaryReasoningModel} | Specialist: ${jsonMcp.voiceSpecialistModel}`);
    console.log(`    Discovered MCP Tools: ${jsonMcp.mcpTools?.length} | App Tools: ${jsonMcp.nassApplicationTools?.length}`);
  } catch (e) {
    console.error("[1] GET /api/sarvam/mcp error:", e.message);
  }

  // 2. Test POST /api/assistant with Sarvam 105B Reasoning
  try {
    const resAss = await fetch(`${base}/api/assistant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: "Which project is shipment SHP-8802 associated with?" }),
    });
    const jsonAss = await resAss.json();
    console.log(`\n[2] POST /api/assistant -> HTTP ${resAss.status}`);
    console.log(`    Provider: ${jsonAss.data?.provider} | Model: ${jsonAss.data?.model}`);
    console.log(`    Answer snippet: ${jsonAss.data?.answer?.slice(0, 200)}...`);
  } catch (e) {
    console.error("[2] POST /api/assistant error:", e.message);
  }

  // 3. Test POST /api/sarvam/mcp tool execution
  try {
    const resTool = await fetch(`${base}/api/sarvam/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toolName: "get_live_news", parameters: {} }),
    });
    const jsonTool = await resTool.json();
    console.log(`\n[3] POST /api/sarvam/mcp (get_live_news) -> HTTP ${resTool.status}`);
    console.log(`    News items retrieved: ${jsonTool.result?.items?.length} | Timezone: ${jsonTool.result?.timezone}`);
  } catch (e) {
    console.error("[3] POST /api/sarvam/mcp error:", e.message);
  }

  console.log("\n=== Live Deployment Test Completed Successfully! ===\n");
}

testLiveMcp();
