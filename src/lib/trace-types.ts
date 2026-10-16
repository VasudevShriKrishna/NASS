/* Live Traceability — shared snapshot types (client + server + PDF).
 * Pure types only — no server imports so client components can `import type`. */

export type LiveStatus = "IN_TRANSIT" | "AT_PORT" | "CUSTOMS_HOLD" | "DELAYED" | "ARRIVED" | "BOOKED" | "UNKNOWN";

export interface TraceMaterial {
  sku: string;
  name: string;
  category: string | null;
  criticality: string;
  quantity: number;
  uom: string;
  unitPrice: number;
  extended: number;
  countryOfOrigin: string;
  workPackage: string | null;
}

export interface TraceException {
  ref: string;
  title: string;
  category: string;
  severity: string;
  state: string;
}

export interface TraceRisk {
  signalCode: string;
  severity: string;
  fact: string;
  interpretation: string | null;
}

export interface TraceEvidence {
  entityRef: string;
  sourceSystem: string;
  issuer: string;
  label: string;
}

export interface TraceMilestone {
  code: string;
  label: string;
  location: string | null;
  eventTime: string;
  receivedAt: string;
  source: string;
  isEstimated: boolean;
  freshness: string;
  correctedByEventId: string | null;
  note: string | null;
  quantity: number | null;
  uom: string | null;
}

export interface TraceQuantity {
  /** PO-allocated dispatched quantity per material (Phase 5/6) */
  dispatched: { material: string; uom: string; quantity: number }[];
  /** inventory lots currently IN_TRANSIT for this shipment */
  inTransit: { material: string; uom: string; quantity: number }[];
  /** goods receipts (landed + received) for this shipment */
  received: { material: string; uom: string; quantity: number; ref: string | null; status: string }[];
  /** human-readable outstanding summary (per material, receivedQty vs dispatched) */
  outstanding: { material: string; uom: string; quantity: number }[];
}

export interface TraceLeg {
  seq: number;
  mode: string;
  fromPoint: string | null;
  toPoint: string | null;
  status: string;
  carrier: string | null;
}

export interface TraceCompliance {
  customsStatus: string | null;
  customsHold: boolean;
  importFileRef: string | null;
  bol: { bolNo: string; status: string; version: number; matchStatus: string; active: boolean }[];
  reconciliation: { PASS: number; WARN: number; FAIL: number; NOT_CHECKED: number };
  overallReconciliation: "PASS" | "WARN" | "FAIL" | "NOT_CHECKED";
  exceptions: TraceException[];
  risks: TraceRisk[];
  evidence: TraceEvidence[];
}

export interface TraceShip {
  ref: string;
  status: string;
  liveStatus: LiveStatus;
  /** Phase 4: physical state is separate from warehouse progress */
  deliveryState: "NOT_DELIVERED" | "PARTIALLY_RECEIVED" | "RECEIVED" | "UNKNOWN";
  mode: string;
  carrier: string | null;
  forwarder: string | null;
  vesselName: string | null;
  vesselVoyage: string | null;
  originPort: string;
  destPort: string;
  originCountry: string;
  destCountry: string;
  from: { lat: number; lng: number; label: string } | null;
  to: { lat: number; lng: number; label: string } | null;
  departure: string | null;
  eta: string | null;
  etaType: string | null;
  etaSource: string | null;
  supplierPromisedEta: string | null;
  carrierEta: string | null;
  actualArrival: string | null;
  /** 0..1 at snapshot time — client advances it with the sim clock */
  progress: number;
  voyageHours: number;
  speedKn: number | null;
  freshness: string;
  lastEventAt: string | null;
  lastEventSource: string | null;
  /** declared import value in the PO currency */
  importValue: number;
  currency: string;
  /** normalized to USD with documented FX (Phase 9) */
  importValueUsd: number;
  materials: TraceMaterial[];
  quantities: TraceQuantity;
  legs: TraceLeg[];
  supplier: { code: string; name: string; country: string; city: string | null; status: string; incoterms: string | null } | null;
  po: {
    ref: string;
    status: string;
    currency: string;
    totalAmount: number;
    deliveryTerms: string | null;
    deliveryLocation: string | null;
    promisedDate: string | null;
    contracts: string[];
  } | null;
  project: { code: string; name: string; site: string } | null;
  destinationWarehouse: { code: string; name: string; site: string } | null;
  compliance: TraceCompliance;
  milestones: TraceMilestone[];
  /* Phase 1.3/2.2: destination validation + route provenance */
  destVerified: boolean;
  destNote: string | null;
  routeProvenance: "estimated-corridor" | "land-leg" | "none";
  routeVia: string[];
  routeDistanceNm: number | null;
}

export interface TraceTotals {
  ships: number;
  inTransit: number;
  atPort: number;
  customsHold: number;
  delayed: number;
  arrived: number;
  booked: number;
  unknown: number;
  stale: number;
  /** sum of shipment import values normalized to USD (documented FX) */
  importValueUsd: number;
  currency: "USD";
}

export interface TraceSnapshot {
  serverTime: string;
  nextUpdateAt: string;
  snapshotHourLabel: string;
  ships: TraceShip[];
  totals: TraceTotals;
  /** Phase 1.2/1.3: scenario-level destination binding */
  destination: { country: string; port: string; portVerified: boolean; warehouse: string };
  fx: { asOf: string; source: string };
}
