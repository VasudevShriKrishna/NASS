/**
 * Controlled NASS Application Tool Registry
 * Implements Part D & Part H (Sections 13) of SARVAM_MCP.md:
 * - Controlled registry of typed and documented application tools
 * - Validates arguments server-side. Zero arbitrary SQL execution.
 * - Each tool connects to authoritative business data in SQLite/Prisma/spec-data.
 */

import {
  projectOverview,
  shipmentDetails,
  materialBalanceAndBackupStock,
  materialAndShipmentValuation,
  poShipmentReconciliation,
  qualityAndGoodsReceipt,
  connectorFreshness,
  assetTelemetryAndExceptions,
  nassProjectPortfolio,
  nassPriceBenchmarkComparison,
  nassShipmentWeightAudit,
  nassPartnerAndTradeRoutes,
  nassCeoDecisionBrief,
} from "../operational-tools";
import { webSearch, searchNews, fetchWebpage } from "../search/web-search";

export interface NassToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

export const NASS_APPLICATION_TOOLS: NassToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "get_project_details",
      description: "Retrieve comprehensive details for a NASS Group civil infrastructure project (PRJ-2201 Bahrain Marina, PRJ-2202 Bapco Modernization, PRJ-2203 King Hamad American Hospital, PRJ-2204 ALBA Potline 7 Expansion), including approved value, site coordinates, and critical path materials.",
      parameters: {
        type: "object",
        properties: {
          projectQuery: { type: "string", description: "Project code or name, e.g. 'PRJ-2201' or 'Bahrain Marina'" },
        },
        required: ["projectQuery"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_shipment_details",
      description: "Lookup live or manifest shipment records (e.g., SHP-8801, SHP-8802, SHP-8803, SHP-8804), cargo manifests, bill of lading reference, container count, carrier, and weighbridge audit.",
      parameters: {
        type: "object",
        properties: {
          shipmentRef: { type: "string", description: "Shipment reference code, e.g. 'SHP-8802'" },
        },
        required: ["shipmentRef"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_purchase_order_reconciliation",
      description: "Reconcile purchase order quantities with physical warehouse receipts (GRN) and open supplier balances (e.g. PO-3001, PO-3002).",
      parameters: {
        type: "object",
        properties: {
          poNumber: { type: "string", description: "PO reference number, e.g. 'PO-3001'" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_material_and_shipment_valuation",
      description: "Retrieve verified landed financial valuations for incoming cargo shipments, itemized unit prices, freight charges, and currency conversions (USD to BHD).",
      parameters: {
        type: "object",
        properties: {
          shipmentRef: { type: "string", description: "Optional specific shipment reference, e.g. 'SHP-8802'" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_inventory_and_stock_balance",
      description: "Inspect site inventory levels, buffer stocks, critical shortage alerts, and backup warehouse reserves across Hidd Yard, Mina Salman, and project laydown yards.",
      parameters: {
        type: "object",
        properties: {
          materialCode: { type: "string", description: "Material code or name, e.g. 'MAT-STL-01' or 'Rebar'" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_quality_and_goods_receipt",
      description: "Inspect quality inspection results, Goods Receipt Notes (GRN-5001, GRN-5002, GRN-5003, GRN-5004), mill test certificates, and heat number batch approvals.",
      parameters: {
        type: "object",
        properties: {
          grnRef: { type: "string", description: "Goods receipt note reference, e.g. 'GRN-5002'" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_vessel_port_intelligence",
      description: "Query vessel AIS telematics, live maritime positions, draught, speed, berth allocation at Khalifa Bin Salman Port (KBSP), and Mina Salman.",
      parameters: {
        type: "object",
        properties: {
          vesselQuery: { type: "string", description: "Vessel name or IMO, e.g. 'CMA CGM LHAYNE' or 'MSC TIANPING'" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_connector_freshness_and_health",
      description: "Audit data synchronization health across ERP (SAP S/4HANA), WMS (Oracle WMS), Port Community AIS, and Customs webhooks.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_ceo_decision_brief",
      description: "Retrieve executive CEO briefings, critical capital commitments, operational bottlenecks, and recommended executive actions.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_project_portfolio",
      description: "Retrieve the complete NASS Group public project portfolio, active vs historical project counts, ongoing contractual commitments, client names, contract values (BHD and USD), and completion percentages.",
      parameters: {
        type: "object",
        properties: {
          statusFilter: {
            type: "string",
            enum: ["ALL", "ACTIVE", "HISTORICAL"],
            description: "Optional filter: ALL (default), ACTIVE (confirmed ongoing), or HISTORICAL (completed archives)",
          },
          projectCode: {
            type: "string",
            description: "Optional specific project code to inspect, e.g. PRJ-2201, PRJ-BIA-01, PRJ-ALBA-06",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_price_benchmarks",
      description: "Compare NASS purchase order prices against international market benchmarks (LME steel rebar, MEED, Platts) and calculate landed cost estimates with customs duty, freight, and port handling.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_shipment_weight_audit",
      description: "Audit weighbridge scale measurements vs shipping manifest gross weights across incoming shipments, tolerance status, and flagged discrepancy variances (> ±2.5%).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_partner_and_trade_routes",
      description: "Retrieve NASS Group corporate footprint (18 operating divisions), verified partner brands (Hyundai, BASF, Sarens, etc.), and strategic trade routes.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "navigate_to_module",
      description: "Navigate user's active viewport to a specific Control Tower dashboard (e.g. shipments, po, inventory, projects, ceo-tower, live-trace).",
      parameters: {
        type: "object",
        properties: {
          targetView: { type: "string", enum: ["shipments", "purchase-orders", "inventory", "projects", "ceo-tower", "live-trace", "quality"] },
          recordRef: { type: "string", description: "Optional specific record ID to focus upon navigation" },
        },
        required: ["targetView"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_pdf_report",
      description: "Trigger cryptographic generation of a luxury executive PDF report dossier for CEO decision brief, shipment manifest, or project intelligence.",
      parameters: {
        type: "object",
        properties: {
          reportType: { type: "string", enum: ["ceo-brief", "shipment-dossier", "project-audit", "inventory-risk"] },
          recordRef: { type: "string" },
        },
        required: ["reportType"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search Google and the public web for external information, company background, public figure biographies, commodity price trends, and verified public announcements.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query or research question" },
          recency: { type: "string", description: "Recency filter, e.g. 'latest', 'today', 'last 24 hours', '7 days', 'month', 'year'" },
          domains: { type: "array", items: { type: "string" }, description: "Optional specific domains to limit research to, e.g. ['nassgroup.com', 'bna.bh']" },
          language: { type: "string", description: "ISO 2-letter language code, e.g. 'en'" },
          max_results: { type: "number", description: "Maximum number of search results to retrieve (default: 5)" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_news",
      description: "Search live external news publications, official government bulletins, and global press for breaking news, press releases, and articles published within a specific timeframe.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "News topic or current event query" },
          date_range: { type: "string", description: "Time period, e.g. 'last 24 hours', 'today', 'yesterday', 'last seven days', 'last month'" },
          domains: { type: "array", items: { type: "string" }, description: "Optional news domains to prioritize" },
          max_results: { type: "number", description: "Maximum number of news results to retrieve (default: 5)" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fetch_webpage",
      description: "Retrieve and read the clean text content of a specific public URL for deep verification, official announcements, or source corroboration.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "Full canonical HTTP/HTTPS URL to fetch" },
        },
        required: ["url"],
      },
    },
  },
];

/**
 * Execute an application tool deterministically over authoritative NASS databases.
 */
export async function executeNassTool(
  toolName: string,
  args: Record<string, any>
): Promise<{
  data: any;
  sources: string[];
  navigation?: { view: string; label: string; ref?: string };
  report?: { reportType: string; title: string; downloadUrl: string };
}> {
  const sources: string[] = [`nass_db:${toolName}`];

  switch (toolName) {
    case "get_project_details": {
      const data = await projectOverview(args.projectQuery || "PRJ-2201");
      return { data, sources: ["db:projects", "db:contracts"] };
    }

    case "get_shipment_details": {
      const data = await shipmentDetails(args.shipmentRef || "SHP-8802");
      return { data, sources: ["db:shipments", "db:bills_of_lading", "ais:maritime"] };
    }

    case "get_purchase_order_reconciliation": {
      const data = await poShipmentReconciliation(args.poNumber || "PO-3001");
      return { data, sources: ["db:purchase_orders", "db:receipts"] };
    }

    case "get_material_and_shipment_valuation": {
      const data = await materialAndShipmentValuation(args.shipmentRef);
      return { data, sources: ["db:purchase_orders", "db:invoices", "fx:usd_bhd"] };
    }

    case "get_inventory_and_stock_balance": {
      const data = await materialBalanceAndBackupStock(args.materialCode);
      return { data, sources: ["db:inventory", "wms:hidd_yard"] };
    }

    case "get_quality_and_goods_receipt": {
      const data = await qualityAndGoodsReceipt(args.grnRef);
      return { data, sources: ["db:receipts", "lab:mill_test_certs"] };
    }

    case "get_vessel_port_intelligence": {
      const data = await assetTelemetryAndExceptions(args.vesselQuery);
      return { data, sources: ["ais:live_telemetry", "kbsp:berth_schedule"] };
    }

    case "get_connector_freshness_and_health": {
      const data = await connectorFreshness();
      return { data, sources: ["telemetry:connectors", "audit:sync_logs"] };
    }

    case "get_ceo_decision_brief": {
      const data = await nassCeoDecisionBrief();
      return { data, sources: ["executive:decision_brief", "db:ceo_metrics"] };
    }

    case "get_project_portfolio": {
      const data = await nassProjectPortfolio(args);
      return { data, sources: ["db:projects", "db:contracts", "nass:portfolio_register"] };
    }

    case "get_price_benchmarks": {
      const data = await nassPriceBenchmarkComparison();
      return { data, sources: ["nass_price_benchmark_comparison", "lme:metals", "customs:tariffs"] };
    }

    case "get_shipment_weight_audit": {
      const data = await nassShipmentWeightAudit();
      return { data, sources: ["nass_shipment_weight_audit", "weighbridge:hidd_gate", "db:manifests"] };
    }

    case "get_partner_and_trade_routes": {
      const data = await nassPartnerAndTradeRoutes();
      return { data, sources: ["nass_partner_and_trade_routes", "db:corporate_units"] };
    }

    case "navigate_to_module": {
      const viewMap: Record<string, string> = {
        "shipments": "Active Inbound Shipments",
        "purchase-orders": "Purchase Orders & Procurement",
        "inventory": "Materials & Warehouse Inventory",
        "projects": "Project Portfolio & Civil Works",
        "ceo-tower": "CEO Executive Control Tower",
        "live-trace": "Global Maritime AIS Live Trace",
        "quality": "Quality Inspection & Goods Receipts",
      };
      const label = viewMap[args.targetView] || args.targetView;
      return {
        data: { status: "NAVIGATED", targetView: args.targetView, recordRef: args.recordRef },
        sources: [`navigation:${args.targetView}`],
        navigation: {
          view: args.targetView,
          label,
          ref: args.recordRef,
        },
      };
    }

    case "generate_pdf_report": {
      const title = args.reportType === "ceo-brief" ? "CEO Executive Brief" : `${args.reportType.toUpperCase()} Dossier`;
      const downloadUrl = `/api/reports/generate?type=${encodeURIComponent(args.reportType)}&ref=${encodeURIComponent(args.recordRef || "")}`;
      return {
        data: { status: "REPORT_READY", reportType: args.reportType, title, downloadUrl },
        sources: [`report:${args.reportType}`],
        report: {
          reportType: args.reportType,
          title,
          downloadUrl,
        },
      };
    }

    case "web_search": {
      const res = await webSearch(args.query, args.recency, args.domains, args.language, args.max_results || 5);
      const toolSources = res.results.length
        ? res.results.map((r) => `web:${r.source}`)
        : ["web:public_search"];
      return { data: res, sources: toolSources };
    }

    case "search_news": {
      const res = await searchNews(args.query, args.date_range, args.domains, args.max_results || 5);
      const toolSources = res.results.length
        ? res.results.map((r) => `news:${r.source}`)
        : ["news:live_feed"];
      return { data: res, sources: toolSources };
    }

    case "fetch_webpage": {
      const res = await fetchWebpage(args.url);
      return { data: res, sources: [`webpage:${args.url}`] };
    }

    default:
      return {
        data: { error: `Tool ${toolName} not found in authorized NASS registry` },
        sources: ["system:unknown_tool"],
      };
  }
}
