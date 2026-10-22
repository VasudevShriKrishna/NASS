"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, ExternalLink, FileText, ShieldAlert, Ship, Siren, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SeverityBadge, StatusPill } from "@/components/app/shared";
import { STATUS_COLOR, STATUS_LABEL } from "@/components/app/world-map";
import { fmtBahrainDateTime } from "@/lib/bahrain-time";
import type { TraceShip } from "@/lib/trace-types";

interface AlertsResolutionModalProps {
  isOpen: boolean;
  ships: TraceShip[];
  onClose: () => void;
  onInvestigateShipment: (ref: string) => void;
  onViewShipmentDetails: (ship: TraceShip) => void;
}

export function AlertsResolutionModal({
  isOpen,
  ships,
  onClose,
  onInvestigateShipment,
  onViewShipmentDetails,
}: AlertsResolutionModalProps) {
  if (!isOpen) return null;

  // Extract alert consignments (DELAYED or CUSTOMS_HOLD or with active exceptions/risks)
  const alertShips = ships.filter(
    (s) => s.liveStatus === "DELAYED" || s.liveStatus === "CUSTOMS_HOLD" || s.compliance.exceptions.length > 0
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[95] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative flex flex-col w-full max-w-3xl max-h-[85vh] rounded-2xl border border-amber-500/35 bg-[#0b0f17] text-foreground shadow-[0_25px_60px_rgba(0,0,0,0.85)] overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Active Fleet Alerts & Operational Issue Resolution"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-amber-500/20 bg-gradient-to-r from-amber-500/15 via-[#131b26] to-transparent shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)]">
                <Siren className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-base font-bold text-foreground">Operational Alerts &amp; Exceptions</h3>
                  <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                    {alertShips.length} Active Issues
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Actionable delays, regulatory customs holds, and supply-chain discrepancies requiring operational intervention.
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={onClose}
              aria-label="Close alerts modal"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5">
            {alertShips.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <ShieldAlert className="h-10 w-10 mx-auto text-emerald-400/50 mb-2" />
                <p className="font-semibold text-foreground">No active operational alerts across the fleet.</p>
                <p className="text-xs text-muted-foreground mt-1">All consignments are operating within normal voyage parameters.</p>
              </div>
            ) : (
              alertShips.map((ship) => {
                const isDelayed = ship.liveStatus === "DELAYED";
                const isHold = ship.liveStatus === "CUSTOMS_HOLD";
                const primaryColor = isHold ? "#fbbf24" : isDelayed ? "#f87171" : "#d4af37";

                // Determine concise summary and primary action label
                let alertTitle = "Maritime Voyage Exception";
                let alertExplanation = "Consignment has encountered operational delay or reconciliation discrepancy.";
                let primaryActionLabel = "Investigate Delay";
                let severity = "HIGH";

                if (isHold) {
                  alertTitle = "Customs Clearance & Regulatory Hold Flag";
                  alertExplanation = ship.compliance.customsStatus 
                    ? `Broker reported: ${ship.compliance.customsStatus}. Free time demurrage clock is active.`
                    : "Import consignment held at port gate under customs inspection protocol.";
                  primaryActionLabel = "View Hold Details";
                  severity = "CRITICAL";
                } else if (isDelayed) {
                  alertTitle = "Carrier ETA Slippage vs Supplier Promise";
                  alertExplanation = ship.carrierEta && ship.supplierPromisedEta
                    ? `Carrier ETA slipped to ${fmtBahrainDateTime(ship.carrierEta)}. Work package program exposed to site delay.`
                    : "Voyage transit speed or transshipment dwell exceeds expected schedule.";
                  primaryActionLabel = "Investigate Delay";
                  severity = ship.ref === "SHP-8802" ? "CRITICAL" : "HIGH";
                }

                return (
                  <div
                    key={ship.ref}
                    className="rounded-xl border border-border/70 bg-card/60 p-4 transition-all hover:border-amber-500/40 hover:bg-card/85 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-foreground">{ship.ref}</span>
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                          style={{
                            background: `${primaryColor}20`,
                            color: primaryColor,
                            border: `1px solid ${primaryColor}55`,
                          }}
                        >
                          {STATUS_LABEL[ship.liveStatus]}
                        </span>
                        <SeverityBadge value={severity} />
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        Logged: {fmtBahrainDateTime(ship.lastEventAt)}
                      </span>
                    </div>

                    <div>
                      <p className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        {alertTitle}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {alertExplanation}
                      </p>
                      <p className="text-[11px] text-primary/80 mt-1 font-mono">
                        Sea Corridor: {ship.from?.label ?? ship.originPort} → {ship.to?.label ?? ship.destPort}
                        {ship.vesselName ? ` · Vessel: ${ship.vesselName}` : ""}
                      </p>
                    </div>

                    {/* Exceptions list if any */}
                    {ship.compliance.exceptions.length > 0 && (
                      <div className="rounded-lg border border-rose-500/25 bg-rose-500/10 p-2.5 space-y-1">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-rose-300">
                          Audit Exception Traces ({ship.compliance.exceptions.length}):
                        </p>
                        {ship.compliance.exceptions.map((ex) => (
                          <p key={ex.ref} className="text-[11px] text-rose-200 flex items-start gap-1">
                            <span className="font-mono font-semibold">{ex.ref}:</span>
                            <span>{ex.title}</span>
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40">
                      <div className="text-[10px] text-muted-foreground">
                        Project: <span className="font-semibold text-foreground">{ship.project?.name ?? "NASS National Project"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-border/80 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            onViewShipmentDetails(ship);
                            onClose();
                          }}
                        >
                          <FileText className="mr-1 h-3 w-3" /> View Shipment
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 text-xs font-semibold border border-amber-500/50 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25"
                          onClick={() => {
                            onInvestigateShipment(ship.ref);
                            onClose();
                          }}
                        >
                          <Siren className="mr-1 h-3 w-3" /> {primaryActionLabel}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-border/50 bg-[#070b12] text-xs text-muted-foreground shrink-0">
            <span className="font-mono text-[10px]">
              NASS Operations Intelligence · All resolution actions conform to GCC Port &amp; Customs regulations
            </span>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onClose}>
              Close
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
