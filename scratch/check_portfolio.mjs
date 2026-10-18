import dotenv from 'dotenv';
dotenv.config();

import { runCopilotReasoning } from '../src/lib/voice/mistral.ts';

async function main() {
  const r = await runCopilotReasoning({ userMessage: "What projects are currently active and which are historical?" });
  console.log("ANSWER:\n", r.answerText);
  console.log("\nPROVIDER NOTICE:", r.providerNotice);
}
main();
