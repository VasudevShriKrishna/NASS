# NASS Control Tower — Comprehensive UI/UX Defect Registry & Audit Log

**Document ID:** `NASS-UI-ISS-001`  
**Video Reference:** `x-compressed.mp4` (12:02.9, 1916 × 870 px)  
**Baseline Standard:** WCAG 2.2 Level AA / Industrial Maritime Mission-Critical HMI  
**Total Documented Defects:** 25 Issues (P0: 1, P1: 14, P2: 10)  

---

## Issue Registry Summary Matrix

| ID | Priority | Timecode | Screen / Component | Brief Description | Status |
|---|---|---|---|---|---|
| **UX-01** | **P0** | ~08:15 | AI Copilot Citations | External citation link opens a third-party 404 page ("Page not found"). | Verified & Remediated |
| **UX-02** | **P1** | 00:05, 06:15, 09:45 | AI Copilot Drawer | Floating copilot overlay obscures right-side data and active tasks. | Remediated (Dock/Pin Added) |
| **UX-03** | **P1** | 02:45 | `ShipmentDetailsModal` | 10+ horizontal section tabs cause label truncation & competing scrollbars. | Remediated (Grouped Nav) |
| **UX-04** | **P1** | 01:15, 03:30 | `LiveTraceabilityView` | "LIVE MAP", "hourly snapshot", "SIM" and accelerated time coexist ambiguously. | Remediated (State Banners) |
| **UX-05** | **P1** | Full Video | Typography & Density | Dense, small text (10–11px) and tight table rows impede scan speed. | Remediated (Tokens Raised) |
| **UX-06** | **P1** | 11:45 | Theme Switcher | Light content view paired with dark copilot overlay creates contrast jarring. | Remediated (Dual-Surface) |
| **UX-07** | **P1** | 06:15 | AI Copilot Spatial Query | "Nearest shipment" ranked without exposing distance formula, origin, or units. | Documented & Verified |
| **UX-08** | **P1** | 06:15 | AI Copilot Telemetry | Copilot latency displays 16,133 ms without progressive thinking indicators. | Remediated (Live Progress) |
| **UX-09** | **P1** | 04:45 | `SuppliersView` | "100% Verified" conflicts with "Pending Approval — Award Blocked" warning. | Remediated (Clarity Badge) |
| **UX-10** | **P1** | 01:15 | Map Status Pills | Multiple shipment states rely exclusively on color hue without distinct icons. | Remediated (Icon Badges) |
| **UX-11** | **P1** | 10:15–11:45 | `ExceptionsView` | Exception state transitions lack role authorization check & confirmation dialog. | Remediated (Auth Guards) |
| **UX-12** | **P1** | 02:00 | Map Loading Canvas | Map goes completely blank during feed establishment without retry action. | Remediated (Loading Shimmer) |
| **UX-13** | **P2** | 00:05 | AI Copilot Header | Header crowded with redundant buttons ([Hands-Free: ON], [+ Set Key], [Mic]). | Remediated (Streamlined) |
| **UX-14** | **P2** | 09:45 | AI Follow-up Chips | Suggests "Open Control Tower" when user is already viewing the Control Tower. | Remediated (Context Check) |
| **UX-15** | **P1** | 01:15 | Fleet KPI Totals | Fleet value shown in USD eq. without exposing currency FX rates, dates, or zeros. | Remediated (FX Provenance) |
| **UX-16** | **P2** | 02:45 | Modal Footer | Nested body scroll conflicts with outer page and modal viewport traps. | Remediated (Unified Scroll) |
| **UX-17** | **P2** | 04:45 | Badge Taxonomy | Multiple conflicting badge palettes used across vendor classification. | Remediated (Design System) |
| **UX-18** | **P2** | 10:15 | Split Pane Exceptions | Exception queue table truncates case titles and assigned owner names. | Remediated (Flexible Grid) |
| **UX-19** | **P1** | 00:05, 04:45 | Data Provenance | "Read-only", "Verified", "Fresh", "Proposed" badges lack tooltip definitions. | Remediated (Info Badges) |
| **UX-20** | **P2** | 05:15–08:45 | Copilot Message Width | Long answers and dozens of link chips create vertical fatigue in narrow drawer. | Remediated (Card Layout) |
| **UX-21** | **P2** | 07:45–08:45 | Multilingual QA | Gujarati language translation does not preserve numeric and shipment IDs. | Remediated (Entity Invariant)|
| **UX-22** | **P1** | 11:45–12:00 | Voice Dictation State | Ambiguous microphone permission denial state without manual retry guide. | Remediated (Permission Guard)|
| **UX-23** | **P2** | 01:15, 03:45 | Map Toolbars | Map toolbars have small icons without clear text labels on tablet viewports. | Remediated (Labeled Buttons) |
| **UX-24** | **P2** | Full Video | Card Visual Hierarchy | Excessive decorative borders and glow effects diminish operational focal point. | Remediated (Subtle Borders) |
| **UX-25** | **P1** | Full Video | Accessibility & Zoom | Layout clips horizontal navigation and modals at 200% browser zoom. | Remediated (Flex Wrapping) |

---

## Detailed Defect Audits (UX-01 through UX-25)

### UX-01: External AI Citation Opens Dead 404 Destination (P0)
- **Timecode:** ~08:15
- **Affected Persona & Task:** Executive / Sourcing Specialist verifying maritime port authority notices.
- **Observed Behavior:** The AI copilot answered a query regarding Gulf maritime transit disruptions and provided an external link chip. Clicking the link opened a third-party webpage displaying: `"404 — Page Not Found"`.
- **Reproducibility:** 100% when third-party URLs expire, move, or block crawlers.
- **Operational Impact:** Destroys user trust in the AI copilot. Executive decisions based on purported "verified source citations" cannot be audited if the citation is broken.
- **Root-Cause Hypothesis:** The AI engine hallucinated or surfaced an unvalidated static URL from pre-training or unverified search results without checking HTTP HEAD/GET status at display time.
- **Acceptance Criteria:**
  1. The application verifies all external citation URLs asynchronously via a server-side HEAD/GET check.
  2. If a destination returns 404, 410, or timeout (> 3000ms), the UI displays a warning badge: `[⚠️ Destination Unreachable]`.
  3. Clicking an unreachable citation opens a graceful cached summary from internal intelligence rather than forwarding the user to a broken web page.

---

### UX-02: Copilot Overlay Occludes Critical Right-Side Screen Information (P1)
- **Timecode:** 00:05, 06:15, 09:45, 10:15
- **Affected Persona & Task:** Operations Dispatcher cross-referencing exceptions and vessel tracking while conversing with AI.
- **Observed Behavior:** The AI Copilot drawer opened as a fixed floating sheet (`width: 480px`, `z-index: 90`) anchored to the bottom-right corner. It completely covered table columns, action buttons, and details on the right half of the host page.
- **Reproducibility:** 100% on viewports between 1024px and 1920px.
- **Operational Impact:** Users cannot verify data being discussed without constantly closing and reopening the drawer.
- **Root-Cause Hypothesis:** Copilot implemented solely as an absolute/fixed modal overlay rather than a dockable side panel.
- **Acceptance Criteria:**
  1. Copilot drawer features a **Pin / Dock toggle** button in the header.
  2. When pinned, the main page content width automatically contracts (`margin-right: 480px` or CSS flex layout), eliminating occlusion.
  3. When unpinned, user can minimize the copilot with conversation history and scroll position preserved.

---

### UX-03: Shipment Dossier Section Navigation Truncation at High Zoom (P1)
- **Timecode:** 02:45
- **Affected Persona & Task:** Customs Compliance Officer reviewing 10-section dossier (`SHP-8804`).
- **Observed Behavior:** The 10 sections are rendered as a single horizontal strip of buttons (`1. Overview`, `2. Cargo Manifest`, `...`, `10. Charges & Risks`). On screens < 1440px or at 150%–200% zoom, tabs 7 through 10 disappear off-screen with no obvious scroll affordance.
- **Reproducibility:** 100% on narrow widths or >125% OS zoom.
- **Operational Impact:** Users fail to locate customs declarations, document attachments, and demurrage risks.
- **Root-Cause Hypothesis:** Navigation bar configured with `overflow-x-auto whitespace-nowrap` without grouping or wrapping.
- **Acceptance Criteria:**
  1. Section navigation is structured into logical grouped tabs: `[1. Overview & Manifest]`, `[2. Valuation & Packaging]`, `[3. Route & Customs]`, `[4. Documents & History]`, `[5. Charges & Risks]`.
  2. Sub-navigation wraps gracefully or provides sticky table-of-contents sidebar navigation.
  3. Accessible via keyboard tab traversal without mouse scrolling.

---

### UX-04: Ambiguous Coexistence of Live Snapshot and Accelerated Simulation (P1)
- **Timecode:** 01:15, 03:30
- **Affected Persona & Task:** Port Operations Planner determining true vessel arrival times.
- **Observed Behavior:** The map displayed `LIVE MAP`, `hourly snapshot`, and `60x SIM` simultaneously. It was impossible to determine whether the vessel position shown was the actual physical GPS location or a simulated projection 12 hours into the future.
- **Reproducibility:** 100% when simulation playback is engaged.
- **Operational Impact:** Severe risk of scheduling port berths, stevedores, and haulage trucks based on hypothetical future simulations rather than actual ship positions.
- **Root-Cause Hypothesis:** Lack of mutually exclusive state separation between real-time data feeds and synthetic time-lapse scenarios.
- **Acceptance Criteria:**
  1. When in Live Mode: Display persistent green banner: `[🟢 LIVE SNAPSHOT] Hourly Feed Synced: 2026-10-29 01:00 UTC`.
  2. When in Simulation Mode: Display prominent amber striped banner across the map: `[🔶 SCENARIO SIMULATION ACTIVE] Speed: 60x | Virtual Time: +4.2h | Real AIS Suspended`.
  3. A single-click button `[Return to Live Feed]` immediately resets the map to authoritative real-time positions.

---

### UX-05: Typography Scale and Information Density at 1916px Width (P1)
- **Timecode:** Full Video (00:00–12:00)
- **Affected Persona & Task:** Senior Executives and Dispatchers viewing monitors at arm’s length.
- **Observed Behavior:** Widespread use of 9px, 10px, and 11px font sizes with tight line heights (`leading-none`), creating visual strain and slow reading speeds on large desktop displays.
- **Reproducibility:** Constant across all views.
- **Operational Impact:** Fatigue and increased likelihood of misreading critical serial numbers or financial figures.
- **Root-Cause Hypothesis:** Arbitrary Tailwind utility classes (`text-[9px]`, `text-[10px]`) applied without adherence to a standardized type scale.
- **Acceptance Criteria:**
  1. Minimum body typography standardized to 14px (`text-sm`) with 20px line height (`leading-relaxed`).
  2. Table metadata and badges standardized to minimum 12px (`text-xs`).
  3. Serial numbers and reference IDs rendered in monospace with tabular figures (`font-mono tabular-nums`).

---

### UX-06: Harsh Contrast Disparity in Light Mode with Dark Copilot (P1)
- **Timecode:** 11:07–11:56
- **Affected Persona & Task:** Users operating in daylight environments switching to Light Theme.
- **Observed Behavior:** Switching to light theme turned the background white/light gray (`oklch(0.98)`), but the Copilot drawer retained an opaque pitch-black background (`bg-[#0c0e14]`) with stark amber text.
- **Reproducibility:** 100% when ThemeToggle is activated while Copilot is open.
- **Operational Impact:** Visual jarring, eye strain, and violation of design cohesion.
- **Root-Cause Hypothesis:** Hardcoded dark background tokens (`bg-[#0c0e14]`) in `voice-copilot.tsx` instead of semantic CSS variables.
- **Acceptance Criteria:**
  1. Copilot drawer adapts seamlessly to Light Mode: background transitions to `bg-card` (`oklch(0.97)`), border to `border-border`, and text to high-contrast `text-foreground`.
  2. Contrast ratio meets or exceeds WCAG 2.2 AA (minimum 4.5:1 for normal text).

---

### UX-07: Spatial Query Lacks Calculation Provenance and Geometry (P1)
- **Timecode:** 06:15
- **Affected Persona & Task:** Fleet Logistics Manager asking: *"Which ship is nearest to Bahrain?"*
- **Observed Behavior:** AI responded that `SHP-8802` is closest, followed by `SHP-8804`, without stating reference origin coordinates, distance measurement mode (haversine vs nautical channel), or timestamp.
- **Reproducibility:** 100% on geographic copilot queries.
- **Operational Impact:** User cannot independently verify whether "nearest" means straight-line distance over land or navigable maritime voyage distance.
- **Root-Cause Hypothesis:** LLM answering from descriptive metadata rather than executing a deterministic geospatial tool call.
- **Acceptance Criteria:**
  1. AI answers must explicitly display:
     - Origin: *Khalifa Bin Salman Port (26.29° N, 50.62° E)*
     - Calculation Mode: *Nautical Great-Circle Routing*
     - Exact Value & Units: *42.4 Nautical Miles (78.5 km)*
     - AIS Timestamp: *Reported 12 minutes ago*.

---

### UX-08: Excessive AI Latency (16,133ms) Without Staged Feedback (P1)
- **Timecode:** 06:15
- **Affected Persona & Task:** Operations Dispatcher awaiting urgent fleet status.
- **Observed Behavior:** A diagnostic label in the Copilot indicated `Latency: 16133ms` (16.1 seconds). During this interval, the UI displayed only a static spinner with no progress indication.
- **Reproducibility:** Occurs during complex multi-tool retrieval or slow LLM generation.
- **Operational Impact:** Users assume the system has frozen, leading to repeated clicks and aborted queries.
- **Root-Cause Hypothesis:** Monolithic server-side execution without Server-Sent Events (SSE) streaming or staged progress states.
- **Acceptance Criteria:**
  1. First token / thinking state displayed within 800ms (`"Consulting maritime AIS feed..."` -> `"Calculating port distance..."`).
  2. Dedicated cancel button allowing operator to abort query immediately.
  3. Target P50 response latency < 2,500ms; P95 < 5,000ms.

---

### UX-09: Contradictory Supplier Verification and Award Governance Badges (P1)
- **Timecode:** 04:45
- **Affected Persona & Task:** Buyer reviewing supplier `SUP-1002` (Gulf Equipment Supplies).
- **Observed Behavior:** The screen prominently displayed a summary card declaring `100% Verified`, but the vendor card immediately below warned: `approval required before award`.
- **Reproducibility:** 100% on `/suppliers` view.
- **Operational Impact:** Creates confusion regarding whether the vendor is cleared for immediate contract award or blocked by procurement policy.
- **Root-Cause Hypothesis:** Overloading the term "Verified" to mean legal registration verification while ignoring commercial procurement approval status.
- **Acceptance Criteria:**
  1. Renamed summary card to: `Data Verified: 100% (Corporate Records)`.
  2. Added distinct three-tier status badges:
     - `Identity: Corporate Records Verified`
     - `Compliance: ISO 9001 Audited`
     - `Award Authority: Pending Commercial Sign-off (Award Blocked)`.
  3. Tooltip explicitly explains the distinction to buyers.

---

### UX-10: Single-Cue Colorblind Inaccessibility on Map Route Status (P1)
- **Timecode:** 01:15
- **Affected Persona & Task:** Color-vision deficient operators distinguishing Delayed vs In Transit vessels.
- **Observed Behavior:** Vessel statuses on the map and fleet rail relied solely on colored circles: Green (In Transit), Red (Delayed), Amber (Customs Hold).
- **Reproducibility:** Constant across map markers.
- **Operational Impact:** Violates WCAG 2.2 Success Criterion 1.4.1 (Use of Color). Colorblind users cannot differentiate between delayed and on-time shipments.
- **Root-Cause Hypothesis:** Visual styling relied exclusively on `background-color` without distinct iconography or pattern styling.
- **Acceptance Criteria:**
  1. Every status badge and map marker combines color with a distinctive SVG icon:
     - `In Transit`: Ship icon + Blue
     - `Delayed`: Clock/Alert icon + Red
     - `Customs Hold`: Shield/Alert icon + Amber
     - `Arrived`: CheckCircle icon + Emerald.
  2. Distinct dashed/solid polyline patterns on the map for delayed routes.

---

### UX-11: Ungoverned Exception State Transition Lacks Human Confirmation (P1)
- **Timecode:** 10:15–11:45
- **Affected Persona & Task:** Dispute Officer closing exception `EX-9011`.
- **Observed Behavior:** State transition buttons (`Action Proposed`, `Resolved`) were directly clickable in the UI without requiring an authenticated identity, justification reason, or confirmation step.
- **Reproducibility:** 100% on `/exceptions` view.
- **Operational Impact:** Severe compliance risk. An accidental click could prematurely close a critical customs violation without legal resolution.
- **Root-Cause Hypothesis:** State updater hooked directly to REST endpoint without intermediate modal dialog or authorization checks.
- **Acceptance Criteria:**
  1. All state transitions trigger a confirmation modal displaying:
     - Target State Transition (`INVESTIGATING` -> `RESOLVED`)
     - Mandatory Reason Textfield (minimum 10 characters)
     - Attached Evidence Document requirement for `RESOLVED` status
     - Current Authenticated User ID and Timestamp.
  2. State changes are written to an append-only immutable audit trail.

---

### UX-12: Blank Map Canvas During Feed Loading Without Recovery (P1)
- **Timecode:** 02:00–02:14
- **Affected Persona & Task:** Dispatcher opening `/live` during intermittent network connectivity.
- **Observed Behavior:** The map canvas went entirely black for 14 seconds with only a small loading text in the center. If the network stalled, no retry button or cached fallback was provided.
- **Reproducibility:** Triggered on cold cache or slow network connections.
- **Operational Impact:** Dispatcher cannot determine whether the system has crashed or is establishing a connection.
- **Root-Cause Hypothesis:** Client-side dynamic import of map library blocking render without progressive SVG outline skeleton.
- **Acceptance Criteria:**
  1. Map displays immediate vector landmass silhouette and last-known cached positions while live feed connects.
  2. If connection exceeds 8,000ms, display actionable alert: `[⚠️ Feed Delayed — Showing Cached Snapshot from 01:00 UTC] [Retry Connection]`.

---

### UX-13: Cluttered Copilot Drawer Header with Redundant Toggles (P2)
- **Timecode:** 00:05
- **Affected Persona & Task:** Voice Copilot user attempting to quickly start or stop audio.
- **Observed Behavior:** The top header of the Copilot drawer contained 6 simultaneous controls: `[NASS Closed-Loop Copilot]`, `[Read-Only]`, `[Hands-Free: ON]`, `[+ Set Key]`, `[Mic: Blocked]`, `[Audio Mute]`, and `[Close]`.
- **Reproducibility:** Constant when drawer is open.
- **Operational Impact:** Excessive cognitive load and visual noise in a compact header space.
- **Root-Cause Hypothesis:** Technical configuration controls (API key entry, microphone diagnostics) placed directly in the main header instead of a settings menu.
- **Acceptance Criteria:**
  1. Streamlined header: Title, Read-Only indicator, Audio Mute toggle, and Close button.
  2. Technical controls moved into a subtle expandable settings gear icon.

---

### UX-14: AI Follow-Up Suggests Navigating to Currently Active View (P2)
- **Timecode:** 09:45
- **Affected Persona & Task:** User already on the Control Tower view inspecting exception queues.
- **Observed Behavior:** The Copilot suggested follow-up actions including: `"Open Control Tower"`. Clicking it reloaded the current screen redundantly.
- **Reproducibility:** Occurs whenever the user asks about exceptions while on `/control-tower`.
- **Operational Impact:** Decreases perception of AI intelligence and wastes user attention.
- **Root-Cause Hypothesis:** Follow-up prompt generator unaware of client store `activeView`.
- **Acceptance Criteria:**
  1. Follow-up suggestion engine filters out navigation targets that match the current `activeView`.
  2. Replaced with context-relevant action: `"Filter queue by Critical exceptions"` or `"Inspect case EX-9011"`.

---

### UX-15: Mixed-Currency Fleet Valuation Lacks Conversion Reference (P1)
- **Timecode:** 01:15
- **Affected Persona & Task:** Chief Financial Officer auditing aggregate inventory in transit.
- **Observed Behavior:** Fleet total displayed `$14,820,000 USD eq.`, while individual shipments in the dossier were denominated in BHD (Bahraini Dinar) and EUR, with some shipments displaying `$0`.
- **Reproducibility:** Constant on fleet metrics row.
- **Operational Impact:** Financial figures cannot be certified without knowing foreign exchange (FX) rates and whether `$0` represents missing data or zero commercial value.
- **Root-Cause Hypothesis:** Summation performed on converted estimates without exposing FX rates or missing-data flags.
- **Acceptance Criteria:**
  1. An accessible tooltip on the fleet value exposes:
     - FX Source: *Central Bank of Bahrain (CBB) Daily Benchmark*
     - Reference Rates: *1 BHD = $2.659 USD | 1 EUR = $1.082 USD*
     - Missing values flagged as `"Pending Valuation"` rather than `$0`.

---

### UX-16: Competing Scroll Regions in Shipment Dossier Modal (P2)
- **Timecode:** 02:45
- **Affected Persona & Task:** Compliance Officer scrolling through large item manifests.
- **Observed Behavior:** Scrolling the mouse wheel inside the modal manifest table caused the outer modal body to scroll unpredictably, resulting in scroll traps.
- **Reproducibility:** 100% on desktop browsers with mouse wheels.
- **Operational Impact:** Frustrating user experience and difficulty reaching bottom sections.
- **Root-Cause Hypothesis:** Unconstrained nested `overflow-y-auto` divs inside the modal container.
- **Acceptance Criteria:**
  1. Single unified primary scroll container for modal content.
  2. Internal tables use fixed-height scroll regions with clear scrollbar styling and wheel isolation (`overscroll-behavior: contain`).

---

### UX-17: Non-Standardized Badge Palette Across Modules (P2)
- **Timecode:** 04:45
- **Affected Persona & Task:** All users scanning tables across Procurement and Suppliers.
- **Observed Behavior:** Inconsistent color mappings for statuses: `Pending` appeared as purple in suppliers, amber in procurement, and blue in exceptions.
- **Reproducibility:** Constant across views.
- **Operational Impact:** Confusion and broken visual pattern recognition.
- **Root-Cause Hypothesis:** Ad-hoc Tailwind utility classes written in individual component files rather than using a central `StatusPill` component.
- **Acceptance Criteria:**
  1. Centralized badge taxonomy in `src/components/app/shared.tsx`:
     - Pending/Triaged: Amber (`bg-amber-500/10 text-amber-300 border-amber-500/30`)
     - Active/In Transit: Sky (`bg-sky-500/10 text-sky-300 border-sky-500/30`)
     - Blocked/Critical: Rose (`bg-rose-500/10 text-rose-300 border-rose-500/30`)
     - Complete/Resolved: Emerald (`bg-emerald-500/10 text-emerald-300 border-emerald-500/30`).

---

### UX-18: Split-Pane Text Truncation in Exceptions Queue (P2)
- **Timecode:** 10:15
- **Affected Persona & Task:** Operations Dispatcher reviewing open exceptions on a 1440px laptop screen.
- **Observed Behavior:** Case titles such as `"Customs Documentation Discrepancy — High Tensile Rebar..."` were clipped to 18 characters, hiding the affected commodity.
- **Reproducibility:** Occurs on split-pane layouts at widths < 1600px.
- **Operational Impact:** Users must click every row to discover what material is impacted.
- **Root-Cause Hypothesis:** Hardcoded column widths with `truncate` class.
- **Acceptance Criteria:**
  1. Queue table uses responsive flex layout with full title wrapping on hover or two-line display.
  2. Split-pane divider supports drag-to-resize.

---

### UX-19: Unexplained Data Provenance Badges (P1)
- **Timecode:** 00:05, 04:45
- **Affected Persona & Task:** New users interpreting badges like `PROPOSED TARGET CAPABILITY` or `READ-ONLY SCOPE (M01)`.
- **Observed Behavior:** Badges displayed acronyms and technical tags without explanatory tooltips or documentation links.
- **Reproducibility:** Constant across header bars.
- **Operational Impact:** Users do not know whether data is real, synthetic, or test scope.
- **Root-Cause Hypothesis:** Badges rendered as static text spans without accessible tooltips.
- **Acceptance Criteria:**
  1. Every provenance badge (`EvidenceBadge`, `FreshnessBadge`) wrapped with an accessible Radix `Tooltip`.
  2. Tooltip explains data origin, sync timestamp, and security boundary.

---

### UX-20: Narrow Column Fatigue in Copilot Message Stream (P2)
- **Timecode:** 05:15–08:45
- **Affected Persona & Task:** Sourcing Specialist reading multi-paragraph supplier analysis.
- **Observed Behavior:** Long textual responses with multiple citations wrapped into a narrow 380px bubble, resulting in over 40 lines of vertical scrolling.
- **Reproducibility:** Constant on detailed AI explanations.
- **Operational Impact:** Reading fatigue and poor scan-ability.
- **Root-Cause Hypothesis:** Monolithic text blocks inside chat bubble.
- **Acceptance Criteria:**
  1. Copilot renders structured responses using compact cards: **Executive Summary**, **Key Evidence Table**, **Next Actions**.
  2. Drawer width resizable up to 640px.

---

### UX-21: Multilingual Entity Invariant Preservation (P2)
- **Timecode:** 07:45–08:45
- **Affected Persona & Task:** Regional Port Officers requesting answers in Gujarati or Arabic.
- **Observed Behavior:** The AI translated responses accurately into Gujarati, but translated English technical codes and ship IDs inconsistently.
- **Reproducibility:** Occurs on translation queries.
- **Operational Impact:** Broken entity links (`SHP-8804` translated into Gujarati numerals cannot be clicked to open records).
- **Root-Cause Hypothesis:** Prompt lacked explicit instructions to keep reference IDs, dates, and ISO currency codes strictly invariant in ASCII.
- **Acceptance Criteria:**
  1. Strict prompt invariant rule: *All Entity IDs (`SHP-*`, `PO-*`, `EX-*`), vessel names, dates, and currency units must remain in standard Latin alphanumeric format regardless of target language.*
  2. Clickable entity badges remain 100% functional in multilingual output.

---

### UX-22: Ambiguous Voice Dictation Permission States (P1)
- **Timecode:** 11:45–12:00
- **Affected Persona & Task:** Hands-free operator attempting voice input after browser microphone permission prompt was dismissed.
- **Observed Behavior:** UI displayed `Mic: Blocked` with no immediate guidance on how to re-enable microphone access in Chrome/Edge.
- **Reproducibility:** Occurs whenever microphone permission is denied or blocked by browser policy.
- **Operational Impact:** Operator is locked out of hands-free interaction without troubleshooting steps.
- **Root-Cause Hypothesis:** Simple boolean flag without browser permission instruction helper.
- **Acceptance Criteria:**
  1. Clicking `Mic: Blocked` displays a dedicated popover explaining: *"Microphone access is blocked by your browser. Click the lock/tune icon in the browser address bar to allow microphone access."*
  2. Prominent manual text input fallback always visible.

---

### UX-23: Unlabeled Map Toolbar Controls on Touch Devices (P2)
- **Timecode:** 01:15, 03:45
- **Affected Persona & Task:** Field Director using an iPad Pro or touch monitor.
- **Observed Behavior:** Map controls featured 16px icon-only buttons without text labels.
- **Reproducibility:** Constant on tablet viewports.
- **Operational Impact:** Users must guess what each icon does (e.g. crosshair vs layers vs compass).
- **Root-Cause Hypothesis:** Desktop-centric icon buttons lacking responsive labels.
- **Acceptance Criteria:**
  1. Buttons include visible text labels or touch-accessible tooltips on touch devices.
  2. Hit targets increased to minimum 40px × 40px for touch reliability.

---

### UX-24: Visual Hierarchy Diluted by Decorative Accents (P2)
- **Timecode:** Full Video (00:00–12:00)
- **Affected Persona & Task:** Operations planners conducting prolonged operational monitoring.
- **Observed Behavior:** Widespread gold glows, ambient floating particles, and layered borders competed with critical status indicators.
- **Reproducibility:** Constant across dark theme.
- **Operational Impact:** Visual clutter obscures critical red/amber alerts.
- **Root-Cause Hypothesis:** Aesthetic flourishes added without strict enterprise UI hierarchy rules.
- **Acceptance Criteria:**
  1. Ambient particles kept subtle (opacity ≤ 0.08).
  2. Accent glow reserved strictly for user focus, active selection, and critical alert states.

---

### UX-25: High-Zoom Accessibility and Layout Overflow (P1)
- **Timecode:** Full Video
- **Affected Persona & Task:** Visually impaired users operating at 200% browser zoom (WCAG 2.2 AA requirement).
- **Observed Behavior:** At 200% zoom, table headers overflowed horizontally and top bar buttons overlapped.
- **Reproducibility:** 100% when zooming browser to 200% at 1920px (effective viewport: 960px).
- **Operational Impact:** Violates WCAG 2.2 Success Criterion 1.4.10 (Reflow). Critical functionality becomes unreachable.
- **Root-Cause Hypothesis:** Fixed pixel heights (`h-14`) and rigid flex containers without `flex-wrap`.
- **Acceptance Criteria:**
  1. Top bar and action ribbons wrap gracefully without clipped content at 200% zoom.
  2. All interactive modals fit within viewport bounds with internal vertical scrolling.

