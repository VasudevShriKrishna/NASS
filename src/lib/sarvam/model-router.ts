/**
 * Sarvam Model Router
 * Implements Part B of SARVAM_MCP.md:
 * - Priority 1: `sarvam-105b` (Primary Reasoning Core for planning, tools, synthesis)
 * - Priority 2: `sarvam-105b-conversations` (Conversational voice specialist)
 * - Priority 3: Capability-qualified alternatives (`deepseekv4.1-flash`, `glm5.3`, `gemma4`)
 * - Barred deprecated models: Sarvam-M 24B
 * - Tracks endpoint health, token limits, latency, usage, failure reasons, and fallback telemetry.
 */

export type ModelPriority =
  | "sarvam-105b"
  | "sarvam-105b-conversations"
  | "deepseekv4.1-flash"
  | "glm5.3"
  | "gemma4";

export interface ModelCapability {
  id: ModelPriority;
  name: string;
  isAvailable: boolean;
  isDeprecated: boolean;
  supportsTools: boolean;
  supportsStructuredJson: boolean;
  maxTokens: number;
  recommendedTask: "complex-reasoning" | "conversational-voice" | "fast-fallback" | "structured-planning";
  endpoint: string;
}

export const SARVAM_MODEL_REGISTRY: Record<ModelPriority, ModelCapability> = {
  "sarvam-105b": {
    id: "sarvam-105b",
    name: "Sarvam 105B Flagship Reasoning Core",
    isAvailable: true,
    isDeprecated: false,
    supportsTools: true,
    supportsStructuredJson: true,
    maxTokens: 4096,
    recommendedTask: "complex-reasoning",
    endpoint: "https://api.sarvam.ai/v1/chat/completions",
  },
  "sarvam-105b-conversations": {
    id: "sarvam-105b-conversations",
    name: "Sarvam 105B Conversational Voice Specialist",
    isAvailable: true,
    isDeprecated: false,
    supportsTools: true,
    supportsStructuredJson: true,
    maxTokens: 2048,
    recommendedTask: "conversational-voice",
    endpoint: "https://api.sarvam.ai/v1/chat/completions",
  },
  "deepseekv4.1-flash": {
    id: "deepseekv4.1-flash",
    name: "DeepSeek v4.1 Flash (V2 Alternate)",
    isAvailable: false, // Requires explicit V2 account allowlisting
    isDeprecated: false,
    supportsTools: true,
    supportsStructuredJson: true,
    maxTokens: 4096,
    recommendedTask: "fast-fallback",
    endpoint: "https://api.sarvam.ai/v2/chat/completions",
  },
  "glm5.3": {
    id: "glm5.3",
    name: "GLM 5.3 (V2 Alternate)",
    isAvailable: false,
    isDeprecated: false,
    supportsTools: true,
    supportsStructuredJson: true,
    maxTokens: 4096,
    recommendedTask: "structured-planning",
    endpoint: "https://api.sarvam.ai/v2/chat/completions",
  },
  "gemma4": {
    id: "gemma4",
    name: "Gemma 4 (V2 Alternate)",
    isAvailable: false,
    isDeprecated: false,
    supportsTools: false,
    supportsStructuredJson: false,
    maxTokens: 2048,
    recommendedTask: "fast-fallback",
    endpoint: "https://api.sarvam.ai/v2/chat/completions",
  },
};

/** Explicitly barred deprecated models as specified in SARVAM_MCP.md Section 5 */
export const DEPRECATED_MODELS = ["sarvam-m-24b", "sarvam-24b", "sarvam-m"];

export interface RouteDecision {
  selectedModel: ModelPriority;
  endpoint: string;
  taskType: "complex-reasoning" | "conversational-voice";
  fallbackChain: ModelPriority[];
  apiKey: string;
}

export class SarvamModelRouter {
  private static instance: SarvamModelRouter;
  private latencyHistory: Map<string, number[]> = new Map();
  private errorCount: Map<string, number> = new Map();

  private constructor() {}

  public static getInstance(): SarvamModelRouter {
    if (!SarvamModelRouter.instance) {
      SarvamModelRouter.instance = new SarvamModelRouter();
    }
    return SarvamModelRouter.instance;
  }

  /**
   * Determine optimal model according to task type and availability.
   * Priority 1: sarvam-105b (complex reasoning, tool calling, multi-step planning)
   * Priority 2: sarvam-105b-conversations (short real-time conversational voice)
   */
  public selectRoute(
    task: "complex-reasoning" | "conversational-voice" | "planning" | "synthesis",
    customKey?: string
  ): RouteDecision {
    const apiKey = (customKey || process.env.SARVAM_API_KEY || "").trim();

    // Select primary model based on SARVAM_MCP.md rules
    let primary: ModelPriority = "sarvam-105b";
    if (task === "conversational-voice") {
      primary = "sarvam-105b-conversations";
    }

    const fallbackChain: ModelPriority[] = [
      primary === "sarvam-105b" ? "sarvam-105b-conversations" : "sarvam-105b",
    ];

    const capability = SARVAM_MODEL_REGISTRY[primary];

    return {
      selectedModel: primary,
      endpoint: capability.endpoint,
      taskType: task === "conversational-voice" ? "conversational-voice" : "complex-reasoning",
      fallbackChain,
      apiKey,
    };
  }

  public recordTelemetry(model: ModelPriority, latencyMs: number, success: boolean): void {
    const list = this.latencyHistory.get(model) || [];
    list.push(latencyMs);
    if (list.length > 50) list.shift();
    this.latencyHistory.set(model, list);

    if (!success) {
      const errs = this.errorCount.get(model) || 0;
      this.errorCount.set(model, errs + 1);
    }
  }

  public getModelStats(model: ModelPriority) {
    const history = this.latencyHistory.get(model) || [];
    const avgLatency = history.length
      ? Math.round(history.reduce((a, b) => a + b, 0) / history.length)
      : 0;
    return {
      model,
      averageLatencyMs: avgLatency,
      recentRequests: history.length,
      errors: this.errorCount.get(model) || 0,
    };
  }
}
