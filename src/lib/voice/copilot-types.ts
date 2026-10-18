/**
 * NASS Closed-Loop Control Tower — Voice AI Copilot Types & Contracts.
 *
 * Implements Layer B (Voice interaction & session management) and
 * Layer C (AI orchestration & provider adapters).
 */

export type CopilotState =
  // 14 Core Mandated States
  | "IDLE"
  | "REQUESTING_PERMISSION"
  | "LISTENING"
  | "TRANSCRIBING"
  | "INTERPRETING"
  | "FETCHING_DATA"
  | "EXECUTING_TOOL"
  | "NAVIGATING"
  | "GENERATING_REPORT"
  | "SPEAKING"
  | "INTERRUPTED"
  | "PAUSED"
  | "RECOVERING"
  | "ERROR"
  // Operational & UI Aliases
  | "PROCESSING"
  | "RETRIEVING"
  | "GENERATING"
  | "PERMISSION_DENIED"
  | "CONNECTION_FAILED"
  | "EMPTY_SPEECH"
  | "NO_VERIFIED_DATA"
  | "CANCELLED"
  | "UNAUTHORIZED"
  | "PROVIDER_UNAVAILABLE";

export type VoiceState = CopilotState;

export interface MediaAttachment {
  id: string;
  type: "video" | "image" | "document";
  name: string;
  size: number;
  url: string;
  mimeType: string;
  duration?: number;
}

export interface NavigationAction {
  view: string;
  recordRef?: string;
  targetRef?: string;
  label: string;
  reason?: string;
  description?: string;
  filter?: string;
  filterProject?: string;
  executed?: boolean;
  autoExecute?: boolean;
}

export interface ReportAction {
  reportType: "shipment" | "project" | "procurement" | "inventory" | "supplier" | "quality" | "ceo_executive";
  entityRef?: string;
  title: string;
  reportName?: string;
  downloadUrl: string;
  filename: string;
  fileName?: string;
  summary?: string;
}

export interface CopilotMessage {
  id: string;
  role: "user" | "assistant" | "system";
  text?: string;
  content?: string;
  spokenText?: string;
  audioUrl?: string | null;
  timestamp: string;
  state?: CopilotState;
  sources?: string[];
  dataQuality?: string;
  followUpSuggestions?: string[];
  structured?: {
    ref?: string;
    sections: { key: string; label: string; lines: string[] }[];
    shipmentRef?: string;
  };
  toolsUsed?: string[];
  pageContext?: string;
  degraded?: boolean;
  media?: MediaAttachment;
  navigation?: NavigationAction;
  report?: ReportAction;
}

export interface ConversationContext {
  selectedProject?: string;
  selectedShipment?: string;
  selectedPo?: string;
  selectedMaterial?: string;
  currentFilters?: Record<string, any>;
  reportingPeriod?: string;
  currentPage?: string;
  previousQueryResult?: any;
  pendingConfirmation?: {
    action: string;
    description: string;
    payload?: any;
  };
  currentReportJob?: {
    id: string;
    type: string;
    status: "pending" | "completed" | "failed";
  };
}

export interface PageContext {
  activeView: string;
  selectedRef?: string | null;
  focusedEntity?: {
    type: "shipment" | "project" | "po" | "material" | "exception" | "asset";
    id: string;
    ref?: string;
  };
  context?: ConversationContext;
}

export interface SttResult {
  transcript: string;
  confidence?: number;
  languageCode?: string;
  provider: "sarvam" | "browser" | "fallback";
  latencyMs?: number;
}

export interface TtsResult {
  audioBase64?: string | null;
  audioUrl?: string | null;
  mimeType?: string;
  provider: "sarvam" | "browser" | "fallback";
  latencyMs?: number;
}

export interface CopilotRequest {
  message: string;
  history?: { role: "user" | "assistant"; content: string }[];
  pageContext?: PageContext;
  audioRequested?: boolean;
  context?: ConversationContext;
}

export interface CopilotResponse {
  answer: string;
  answerText?: string;
  spokenText?: string;
  sources: string[];
  toolsUsed: string[];
  structured?: {
    ref?: string;
    sections: { key: string; label: string; lines: string[] }[];
    shipmentRef?: string;
  };
  dataQuality?: string;
  as_of?: string;
  degraded?: boolean;
  tts?: TtsResult;
  provider?: string;
  model?: string;
  providerNotice?: string;
  navigation?: NavigationAction;
  report?: ReportAction;
  followUpSuggestions?: string[];
}
