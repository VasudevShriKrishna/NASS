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
  const targetPath = `/${view}`;
  const query = ref ? `?ref=${encodeURIComponent(ref)}` : "";
  const newUrl = `${targetPath}${query}`;
  if (window.location.pathname + window.location.search !== newUrl) {
    try {
      window.history.pushState({ view, ref }, "", newUrl);
    } catch {}
  }
}

export interface RouteMetadata {
  id: ViewId;
  label: string;
  path: string;
  aliases: string[];
  group: string;
  description: string;
}

export const ROUTE_REGISTRY: Record<ViewId, RouteMetadata> = {
  "ceo-tower": {
    id: "ceo-tower",
    label: "CEO Decision Tower",
    path: "/ceo-tower",
    aliases: ["ceo tower", "ceo-tower", "executive", "board", "ceo decision tower", "command"],
    group: "Command",
    description: "Executive control tower, strategic decision pipeline, capital commitments",
  },
  "live": {
    id: "live",
    label: "Live Traceability",
    path: "/live",
    aliases: ["live", "live trace", "live traceability", "vessel map", "maritime trace", "sea trace", "ais map", "live map"],
    group: "Command",
    description: "Live maritime vessel tracking, AIS positions, and voyage map",
  },
  "control-tower": {
    id: "control-tower",
    label: "Control Tower",
    path: "/control-tower",
    aliases: ["control tower", "control-tower", "dashboard", "operations overview"],
    group: "Command",
    description: "Operational overview and supply chain metrics",
  },
  "procurement": {
    id: "procurement",
    label: "PR · RFQ · PO · Contracts",
    path: "/procurement",
    aliases: ["procurement", "pr", "rfq", "po", "contracts", "purchase order", "purchase orders", "po ledger", "pr rfq po contracts"],
    group: "Procure (M04–M07)",
    description: "Procurement lifecycle, purchase requests, RFQs, purchase orders and contracts",
  },
  "suppliers": {
    id: "suppliers",
    label: "Suppliers & Scorecards",
    path: "/suppliers",
    aliases: ["suppliers", "supplier", "scorecards", "vendor", "vendors", "supplier directory", "supplier intelligence"],
    group: "Procure (M04–M07)",
    description: "Supplier registry, performance scorecards, and tier-1 vendor profiles",
  },
  "import-tracking": {
    id: "import-tracking",
    label: "Shipment Tracking",
    path: "/import-tracking",
    aliases: ["import tracking", "import-tracking", "shipment tracking", "shipments tracking", "cargo tracking", "container tracking"],
    group: "Import (M08–M11)",
    description: "Shipment tracking register, customs clearance, port arrival milestones",
  },
  "bol-intelligence": {
    id: "bol-intelligence",
    label: "BOL Intelligence",
    path: "/bol-intelligence",
    aliases: ["bol", "bol intelligence", "bill of lading", "bills of lading", "bol-intelligence"],
    group: "Import (M08–M11)",
    description: "Bill of lading digitization, container manifests, and line-item cargo audit",
  },
  "inventory": {
    id: "inventory",
    label: "Inventory",
    path: "/inventory",
    aliases: ["inventory", "stock", "warehouse", "stock balance", "materials stock", "yard inventory", "hidd yard"],
    group: "Warehouse & Assets (M12–M15)",
    description: "Physical on-hand inventory, buffer stocks, quarantined lots, and warehouse yards",
  },
  "receiving": {
    id: "receiving",
    label: "Receiving & QC",
    path: "/receiving",
    aliases: ["receiving", "qc", "receiving & qc", "quality", "grn", "goods receipt", "goods receipts", "weighbridge", "inspection", "inspections"],
    group: "Warehouse & Assets (M12–M15)",
    description: "Goods receipt notes (GRN), weighbridge audit, and physical QC inspections",
  },
  "projects": {
    id: "projects",
    label: "Project Materials",
    path: "/projects",
    aliases: ["projects", "project", "project materials", "civil projects", "sites", "bahrain marina", "falcon flyover"],
    group: "Warehouse & Assets (M12–M15)",
    description: "Civil projects portfolio, material allocations, and site delivery schedules",
  },
  "assets": {
    id: "assets",
    label: "Assets & Telemetry",
    path: "/assets",
    aliases: ["assets", "asset", "telemetry", "equipment", "machinery", "assets & telemetry"],
    group: "Warehouse & Assets (M12–M15)",
    description: "Heavy equipment registry, sensor telemetry, and maintenance logs",
  },
  "exceptions": {
    id: "exceptions",
    label: "Exceptions (Closed Loop)",
    path: "/exceptions",
    aliases: ["exceptions", "exception", "closed loop", "alerts", "bottlenecks", "exceptions (closed loop)", "discrepancies"],
    group: "Operate (M16–M19)",
    description: "Closed-loop operational exceptions, weight variances, and ETA slips",
  },
  "actions": {
    id: "actions",
    label: "Decision Management",
    path: "/actions",
    aliases: ["actions", "decision management", "decisions", "decision", "action items", "management decisions"],
    group: "Operate (M16–M19)",
    description: "Executive decision management and closed-loop resolution pipeline",
  },
  "governance": {
    id: "governance",
    label: "Audit · Evidence · Health",
    path: "/governance",
    aliases: ["governance", "audit", "evidence", "health", "connector health", "connectors", "integrations", "system health"],
    group: "Govern (M22–M23)",
    description: "Audit trail, cryptographic proof, connector freshness, and integration monitors",
  },
  "architecture": {
    id: "architecture",
    label: "Architecture & Spec",
    path: "/architecture",
    aliases: ["architecture", "spec", "system architecture", "documentation", "specifications"],
    group: "Reference",
    description: "System architecture, specifications, and data flow references",
  },
  "live": {
    id: "live",
    label: "Live Traceability & Corridors",
    path: "/live",
    aliases: ["live", "live traceability", "corridors", "map", "vessel tracking", "sea corridors", "trace", "ais"],
    group: "Operations",
    description: "Live vessel tracking, global sea corridors, and GIS map telemetry",
  },
};

/**
 * Resolves a natural-language query or path into a canonical ViewId
 */
export function resolveViewFromInput(input: string): { view: ViewId; label: string; path: string } | null {
  if (!input) return null;
  const clean = input.trim().toLowerCase().replace(/[·•\-_/]/g, " ").replace(/\s+/g, " ");

  // Handle explicit URL patterns like https://mycorps.vercel.app/import-tracking or /import-tracking
  const urlMatch = input.match(/(?:https?:\/\/[^/]+)?\/([a-z0-9_-]+)/i);
  if (urlMatch && urlMatch[1]) {
    const segment = urlMatch[1].toLowerCase() as ViewId;
    if (VALID_VIEWS.includes(segment)) {
      const meta = ROUTE_REGISTRY[segment];
      return { view: segment, label: meta.label, path: meta.path };
    }
  }

  // Exact ID match
  if (VALID_VIEWS.includes(input.trim().toLowerCase() as ViewId)) {
    const v = input.trim().toLowerCase() as ViewId;
    const meta = ROUTE_REGISTRY[v];
    return { view: v, label: meta.label, path: meta.path };
  }

  // Explicit negative check: "Shipment Tracking. Not Shipment."
  if (clean.includes("shipment tracking") || clean.includes("import tracking")) {
    return { view: "import-tracking", label: ROUTE_REGISTRY["import-tracking"].label, path: ROUTE_REGISTRY["import-tracking"].path };
  }

  // Check aliases across all registered routes
  for (const v of VALID_VIEWS) {
    const meta = ROUTE_REGISTRY[v];
    for (const alias of meta.aliases) {
      const cleanAlias = alias.replace(/[·•\-_/]/g, " ").replace(/\s+/g, " ");
      if (clean === cleanAlias || clean.includes(cleanAlias)) {
        return { view: v, label: meta.label, path: meta.path };
      }
    }
  }

  return null;
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

