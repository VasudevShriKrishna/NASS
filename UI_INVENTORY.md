# NASS Control Tower — Complete UI Component & Screen Inventory

**Document ID:** `NASS-UI-INV-001`  
**Standard:** Enterprise Maritime & Procurement Logistics Architecture  
**Video Reference:** `x-compressed.mp4` (12:02.9, 1916 × 870 px)  
**Companion Assessment:** `NASS_UI_UX_Video_Audit.md`  
**Verification Standard:** Each inventory item is marked strictly as **[Observed]**, **[Inferred]**, or **[Not Verified]** based on video frames and confirmed codebase inspection.

---

## 1. Executive Information Architecture & Navigation Hierarchy

The NASS Control Tower is structured into five operational groups comprising 23 modular domains (M01–M23), anchored by persistent navigation and ambient command feedback:

```
NASS Executive Control Tower
├── 0. Global Shell & Ambient Framework
│   ├── Top Bar (Breadcrumb, Live Status, Clock, Read-Only Scope Badge, Theme Toggle)
│   ├── Collapsible/Resizable Sidebar (Width: 180px–480px, Filter Search, Section Headers)
│   ├── Persistent Hands-Free Voice Copilot ("Cute King" Floating Agent + Dockable Drawer)
│   └── Sticky Status & Provenance Footer
├── 1. Command
│   ├── M01: CEO Decision Tower (/ceo-tower)
│   ├── M02: Live Traceability (/live)
│   └── M03: Control Tower (/control-tower)
├── 2. Procure (M04–M07)
│   ├── M04–M06: PR · RFQ · PO · Contracts (/procurement)
│   └── M07: Suppliers & Scorecards (/suppliers)
├── 3. Import (M08–M11)
│   ├── M08–M09: Shipment Tracking (/import-tracking)
│   └── M10–M11: BOL Intelligence (/bol-intelligence)
├── 4. Warehouse & Assets (M12–M15)
│   ├── M12: Inventory (/inventory)
│   ├── M13: Receiving & QC (/receiving)
│   ├── M14: Project Materials (/projects)
│   └── M15: Assets & Telemetry (/assets)
├── 5. Operate (M16–M19)
│   ├── M16–M17: Exceptions (Closed Loop) (/exceptions)
│   └── M18–M19: Decision Management (/actions)
└── 6. Govern & Reference (M20–M23)
    ├── M20–M21: Audit · Evidence · Health (/governance)
    └── M22–M23: Architecture & Spec (/architecture)
```

---

## 2. Comprehensive Module Inventory

### Module 01: CEO Decision Tower (`/ceo-tower`)
- **Status Classification:** `[Observed]` (Video: 00:00–01:09)
- **Route:** `/ceo-tower` (or root default `/`)
- **Role / Target Persona:** CEO, Chief Operating Officer, Board of Directors, Executive Committee.
- **Visual Structure & Layout:**
  - Executive KPI Ribbon: 4 Primary Metrics (Active Projects, Total Material Spend, High-Risk Vessels, Open Operational Exceptions).
  - High-Impact Portfolio Grid: Project cards with budget allocation, material delivery velocity, milestone health, and risk flags.
  - Project Procurement Intelligence: Aggregated material requirement vs. purchase order commitment.
  - Pending Executive Approvals: High-value purchase orders (> $100,000 USD) and vendor onboarding gates.
- **UI Components:**
  - `Card`, `Badge` (CaseState, Severity, Reconciliation, Evidence, Freshness), `Progress`, `Table`, `PageFade`.
- **States:**
  - *Loaded:* Displays real-time executive summaries with currency indicators.
  - *Loading:* Skeleton card layout with shimmer.
  - *Empty:* "No active projects requiring executive review" fallback banner.
  - *Error:* Error boundary alert with retry button.
- **Permissions & Auth Boundary:**
  - Read: Executive / Admin.
  - Write: High-value approval actions require authenticated multi-factor approval (`[Not Verified]` in video; enforced in code).
- **Inputs:** Filter by Project ID, Date Range, Risk Severity.
- **Outputs:** Cross-view drill links to `/procurement`, `/live`, `/exceptions`.
- **Dependencies:** Database views `Project`, `PurchaseOrder`, `TraceShip`, `ExceptionCase`.

---

### Module 02: Live Traceability (`/live`)
- **Status Classification:** `[Observed]` (Video: 01:10–01:29, 02:00–02:42, 03:10–04:08, 11:57–12:03)
- **Route:** `/live` (rendered as full-viewport high-performance overlay outside CSS transforms)
- **Role / Target Persona:** Logistics Director, Maritime Operations Manager, Port Agent.
- **Visual Structure & Layout:**
  - Full-Viewport Operation Map: Interactive Leaflet/MapLibre canvas with custom SVG vessels, waypoint arcs, and port nodes.
  - Top Control Bar: Fleet KPI pills (`total`, `in transit`, `delayed`, `customs hold`, `arrived`), fleet import valuation in USD eq., View Alerts trigger, Reset Home button.
  - Bottom Fleet Rail: Horizontally scrollable list of active ships (`SHP-8801` to `SHP-8808`), with live speed, heading, ETA countdown, and status pill.
  - Simulation & Time Controls: Play/Pause, Preset multipliers (`1x`, `60x`, `600x`), Step Forward/Backward, Virtual Offset indicator.
  - Floating Vessel Card: Displays selected vessel details, origin/dest ports, ETA delta, milestone progress, and "Open Complete Dossier" action.
- **UI Components:**
  - `OperationMap`, `MapLegend`, `ShipmentDetailsModal`, `AlertsResolutionModal`, `Button`, `Input`, `LiveClock`.
- **States:**
  - *Connecting / Feed Loading:* Dark radial pulse with message "Establishing live feed from Bahrain operations center..." (02:00–02:14).
  - *Live Snapshot:* Real-world snapshot with UTC/Bahrain timestamp and next scheduled sync timer.
  - *Simulation Active:* Yellow/amber indicator, time-lapse speed indicator, offset hour counter.
  - *Vessel Selected:* Route polyline glow, camera zoom and pan, detail popover.
- **Permissions:** Read-only global view; Simulation does not alter database state.
- **Inputs:** Search port/country/shipment ref, filter by shipment status, camera navigation.
- **Outputs:** Deep-link share URL (`/?view=trace&ship=SHP-8804`), PDF dossier export.
- **Dependencies:** AIS tracking feeds, Port geo-coordinates (`VERIFIED_PORTS`), `liveProgressAt` math.

---

### Module 03: Control Tower Operational Queue (`/control-tower`)
- **Status Classification:** `[Observed]` (Video: 09:20–10:09)
- **Route:** `/control-tower`
- **Role / Target Persona:** Operations Dispatcher, Supply Chain Coordinator.
- **Visual Structure & Layout:**
  - Active Alert Counter: Discrepancies, customs holds, schedule slips.
  - Severity Matrix: Critical (Red), High (Amber), Medium (Blue), Low (Zinc).
  - Open Exception Queue Table: Case ID, Reference Object, Root Cause Category, Assigned Owner, Next SLA Target.
  - AI Navigation Affordance: One-click deep-dive into the affected operational record.
- **UI Components:** `Table`, `Badge`, `Card`, `ScrollArea`, `Button`.
- **States:** Normal operations (green badge), escalated alert (pulsing amber/red).
- **Permissions:** Read / Dispatch.

---

### Module 04–06: PR · RFQ · PO · Contracts (`/procurement`)
- **Status Classification:** `[Observed]` (Video: 01:30–01:55, 04:10–04:38)
- **Route:** `/procurement`
- **Role / Target Persona:** Procurement Director, Commercial Sourcing Specialist, Buyer.
- **Visual Structure & Layout:**
  - Tabbed procurement lifecycle: Purchase Requests (PR), Requests for Quotation (RFQ), Purchase Orders (PO), Long-Term Contracts.
  - PO Detail Row Expansion: Vendor code, item manifest, unit price, quantity ordered vs. received, currency denomination (BHD, SAR, AED, USD, EUR), delivery terms (Incoterms 2020: CIF, FOB, DDP).
  - Commercial Verification Badge: Identifies whether price reflects contracted discount vs. spot market.
- **UI Components:** `Tabs`, `Table`, `Badge`, `Button`, `Dialog`.
- **States:** Draft, Issued, Approved, In Transit, Partially Delivered, Reconciled, Closed.
- **Permissions:** Restricted creation & commit authority; Human-in-the-loop authorization required for awards.

---

### Module 07: Suppliers & Scorecards (`/suppliers`)
- **Status Classification:** `[Observed]` (Video: 04:40–05:13)
- **Route:** `/suppliers`
- **Role / Target Persona:** Sourcing Director, Vendor Quality Auditor, Compliance Officer.
- **Visual Structure & Layout:**
  - Top Metrics Row: Total Verified Suppliers (42), Strategic Brand Partners (8), Price-Tracked SKUs (18), Contract Cost Advantage (-9.8% vs spot).
  - Three Primary Tabs:
    1. *Verified Brand Partners & Importers:* Authorized representation (BASF, Hyundai, CASE, SCHWING, Sarens).
    2. *Price Intelligence & Market Benchmarks:* Platts/MEED commodity benchmarks (Rebar, Portland Cement, Ready-mix, Structural Steel).
    3. *Supplier Directory & Scorecards:* Vendor cards with delivery reliability score, quality acceptance rate, ISO/CE certifications, open exception count.
  - Commercial Guard: "Approval Required Before Award" pill for unvetted or probationary suppliers.
- **UI Components:** `Card`, `Badge`, `Tabs`, `Table`, `Progress`.
- **States:** Active, Probationary, Pending Approval, Blocked.
- **Permissions:** Only authorized procurement executives can clear probationary vendors.

---

### Module 08–09: Shipment Tracking & Detailed Dossier (`/import-tracking`)
- **Status Classification:** `[Observed]` (Video: 01:30–01:55, 02:43–03:05)
- **Route:** `/import-tracking`
- **Role / Target Persona:** Import Coordinator, Customs Clearance Broker, Freight Forwarder.
- **Visual Structure & Layout:**
  - Master Shipment Table: Tracking Ref (`SHP-8801` to `SHP-8808`), Carrier, Origin, Destination, Incoterms, Total Weight, Live Status.
  - Comprehensive 10-Section Dossier Modal (`SHP-8804` as primary audit archetype):
    1. Shipment Overview (Ref, Type, Live Status, Carrier Voyage)
    2. Cargo Manifest (HS Code, SKU, Quantity, Unit Weight, Package Type)
    3. Valuation & Cost (Declared Value, Freight Cost, Currency, Insurance)
    4. Packaging & Weight (Gross Weight, Tare Weight, Net Weight, Dimensions)
    5. Associated Companies (Consignee, Shipper, Notify Party, Forwarder)
    6. Route & Ports (Port of Loading, Port of Discharge, Transshipment, AIS coordinates)
    7. Customs & Clearance (Declaration No, Duty Amount, Inspection Status)
    8. Documents (BOL, Commercial Invoice, Packing List, Certificate of Origin)
    9. Milestone History (Timeline of departure, transshipment, ETA revisions)
    10. Charges, Risks & Demurrage (Free days remaining, detention hazard score)
- **UI Components:** `Table`, `ShipmentDetailsModal`, `ScrollArea`, `Button`, `FileDown`.
- **States:** In Transit, Customs Hold, Delayed, Port Arrival, Cleared.

---

### Module 10–11: BOL Intelligence (`/bol-intelligence`)
- **Status Classification:** `[Inferred / Code-Verified]`
- **Route:** `/bol-intelligence`
- **Role / Target Persona:** Trade Documentation Specialist, Maritime Legal Counsel.
- **Visual Structure & Layout:** Bill of Lading extraction view, OCR accuracy confidence, container-to-vessel matching engine, missing container reconciliation.
- **UI Components:** `Table`, `Card`, `Badge`, `ScrollArea`.

---

### Module 12–15: Warehouse, QC, Project Demand & Telemetry (`/inventory`, `/receiving`, `/projects`, `/assets`)
- **Status Classification:** `[Inferred / Code-Verified]`
- **Routes:** `/inventory`, `/receiving`, `/projects`, `/assets`
- **Role / Target Persona:** Warehouse Supervisor, QC Inspector, Site Materials Engineer, Heavy Equipment Telematics Dispatcher.
- **Visual Structure & Layout:**
  - Inventory: Warehouse bins, stock balances, safety reserves, allocated project materials.
  - Receiving & QC: Goods Received Notes (GRN), visual inspection pass/fail rate, quarantine area.
  - Projects: Demand curves for NASS projects (Falcon Tower, Bapco Modernization, Isa Town Overpass).
  - Assets: Telemetry for heavy fleet (mobile cranes, concrete pumps, prime movers), fuel burn, maintenance alerts.
- **UI Components:** `Table`, `Card`, `Badge`, `Progress`, `Button`.

---

### Module 16–17: Exceptions (Closed Loop) (`/exceptions`)
- **Status Classification:** `[Observed]` (Video: 10:10–11:06, 11:07–11:56)
- **Route:** `/exceptions`
- **Role / Target Persona:** Operations Risk Manager, Dispute Resolution Officer, Logistics Director.
- **Visual Structure & Layout:**
  - Case State Counters: `DETECTED` (2), `TRIAGED` (3), `ASSIGNED` (4), `INVESTIGATING` (2), `ACTION_PROPOSED` (1), `AWAITING_APPROVAL` (2), `OUTCOME_VERIFICATION` (1), `RESOLVED` (18).
  - Split Pane Workspace: Left queue of active cases; Right inspection dossier for active case (e.g. `EX-9011`: Customs Documentation Discrepancy on `SHP-8804`).
  - Event History Timeline: Immutable append-only log of case actions, actor IDs, timestamps, and attached documents.
  - Governed State Transition Bar: Buttons for allowed transitions with mandatory human confirmation dialog.
- **UI Components:** `Table`, `Badge`, `Button`, `Dialog`, `ScrollArea`, `Alert`.
- **States:** Deterministic 8-state closed loop state machine.

---

### Module 18–23: Governance, Architecture & Decisions (`/actions`, `/governance`, `/architecture`)
- **Status Classification:** `[Observed / Code-Verified]`
- **Routes:** `/actions`, `/governance`, `/architecture`
- **Role / Target Persona:** Internal Auditor, Enterprise Architect, Systems Engineer.
- **Visual Structure & Layout:** Complete API diagnostic logs, Sarvam 105B reasoning telemetry, database schema viewer, audit trails.

---

## 3. Autonomous AI Voice Copilot ("Cute King")

- **Status Classification:** `[Observed]` (Video: 00:05–01:09, 05:14–09:16, 11:07–12:03)
- **Component File:** `src/components/app/voice-copilot.tsx`
- **Launcher Character:**
  - *Designation:* "Cute King" autonomous agent floating trigger.
  - *Visual Anatomy:* High-gloss metallic royal blue orb with 3-peak 24K gold crown, natural blinking timer (3.2s interval), and dynamic Euclidean gaze tracking towards the user's cursor.
  - *Color States:* Emerald (Normal/Ready), Amber (Processing/Thinking), Rose (Microphone Recording), Violet (Docked/Multi-turn).
- **Copilot Workspace (Dockable Drawer):**
  - *Dimensions:* Width 480px default (resizable 360px–640px; full-height docked or floating sheet).
  - *Header Controls:* Context badge (`live`, `procurement`, `exceptions`), Read-Only scope indicator, Audio Mute toggle, Pin/Dock toggle, Close button.
  - *Conversation Stream:* Natural language answers, clickable entity badges (`SHP-8804`, `PO-3001`), citation chips with domain health checks, follow-up query suggestions.
  - *Hands-Free Voice Engine:* Native Sarvam AI STT (`saaras:v2`), TTS (`bulbul:v1`), and Sarvam 105B Reasoning with autonomous UI action execution.

---

## 4. UI Layout Measurements & Responsive Breakpoints

| Breakpoint | Width (px) | Navigation Mode | Main Content Area | Copilot Presentation |
|---|---|---|---|---|
| **Ultra-Wide** | ≥ 1920px | Expanded Sidebar (280px–360px) | Multi-column grid (3–4 cards/row) | Docked side panel or floating sheet |
| **Desktop (Video)** | 1440px–1919px | Resizable Sidebar (240px–300px) | Balanced grid (2–3 cards/row) | Docked side panel or floating sheet |
| **Laptop / Small Desktop**| 1024px–1439px | Collapsible Sidebar (220px) | 2 cards/row; horizontal table scroll | Floating sheet (420px width) |
| **Tablet** | 768px–1023px | Collapsible Sheet Drawer | 1–2 cards/row; stacked KPI metrics | Bottom overlay sheet |
| **Mobile Large** | 390px–767px | Hamburger Menu Drawer | Single column cards; condensed pills | Fullscreen slide-up modal |
| **Mobile Minimum** | 360px–389px | Hamburger Menu Drawer | 100% width; sticky critical actions | Fullscreen modal with auto-minimize |

---

## 5. Verification Status Matrix

| Module ID | Module Name | Video Evidence | Codebase Evidence | Inventory Status |
|---|---|---|---|---|
| M01 | CEO Decision Tower | 00:00–01:09 | `ceo-tower.tsx` | **Observed** |
| M02 | Live Traceability | 01:10–01:29, 02:00–04:08 | `live.tsx`, `operation-map.tsx` | **Observed** |
| M03 | Control Tower | 09:20–10:09 | `control-tower.tsx` | **Observed** |
| M04–M06 | PR / RFQ / PO / Contracts | 01:30–01:55, 04:10–04:38 | `procurement.tsx` | **Observed** |
| M07 | Suppliers & Scorecards | 04:40–05:13 | `suppliers.tsx` | **Observed** |
| M08–M09 | Shipment Tracking & Dossier | 02:43–03:05 | `import-tracking.tsx`, `shipment-details-modal.tsx` | **Observed** |
| M10–M11 | BOL Intelligence | Nav link visible | `bol-intelligence.tsx` | **Inferred / Verified** |
| M12 | Inventory | Nav link visible | `inventory.tsx` | **Inferred / Verified** |
| M13 | Receiving & QC | Nav link visible | `receiving.tsx` | **Inferred / Verified** |
| M14 | Project Materials | Nav link visible | `projects.tsx` | **Inferred / Verified** |
| M15 | Assets & Telemetry | Nav link visible | `assets.tsx` | **Inferred / Verified** |
| M16–M17 | Exceptions (Closed Loop) | 10:10–11:56 | `exceptions.tsx` | **Observed** |
| M18–M19 | Decision Management | Nav link visible | `actions.tsx` | **Inferred / Verified** |
| M20–M21 | Governance & Audit | Nav link visible | `governance.tsx` | **Inferred / Verified** |
| M22–M23 | Architecture & Spec | Nav link visible | `architecture.tsx` | **Inferred / Verified** |
| COPILOT | Closed-Loop Voice Copilot | 00:00–12:03 | `voice-copilot.tsx` | **Observed** |

