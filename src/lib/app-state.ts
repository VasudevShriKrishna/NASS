"use client";

import { create } from "zustand";
export * from "./route-registry";
import type { ViewId } from "./route-registry";

export function syncUrlPath(view: ViewId, ref?: string | null) {
  if (typeof window === "undefined") return;
  const targetPath = `/${view}`;
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
  /** Sidebar state accessible from Voice Copilot actions */
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  sidebarScrollTarget: "top" | "bottom" | "down" | "up" | null;
  scrollSidebar: (dir: "top" | "bottom" | "down" | "up") => void;
  clearSidebarScroll: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  view: "customer-tracking",
  viewHistory: ["customer-tracking"],
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
  isSidebarOpen: true,
  setSidebarOpen: (open) => {
    try {
      localStorage.setItem("nass_sidebar_open", String(open));
    } catch {}
    set({ isSidebarOpen: open });
  },
  toggleSidebar: () => {
    const next = !get().isSidebarOpen;
    try {
      localStorage.setItem("nass_sidebar_open", String(next));
    } catch {}
    set({ isSidebarOpen: next });
  },
  sidebarScrollTarget: null,
  scrollSidebar: (dir) => set({ sidebarScrollTarget: dir }),
  clearSidebarScroll: () => set({ sidebarScrollTarget: null }),
}));
