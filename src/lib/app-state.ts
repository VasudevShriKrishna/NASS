"use client";

import { create } from "zustand";

export type ViewId =
  | "live"
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
  /** cross-view drill-down payload (e.g. jump from control tower KPI to exceptions view) */
  drill: { view: ViewId; ref?: string } | null;
  drillTo: (view: ViewId, ref?: string) => void;
  clearDrill: () => void;
  /** ship ref preselected for the Live Traceability command view (deep links, cross-view entries) */
  traceShip: string | null;
  openTrace: (ship?: string | null) => void;
  clearTraceShip: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  view: "control-tower",
  setView: (v) => set({ view: v }),
  drill: null,
  drillTo: (view, ref) => set({ view, drill: { view, ref } }),
  clearDrill: () => set({ drill: null }),
  traceShip: null,
  openTrace: (ship) => set({ view: "live", traceShip: ship ?? null }),
  clearTraceShip: () => set({ traceShip: null }),
}));
