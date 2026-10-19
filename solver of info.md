# MASTER BUG FIX PROMPT: RESOLVING NASS COPILOT "NO INFORMATION RETURNED" ON ACTIVE PROJECTS & PORTFOLIO COMMITMENTS

## 1. Executive Summary & Problem Description

When an operator in the NASS Group CEO Control Tower asks the AI Copilot:
> *"Tell me one thing how many projects of Nas public portfolio projects and contractual commitments are ongoing and active"*

The Copilot drawer outputs:
```
NASS AI COPILOT
No information returned.

[tool: get_ceo_decision_brief] [src: executive:decision_brief] [src: db:ceo_metrics]
```

This occurs even though the CEO Control Tower screen directly behind the Copilot clearly displays:
- **Active Projects:** `7 Verified Active, 1 Historical Ref`
- **Confirmed Active Projects:** `PRJ-2201` (Bahrain Marina Phase 1), `PRJ-2204` (Industrial Zone Phase 2), `PRJ-2210` (Airport Expansion), `PRJ-BIA-01` (Airport Access Falcon Flyover), `PRJ-KAMC-03` (King Abdullah Medical City), etc.
- **Historical Archive:** `PRJ-ALBA-06` (Alba Potline 6 Expansion)
- **Portfolio Scope:** `BHD 173.5M Committed`

---

## 2. Root Cause Analysis

Tracing the request through `src/app/api/voice/copilot/route.ts`, `src/lib/voice/mistral.ts`, `src/lib/sarvam/orchestrator.ts`, and `src/lib/sarvam/nass-tools.ts` reveals four distinct points of failure:

1. **Tool Definition Gap in `NASS_APPLICATION_TOOLS` (`src/lib/sarvam/nass-tools.ts`):**
   - In `src/lib/operational-tools.ts`, `nassProjectPortfolio()` is fully implemented and returns authoritative data on all 6+ projects (active vs historical, clients, contract values, progress percentages).
   - In `src/lib/sarvam/nass-tools.ts`, `nassProjectPortfolio` is imported on line 18, but **was never registered** inside `NASS_APPLICATION_TOOLS`.
   - The only project tool exposed to the LLM was `get_project_details`, which requires a specific single project code (e.g. `PRJ-2201`). There was no tool to query portfolio-wide projects, active counts, or overall commitments.

2. **Misrouted Tool Call:**
   - Because the user's prompt contained the phrase *"contractual commitments"*, the LLM mapped the query to `get_ceo_decision_brief` (whose description states: *"Retrieve executive CEO briefings, critical capital commitments..."*).
   - `get_ceo_decision_brief` only returns pending executive decisions (`DEC-2026-01` to `DEC-2026-04`), not the project register or active project counts.

3. **Empty Text Completion from LLM (`src/lib/sarvam/orchestrator.ts`):**
   - After `get_ceo_decision_brief` returned decisions data that had nothing to do with the requested project counts, the LLM returned empty or whitespace text (`message.content === ""`).
   - `runSarvamOrchestrator` took `message.content?.trim() || ""` and returned `answerText: ""` without validating whether the LLM actually generated an answer.

4. **Hardcoded Fallback in Frontend Drawer (`src/components/app/voice-copilot.tsx` Line 885):**
   - In `voice-copilot.tsx`:
     ```typescript
     content: responseData.answerText || "No information returned.",
     ```
   - When `answerText` is empty, the UI blindly renders `"No information returned."`, leaving the user with an apparent system failure.
   - Crucially, `runSarvamOrchestrator` returning `{ answerText: "" }` prevented the secondary deterministic engine in `src/lib/voice/mistral.ts` (which has the complete project portfolio answers) from executing.

---

## 3. Scope of Required Work

You must act as a Principal Full-Stack Engineer and Voice AI Architect to permanently fix this issue across the following areas:

### A. Register `get_project_portfolio` in NASS Application Tools
**File:** `src/lib/sarvam/nass-tools.ts`
1. Add `get_project_portfolio` to `NASS_APPLICATION_TOOLS`:
   ```typescript
   {
     type: "function",
     function: {
       name: "get_project_portfolio",
       description: "Retrieve the complete NASS Group public project portfolio, active vs historical project counts, ongoing contractual commitments, client names, contract values (BHD and USD), and completion percentages.",
       parameters: {
         type: "object",
         properties: {
           statusFilter: {
             type: "string",
             enum: ["ALL", "ACTIVE", "HISTORICAL"],
             description: "Optional filter: ALL (default), ACTIVE (confirmed ongoing), or HISTORICAL (completed archives)",
           },
           projectCode: {
             type: "string",
             description: "Optional specific project code to inspect, e.g. PRJ-2201, PRJ-BIA-01, PRJ-ALBA-06",
           },
         },
       },
     },
   }
   ```
2. In `executeNassTool`:
   Handle `case "get_project_portfolio"`:
   - Call `nassProjectPortfolio(args)` from `../operational-tools`.
   - Return `{ data, sources: ["db:projects", "db:contracts", "nass:portfolio_register"] }`.

### B. Add Fail-Safe Validation in the Sarvam Orchestrator Loop
**File:** `src/lib/sarvam/orchestrator.ts`
1. After the tool execution loop finishes, check if `message.content` is empty or whitespace.
2. If `message.content` is empty or if the model failed to formulate a response following tool execution:
   - Do **NOT** return an empty string.
   - If `toolsUsed.includes("get_project_portfolio")` or if the user asked about projects, synthesize a grounded answer directly from the tool's returned data.
   - If no grounded answer can be formed, return `null` so that `runCopilotReasoning` in `src/lib/voice/mistral.ts` seamlessly falls back to the deterministic grounding engine.

### C. Enhance Fallback Pattern Matching & Router Intent
**File:** `src/lib/voice/mistral.ts`
1. Update the project regex in `runFallbackDeterministicReasoning` (around line 1431):
   - Ensure it matches queries such as:
     `how many projects`, `ongoing and active`, `public portfolio`, `contractual commitments`, `active projects`, `portfolio projects`.
   - Ensure the generated answer explicitly answers:
     - Exact active count: **7 Verified Active**
     - Exact historical count: **1 Historical Reference Archive**
     - Total portfolio value: **BHD 173.5M Committed (≈ USD 461.4M)**
     - Itemized list of active projects (`PRJ-2201`, `PRJ-BIA-01`, `PRJ-KAMC-03`, `PRJ-2204`, `PRJ-2210`, `PRJ-MAR-04`, `PRJ-RCSI-05`) with client and contract value.
     - Note on historical reference: `PRJ-ALBA-06` (Aluminium Bahrain Potline 6 Expansion).

### D. Improve Frontend Copilot Response Safety
**File:** `src/components/app/voice-copilot.tsx`
1. On line 885, replace the raw `responseData.answerText || "No information returned."` with a meaningful contextual fallback:
   - If `responseData.answerText` is missing but `toolsUsed` or `sources` exist, format a user-friendly summary of the retrieved records.
   - Never display a bare `"No information returned."` when the active page context has visible data.

---

## 4. Required Test Cases

Verify the fix with automated and manual test queries:

1. **Exact User Query:**
   *"Tell me one thing how many projects of Nas public portfolio projects and contractual commitments are ongoing and active"*
   - **Expected Output:** Clearly states that NASS Group has **7 verified active projects** and **1 historical reference project**, with total contractual commitments of **BHD 173.5M**. Lists the ongoing projects with clients and progress.
   - **Expected Tool/Source Pills:** `[tool: get_project_portfolio]` `[src: db:projects]` `[src: db:contracts]`.
   - **Must NOT output:** `"No information returned."`

2. **Synonym & Variation Queries:**
   - *"What are the ongoing active projects in the portfolio?"*
   - *"How many public projects is NASS currently executing?"*
   - *"List all confirmed active projects and their contract values."*
   - *"What is the status of PRJ-ALBA-06?"* (Answers that it is a historical completed archive with 0 active material demands).

3. **Tool Calling Integrity:**
   - Confirm that `get_project_portfolio` executes without throwing exceptions.
   - Confirm that tool calls are recorded in `toolsUsed` and `sources`.

---

## 5. Definition of Done

- `get_project_portfolio` is registered in `NASS_APPLICATION_TOOLS` and handled in `executeNassTool`.
- `orchestrator.ts` never returns an empty `answerText` when tool data was successfully fetched.
- Asking about active projects or commitments returns authoritative facts matching the CEO Control Tower dashboard.
- The voice audio (TTS) speaks the concise active project summary in Bahrain local time.
- All other third-party LLM APIs remain commented out; Sarvam AI remains the sole active AI provider.
