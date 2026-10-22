"use client";

import { create } from "zustand";

export type ViewId =
  | "live"
  | "ceo-tower"
  | "control-tower"
  | "procurement"
  | "suppliers"
  | "import-tracking"
  | "bol-intelligence"
  | "inventory"
  | "receiving"
  | "projects"
  | "assets"
  | "exceptions"
  | "actions"
  // | "assistant"
  | "governance"
  | "architecture";

export const VALID_VIEWS: ViewId[] = [
  "control-tower",
  "ceo-tower",
  "projects",
  "procurement",
  "suppliers",
  "import-tracking",
  "bol-intelligence",
  "inventory",
  "receiving",
  "assets",
  "exceptions",
  "actions",
  // "assistant",
  "governance",
  "architecture",
  "live",
];

export function parseViewFromPath(pathname: string): ViewId | null {
  if (typeof window === "undefined" && !pathname) return null;
  const segment = (pathname || "").replace(/^\/+|\/+$/g, "").split("/")[0]?.toLowerCase();
  if (!segment || segment === "") return "ceo-tower";
  if (VALID_VIEWS.includes(segment as ViewId)) {
    return segment as ViewId;
  }
  return null;
}

export function syncUrlPath(view: ViewId, ref?: string | null) {
  if (typeof window === "undefined") return;
  const targetPath = view === "ceo-tower" ? "/" : `/${view}`;
  const query = ref ? `?ref=${encodeURIComponent(ref)}` : "";
  const newUrl = `${targetPath}${query}`;
  if (window.location.pathname + window.location.search !== newUrl) {
    try {
      window.history.pushState({ view, ref }, "", newUrl);
    } catch {}
  }
}

interface AppState {
  view: ViewId;
  setView: (v: ViewId) => void;
  viewHistory: ViewId[];
  goBack: () => boolean;
  /** cross-view drill-down payload (e.g. jump from control tower KPI to exceptions view) */
  drill: { view: ViewId; ref?: string } | null;
  drillTo: (view: ViewId, ref?: string) => void;
  clearDrill: () => void;
  /** ship ref preselected for the Live Traceability command view (deep links, cross-view entries) */
  traceShip: string | null;
  openTrace: (ship?: string | null) => void;
  clearTraceShip: () => void;
  /** Global voice copilot open/closed state (accessible from header Grokbot button & floating pill) */
  isVoiceCopilotOpen: boolean;
  setVoiceCopilotOpen: (open: boolean) => void;
  toggleVoiceCopilot: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  view: "ceo-tower",
  viewHistory: ["ceo-tower"],
  setView: (v) => {
    syncUrlPath(v);
    set((state) => ({
      view: v,
      viewHistory: state.view === v ? state.viewHistory : [...state.viewHistory.slice(-10), v],
    }));
  },
  goBack: () => {
    const { viewHistory } = get();
    if (viewHistory.length > 1) {
      const newHistory = [...viewHistory];
      newHistory.pop(); // pop current
      const prev = newHistory[newHistory.length - 1];
      syncUrlPath(prev);
      set({ view: prev, viewHistory: newHistory, drill: null });
      return true;
    }
    // Default back to CEO tower if no history
    syncUrlPath("ceo-tower");
    set({ view: "ceo-tower", drill: null });
    return false;
  },
  drill: null,
  drillTo: (view, ref) => {
    syncUrlPath(view, ref);
    set((state) => ({
      view,
      drill: { view, ref },
      viewHistory: state.view === view ? state.viewHistory : [...state.viewHistory.slice(-10), view],
    }));
  },
  clearDrill: () => set({ drill: null }),
  traceShip: null,
  openTrace: (ship) => {
    syncUrlPath("live", ship ? `ship=${encodeURIComponent(ship)}` : undefined);
    set((state) => ({
      view: "live",
      traceShip: ship ?? null,
      viewHistory: state.view === "live" ? state.viewHistory : [...state.viewHistory.slice(-10), "live"],
    }));
  },
  clearTraceShip: () => set({ traceShip: null }),
  isVoiceCopilotOpen: false,
  setVoiceCopilotOpen: (open) => set({ isVoiceCopilotOpen: open }),
  toggleVoiceCopilot: () => set((state) => ({ isVoiceCopilotOpen: !state.isVoiceCopilotOpen })),
}));
