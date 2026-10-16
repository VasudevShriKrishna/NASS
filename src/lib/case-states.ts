/**
 * Closed-loop exception state machine constants (M17) — PURE data module.
 *
 * Deliberately free of server-only imports (no db): safe to import from client
 * components (e.g. the Decision Management lifecycle strip) as well as route
 * handlers. src/lib/case-machine.ts re-exports these and adds the db-backed
 * transition executor.
 *
 * PHASE 7 lifecycle mapping:
 *   DETECTED = Detect · TRIAGED = Verify · ASSIGNED = Assign · INVESTIGATING = Assess
 *   ACTION_PROPOSED = Recommend · AWAITING_APPROVAL = Approve · ACTION_SUBMITTED = Execute
 *   OUTCOME_PENDING_VERIFICATION = Verify outcome · RESOLVED = Close (evidence required)
 */
export const CASE_STATES = [
  "DETECTED",
  "TRIAGED",
  "ASSIGNED",
  "INVESTIGATING",
  "ACTION_PROPOSED",
  "AWAITING_APPROVAL",
  "ACTION_SUBMITTED",
  "OUTCOME_PENDING_VERIFICATION",
  "RESOLVED",
  "CANCELLED",
] as const;

export type CaseState = (typeof CASE_STATES)[number];

export const TRANSITIONS: Record<CaseState, CaseState[]> = {
  DETECTED: ["TRIAGED", "CANCELLED"],
  TRIAGED: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["INVESTIGATING", "CANCELLED"],
  INVESTIGATING: ["ACTION_PROPOSED", "CANCELLED"],
  ACTION_PROPOSED: ["AWAITING_APPROVAL", "CANCELLED"],
  AWAITING_APPROVAL: ["ACTION_SUBMITTED", "CANCELLED"],
  ACTION_SUBMITTED: ["OUTCOME_PENDING_VERIFICATION", "CANCELLED"],
  OUTCOME_PENDING_VERIFICATION: ["RESOLVED", "CANCELLED"],
  RESOLVED: [], // reopen handled separately
  CANCELLED: [],
};

export function canTransition(from: CaseState, to: CaseState): boolean {
  if (from === "RESOLVED" && to === "INVESTIGATING") return true; // reopen on regression
  return (TRANSITIONS[from] ?? []).includes(to);
}

/** States that still represent open work (anything not RESOLVED/CANCELLED). */
export const OPEN_CASE_STATES: CaseState[] = CASE_STATES.filter(
  (s) => s !== "RESOLVED" && s !== "CANCELLED"
);

/** Human lifecycle verb for each state (PHASE 7 decision lifecycle). */
export const LIFECYCLE_STEP: Record<CaseState, string> = {
  DETECTED: "Detect",
  TRIAGED: "Verify",
  ASSIGNED: "Assign",
  INVESTIGATING: "Assess",
  ACTION_PROPOSED: "Recommend",
  AWAITING_APPROVAL: "Approve",
  ACTION_SUBMITTED: "Execute",
  OUTCOME_PENDING_VERIFICATION: "Verify outcome",
  RESOLVED: "Close",
  CANCELLED: "Cancel",
};
