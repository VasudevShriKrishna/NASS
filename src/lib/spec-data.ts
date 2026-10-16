/**
 * spec-data.ts — Faithful structured extraction of upload/K.md
 * (nass-closed-loop-supply-chain-intelligence v1.0.0)
 * Every line maps 1:1 to the source skill file. Consumed by the Architecture & Spec view.
 */

export const SPEC_META = {
  name: "nass-closed-loop-supply-chain-intelligence",
  version: "1.0.0",
  description:
    "Design evidence-led, implementation-ready architecture for NASS-style multi-supplier procurement, import shipment visibility, bill-of-lading intelligence, warehouse inventory, asset monitoring, and closed-loop operational workflows. Distinguish verified platform evidence from proposed scope and validate all live-data dependencies.",
  source: "upload/K.md",
};

export const NON_NEGOTIABLE_RULES: string[] = [
  "Evidence before assertion. Every factual status, location, ETA, inventory quantity, supplier commitment, extracted document field, AI recommendation, and completed action must retain its source and timestamp.",
  "Separate evidence from design. Label statements as PUBLICLY EVIDENCED, PROPOSED TARGET CAPABILITY, REQUIRES CUSTOMER DATA/INTEGRATION, REQUIRES DEMO/VALIDATION, or NOT CONFIRMED.",
  "Never manufacture live data. Do not say a shipment is live-tracked unless an active feed, its update time, and the relevant shipment/container/vessel identity are available. Do not invent ETAs, GPS points, stock levels, supplier performance scores, or delivery dates.",
  "A vessel is not a container. AIS usually reports vessel position. Do not infer a particular container's position from a vessel position unless a trustworthy shipment-to-vessel/container relationship is established by source records.",
  "Closed loop means verified outcome. Detecting an exception or creating a task is not resolution. Close the case only after the source system or authorized user confirms the result.",
  "Human approval for consequential actions. Never automatically approve a supplier, change a contract, release a purchase order, commit spend, change a delivery address, clear a customs hold, or send binding commitments without configured authority and explicit approval.",
  "Idempotency and deduplication. Reprocessing the same email, BOL, webhook, shipment milestone, or ERP event must not create duplicate purchase orders, receipts, supplier records, cases, or notifications.",
  "Preserve history. Never silently overwrite the original document, ETA, milestone, stock count, approval, or user correction. Keep version history and record who/what changed it and why.",
  "Show freshness and uncertainty. Each live-looking field must expose source, last_updated_at, freshness status, and confidence/quality where applicable. A stale value must be labeled stale, not presented as current.",
  "Degrade safely. If a provider, integration, model, database, or external API fails, show a truthful partial state, log the fault, queue retryable work, and route unrecoverable or ambiguous cases to a human queue.",
  "Least privilege. Enforce company, legal entity, project, site, supplier, cost centre, and role permissions at the API/data layer, not only in the UI.",
  "Bounded scope. Build one shared operational backbone and separately deployable modules. Do not create a separate AI agent for every screen or overbuild predictive AI before identifiers and source data are reliable.",
  "Deterministic rules for decisions. Use versioned business rules for thresholds, reconciliation, escalation and approvals. Use LLMs for language, extraction assistance and explanations, never as the sole authority for high-impact status transitions.",
  "Explicit time semantics. Store timestamps in UTC; preserve original timezone and source timestamp; render local time with timezone. Distinguish event time from ingestion time.",
  "No false precision. A predicted arrival is a forecast with a model/source and confidence, not a guaranteed arrival. Display a point estimate only when justified; otherwise display a range or 'not enough data.'",
];

export const REFERENCE_ARCHITECTURE_MERMAID = `flowchart TB
  subgraph SRC[Systems of record and evidence sources]
    ERP[ERP / PR / PO / Finance]
    SUP[Supplier portals / email / RFQ]
    DOC[Contracts / BOL / invoices / packing lists]
    LOG[Carrier / forwarder / port / AIS APIs]
    WMS[WMS / warehouse / site stock]
    EAM[CMMS / EAM / asset register]
    IOT[IoT sensors / SCADA / telematics]
    PROJ[Project controls / material schedules]
  end

  subgraph EDGE[Integration boundary]
    CON[API adapters, webhooks, polling, file and email ingestion]
    SEC[Auth, secrets, rate limits, source allow-lists]
    RAW[Immutable raw payload and document store]
    VAL[Schema validation, quarantine, dedupe, idempotency]
  end

  subgraph DATA[Canonical operational data layer]
    MDM[Master data and identity resolution]
    BUS[Event bus / durable queue / replay]
    ODS[Operational relational store]
    GRAPH[Relationship graph / cross-record links]
    SEARCH[Full-text and semantic index]
    TIME[Time-series store for telemetry and location observations]
    EVID[Evidence registry, provenance and version history]
  end

  subgraph DOM[Domain services]
    PROCUREMENT[PR, RFQ, supplier, PO and contract]
    DOCAI[Document intelligence and BOL reconciliation]
    IMPORT[Import file, shipment, container and milestone tracking]
    INV[Warehouse inventory, receipt and material allocation]
    ASSET[Asset, inspection, condition and maintenance]
    RISK[Rules, risk, ETA and stockout calculations]
    CASE[Exception, task, escalation and approval workflow]
  end

  subgraph APP[User and decision layer]
    API[Permission-aware API layer]
    DASH[Control tower / dashboards / reports]
    CHAT[Grounded conversational assistant]
    NOTIFY[Email / messaging / in-app notifications]
    ACTION[Approved action gateway / write-back adapters]
  end

  subgraph GOV[Cross-cutting controls]
    IAM[RBAC/ABAC, SSO, MFA and segregation of duties]
    OBS[Logs, metrics, traces, connector health and alerts]
    AUDIT[Append-only audit trail and evidence links]
    OPS[Backups, DR, retention, privacy and policy]
  end

  SRC --> CON --> SEC --> RAW --> VAL
  VAL --> BUS
  VAL --> MDM
  BUS --> ODS
  BUS --> GRAPH
  BUS --> TIME
  RAW --> DOCAI
  DOCAI --> EVID
  MDM --> ODS
  MDM --> GRAPH
  ODS --> PROCUREMENT
  GRAPH --> PROCUREMENT
  DOCAI --> IMPORT
  BUS --> IMPORT
  TIME --> IMPORT
  ODS --> INV
  TIME --> ASSET
  ODS --> ASSET
  PROCUREMENT --> RISK
  IMPORT --> RISK
  INV --> RISK
  ASSET --> RISK
  RISK --> CASE
  CASE --> ACTION
  ACTION --> SRC
  PROCUREMENT --> API
  DOCAI --> API
  IMPORT --> API
  INV --> API
  ASSET --> API
  RISK --> API
  CASE --> API
  API --> DASH
  API --> CHAT
  CASE --> NOTIFY
  GOV -. applies across .-> EDGE
  GOV -. applies across .-> DATA
  GOV -. applies across .-> DOM
  GOV -. applies across .-> APP`;

export const ARCHITECTURE_INTERPRETATION: string[] = [
  "The integration boundary receives and validates data; it must not perform undocumented business decisions.",
  "Raw source payloads and original documents are preserved for traceability, subject to retention policy.",
  "Canonical domain services own validated domain state; event consumers can be replayed safely.",
  "The graph links records across systems, while the relational store remains appropriate for transactions. Do not force every workload into a graph database.",
  "Time-series storage is for telemetry and location observations; it is not the only source of shipment state.",
  "AI provides extraction assistance, natural-language access, explanation, and prioritization. Deterministic rules validate critical state transitions.",
  "The action gateway is the only path for external write-backs and consequential notifications.",
  "Security, observability, audit, retention, backup and disaster recovery apply across all layers.",
];

export interface SpecModule {
  id: string;
  name: string;
  purpose: string;
  capabilities: string;
  controls?: string;
  rules?: string;
  acceptance?: string;
  implementedInApp: string;
}

export const MODULES: SpecModule[] = [
  { id: "M01", name: "Identity, tenant, entity and permission management", purpose: "SSO/MFA where available; scoped roles for all operating teams.", capabilities: "User, team, legal entity, project/site and supplier scope; roles for requesters, procurement, logistics, warehouse, maintenance, project controls, finance, approvers, auditors and administrators; segregation of duties; temporary delegated approval; vendor portal scope if required.", controls: "API-layer authorization, row/data-level filters, least privilege, privileged-action review, session expiry, secret rotation and audit of access to restricted documents. A user must not see another project's contract or supplier commercial terms unless authorized.", acceptance: "Cross-project access tests fail closed; a requester cannot self-approve a purchase above their authority; the audit record identifies actor and policy.", implementedInApp: "View registry + role labels; demo enforces read-only scope per view." },
  { id: "M02", name: "Source connectors and ingestion orchestration", purpose: "Thin connectors that normalize downstream.", capabilities: "API/webhook/polling/file ingestion; schema registry; source-specific adapters; pagination; incremental cursor/checkpoint; rate-limit handling; schema drift detection; mapping; payload validation; quarantines; replay; per-source health; service account and secrets management.", rules: "Keep connectors thin. Normalize data downstream. Use incremental ingestion and checkpoint only after durable persistence. Record source system, endpoint/file, retrieval time, source timestamp, payload hash, sync cursor and connector version. Respect source API terms and access controls.", acceptance: "Replaying a source batch twice creates no duplicates; a failed page is retried without skipping records; schema drift appears as a visible integration issue.", implementedInApp: "Integration Health view — connectors with freshness, retries, DLQ; seed includes duplicate-webhook dedupe (GRN-5004)." },
  { id: "M03", name: "Master data management and entity resolution", purpose: "Canonical identities with aliases.", capabilities: "Canonical supplier/material/project/warehouse/asset identities; alias resolution; duplicate detection; code mapping; UOM and currency normalization; source precedence; confidence-based candidate matches; steward review and merge/unmerge history.", rules: "Do not automatically merge suppliers or container/shipment identities on fuzzy similarity alone. Use strong identifiers first (source ID, PO number + line, BOL number + issuer/version, container number with check-digit validation, serial number). A fuzzy match can suggest candidates but must not erase ambiguity.", acceptance: "Ambiguous supplier names and similar container references go to review; approved merge preserves old IDs as aliases and keeps a reversible audit trail.", implementedInApp: "Canonical IDs + supplier aliases in data model; unmatched BOL stays UNMATCHED (not force-linked)." },
  { id: "M04", name: "Supplier network and performance", purpose: "Supplier view across PR → RFQ → contract → PO → shipment → receipt → invoice/discrepancy.", capabilities: "Supplier directory, approved/vendor-inactive status, categories, locations, lead-time commitments, delivery terms, quote history, contract/PO linkage, shipment reliability, discrepancy history, certification expiry, corrective-action record and supplier-specific open cases.", controls: "Publish metric formulas, sample size, period, exclusions and source data. Do not compare unlike supplier categories or penalize suppliers for delays demonstrably outside their control without configurable attribution rules. Do not infer financial/credit status without an authorized data source.", acceptance: "Scorecards show definition, version, sample size and exclusions.", implementedInApp: "Suppliers view with published scorecard formulas + risk signals." },
  { id: "M05", name: "Purchase request intake and demand management", purpose: "Capture requests from controlled channels; no PO from incomplete requests.", capabilities: "Capture requests from a controlled form, ERP, email and approved spreadsheets; extract requester, project/site, material, quantity, UOM, required-on-site date, cost code, specification, justification, priority and attachments; detect duplicates; ask for missing fields; route approvals.", controls: "OCR/LLM extraction is a draft until validated. Preserve original email/form/document. Require a human or deterministic source confirmation for critical fields. Track request status from draft to submitted, clarification, approved, sourcing, ordered, partly fulfilled and closed/cancelled.", acceptance: "Incomplete request does not silently create a PO; duplicate intake links to the existing request or queues review.", implementedInApp: "Procurement view — PR pipeline incl. NEEDS_INFO and duplicate PR-1011→PR-1007." },
  { id: "M06", name: "RFQ, quote comparison and sourcing", purpose: "Explainable sourcing with no autonomous award.", capabilities: "Supplier shortlist based on authorized/approved criteria; RFQ package; supplier responses and versioning; price/currency/Incoterms/lead-time comparison; freight/tax/landed-cost breakdown when data is available; technical/compliance deviations; quote expiration; recommendation and decision record.", controls: "Explain every rank and criterion. LLM extraction of a quote must link to the original page/field and confidence. No autonomous supplier award or commercial negotiation without explicit policy and approval.", acceptance: "Ranked quotes with per-rank rationale and extraction confidence.", implementedInApp: "Procurement view — RFQ-2001 with 3 ranked quotes + rationale." },
  { id: "M07", name: "Purchase order, contract and obligation management", purpose: "PO/line states, amendments, obligations with version lineage.", capabilities: "PO/line states; amendments; promised and required dates; quantities and partial deliveries; contract obligations; delivery terms; cancellation/restock/penalty clauses; insurance and certification requirements; expiry and renewal alerts; supplier-confirmation capture; changes compared against approved baseline.", controls: "Contract summaries are navigational aids, not legal advice. Signed documents and approved ERP values are authoritative. Any PO/contract amendment requires controlled approval and version lineage.", acceptance: "Contract CTR-4001 obligations extracted; CTR-4002 expiring alert.", implementedInApp: "Procurement view — PO register + contracts with obligation JSON." },
  { id: "M08", name: "Document registry and document intelligence", purpose: "Multi-format intake with page-level provenance.", capabilities: "Multi-format intake; OCR/layout parsing; page-level source coordinates; document classification; field extraction; version comparison; duplicate detection; entity/PO/shipment linking; validation rules; full-text and semantic search; retention and access policy.", controls: "Each extracted field stores value, normalized value, source page/coordinates, extraction engine/model/version, confidence and validation result. Low confidence or conflict triggers review. Keep original files immutable; derived text and redacted copy are separate artifacts.", acceptance: "Every BOL field carries page + engine + confidence; originals hashed.", implementedInApp: "BOL Intelligence view — field provenance table with page/coords/engine." },
  { id: "M09", name: "Bill of lading (BOL) intelligence — required standalone module", purpose: "Turn each BOL into a controlled, versioned source of shipment facts and reconcile it with procurement and other import records.", capabilities: "Capture: BOL number; master/house designation; issuer; version/issue date/amendment indicator; shipper/consignee/notify party; vessel/voyage where specified; ports/places; container numbers, type/size, seal, package count/type, marks, goods description, gross/net weight, volume; freight terms; PO/invoice/packing-list/booking/shipment references; estimated/actual sailing/arrival only when present with who supplied the date.", controls: "Processing lifecycle: 1) immutable document ID + content hash; 2) classify master/house and amendment/supersession state — never assume later upload is an amendment without evidence; 3) extract with page-level provenance + confidence; 4) validate formats and internal consistency with configurable rules; 5) match against supplier, PO lines, invoice, packing list, booking, shipment, container, arrival notice, delivery order, GRN; 6) cross-document reconciliation (quantities, UOM, goods, weights, packages, parties, origin/destination, container/seal, PO refs); 7) discrepancy case for missing/conflicting/duplicate/invalid fields with severity, owner, evidence, due date; 8) human confirms/corrects critical fields — correction stored separately, extracted value + provenance retained; 9) publish verified BOL links to import/shipment and supplier/PO/warehouse/project views; 10) monitor downstream milestones — unresolved identity stays unresolved.", rules: "Decision boundaries: system may auto-classify and propose matches, but critical document identity, conflicting cargo identifiers, and commercial/legal exceptions require configured approval. An absent container number must never be fabricated from an unrelated document or inferred from vessel AIS.", acceptance: "BOL with no container number becomes MISSING_IDENTIFIER + discrepancy case; number but no matching shipment stays UNMATCHED; container disagreement across BOL/packing list produces field-level conflict with both references; amended BOL keeps previous version, marks new active version only after policy validation and recomputes reconciliations; human correction records user, timestamp, reason, old/new value, approval policy; retried upload with same hash does not create a second active BOL.", implementedInApp: "BOL Intelligence view — discrepancy catalogue, corrections with audit, version history, content-hash dedupe." },
  { id: "M10", name: "Import file and trade compliance", purpose: "Per-shipment import dossier with compliance checklist.", capabilities: "Per-shipment import dossier; responsible broker/forwarder; origin and destination; commodity/HS code if supplied or approved; country-of-origin evidence; required permit/certificate checklist; customs declaration/status where integrated; duties/taxes/fees if sourced; inspection/hold/release; delivery order; demurrage/detention clock where dates/rates are known; document completeness and broker queries.", rules: "Do not determine legal customs classifications, duties, sanctions clearance or regulatory eligibility solely from an LLM. Require jurisdiction-specific rules and authorized source data. If customs data is not connected, label status as manually reported or unknown; never imply customs clearance.", acceptance: "SHP-8805 customs hold is manually reported by broker — never implied cleared.", implementedInApp: "Import Tracking view — import dossier fields + manual-source labels." },
  { id: "M11", name: "Live import shipment, container and milestone tracking — required standalone module", purpose: "Show the most recent verified transport event, expected arrival, route and exception status from origin to warehouse/site, with explicit freshness and provenance.", capabilities: "Sources: supplier dispatch notices; freight-forwarder platform; carrier tracking APIs; terminal/port events; vessel AIS feed; customs/broker updates; GPS/telematics; manual operator event; warehouse gate/receipt scan. Journey modeled as milestones (booking requested/confirmed; cargo ready/pickup; gate-in; export customs; loaded/departed (ATD); underway + transshipment; port arrival/discharge/availability; import customs; delivery order/release; gate-out/final mile; delivered/received/exception). Separate values for supplier promised ETA, carrier/forwarder ETA, port schedule, model-predicted ETA, actual arrival and user-entered estimate with visible precedence policy. Freshness classes fresh/aging/stale/unavailable per mode and provider cadence. ETA prediction includes method/source, calculation time, input data time, uncertainty — or 'not enough data'. Link shipment to vessel only from booking, carrier event, manifest or reliable source.", controls: "Store every raw event and a normalized milestone; keep provider event ID, source, event time, received time, position accuracy, estimated-vs-actual. Every location and date view indicates whether it is source-reported, manually reported, predicted or stale.", rules: "AIS vessel position ≠ container position. Support multi-leg, transshipment, split/partial delivery, LCL without container visibility, multiple deliveries per PO. Detect no-update beyond threshold, route deviation, milestone delay, ETA slip, missed required-on-site date, port dwell, customs hold, container mismatch, cancelled booking.", acceptance: "Timeline shows event time and received time separately; stale carrier data displayed as stale; AIS vessel position with missing container relationship shows vessel position separately and container unresolved; corrections/retractions preserved and recomputed idempotently; late-arriving events ordered by event time without deleting audit history; provider outage leaves last-known data visible with stale label + health warning + retry status; ETA slip evaluated against PO commitment and project-required date with configured severity rules.", implementedInApp: "Import Tracking view — milestone timeline (event vs received), ETA provenance panel, vessel/container separation panel." },
  { id: "M12", name: "Warehouse, stock and multi-site inventory", purpose: "Precise availability semantics; in-transit is never available.", capabilities: "Warehouses, bins, sites, stock ledger, item/UOM normalization, on-hand, available, reserved, allocated, in-transit, quarantine, damaged, inspection-pending and issued/consumed status; serial/lot/batch; min/max and safety stock; stock transfers; cycle count; barcode/QR scanning; receiving and picking records.", rules: "Define 'available' precisely (on-hand minus reservations and quarantined stock). Never count in-transit quantities as physically available. Inventory should reconcile to WMS/ERP ledger; manually maintained shadow values are visibly provisional.", acceptance: "Partial receipt updates only the received quantity; remaining quantity stays open against PO/shipment. Duplicate receipt webhook does not double stock.", implementedInApp: "Inventory view — per-status buckets, in-transit separated; GRN-5004 dedupe evidence." },
  { id: "M13", name: "Inbound receiving, quality and discrepancy resolution", purpose: "Closed loop from expected receipt to verified resolution.", capabilities: "Expected-receipt notice; scan PO/shipment/container/package; count/weight validation; damage photos; QC inspection; partial/over/short delivery; incorrect item; lot/serial capture; quarantine and release; GRN creation; put-away; supplier claim; invoice/PO/receipt three-way reconciliation when sources are integrated.", rules: "Closed loop: Receiving discrepancy → evidence capture → owner assignment → supplier/forwarder case → approved ERP adjustment/claim → verified response or stock correction → close with reason and proof.", acceptance: "GRN-5003 discrepancy case EX-9007 in ACTION_SUBMITTED with photos + claim.", implementedInApp: "Receiving view — receipts with QC results and discrepancy states." },
  { id: "M14", name: "Project/site materials planning", purpose: "Demand vs stock vs in-transit with evidenced links only.", capabilities: "Project/site, work package, material requirement, planned need date, lead time, substitution/technical constraints, allocation, reservation and criticality; connect project schedules or manually approved demand baselines to PRs, POs, shipments and warehouse positions.", rules: "Do not infer formal project schedule dependencies unless imported or explicitly configured. Distinguish planned requirement from approved requirement and actual consumption. Show which material delays put which work package at risk only when the relationship is evidenced.", acceptance: "PRJ-2201 requirements AT_RISK from evidenced SHP-8802 linkage.", implementedInApp: "Projects view — demand vs available vs in-transit with gap." },
  { id: "M15", name: "Asset registry, condition monitoring and inspection", purpose: "Expose monitoring class truthfully; never mislabel inspection-only as real-time.", capabilities: "Asset hierarchy; asset IDs and serials; site/location; ownership; criticality; make/model; warranties/certificates; scheduled inspections; checklists, photos, defect classification, corrective actions; service hours/cycles; telemetry ingestion; condition trends; maintenance thresholds; open work orders; parts/tools needed; technician and completion evidence. Classes: REGISTRY_ONLY | INSPECTION_MONITORED | TELEMETRY_CONNECTED | LOCATION_TRACKED.", controls: "Sensor threshold and trend alerts; offline sensor detection; calibration/quality status; defect-to-work-order; maintenance-due notices; certificate expiry; spare-part dependency; maintenance verification; post-maintenance re-test.", rules: "Expose the class clearly. Do not call an asset 'real-time monitored' if the only input is a periodic manual inspection. If telemetry is stale, first create a telemetry/data-quality issue rather than assert a fault.", acceptance: "Sensor data older than threshold triggers telemetry-stale state (AST-CH-02), not a normal condition state. Inspection marked complete without required evidence remains pending or is rejected (AST-GEN-04).", implementedInApp: "Assets view — class badges, telemetry freshness, stale ≠ fault." },
  { id: "M16", name: "Supplier, shipment and inventory risk engine", purpose: "Deterministic signals; fact separate from interpretation.", capabilities: "Deterministic signal calculations for PO lateness, ETA slippage, supplier promise drift, missing documents, low stock, projected stockout, open customs hold, capacity/lead-time variance, repeat receiving discrepancy, asset criticality and project deadline exposure.", rules: "Every signal has definition/version, source fields, calculation time, severity mapping, threshold, uncertainty and suppression rule. Avoid opaque composite scores with no component breakdown. Keep fact (e.g. 'ETA changed by two days') separate from interpretation (e.g. 'high risk to project').", acceptance: "Forecasting is optional add-on after back-testing; deterministic baseline must still work if prediction service fails.", implementedInApp: "Control tower + Exceptions — risk signals with fact/interpretation split." },
  { id: "M17", name: "Exception, case and SLA workflow engine", purpose: "Closed-loop state machine with verified outcomes.", capabilities: "Trigger, severity, category, owner, team, SLA, due date, related PR/PO/supplier/BOL/container/project/asset, evidence bundle, investigation checklist, comments, supplier/forwarder communication record, approval state, escalation and resolution code.", controls: "State pattern: DETECTED → TRIAGED → ASSIGNED → INVESTIGATING → ACTION_PROPOSED → AWAITING_APPROVAL (if required) → ACTION_SUBMITTED → OUTCOME_PENDING_VERIFICATION → RESOLVED or CANCELLED with a reason. Exceptions may reopen if the verified condition regresses. SLA pause/resume rules must be explicit. A case cannot reach RESOLVED solely because an email was drafted or sent. Require a verified postcondition, human confirmation, or an approved closure rule.", acceptance: "EX-9009 closed with verified closure proof; EX-9006 at AWAITING_APPROVAL with full transition history.", implementedInApp: "Exceptions view — interactive state machine with transition validation." },
  { id: "M18", name: "Action gateway, approvals and write-back", purpose: "The only path for external write-backs.", capabilities: "Permission and policy checks; approval routing; command validation; dry-run/preview; idempotency key; external API execution; result capture; post-write read-back; retry; compensation/rollback workflow where feasible; manual operator queue.", controls: "Safe actions: draft supplier follow-up; PO amendment proposal; open warehouse count task; request missing BOL data; draft claim; create approved maintenance work order; create ERP requisition after explicit approval. High-risk: supplier award, PO release, financial commitment, bank/payment change, contract amendment, booking cancellation, receiving/stock adjustment, customs declaration, asset shutdown or safety-related action. LLM output is a proposal, not an action authorization.", acceptance: "ACT-0005 verified via postcondition read-back; ACT-0004 rejected with authority comment; ACT-0006 failed with UNKNOWN/PENDING_RECONCILIATION — no blind retry.", implementedInApp: "Actions view — approve/reject via gateway; results + idempotency keys shown." },
  { id: "M19", name: "Notification and communication orchestration", purpose: "Internal vs external separation; delivery evidence before 'contacted'.", capabilities: "In-app, email, approved collaboration platform, SMS/WhatsApp only where company policy and consent allow, and supplier portal if in scope. Template versioning; recipient validation; urgency and quiet hours; digest versus immediate escalation; reminder cadence; delivery status; bounce/failure tracking; opt-outs where required; communication link to case and evidence.", rules: "Separate internal notes from external communications. Supplier-facing statements must use verified facts and approved templates; no AI-generated binding commitments. Prevent duplicate notifications during retries using an idempotency key.", acceptance: "Claim notification shows DELIVERED with delivery receipt; outage alert FAILED → SMS fallback; digest grouping.", implementedInApp: "Actions view — notifications panel with channels + states." },
  { id: "M20", name: "Conversational operations assistant", purpose: "Grounded, permission-aware answers with citations.", capabilities: "Permission-aware natural language queries; query clarification; supplier/PO/BOL/container/material/asset cross-referencing; grounded answers; citations to source records/documents; timestamp and freshness display; drill-down to timeline and exceptions; draft investigation summaries.", rules: "Query contract: for questions about live or current state, retrieve source records first, calculate deterministic answers, then explain. State 'unknown/unavailable' when source coverage is absent. Provide a compact answer with as_of time, sources used, and known caveat. Never invent a container location, ETA, receipt, or asset condition. No direct database write from the LLM.", acceptance: "Assistant answers carry sources + caveats; unknown data answered truthfully.", implementedInApp: "Assistant view — grounded retrieval → explain with sources + caveats." },
  { id: "M21", name: "Control tower, dashboards and reporting", purpose: "Single operational view backed by connected source records.", capabilities: "Views: procurement pipeline; supplier portfolio; import control tower; BOL/document workbench; inventory/site view; project materials risk; asset view; exceptions/SLAs; integration health; audit and performance.", rules: "Every tile can drill to row-level records and source evidence. Never show only an aggregate when an operational user must take action.", acceptance: "All KPI tiles clickable → drill to row-level records.", implementedInApp: "Control Tower view with drill-down wiring to all domain views." },
  { id: "M22", name: "Audit, evidence and data governance", purpose: "Append-only audit + evidence registry.", capabilities: "Append-only audit; source lineage; document hash/version; field-level extraction provenance; rule/model/threshold version; approvals; exportable case dossier; access audit; retention and deletion policy; sensitive-document classification; legal hold where required; evidence export for dispute, claim or internal audit.", rules: "Minimum audit event fields: event ID, UTC timestamp, actor/service identity, action, entity type/ID, previous state or diff, new state, reason, correlation ID, source record, rule/model version and approval ID.", acceptance: "Audit view shows BOL correction old→new, approvals, dedupe rejections, policy decisions.", implementedInApp: "Governance view — audit stream + evidence registry with labels." },
  { id: "M23", name: "Integration reliability and platform operations", purpose: "Connector health and safe degradation.", capabilities: "Connector health; API latency and error rates; ingestion lag; schema-drift alert; queue depth; dead-letter queue; retry volume; replay console; database/queue health; model/OCR service health; notification deliverability; backup/restore tests; deployment rollback; feature flags; runbooks and incident ownership.", acceptance: "Connector matrix with freshness classes, retry queues and DLQ depth.", implementedInApp: "Governance view — connector health table." },
];

export const WORKFLOWS: { id: string; name: string; steps: string[] }[] = [
  {
    id: "A",
    name: "BOL missing or conflicting container number",
    steps: [
      "BOL arrives and original document is stored.",
      "OCR extracts fields with provenance and confidence.",
      "Required-field rule detects missing container number or conflict with packing list.",
      "A case is created with a reason code (BOL_MISSING_CONTAINER_ID or BOL_CONTAINER_CONFLICT), severity and evidence.",
      "Procurement/logistics owner is assigned by legal entity, project/site, shipment and responsibility rules.",
      "Assistant prepares a supplier/forwarder request for clarification, quoting only verified references.",
      "Authorized user approves/sends the message if required.",
      "Updated document or source response arrives; it is versioned and reconciled.",
      "Human or configured policy confirms the correct identifier; matching is rerun idempotently.",
      "Shipment-to-container relationship is persisted with evidence; tracking starts only when a valid provider identifier/feed is available.",
      "Case closes only after required fields and matching checks pass. All initial and corrected values remain auditable.",
    ],
  },
  {
    id: "B",
    name: "Import ETA slip threatens material availability",
    steps: [
      "Carrier/forwarder/port source updates ETA or a configured no-update/delay rule triggers.",
      "The system records the raw observation and source timestamp.",
      "Identity service links the event to the shipment, container, PO lines and project material requirement only when linkage evidence passes.",
      "Risk service calculates delay against supplier promise, PO date, required-on-site date, stock position, reservations and approved safety-stock policy.",
      "If risk exceeds a configurable threshold, create/refresh an exception instead of opening duplicates.",
      "Owner reviews evidence and alternatives (expedite, split delivery, approved substitute, transfer stock, resequence task, communicate delay).",
      "Proposed actions are ranked using explicit criteria; commercial/safety/contract constraints are surfaced.",
      "Approval gateway checks spend, substitution, contract and authority policies.",
      "Approved action is submitted to the target system/provider; result is recorded.",
      "Re-read the target system or wait for a source-confirming event. Do not mark action complete based only on a successful HTTP request.",
      "Recalculate material risk; close only when the required material is available, schedule/risk owner accepts a documented disposition, or another explicit closure rule is met.",
    ],
  },
  {
    id: "C",
    name: "Receiving mismatch / shortage",
    steps: [
      "Expected PO/shipment lines → scan arrival and documents → capture counted quantity/quality.",
      "Compare normalized values (UOM-normalized; never kg vs tonnes without conversion metadata).",
      "Quarantine or accept under policy.",
      "Create discrepancy case with evidence (photos, counts).",
      "Supplier/forwarder follow-up prepared and approved.",
      "Approved inventory/ERP correction or claim submitted via action gateway.",
      "Verify ledger and physical disposition (read-back).",
      "Close with GRN, photos, approvals and communications.",
    ],
  },
  {
    id: "D",
    name: "Asset fault and spare-parts dependency",
    steps: [
      "Sensor/inspection triggers defect.",
      "Validate signal freshness and sensor health FIRST — if telemetry is stale, create a telemetry/data-quality issue rather than assert a fault.",
      "Identify asset/site/criticality.",
      "Create work order and task.",
      "Check spare-part stock and inbound POs.",
      "Detect missing part risk (MAT-SEAL-K: 1 on hand, 2 required).",
      "Route replenishment decision through procurement approvals — no autonomous PO.",
      "Capture repair/inspection evidence.",
      "Post-repair verification (re-test) before closing work order and root-cause record.",
    ],
  },
  {
    id: "E",
    name: "Supplier commitment breach",
    steps: [
      "Supplier commitment is captured with source/time.",
      "Compare actual milestones and approved dates.",
      "Evaluate whether delay is attributable and which PO lines/projects are affected.",
      "Create evidence pack.",
      "Assign accountable owner.",
      "Prepare supplier query or contractual follow-up for approval.",
      "Record supplier response and revised promise.",
      "Recalculate risk.",
      "Close only when delivery/accepted disposition is verified.",
    ],
  },
];

export const STATE_MACHINES: { domain: string; states: string[]; note?: string }[] = [
  { domain: "PR (Purchase Request)", states: ["DRAFT", "SUBMITTED", "NEEDS_INFO", "PENDING_APPROVAL", "APPROVED", "SOURCING", "ORDERED", "PARTIALLY_FULFILLED", "FULFILLED", "CANCELLED"] },
  { domain: "BOL", states: ["RECEIVED", "PARSED", "NEEDS_REVIEW", "RECONCILIATION_FAILED", "VERIFIED", "SUPERSEDED", "REJECTED"] },
  { domain: "Shipment", states: ["PLANNED", "BOOKED", "READY", "IN_TRANSIT", "AT_TRANSIT_POINT", "ARRIVED", "CUSTOMS_HOLD", "RELEASED", "OUT_FOR_DELIVERY", "DELIVERED", "PARTIALLY_DELIVERED", "CANCELLED", "TRACKING_STALE", "STATUS_UNKNOWN"] },
  { domain: "Inventory line", states: ["EXPECTED", "PARTIALLY_RECEIVED", "RECEIVED_PENDING_QC", "AVAILABLE", "QUARANTINED", "DAMAGED", "SHORT", "CLOSED"] },
  { domain: "Action", states: ["DRAFT", "POLICY_CHECK", "AWAITING_APPROVAL", "AUTHORIZED", "SUBMITTED", "ACKNOWLEDGED", "PENDING_VERIFICATION", "VERIFIED", "FAILED", "COMPENSATION_REQUIRED", "CANCELLED"] },
  { domain: "Exception (M17)", states: ["DETECTED", "TRIAGED", "ASSIGNED", "INVESTIGATING", "ACTION_PROPOSED", "AWAITING_APPROVAL", "ACTION_SUBMITTED", "OUTCOME_PENDING_VERIFICATION", "RESOLVED", "CANCELLED"], note: "Exceptions may reopen if the verified condition regresses." },
];

export const FAILURE_MATRIX: { condition: string; required: string; never: string }[] = [
  { condition: "Carrier/API outage", required: "Preserve last-known value, mark stale with last successful sync, queue bounded retries, show source health", never: "Display cached position as live or replace it with a guess" },
  { condition: "Authentication/permission failure", required: "Stop automatic retry after configured auth handling; alert integration owner; store non-sensitive error detail", never: "Retry forever or expose secret/token" },
  { condition: "Rate limit / transient 5xx / timeout", required: "Exponential backoff with jitter, retry budget, provider quota awareness, idempotent request", never: "Create duplicate milestones/records on each retry" },
  { condition: "Permanent 4xx/schema rejection", required: "Quarantine payload, expose mapping/schema error, alert owner; reprocess after fix", never: "Drop record silently" },
  { condition: "Duplicate webhook/file/email", required: "Deduplicate by provider event ID, content hash or canonical idempotency strategy; retain duplicate metadata where useful", never: "Duplicate stock receipts, cases or messages" },
  { condition: "Late/out-of-order event", required: "Reconcile by source event time and domain transition policy; preserve ingestion order for audit", never: "Discard late but valid evidence or rewrite history without trace" },
  { condition: "Conflicting BOL fields", required: "Field-level conflict case and human review", never: "Choose whichever value the LLM prefers" },
  { condition: "OCR/LLM low confidence", required: "Mark draft/low confidence; ask reviewer for critical values", never: "Treat extracted field as verified fact" },
  { condition: "Container/vessel identity unresolved", required: "Keep relation unresolved, show source evidence and missing mapping", never: "Guess from similar container number, route or vessel name" },
  { condition: "Conflicting ETA sources", required: "Retain all observations; apply documented source precedence; show source and type", never: "Quietly overwrite one source with another" },
  { condition: "ERP write request timeout", required: "Mark result UNKNOWN/PENDING_RECONCILIATION; query target for postcondition using idempotency key", never: "Retry a non-idempotent create blindly or say successful" },
  { condition: "ERP write rejected", required: "Keep case/action open, capture rejection, assign remediation", never: "Close the originating case automatically" },
  { condition: "Database/queue unavailable", required: "Fail safely, queue durable writes if supported, surface degraded state, use runbook", never: "Acknowledge ingestion before durable persistence when durability is required" },
  { condition: "Sensor offline/stale", required: "Mark telemetry stale, open data-health issue when threshold met", never: "Interpret missing data as healthy equipment" },
  { condition: "Clock/timezone mismatch", required: "Preserve source time, ingestion time and source timezone; flag impossible chronology", never: "Sort every date as if all timestamps share one timezone" },
  { condition: "Permission denied", required: "Deny access, log event, show a safe explanation", never: "Reveal restricted record existence/details to unauthorized users" },
  { condition: "Notification failure", required: "Retry idempotently, show delivery state and fallback route", never: "Mark supplier contacted without delivery/dispatch evidence" },
  { condition: "Model or vector service unavailable", required: "Fall back to deterministic queries/search; preserve existing workflows", never: "Block core procurement/tracking transactions because AI is down" },
];

export const DATA_QUALITY_RULES: string[] = [
  "Required identifiers missing; invalid or duplicate BOL/container/PO references.",
  "Supplier, PO, consignee or delivery location disagreement.",
  "Shipment record with no linked PO line or a PO line with no expected delivery explanation.",
  "Package/quantity/weight/UOM disagreement between BOL, packing list, invoice, PO and receipt.",
  "Shipment quantity exceeding ordered quantity without approved tolerance/amendment.",
  "Supplier commitment, carrier ETA and site-required date conflict.",
  "Receipt recorded twice or inventory delta not reconciled.",
  "On-hand/available/reserved/in-transit status confusion.",
  "Sensor timestamp too old, physically implausible readings, invalid units or calibration expired.",
  "Unsourced supplier score, ETA, position or asset condition.",
  "Every reconciliation result returns PASS, WARN, FAIL, or NOT_CHECKED, plus rule version, records compared, normalized values, differences and next action. NOT_CHECKED must not be treated as PASS.",
];

export const METRICS: string[] = [
  "PR submission-to-approval cycle time and percentage of requests returned for missing data.",
  "PR-to-PO elapsed time and approved sourcing lead time.",
  "Percentage of active shipments with a linked supplier, PO, BOL and verified tracking source.",
  "Percentage of shipments with fresh status under each provider's cadence.",
  "Missing/invalid BOL identifier rate and average exception resolution time.",
  "ETA prediction error against actual arrival, separated by mode, provider and prediction horizon.",
  "On-time delivery against agreed baseline; distinguish supplier-controlled and externally caused delay if attribution is evidenced.",
  "Stockout incidents, inventory accuracy, receipt discrepancy rate and receiving-to-availability time.",
  "Project material-shortage alerts with confirmed outcomes.",
  "Asset inspection completion, overdue maintenance, telemetry uptime and mean time to acknowledge/repair where data supports it.",
  "Open exception age, SLA attainment, reopen rate, action write-back failure rate and percentage of actions with verified outcomes.",
  "Integration sync latency, failed-record rate, dead-letter queue age and recovery time.",
  "Never publish a KPI without its numerator, denominator, time window, exclusions, source, owner and baseline.",
];

export const PHASES: { phase: string; name: string; detail: string }[] = [
  { phase: "Phase 0", name: "Discovery and data reality check", detail: "Inventory source systems, records, identifiers, access, API availability, document examples, transport providers, sites, users, approval rules, security/residency constraints and target SLOs. Walk through at least one real PR-to-receipt transaction and one BOL-to-container tracking transaction. Map all observed manual work and unresolved data ownership." },
  { phase: "Phase 1", name: "Read-only operational visibility", detail: "Connect a thin set of high-value sources (approved supplier/master data, PR/PO, BOL/packing-list documents, import/forwarder updates, warehouse stock). Build canonical IDs, source evidence, import control tower, freshness, searchable records and dashboard. Do not write back to ERP yet." },
  { phase: "Phase 2", name: "Reconciliation and exception workflow", detail: "Implement BOL field validation, supplier/PO/shipment matching, inventory reconciliation, ETA/delivery risk rules, assignments, SLA, notifications and auditable human correction. Prove closed-loop resolution manually before adding automation." },
  { phase: "Phase 3", name: "Approved action and write-back", detail: "Add narrowly scoped write-back for approved actions with idempotency, approvals, postcondition verification, retry/compensation and reconciliation. Use one workflow at a time; no broad autonomous procurement action." },
  { phase: "Phase 4", name: "Asset telemetry and predictive intelligence", detail: "Connect equipment/sensor/CMMS feeds after identity, time synchronization and source quality are proven. Back-test ETA/stockout predictions. Add predictive models only when they improve outcomes over an explicit baseline." },
  { phase: "Phase 5", name: "Scale and optimize", detail: "Expand legal entities/sites/suppliers/providers; optimize operational dashboards, reporting, automation coverage, audit exports, resilience and governance. Measure operational KPIs at each phase gate." },
];

export interface EvidenceMapRow {
  ref: string;
  described: string;
  relevance: string;
  mustNotClaim: string;
}

export const EVIDENCE_MAP: EvidenceMapRow[] = [
  { ref: "SCIO platform (stellarscio.app)", described: "Public platform page describes integration with ERP/finance, SCADA/sensors, vessel AIS and cloud/data lakes; vendor lead times, inventory buffers, correlating delivery promises with port delays, and closed-loop actions", relevance: "Strongest public fit for supply-chain/industrial operations concept", mustNotClaim: "Do not imply every customer connector is live, that every container is trackable, or that NASS data is connected. Validate the demo, feed coverage, exact write-back and actual operational maturity." },
  { ref: "Deterministic AI Enterprise Intelligence", described: "Config-driven domain logic; signals, rules, scores, guardrails; controlled LLM for intent and explanations; auditability and enterprise data integration", relevance: "Decision/rules/guardrail layer for reproducible triage", mustNotClaim: "Does not itself document a live container tracking network or BOL-to-shipment reconciliation implementation." },
  { ref: "AI Knowledge Graph Platform", described: "ERP database and email ingestion; links records in a graph; taxonomy, semantic search, natural-language queries; published graph scale of 499k+ nodes and 576k+ relationships", relevance: "Data unification and relationship resolution", mustNotClaim: "Customer's example does not prove NASS ERP integrations, logistics APIs or shipment GPS." },
  { ref: "Case-study library — AI Conversational Data Platform | Warehouse Operations", described: "Listing describes real-time order, inventory and shipment insights, role-based access and secure read-only retrieval", relevance: "Warehouse query and visibility pattern", mustNotClaim: "Verify exact system sources, freshness guarantees, supported providers and whether code/demo is currently accessible." },
  { ref: "Case-study library — Supply Chain Root Cause Intelligence System", described: "Listing describes inventory management, low-stock root-cause analysis, automated investigation and delay prevention", relevance: "Inventory and exception intelligence", mustNotClaim: "Do not claim an exact NASS inventory implementation or guaranteed prevention without evaluation data." },
  { ref: "Case-study library — AI-Powered Consulting Procurement Automation Platform", described: "Listing describes supplier proposal review, pricing checks and compliance evaluation", relevance: "RFQ/quote comparison and procurement support", mustNotClaim: "Does not prove autonomous PO approval, global import tracking or BOL verification." },
  { ref: "Case-study library — AI-Powered Contract Intelligence Platform", described: "Listing describes contract ingestion, obligation/expiry/risk discovery and conversational querying", relevance: "Contract and obligation extraction", mustNotClaim: "Validate clause coverage, legal review gates and connection to NASS contracts." },
  { ref: "Case-study library — Multi-Warehouse Fulfillment | Automated Order Routing", described: "Listing describes inventory allocation across warehouses, order routing and audit tracking", relevance: "Multi-warehouse inventory concepts", mustNotClaim: "Published scope references ecommerce fulfillment; do not equate it with EPC receiving/GRN without adaptation and demonstration." },
  { ref: "Case-study library — AI Smart Inventory Management | Grocery Retail", described: "Listing describes IoT smart jars/tags, stock monitoring, low-stock alerts and reorder support", relevance: "IoT inventory monitoring pattern", mustNotClaim: "Does not prove rugged industrial asset telemetry, container tracking or NASS site deployment." },
  { ref: "IoT Integration with ERP for Optimized Production", described: "Public case study describes IoT-to-ERP data exchange and production/machine-cycle monitoring", relevance: "ERP + telemetry integration pattern", mustNotClaim: "Manufacturing machine monitoring is not proof of logistics asset tracking or every live IoT device type." },
  { ref: "FMCG Multi Tool Integrator", described: "Public case study describes integrating 15+ sources, hourly synchronization, ADF orchestration, transformation, deduplication, automated error handling and BI dashboards refreshed every 15 minutes", relevance: "Useful integration reliability and enterprise data synchronization precedent", mustNotClaim: "Do not promise those exact refresh times for NASS; the case study describes a separate project and its architecture." },
];

export const EVIDENCE_VOCABULARY: { term: string; meaning: string }[] = [
  { term: "Publicly evidenced", meaning: "The cited public description explicitly says the capability was built/described." },
  { term: "Public listing only", meaning: "The official case-study listing summarizes the capability, but granular implementation details are not publicly demonstrated in the source checked." },
  { term: "Architectural fit", meaning: "The proposed system design logically supports the capability, but customer-specific implementation is not established." },
  { term: "Requires integration", meaning: "A source/feed/API/device/document process must be connected before the capability can work." },
  { term: "Requires validation/demo", meaning: "Ask the product team for a live screen, test record, API contract or deployment evidence." },
  { term: "Not confirmed", meaning: "Do not make the claim externally." },
];

export const TWO_PASS_REVIEW = {
  pass1: {
    title: "Pass 1 — Functional completeness and logical consistency",
    items: [
      "Every required workflow maps to one or more named modules.",
      "Every module has defined inputs, outputs, source of truth, ownership and acceptance tests.",
      "BOL extraction, field-level evidence, versioning, reconciliation and exception routes are specified.",
      "Multi-supplier relationships, split shipments, partial deliveries, multiple BOLs, master/house BOLs and multiple warehouse destinations are modeled.",
      "Live tracking includes source onboarding, identifier matching, milestone timeline, source precedence, freshness and ETA provenance.",
      "Vessel AIS versus container tracking is distinguished explicitly.",
      "On-hand, reserved, available, quarantined and in-transit quantities are distinct.",
      "Project material need dates and stockout calculations reference explicit source records and approved rules.",
      "Asset registry, inspections, telemetry, maintenance and spare-part relationships distinguish manual from live monitoring.",
      "The control tower drills down to source records/evidence.",
      "Closed-loop examples define action owners, approval, postcondition verification and closure evidence.",
      "No contradictory statuses, identifier rules, ownership or source-of-truth definitions remain.",
    ],
  },
  pass2: {
    title: "Pass 2 — Reliability, security and truthfulness",
    items: [
      "Every external write has authorization, business-policy check, approval, idempotency, result capture and postcondition verification.",
      "Duplicate, retry, out-of-order, late, amended, replayed and corrected events cannot corrupt state or create duplicate actions.",
      "Each runtime error has a safe user-visible state, log/metric, retry or manual fallback, owner and recovery path.",
      "A stale or unavailable feed cannot appear live; all time fields have explicit semantics.",
      "No LLM-only decision can release spend, modify contracts, clear customs, adjust stock, or perform safety-critical action.",
      "Low-confidence extraction, conflicting values and ambiguous identity route to human review.",
      "Permission boundaries apply to API/data access, documents, vector/graph search, dashboards, exports and notifications.",
      "Secrets, sensitive payloads and untrusted document instructions are handled safely.",
      "Backup/restore, queue replay, dead-letter recovery, connector credential rotation and rollout rollback are addressed.",
      "Every public capability claim is cited and correctly labeled by evidence level.",
      "No ETA/location/stock/savings/SLO/timeline is invented or stated with unsupported precision.",
      "All critical failure cases have corresponding tests and monitoring.",
    ],
  },
};

export const BOL_EXCEPTION_CATALOGUE: string[] = [
  "missing container number", "malformed/invalid number", "duplicate number across active shipments", "BOL number collision", "unknown supplier/consignee", "PO reference absent", "PO not found", "different supplier than PO", "package/weight mismatch", "UOM mismatch", "conflicting container/seal between BOL and packing list", "amended BOL without approval or clear supersession", "duplicate document", "missing signature/stamp where required by policy", "route mismatch", "expected dates missing", "customs/arrival notice inconsistency", "receipt quantity short/damaged", "master/house relationship unresolved",
];

export const ENTITY_MODEL: { id: string; name: string; detail: string }[] = [
  { id: "1", name: "LegalEntity / BusinessUnit", detail: "The NASS entity or operating unit that owns a transaction." },
  { id: "2", name: "Project / Site", detail: "Project code, site, required-on-site date, cost code, work package and material demand." },
  { id: "3", name: "Supplier / Vendor", detail: "Canonical supplier ID, registered names, aliases, locations, status, approved categories, terms, certifications and contacts." },
  { id: "4", name: "Material / SKU / Part", detail: "Canonical item ID, manufacturer part number, unit of measure, description, criticality, storage conditions and controlled aliases." },
  { id: "5", name: "PurchaseRequest (PR)", detail: "Requester, project/site, line items, quantity, required date, justification, channel, approval route, status and source reference." },
  { id: "6", name: "RFQ / SupplierResponse", detail: "Supplier invitation, quotation/version, currency, lead time, validity, price components, exceptions and evidence." },
  { id: "7", name: "PurchaseOrder (PO)", detail: "Supplier, legal entity, PO lines, quantities, currency, price, delivery terms, delivery location, milestones, amendments and line-level statuses." },
  { id: "8", name: "Contract / Obligation", detail: "Contract/amendment versions, parties, scope, clauses, committed dates, delivery terms, penalties, insurance/certification obligations and approval status." },
  { id: "9", name: "Shipment / ShipmentLeg", detail: "Shipment ID, related PO lines, shipper, consignee, forwarder, carrier, mode, origin/destination, handoff milestones, planned and actual dates." },
  { id: "10", name: "Container / Package / Seal", detail: "Container or package identifiers, size/type, seal, package count, weights, linked shipment/BOL and identification source. Support LCL and non-container freight without requiring a container ID." },
  { id: "11", name: "BillOfLading (BOL)", detail: "Document ID, BOL number, master/house type, issuer, version, issue date, shipper, consignee, notify party, vessel/voyage when present, ports/places, container/seal list, cargo marks, package count, gross/net weight, goods description, freight terms and referenced POs/invoices." },
  { id: "12", name: "ShippingDocument", detail: "Commercial invoice, packing list, certificate of origin, insurance document, import permit, customs declaration, arrival notice, delivery order, inspection/certification or other document type." },
  { id: "13", name: "TrackingObservation / ShipmentMilestone", detail: "Event code/type, location, source/provider, provider event ID, event time, ingestion time, source payload reference, confidence and correction/retraction links." },
  { id: "14", name: "ETAObservation", detail: "Value or range, source, estimate type (supplier, carrier, forwarder, port, model), calculated_at, valid-for-time, confidence and input lineage." },
  { id: "15", name: "Warehouse / Location / Bin", detail: "Site/warehouse/bin identity, allowed stock types and physical location hierarchy." },
  { id: "16", name: "InventoryLot / StockPosition", detail: "Item, quantity, UOM, condition/status, lot/batch, serials where applicable, warehouse/bin, owner/project reservation and last verified time." },
  { id: "17", name: "GoodsReceipt (GRN) / Inspection / Discrepancy", detail: "PO line, shipment, BOL/packing-list references, received quantities, damage/shortage, photos, QC result, receiving time and approver." },
  { id: "18", name: "Asset / Equipment / Sensor", detail: "Asset ID, make/model/serial, site/location, owner, criticality, condition, meter, connected devices and source references." },
  { id: "19", name: "MaintenanceWorkOrder / Inspection / Certificate", detail: "Task type, due date, findings, defects, parts required, owner, approvals and closeout evidence." },
  { id: "20", name: "ExceptionCase / Task / Approval", detail: "Trigger, severity, owner, SLA, related entities, recommended action, approval state, due date, communications, resolution code and closure proof." },
  { id: "21", name: "SourceEvidence / DocumentVersion", detail: "Source URI/ID, content hash, received time, issuer, extraction version, confidence by field, original/derived status and retention classification." },
  { id: "22", name: "ActionCommand / ActionResult", detail: "Requested command, author, policy decision, approval references, idempotency key, target system, request/response references and verified postcondition." },
  { id: "23", name: "SupplierScoreSnapshot / RiskSignal", detail: "Metric, definition/version, period, value, source lineage, uncertainty and explanation." },
  { id: "24", name: "AuditEvent", detail: "Actor/service, action, entity, prior/new state or diff, timestamp, reason, correlation ID, approval link and evidence links." },
];

export const RELATIONSHIP_RULES: string[] = [
  "One supplier may connect to many contracts, PRs, POs and shipments.",
  "One PO may be split into multiple deliveries, BOLs, containers, partial receipts and warehouse destinations.",
  "One shipment may cover multiple PO lines and may change legs or carriers.",
  "A master BOL may reference house BOLs or multiple containers where the source documents establish that relationship.",
  "A BOL may be amended or superseded. Preserve prior versions and state which version is operationally active.",
  "One container should not be linked to multiple simultaneously active shipments unless the logistics model and source evidence explicitly permit it.",
  "Quantity comparisons must normalize units and record conversion rules. Never compare kg to tonnes or pieces to boxes without explicit conversion metadata.",
  "Project material demand is a planned requirement; warehouse availability is a stock fact; in-transit quantity is not available on-site inventory.",
  "Every computed/AI-derived relationship must retain its method and evidence, and remain distinguishable from an explicitly source-recorded relationship.",
];

export const OPERATING_CONTEXT: string[] = [
  "Purchase requests may arrive through inconsistent channels.",
  "Procurement and contract steps require coordination across internal teams and suppliers.",
  "Sourcing and logistics may span international suppliers and shipments.",
  "Warehouse inventory may not be linked cleanly to purchase requests or project requirements.",
  "A bill of lading (B/L or BOL) may be missing a container number.",
  "Teams need to see which supplier is linked to which order or shipment, where the shipment was last reported, its latest expected arrival, and whether a delay will affect a project or warehouse.",
];

export const API_GROUPS: string[] = [
  "/suppliers, /supplier-commitments, /supplier-scorecards",
  "/purchase-requests, /rfqs, /quotes, /purchase-orders, /contracts, /approvals",
  "/documents, /bills-of-lading, /document-reconciliations, /discrepancies",
  "/imports, /shipments, /containers, /shipment-legs, /milestones, /eta-observations, /tracking-health",
  "/warehouses, /inventory-positions, /reservations, /receipts, /quality-inspections, /stock-transfers",
  "/projects, /material-requirements, /site-deliveries",
  "/assets, /telemetry-observations, /inspections, /maintenance-work-orders, /certificates",
  "/exceptions, /tasks, /actions, /action-results, /audit-events, /integration-health",
];

export const EVENT_ENVELOPE = `{
  "event_id": "uuid",
  "event_type": "shipment.milestone.observed.v1",
  "event_version": 1,
  "occurred_at": "2026-10-15T08:20:00Z",
  "received_at": "2026-10-15T08:20:06Z",
  "source_system": "carrier_adapter_name",
  "source_event_id": "provider-event-id-or-null",
  "correlation_id": "workflow-correlation-id",
  "idempotency_key": "stable-source-derived-key",
  "entity_refs": { "shipment_id": "canonical-id-or-null", "container_id": "canonical-id-or-null", "po_id": "canonical-id-or-null", "bol_id": "canonical-id-or-null" },
  "payload": {},
  "evidence_refs": ["evidence-id"],
  "quality": { "validation_status": "validated|partial|quarantined", "freshness": "fresh|aging|stale|unknown", "confidence": null }
}`;

export const OUTPUT_FORMAT_SECTIONS: string[] = [
  "Decision summary — recommended architecture and major boundaries.",
  "Evidence and unknowns — facts, public evidence, proposed scope and validation items.",
  "System context and diagrams — logical architecture plus sequences for closed-loop flows.",
  "Module architecture — all modules listed individually, including BOL and live import tracking.",
  "Data model and event/API contracts — identifiers, relationships, source provenance and state machines.",
  "Closed-loop operating workflows — trigger, decision, approval, execution and verified close.",
  "Runtime resilience and security — failure handling, audit, access and recovery.",
  "Acceptance and test matrix — positive, negative, duplicate, stale, failure and recovery tests.",
  "Implementation phases and decision gates — dependencies and what evidence unlocks the next phase.",
  "Two-pass review results — specific findings, corrections made, and remaining blockers.",
];
