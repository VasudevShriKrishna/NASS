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
  | "assistant"
  | "governance"
  | "architecture";

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
  view: "control-tower",
  viewHistory: ["control-tower"],
  setView: (v) =>
    set((state) => ({
      view: v,
      viewHistory: state.view === v ? state.viewHistory : [...state.viewHistory.slice(-10), v],
    })),
  goBack: () => {
    const { viewHistory } = get();
    if (viewHistory.length > 1) {
      const newHistory = [...viewHistory];
      newHistory.pop(); // pop current
      const prev = newHistory[newHistory.length - 1];
      set({ view: prev, viewHistory: newHistory, drill: null });
      return true;
    }
    // Default back to control tower if no history
    set({ view: "control-tower", drill: null });
    return false;
  },
  drill: null,
  drillTo: (view, ref) =>
    set((state) => ({
      view,
      drill: { view, ref },
      viewHistory: state.view === view ? state.viewHistory : [...state.viewHistory.slice(-10), view],
    })),
  clearDrill: () => set({ drill: null }),
  traceShip: null,
  openTrace: (ship) =>
    set((state) => ({
      view: "live",
      traceShip: ship ?? null,
      viewHistory: state.view === "live" ? state.viewHistory : [...state.viewHistory.slice(-10), "live"],
    })),
  clearTraceShip: () => set({ traceShip: null }),
  isVoiceCopilotOpen: false,
  setVoiceCopilotOpen: (open) => set({ isVoiceCopilotOpen: open }),
  toggleVoiceCopilot: () => set((state) => ({ isVoiceCopilotOpen: !state.isVoiceCopilotOpen })),
}));
