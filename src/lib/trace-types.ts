/* Live Traceability — shared snapshot types (client + server + PDF).
 * Pure types only — no server imports so client components can `import type`. */

export type LiveStatus = "IN_TRANSIT" | "AT_PORT" | "CUSTOMS_HOLD" | "DELAYED" | "ARRIVED" | "BOOKED";

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
  importValue: number;
  currency: string;
  materials: TraceMaterial[];
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
  milestones: { code: string; label: string; location: string | null; eventTime: string; isEstimated: boolean }[];
}

export interface TraceTotals {
  ships: number;
  inTransit: number;
  atPort: number;
  customsHold: number;
  delayed: number;
  arrived: number;
  booked: number;
  importValue: number;
  currency: string;
}

export interface TraceSnapshot {
  serverTime: string;
  nextUpdateAt: string;
  snapshotHourLabel: string;
  ships: TraceShip[];
  totals: TraceTotals;
}
