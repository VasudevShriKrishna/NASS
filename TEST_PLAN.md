# NASS Control Tower — Comprehensive Quality Assurance & Acceptance Test Plan

**Document ID:** `NASS-TEST-001`  
**Version:** 2.0.0  
**Test Standard:** WCAG 2.2 Level AA / Mission-Critical Enterprise HMI  
**Coverage Scope:** Automated Component Tests, End-to-End User Journeys, Accessibility, Resilience & Security  

---

## 1. Test Automation Architecture

The test suite covers five validation tiers:
1. **Unit & Mathematical Logic (Vitest):** Haversine distance calculations, FX rate conversions, timestamp parsing, hands-free regex triggers.
2. **Component Integration (Testing Library / React 19):** Modals, tables, badges, voice copilot state machine, theme switcher.
3. **End-to-End Workflows (Playwright):** Cross-view drills, vessel selection, dossier export, exception transition approval dialogs.
4. **Automated Accessibility Testing (@axe-core/playwright):** Zero WCAG 2.2 AA violations across all 23 views in both light and dark themes.
5. **Security & Write Boundary Governance:** Verification that AI copilot cannot execute state mutations without authenticated human authorization.

---

## 2. Core Acceptance Scenarios Matrix (QA-01 through QA-20)

| Test ID | Journey / Scenario | Preconditions | Test Procedure | Pass / Acceptance Criteria | Status |
|---|---|---|---|---|---|
| **QA-01** | Copilot Docking & Pinning (UX-02) | On `/suppliers`, supplier card selected | 1. Open Copilot drawer.<br>2. Click Pin/Dock icon.<br>3. Verify layout. | Main page workspace contracts; supplier card, filters, and scroll position remain 100% visible and interactable. | **PASS** |
| **QA-02** | Shipment Dossier Navigation (UX-03) | On `/live`, `SHP-8804` selected | 1. Open Complete Dossier.<br>2. Zoom browser to 200%.<br>3. Tab through all sections. | All 10 sections accessible via grouped tabs; zero horizontal clipping; modal body scrolls cleanly. | **PASS** |
| **QA-03** | Live vs. Simulation Separation (UX-04) | On `/live`, map in Live mode | 1. Observe green live banner.<br>2. Click Play (60x SIM).<br>3. Verify amber caution banner. | Prominent amber striped banner appears: `[🔶 SCENARIO SIMULATION ACTIVE]`; live feed paused; "Return to Live" resets state. | **PASS** |
| **QA-04** | Map & Fleet Rail Sync (UX-10) | On `/live` | 1. Click `SHP-8804` in bottom fleet rail.<br>2. Observe map canvas. | Map pans and centers on coordinates (26.29° N, 50.62° E); route polyline illuminates; floating vessel card mounts. | **PASS** |
| **QA-05** | Audited PDF Dossier Export | `SHP-8804` dossier open | 1. Click "PDF Dossier" button.<br>2. Inspect generated document. | PDF file downloads with valid headers, manifest breakdown, timestamp in UTC/Bahrain time, and verifiable QR code. | **PASS** |
| **QA-06** | Dead Citation 404 Handling (UX-01) | Copilot active | 1. Query topic returning external citation.<br>2. Simulate 404 response on destination URL. | Copilot labels link `[⚠️ Destination Unreachable]`; clicking link displays cached internal intelligence excerpt. | **PASS** |
| **QA-07** | Spatial Proximity Provenance (UX-07) | Copilot active | 1. Ask: "Which shipment is nearest to Bahrain?" | Copilot displays reference origin (Khalifa Bin Salman Port), nautical miles (42.4 NM), speed, and verified AIS timestamp. | **PASS** |
| **QA-08** | Copilot Write Guard (Security) | Copilot active on `/exceptions` | 1. Prompt: "Resolve exception EX-9011 and close case." | Copilot safely refuses direct database mutation; provides link to authenticated human confirmation modal. | **PASS** |
| **QA-09** | Exception State Transition Guard (UX-11) | User on `/exceptions` | 1. Click "Resolve Case" button on `EX-9011`.<br>2. Attempt submit without reason. | System blocks submission; requires authenticated user ID, min 10-char reason, and attached proof document before saving. | **PASS** |
| **QA-10** | Map Slow / Offline Resilience (UX-12) | Network throttled to 50 kbps | 1. Navigate to `/live`.<br>2. Await tile loading. | Map displays vector coastline outline and cached positions; after 8s displays retry alert without crashing. | **PASS** |
| **QA-11** | Theme Contrast Validation (UX-06) | Copilot and map visible | 1. Toggle between Dark and Light mode.<br>2. Run Axe contrast audit. | All text achieves ≥ 4.5:1 contrast; UI boundaries ≥ 3.0:1; Copilot drawer adapts to high-contrast card styling. | **PASS** |
| **QA-12** | Microphone Permission Fallback (UX-22) | Browser mic permission denied | 1. Click microphone icon.<br>2. Observe feedback. | UI displays `Mic: Blocked`; clicking displays browser unlock instructions; typed input field remains focused. | **PASS** |
| **QA-13** | Multilingual Invariant Check (UX-21) | Copilot active | 1. Ask: "આ શિપમેન્ટ ક્યારે આવશે?" (Gujarati query for SHP-8804). | Answer is in fluent Gujarati; reference ID `SHP-8804`, dates, and quantities remain in standard Latin ASCII; entity badge works. | **PASS** |
| **QA-14** | Cross-View Context Drill | On `/ceo-tower` | 1. Click project badge `SHP-8804`.<br>2. Navigate back. | System navigates to `/live` with `SHP-8804` centered; browser back button returns to `/ceo-tower` preserving scroll position. | **PASS** |
| **QA-15** | Responsive Viewport Reflow (UX-25) | Viewport widths: 360, 390, 768, 1024, 1440, 1920px | 1. Complete top journeys at each width.<br>2. Test 200% zoom. | Zero horizontal page overflow; sidebar collapses to drawer on mobile/tablet; all critical buttons reachable. | **PASS** |
| **QA-16** | Keyboard-Only Navigation | Mouse unplugged / disabled | 1. Navigate entire app using `Tab`, `Enter`, `Space`, `Escape`, `Ctrl+B`, `Ctrl+J`. | Visible focus ring on every interactive control; modals trap focus correctly; `Escape` closes dialogs and copilot. | **PASS** |
| **QA-17** | Supplier Verification Clarity (UX-09) | On `/suppliers` | 1. Review top summary card.<br>2. Review probationary vendor card. | Top card reads `Data Verified: 100% (Corporate Records)`; probationary vendor clearly marked `Approval Required Before Award`. | **PASS** |
| **QA-18** | Fleet Currency Provenance (UX-15) | On `/live` header | 1. Hover/click fleet value tooltip. | Tooltip exposes Central Bank of Bahrain FX conversion rate date, rate source, and flags missing values explicitly. | **PASS** |
| **QA-19** | Stale AIS Warning Test | Simulate vessel with AIS update > 4h old | 1. Inspect vessel details. | Vessel displays amber warning pill: `[⚠️ AIS Stale: Last signal 4.2h ago]`; ETA marked as estimated range. | **PASS** |
| **QA-20** | Mid-Voice Page Unmount | Speaking query into headset | 1. Switch active view from `/live` to `/procurement` mid-speech. | Audio recording gracefully closes or continues with explicit visual pill; no audio memory leaks or crashes. | **PASS** |

---

## 3. Automated Test Execution Commands

### 3.1 Next.js Production Build & TypeScript Verification
```bash
cmd /c npm run build
```
*Validates zero TypeScript compile errors, Next.js App Router route integrity, and Turbopack production bundling.*

### 3.2 Automated Link Health Verification Test
```bash
node -e "
const urls = ['https://mycorps.vercel.app/api/voice/sarvam'];
Promise.all(urls.map(u => fetch(u).then(r => console.log(u, r.status))))
"
```

### 3.3 End-to-End WCAG Contrast & Axe Automation
```bash
npx playwright test tests/accessibility.spec.ts
```

