/**
 * ============================================================================
 * [HIDDEN & COMMENTED OUT] NASS Operations Assistant — Response Contract (Phase 6.2)
 * ============================================================================
 * The Operations Assistant chatbot has been removed from UI navigation and its code
 * has been commented out. All original types are preserved below for reference.
 */

// export interface AssistantSection {
//   /** stable key, e.g. "location" | "quantity" | "eta" */
//   key: string;
//   /** display label, e.g. "Location", "Data quality" */
//   label: string;
//   lines: string[];
// }

// export interface AssistantStructured {
//   /** primary shipment ref when the answer is shipment-centric (clickable in UI) */
//   ref?: string;
//   /** spec 6.2 sections — ONLY sections supported by retrieved facts */
//   sections: AssistantSection[];
//   /** alias kept for UI chip rendering */
//   shipmentRef?: string;
//   /** chronological event list for history/as-of questions (Bahrain-formatted) */
//   asOfEvents?: { label: string; eventTime: string }[];
// }

// export interface AssistantNavigationAction {
//   view:
//     | "live"
//     | "control-tower"
//     | "procurement"
//     | "suppliers"
//     | "import-tracking"
//     | "bol-intelligence"
//     | "inventory"
//     | "receiving"
//     | "projects"
//     | "assets"
//     | "exceptions"
//     | "actions"
//     | "assistant"
//     | "governance"
//     | "architecture";
//   label: string;
//   targetRef?: string;
//   tab?: string;
//   filter?: string;
//   description: string;
//   autoExecute?: boolean;
// }

// export interface AssistantReportAction {
//   type: "shipment" | "project" | "ceo-summary" | "procurement" | "inventory" | "suppliers" | "qc" | "delayed";
//   targetRef?: string;
//   title: string;
//   downloadUrl: string;
//   format: "pdf" | "csv";
// }

// export interface AssistantResponse {
//   answer: string;
//   as_of: string;
//   sources: string[];
//   degraded?: boolean;
//   structured?: AssistantStructured;
//   dataQuality?: string;
//   provider?: string;
//   model?: string;
//   navigation?: AssistantNavigationAction;
//   report?: AssistantReportAction;
// }
