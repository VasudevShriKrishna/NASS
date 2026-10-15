"use client";

import { useMemo } from "react";
import {
  Bookmark,
  Info,
  PackageCheck,
  PackageX,
  ScanSearch,
  ShieldAlert,
  Truck,
  Warehouse,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useApi } from "@/lib/client";
import {
  Badge,
  EmptyState,
  ErrorState,
  FreshnessBadge,
  KpiTile,
  LoadingState,
  ScrollTable,
  SectionCard,
  StatusPill,
  fmtDateTime,
  fmtRelative,
  parseArr,
} from "@/components/app/shared";

/* ── /api/inventory payload shapes ── */
interface LotMaterial {
  sku: string;
  name: string;
  uom: string;
  criticality: string;
}
interface Lot {
  id: string;
  status: string;
  quantity: number;
  uom: string;
  lotNo: string | null;
  serials: string | null;
  lastVerifiedAt: string | null;
  note: string | null;
  material: LotMaterial;
  warehouse: { code: string; name: string };
  project: { code: string; name: string } | null;
}
interface WarehouseRow {
  id: string;
  code: string;
  name: string;
  site: string;
  warehouseType: string;
  bins: string | null;
}
interface ByMaterialRow {
  sku: string;
  name: string;
  uom: string;
  available: number;
  reserved: number;
  quarantined: number;
  damaged: number;
  inTransit: number;
  inspectionPending: number;
}
interface InventoryPayload {
  warehouses: WarehouseRow[];
  lots: Lot[];
  byMaterial: ByMaterialRow[];
}

/** Physical-verification recency: <24h fresh, <72h aging, else stale (M12). */
function lotFreshness(iso: string | null | undefined): string {
  if (!iso) return "unavailable";
  const h = (Date.now() - new Date(iso).getTime()) / 3_600_000;
  if (Number.isNaN(h)) return "unavailable";
  return h < 24 ? "fresh" : h < 72 ? "aging" : "stale";
}

export function InventoryView() {
  const { data, loading, error, asOf } = useApi<InventoryPayload>("/api/inventory");

  const sums = useMemo(() => {
    const base = { available: 0, reserved: 0, quarantined: 0, damaged: 0, inTransit: 0, inspectionPending: 0 };
    for (const m of data?.byMaterial ?? []) {
      base.available += m.available;
      base.reserved += m.reserved;
      base.quarantined += m.quarantined;
      base.damaged += m.damaged;
      base.inTransit += m.inTransit;
      base.inspectionPending += m.inspectionPending;
    }
    return base;
  }, [data]);

  const materialCount = data?.byMaterial.length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Inventory &amp; availability</h2>
          <p className="text-xs text-muted-foreground">
            Stock positions, reservations, quarantine and in-transit — reconciled to the WMS/ERP ledger (M12).
          </p>
        </div>
        <p className="text-[10px] tabular-nums text-muted-foreground">as of {fmtDateTime(asOf)}</p>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : !data ? (
        <EmptyState message="No inventory records available." />
      ) : (
        <>
          {/* KPI tiles per stock status — sums over byMaterial aggregation (mixed UoM, see matrix) */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <KpiTile
              label="Available"
              value={sums.available}
              tone="good"
              icon={<PackageCheck className="h-4 w-4 text-emerald-600" />}
              sub={`${materialCount} materials · mixed UoM`}
            />
            <KpiTile
              label="Reserved"
              value={sums.reserved}
              tone="warn"
              icon={<Bookmark className="h-4 w-4 text-amber-600" />}
              sub="allocated to projects — not free stock"
            />
            <KpiTile
              label="Quarantined"
              value={sums.quarantined}
              tone="bad"
              icon={<ShieldAlert className="h-4 w-4 text-rose-600" />}
              sub="QC hold — excluded from availability"
            />
            <KpiTile
              label="Damaged"
              value={sums.damaged}
              tone="bad"
              icon={<PackageX className="h-4 w-4 text-rose-600" />}
              sub="claim / revaluation in progress"
            />
            <KpiTile
              label="In-transit"
              value={sums.inTransit}
              icon={<Truck className="h-4 w-4 text-violet-600" />}
              sub={<span className="font-semibold text-violet-700 dark:text-violet-400">never physically available (M12)</span>}
            />
            <KpiTile
              label="Inspection pending"
              value={sums.inspectionPending}
              tone="warn"
              icon={<ScanSearch className="h-4 w-4 text-amber-600" />}
              sub="awaiting witness inspection — not released"
            />
          </div>

          {/* By-material availability matrix */}
          <SectionCard
            title="By-material availability matrix"
            subtitle="Available = on-hand minus reservations and quarantine. In-transit is shown for visibility only — it is never added to availability (M12)."
          >
            {data.byMaterial.length === 0 ? (
              <EmptyState message="No stock positions recorded." />
            ) : (
              <ScrollTable maxHeight="max-h-[380px]">
                <Table className="min-w-[780px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead className="text-right">Available</TableHead>
                      <TableHead className="text-right">Reserved</TableHead>
                      <TableHead className="text-right">Quarantined</TableHead>
                      <TableHead className="text-right">Damaged</TableHead>
                      <TableHead className="text-right">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex cursor-default items-center gap-1 text-violet-700 underline decoration-dotted underline-offset-4 dark:text-violet-400">
                              In-transit <Info className="h-3 w-3" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-60 text-xs">
                            In-transit quantity is NEVER physically available (M12)
                          </TooltipContent>
                        </Tooltip>
                      </TableHead>
                      <TableHead className="text-right">Inspection pending</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.byMaterial.map((m) => (
                      <TableRow key={m.sku}>
                        <TableCell className="font-mono text-xs font-semibold">{m.sku}</TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">{m.name}</span>
                          <span className="block text-[10px] text-muted-foreground">{m.uom}</span>
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                          {m.available}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-amber-700 dark:text-amber-400">{m.reserved}</TableCell>
                        <TableCell className="text-right tabular-nums text-rose-700 dark:text-rose-400">{m.quarantined}</TableCell>
                        <TableCell className="text-right tabular-nums text-rose-700 dark:text-rose-400">{m.damaged}</TableCell>
                        <TableCell
                          className={
                            m.inTransit > 0
                              ? "bg-violet-50/80 text-right font-semibold tabular-nums text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
                              : "text-right tabular-nums text-violet-700/60 dark:text-violet-400/60"
                          }
                        >
                          {m.inTransit}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-amber-700 dark:text-amber-400">{m.inspectionPending}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollTable>
            )}
          </SectionCard>

          {/* Warehouses */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.warehouses.map((w) => {
              const bins = parseArr(w.bins);
              return (
                <Card key={w.id} className="gap-0 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-sm font-bold">{w.code}</p>
                    <Badge variant="outline" className="text-[10px] tracking-wide">
                      {w.warehouseType.replaceAll("_", " ")}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm font-medium leading-tight">{w.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{w.site}</p>
                  {bins.length > 0 && (
                    <p className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Warehouse className="h-3 w-3" /> {bins.length} bins · {bins.slice(0, 4).join(", ")}
                      {bins.length > 4 ? "…" : ""}
                    </p>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Lots */}
          <SectionCard
            title="Inventory lots"
            subtitle="Row-level stock records — status, project reservation and physical-verification recency."
          >
            {data.lots.length === 0 ? (
              <EmptyState message="No inventory lots recorded." />
            ) : (
              <ScrollTable maxHeight="max-h-[440px]">
                <Table className="min-w-[880px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead>Warehouse</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Lot / serials</TableHead>
                      <TableHead>Reserved for</TableHead>
                      <TableHead>Last verified</TableHead>
                      <TableHead>Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.lots.map((l) => {
                      const serials = parseArr(l.serials);
                      return (
                        <TableRow key={l.id}>
                          <TableCell>
                            <span className="font-mono text-xs font-semibold">{l.material.sku}</span>
                            <span
                              className="block max-w-[200px] truncate text-[11px] text-muted-foreground"
                              title={`${l.material.name} · criticality ${l.material.criticality}`}
                            >
                              {l.material.name}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className="font-mono font-medium">{l.warehouse.code}</span>
                            <span className="block max-w-[160px] truncate text-[10px] text-muted-foreground" title={l.warehouse.name}>
                              {l.warehouse.name}
                            </span>
                          </TableCell>
                          <TableCell>
                            <StatusPill value={l.status} />
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">
                            {l.quantity} <span className="text-[10px] font-normal text-muted-foreground">{l.uom}</span>
                          </TableCell>
                          <TableCell className="text-xs">
                            {l.lotNo ?? "—"}
                            {serials.length > 0 && (
                              <span className="block font-mono text-[10px] text-muted-foreground">{serials.length} serial(s)</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            {l.project ? <span className="font-mono font-medium">{l.project.code}</span> : "—"}
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-1.5">
                              <span className="text-xs tabular-nums">{fmtRelative(l.lastVerifiedAt)}</span>
                              <FreshnessBadge value={lotFreshness(l.lastVerifiedAt)} />
                            </span>
                            {l.lastVerifiedAt && (
                              <span className="block text-[10px] text-muted-foreground">at {fmtDateTime(l.lastVerifiedAt)}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {l.note ? (
                              <span
                                className="block max-w-[240px] truncate text-xs text-muted-foreground"
                                title={l.note}
                              >
                                {l.note}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollTable>
            )}
          </SectionCard>

          {/* M12 callout */}
          <Card className="border-amber-300/70 bg-amber-50/60 dark:border-amber-900/60 dark:bg-amber-950/20">
            <CardContent className="flex items-start gap-2 p-4">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-200">
                Availability definition: on-hand minus reservations and quarantined stock. Manually maintained shadow values are
                visibly provisional; inventory reconciles to the WMS/ERP ledger (M12).
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
