# MASTER SPECIFICATION & IMPLEMENTATION PROMPT: COPILOT DEFAULT BOTTOM-RIGHT DOCKING & CROSS-SESSION COOKIE PERSISTENCE

## 1. Executive Summary & Problem Definition
In the NASS Group Control Tower, the circular Cyber-Eye Voice AI Copilot must have an authoritative default landing position and persistent session memory across browser cookies and localStorage:

1. **Default Initial Position (Visual Alignment with Production UI)**:
   - When a new deployment or fresh browser session without stored coordinates is opened, the circular Copilot orb MUST default to the **Bottom-Right Corner** (directly above the lower operational footer bar, as depicted in the UI reference snapshot).
   - Default coordinates:
     - `right`: `24px` (`1.5rem`)
     - `bottom`: `28px` (`1.75rem`)
     - Calculated screen fallback: `x = window.innerWidth - 88px`, `y = window.innerHeight - 92px`.
   - Fallback CSS style when position state is initializing: `{ right: "1.5rem", bottom: "1.75rem" }`.

2. **Cookie & Session-State Persistence**:
   - Whenever the user drags the Copilot orb to any location on the screen, the final drop coordinates `(x, y)` MUST be immediately persisted to:
     - Cookie: `nass_ai_btn_pos` with a 365-day lifespan (`SameSite=Lax; path=/`).
     - LocalStorage: `nass_ai_btn_pos`.
   - On session start, page refresh, or cookie generation:
     - Check `getCookie("nass_ai_btn_pos")`.
     - Fallback to `localStorage.getItem("nass_ai_btn_pos")`.
     - Validate and clamp `x` and `y` within the active viewport boundaries (`maxX = window.innerWidth - 88`, `maxY = window.innerHeight - 88`).
     - If saved coordinates exist, restore the orb precisely where the user last left it.
     - If no stored coordinates exist, anchor to the default **Bottom-Right Corner**.

3. **Responsive Expandable Drawer Positioning**:
   - When the circular orb is docked in the lower half of the screen (`y >= 350px`), the Copilot drawer MUST expand upwards from `bottom-24 right-4 sm:right-6` with `max-h-[calc(100vh-6.5rem)]` and `slide-in-from-bottom-4`.
   - When the user drags the orb to the upper half of the screen (`y < 350px`), the drawer docks downwards from `top-20 right-4 sm:right-6` with `slide-in-from-top-4`.

4. **Multi-Rainbow Glow & Interaction Integrity**:
   - Maintain the 5-color rainbow cycle (Red, Orange, Yellow, Green, Blue; excluding Indigo and Violet) on every screen click.
   - Maintain 360-degree real-time eye cursor tracking.
   - Maintain double-click / single-click toggle and dedicated close badge (`✕`) on the orb when open.

---

## 2. Implementation Checklist
- [x] Update `src/components/app/voice-copilot.tsx`:
  - [x] Add cookie reading (`getCookie("nass_ai_btn_pos")`) on initialization with fallback to `localStorage`.
  - [x] Set initial default position to Bottom-Right (`window.innerWidth - 88`, `window.innerHeight - 92`).
  - [x] Set uninitialized CSS style fallback to `{ right: "1.5rem", bottom: "1.75rem" }`.
  - [x] Update `handlePointerUp` to write final dropped coordinates to both `setCookie("nass_ai_btn_pos", ..., 365)` and `localStorage`.
  - [x] Make drawer anchor dynamically above or below based on Copilot orb Y-coordinate (`bottom-24` when in lower half, `top-20` when in upper half).
- [x] Test production Turbopack compilation (`npm run build`).
- [x] Deploy to Vercel production (`vercel --prod --yes`).
- [x] Verify live endpoint (`https://mycorps.vercel.app`).
