/* Bahrain-local time helpers (Control-Tower correction spec Phase 5/8).
 * All operational timestamps are displayed in Asia/Bahrain (AST, UTC+3) with
 * explicit date + offset so event time, ingestion time and ETA provenance
 * read unambiguously across date rollovers. */

const TZ = "Asia/Bahrain";

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const timeFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const timeSecFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

export const BAHRAIN_TZ = TZ;

/** "14 Apr 2026, 08:00 AST (+03)" */
export function fmtBahrainDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(+d)) return "—";
  return `${dateFmt.format(d)}, ${timeFmt.format(d)} AST (+03)`;
}

/** "14 Apr 2026" */
export function fmtBahrainDate(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(+d)) return "—";
  return dateFmt.format(d);
}

/** "08:00:12 AST" */
export function fmtBahrainTime(iso: string | Date | null | undefined, withSeconds = false): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(+d)) return "—";
  return `${withSeconds ? timeSecFmt.format(d) : timeFmt.format(d)} AST`;
}

/** Current wall-clock parts in Bahrain — for the ops clock. */
export function bahrainNow(): Date {
  return new Date();
}
