/**
 * Canonical NASS Control Tower Route & Module Registry (Server-Safe)
 * This file is purely deterministic and contains NO client-side directives ("use client"),
 * allowing both React Server Components / API Routes and Client Components to import it safely.
 */

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
  "governance",
  "architecture",
  "live",
];

export function parseViewFromPath(pathname: string): ViewId | null {
  if (!pathname) return null;
  const segment = (pathname || "").replace(/^\/+|\/+$/g, "").split("/")[0]?.toLowerCase();
  if (!segment || segment === "") return "ceo-tower";
  if (VALID_VIEWS.includes(segment as ViewId)) {
    return segment as ViewId;
  }
  return null;
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
    aliases: [
      "procurement", "pr", "rfq", "po", "contracts", "purchase order", "purchase orders",
      "po ledger", "pr rfq po contracts", "pr rfq contracts", "rfq po contracts", "rfq contracts"
    ],
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
    aliases: [
      "import tracking",
      "import-tracking",
      "shipment tracking",
      "shipments tracking",
      "cargo tracking",
      "container tracking",
      "shipment ranking",
      "shipments ranking",
      "shipment rank",
      "rank shipments",
      "shipment rankings",
      "ranking shipments",
      "shipment register",
      "import register",
    ],
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
    aliases: [
      "live", "live traceability", "livetraceability", "corridors", "map", "vessel tracking",
      "sea corridors", "trace", "ais", "live trace", "traccinilithy", "traceability"
    ],
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

  // Explicit negative check & direct mapping: "Shipment Tracking", "Shipment Ranking"
  if (
    clean.includes("shipment tracking") ||
    clean.includes("import tracking") ||
    clean.includes("shipment ranking") ||
    clean.includes("shipments ranking") ||
    clean.includes("shipment rank") ||
    clean.includes("cargo ranking") ||
    clean.includes("rank shipments")
  ) {
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

  // Fuzzy heuristic for typos in voice inputs (e.g. "traccinilithy" -> live, "livetrace" -> live)
  if (clean.includes("tracc") || clean.includes("trace") || clean.includes("vessel") || clean.includes("corridor")) {
    return { view: "live", label: ROUTE_REGISTRY["live"].label, path: ROUTE_REGISTRY["live"].path };
  }
  if (clean.includes("procure") || clean.includes("rfq") || clean.includes("po contract")) {
    return { view: "procurement", label: ROUTE_REGISTRY["procurement"].label, path: ROUTE_REGISTRY["procurement"].path };
  }
  if (clean.includes("inventor") || clean.includes("warehous") || clean.includes("stock")) {
    return { view: "inventory", label: ROUTE_REGISTRY["inventory"].label, path: ROUTE_REGISTRY["inventory"].path };
  }

  return null;
}
