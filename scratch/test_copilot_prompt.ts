import { runCopilotReasoning } from "../src/lib/voice/mistral";

async function main() {
  console.log("Testing exact user query...");
  const query = "Tell me one thing how many projects of Nas public portfolio projects and contractual commitments are ongoing and active";
  
  const result = await runCopilotReasoning({
    userMessage: query,
    pageContext: {
      activeView: "ceo-tower",
      viewLabel: "CEO Control Tower",
    },
  });

  console.log("=== Copilot Response ===");
  console.log("Answer:", result.answerText);
  console.log("Spoken:", result.spokenText);
  console.log("Tools Used:", result.toolsUsed);
  console.log("Sources:", result.sources);
  console.log("Provider:", result.provider);
  console.log("Model:", result.model);
}

main().catch(console.error);
