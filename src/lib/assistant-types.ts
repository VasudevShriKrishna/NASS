/* NASS Operations Assistant — response contract (Phase 6.2).
 * Shared client+server types only (no server imports) so the chat view can
 * render structured answer cards without importing server-only modules. */

export interface AssistantSection {
  /** stable key, e.g. "location" | "quantity" | "eta" */
  key: string;
  /** display label, e.g. "Location", "Data quality" */
  label: string;
  lines: string[];
}

export interface AssistantStructured {
  /** primary shipment ref when the answer is shipment-centric (clickable in UI) */
  ref?: string;
  /** spec 6.2 sections — ONLY sections supported by retrieved facts */
  sections: AssistantSection[];
  /** alias kept for UI chip rendering */
  shipmentRef?: string;
  /** chronological event list for history/as-of questions (Bahrain-formatted) */
  asOfEvents?: { label: string; eventTime: string }[];
}

export interface AssistantResponse {
  answer: string;
  as_of: string;
  sources: string[];
  degraded?: boolean;
  structured?: AssistantStructured;
  dataQuality?: string;
}
