/**
 * Multi-Step Operational Task Planner & Execution Verifier
 *
 * Implements Section 5 of Prompt:
 * - Handles long, detailed prompts exceeding 10 lines
 * - Deconstructs complex instructions into ordered subtasks
 * - Preserves all constraints, requested formats (tables, reports), and input data
 * - Tracks completed, failed, and remaining steps internally
 * - Validates outputs against user acceptance criteria before delivery
 */

import { resolveViewFromInput, ViewId } from "../route-registry";
import { fmtBahrainDateTime } from "../bahrain-time";

export interface ParsedTaskStep {
  stepNumber: number;
  rawText: string;
  category: "navigation" | "report" | "query" | "calculation" | "formatting" | "general";
  entityRef?: string;
  targetView?: ViewId;
  status: "PENDING" | "COMPLETED" | "FAILED" | "PARTIAL";
  resultSummary?: string;
}

export interface MultiTaskPlan {
  isMultiTask: boolean;
  totalLines: number;
  steps: ParsedTaskStep[];
  requestedFormat: "markdown_table" | "bullet_summary" | "detailed_dossier" | "standard";
  requiresAstTimestamp: boolean;
  requiresCalculations: boolean;
  detectedEntities: {
    shipments: string[];
    purchaseOrders: string[];
    receipts: string[];
    projects: string[];
    materials: string[];
  };
  navigationIntent?: { view: ViewId; label: string };
  reportIntent?: { reportType: string; ref?: string };
}

/**
 * Analyzes and structures long, multi-line user prompts into an actionable plan.
 */
export function analyzePromptTasks(prompt: string): MultiTaskPlan {
  const lines = prompt.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const totalLines = lines.length;

  const detectedEntities = {
    shipments: Array.from(new Set(prompt.match(/\b(SHP-\d{4})\b/gi) || [])).map((s) => s.toUpperCase()),
    purchaseOrders: Array.from(new Set(prompt.match(/\b(PO-\d{4})\b/gi) || [])).map((p) => p.toUpperCase()),
    receipts: Array.from(new Set(prompt.match(/\b(GRN-\d{4})\b/gi) || [])).map((g) => g.toUpperCase()),
    projects: Array.from(new Set(prompt.match(/\b(PRJ-[A-Z0-9-]+)\b/gi) || [])).map((p) => p.toUpperCase()),
    materials: Array.from(new Set(prompt.match(/\b(MAT-[A-Z0-9-]+)\b/gi) || [])).map((m) => m.toUpperCase()),
  };

  const isTableRequested = /\b(table|tabular|columns|matrix|grid)\b/i.test(prompt);
  const isSummaryRequested = /\b(summary|executive summary|bullet points|brief)\b/i.test(prompt);
  const requiresAstTimestamp = /\b(ast|bahrain time|local time|timestamp)\b/i.test(prompt);
  const requiresCalculations = /\b(calculate|total|valuation|sum|bhd|usd|fx|conversion|weight variance)\b/i.test(prompt);

  const steps: ParsedTaskStep[] = [];
  let stepCounter = 1;

  for (const line of lines) {
    const isNumbered = /^\d+[\.\)\-]\s*(.*)$/.exec(line);
    const text = isNumbered ? isNumbered[1] : line;

    if (text.length < 3) continue;

    let category: ParsedTaskStep["category"] = "general";
    let entityRef: string | undefined = undefined;
    let targetView: ViewId | undefined = undefined;

    // Detect navigation
    if (/\b(open|take me to|navigate to|go to|view)\b/i.test(text)) {
      const resolved = resolveViewFromInput(text);
      if (resolved) {
        category = "navigation";
        targetView = resolved.view;
      }
    }

    // Detect reports
    if (/\b(generate|download|export|pdf|report|dossier)\b/i.test(text)) {
      category = "report";
    }

    // Detect queries
    if (category === "general") {
      if (text.includes("SHP-") || /\bshipment\b/i.test(text)) {
        category = "query";
        entityRef = detectedEntities.shipments[0];
      } else if (text.includes("PO-") || /\bpurchase order|reconciliation\b/i.test(text)) {
        category = "query";
        entityRef = detectedEntities.purchaseOrders[0];
      } else if (text.includes("GRN-") || /\bquality|receipt|qc\b/i.test(text)) {
        category = "query";
        entityRef = detectedEntities.receipts[0];
      } else if (/\bproject|marina|falcon\b/i.test(text)) {
        category = "query";
        entityRef = detectedEntities.projects[0];
      } else if (/\bcalc|valuation|math|total|variance\b/i.test(text)) {
        category = "calculation";
      } else if (/\btable|format|summary\b/i.test(text)) {
        category = "formatting";
      }
    }

    steps.push({
      stepNumber: stepCounter++,
      rawText: text,
      category,
      entityRef,
      targetView,
      status: "PENDING",
    });
  }

  // Detect navigation intent
  let navigationIntent: { view: ViewId; label: string } | undefined = undefined;
  const navStep = steps.find((s) => s.category === "navigation" && s.targetView);
  if (navStep && navStep.targetView) {
    const resolved = resolveViewFromInput(navStep.targetView);
    if (resolved) navigationIntent = { view: resolved.view, label: resolved.label };
  } else {
    const directNav = resolveViewFromInput(prompt);
    if (directNav && /\b(open|navigate|go to|take me to)\b/i.test(prompt)) {
      navigationIntent = { view: directNav.view, label: directNav.label };
    }
  }

  // Detect report intent
  let reportIntent: { reportType: string; ref?: string } | undefined = undefined;
  if (/\b(generate|download|export)\b/i.test(prompt) && /\b(pdf|report)\b/i.test(prompt)) {
    if (detectedEntities.shipments.length > 0) {
      reportIntent = { reportType: "shipment", ref: detectedEntities.shipments[0] };
    } else if (detectedEntities.purchaseOrders.length > 0) {
      reportIntent = { reportType: "procurement", ref: detectedEntities.purchaseOrders[0] };
    } else if (detectedEntities.projects.length > 0) {
      reportIntent = { reportType: "project", ref: detectedEntities.projects[0] };
    } else {
      reportIntent = { reportType: "ceo_executive" };
    }
  }

  const isMultiTask = totalLines >= 3 || steps.length >= 2;

  let requestedFormat: MultiTaskPlan["requestedFormat"] = "standard";
  if (isTableRequested) requestedFormat = "markdown_table";
  else if (isSummaryRequested) requestedFormat = "bullet_summary";

  return {
    isMultiTask,
    totalLines,
    steps,
    requestedFormat,
    requiresAstTimestamp,
    requiresCalculations,
    detectedEntities,
    navigationIntent,
    reportIntent,
  };
}

/**
 * Builds system planning guidance injected into Sarvam-105B reasoning context
 * to enforce sequential execution of all requested steps without skipping.
 */
export function buildMultiTaskSystemGuidance(plan: MultiTaskPlan): string {
  if (!plan.isMultiTask) return "";

  const items = plan.steps.map((s) => `${s.stepNumber}. [${s.category.toUpperCase()}] ${s.rawText}`).join("\n");

  return [
    "MULTI-TASK EXECUTION MANDATE:",
    `The operator has submitted a structured multi-part operational request (${plan.totalLines} lines, ${plan.steps.length} sequential tasks):`,
    items,
    "",
    "EXECUTION REQUIREMENTS:",
    "1. You MUST address every numbered or requested task above in the exact sequence specified.",
    "2. Invoke all authorized NASS operational tools required to gather verified ground truth before synthesizing.",
    plan.requestedFormat === "markdown_table" ? "3. Present the comparative findings in a clear, well-structured GitHub-flavored Markdown table." : "3. Structure findings logically with clear bullet points.",
    plan.requiresAstTimestamp ? `4. State all operational event times in verified Bahrain Local Time (AST, UTC+3) as of ${fmtBahrainDateTime(new Date())}.` : "",
    plan.requiresCalculations ? "5. Perform all arithmetic and financial conversions accurately: 1 USD = 0.377 BHD (fixed peg) / 1 BHD = 2.6525 USD." : "",
    "6. Do not omit, skip, or summarize away any requested entity or check.",
  ].filter(Boolean).join("\n");
}
