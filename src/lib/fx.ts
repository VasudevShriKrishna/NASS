/* FX normalization (Phase 9 of the Control-Tower correction spec).
 *
 * Every financial aggregate shown in the UI is derived from its source
 * records — never hard-coded. Shipment values are denominated in the PO
 * currency; fleet totals are normalized to USD with a DOCUMENTED rate and
 * as-of date. When a live FX feed is configured (integration boundary),
 * replace RATES + RATES_AS_OF with the feed and keep the provenance fields. */

export const FX_RATES_AS_OF = "2026-02-01T00:00:00Z";
export const FX_SOURCE = "NASS corporate FX table (static demo — replaced by rates feed when configured)";

/** USD per 1 unit of currency. */
export const FX_TO_USD: Record<string, number> = {
  USD: 1,
  AED: 0.27229,
  EUR: 1.0847,
  BHD: 2.6526,
  GBP: 1.2635,
};

export function toUsd(amount: number, currency: string | null | undefined): number {
  const rate = FX_TO_USD[(currency ?? "USD").toUpperCase()] ?? 1;
  return Math.round(amount * rate * 100) / 100;
}

export function fxLabel(currency: string | null | undefined): string {
  const cur = (currency ?? "USD").toUpperCase();
  const rate = FX_TO_USD[cur] ?? 1;
  if (cur === "USD") return "USD";
  return `${cur} → USD @ ${rate} (as of ${FX_RATES_AS_OF.slice(0, 10)}, ${FX_SOURCE})`;
}
