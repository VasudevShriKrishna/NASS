/**
 * [LEGACY INACTIVE] Mistral AI Provider Adapter — DEPRECATED & INACTIVE
 *
 * ARCHITECTURAL DIRECTIVE & MIGRATION STATUS:
 * - Mistral has been permanently decommissioned and removed from active runtime architecture.
 * - All reasoning, tool calling, and audio synthesis exclusively use Sarvam AI (Sarvam-105B).
 * - All active implementations migrated to `src/lib/voice/copilot-engine.ts`.
 * - No Mistral API calls, SDKs, or runtime fallbacks remain active in this codebase.
 * - This file exists strictly as an inactive legacy bridge for backwards compatibility.
 */

export {
  OPERATIONAL_TOOLS,
  executeTool,
  isGreeting,
  formatGreeting,
  resolveActiveContext,
  resolveNavigationIntent,
  resolveReportIntent,
  runSarvamReasoning,
  runDeterministicFallback,
  runCopilotReasoning,
  type ActiveEntityContext,
} from "./copilot-engine";
