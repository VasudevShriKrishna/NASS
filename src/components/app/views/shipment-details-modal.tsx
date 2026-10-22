"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Anchor,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  Container,
  DollarSign,
  ExternalLink,
  FileDown,
  FileText,
  Globe,
  Layers,
  MapPin,
  Package,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Ship,
  Siren,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollTable, StatusPill, fmtDateTime } from "@/components/app/shared";
import { STATUS_COLOR, STATUS_LABEL } from "@/components/app/world-map";
import { fmtBahrainDateTime } from "@/lib/bahrain-time";
import type { TraceShip } from "@/lib/trace-types";
import { getStructuredShipmentData, type QualityTerm } from "@/lib/shipment-specifications";

interface ShipmentDetailsModalProps {
  ship: TraceShip;
  isOpen: boolean;
  onClose: () => void;
  onTrackRoute?: (ref: string) => void;
  onViewOriginPort?: (portName: string) => void;
  onViewDestPort?: (portName: string) => void;
}

const fmtMoney = (v: number | QualityTerm, ccy: string) => {
  if (typeof v === "string") return v;
  return `${ccy} ${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
};

export function ShipmentDetailsModal({
  ship,
  isOpen,
  onClose,
  onTrackRoute,
  onViewOriginPort,
  onViewDestPort,
}: ShipmentDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overview: true,
    manifest: true,
    valuation: true,
    packaging: true,
    companies: true,
    route: true,
    customs: true,
    documents: true,
    timeline: true,
    charges: true,
  });

  const toggleSection = (s: string) => {
    setExpandedSections((prev) => ({ ...prev, [s]: !prev[s] }));
  };

  const data = getStructuredShipmentData(ship);
  const statusColor = STATUS_COLOR[ship.liveStatus] || "#d4af37";

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md">
        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 18 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex flex-col w-full max-w-5xl h-[92vh] max-h-[950px] rounded-2xl border border-primary/35 bg-[#090d14] text-foreground shadow-[0_25px_70px_rgba(0,0,0,0.85)] overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-label={`Complete Shipment Dossier: ${ship.ref}`}
        >
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-primary/20 bg-gradient-to-r from-primary/15 via-[#0b121e] to-transparent shrink-0">
            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border shadow-lg"
                style={{
                  borderColor: `${statusColor}66`,
                  background: `${statusColor}18`,
                  color: statusColor,
                }}
              >
                <Ship className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-bold text-foreground">{ship.ref}</span>
                  <span
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      background: `${statusColor}22`,
                      color: statusColor,
                      border: `1px solid ${statusColor}55`,
                    }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: statusColor }} />
                    {STATUS_LABEL[ship.liveStatus]}
                  </span>
                  <span className="rounded bg-muted/60 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground uppercase border border-border/50">
                    {data.shipmentType}
                  </span>
                </div>
                <p className="mt-0.5 font-display text-sm font-semibold text-muted-foreground">
                  {ship.vesselName ?? ship.carrier ?? "Vessel"} {ship.vesselVoyage ? `· Voyage ${ship.vesselVoyage}` : ""} · {ship.from?.label ?? ship.originPort} → {ship.to?.label ?? ship.destPort}
                </p>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2">
              {onTrackRoute && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 border-primary/40 text-xs font-semibold text-primary hover:bg-primary/20"
                  onClick={() => {
                    onTrackRoute(ship.ref);
                    onClose();
                  }}
                >
                  <Compass className="h-3.5 w-3.5" /> Track on Map
                </Button>
              )}
              <a href={`/api/live-trace/report?ref=${ship.ref}`} download>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 border-border/80 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  <FileDown className="h-3.5 w-3.5" /> PDF Dossier
                </Button>
              </a>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-foreground ml-1"
                onClick={onClose}
                aria-label="Close shipment details modal"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Quick Sub-Navigation Bar */}
          <div className="flex items-center gap-1.5 px-5 py-2 border-b border-border/40 bg-card/40 overflow-x-auto text-[11px] font-medium shrink-0">
            {[
              { id: "overview", label: "1. Overview" },
              { id: "manifest", label: "2. Cargo Manifest" },
              { id: "valuation", label: "3. Valuation & Cost" },
              { id: "packaging", label: "4. Packaging & Weight" },
              { id: "companies", label: "5. Companies" },
              { id: "route", label: "6. Route & Ports" },
              { id: "customs", label: "7. Customs" },
              { id: "documents", label: "8. Documents" },
              { id: "timeline", label: "9. History" },
              { id: "charges", label: "10. Charges & Risks" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  const el = document.getElementById(`section-${tab.id}`);
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="px-2.5 py-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors whitespace-nowrap cursor-pointer"
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Modal Scrollable Body */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

            {/* 1. Shipment Overview */}
            <section id="section-overview" className="rounded-xl border border-border/70 bg-card/50 p-4">
              <div
                className="flex items-center justify-between cursor-pointer select-none"
                onClick={() => toggleSection("overview")}
              >
                <div className="flex items-center gap-2 text-primary font-display text-sm font-bold uppercase tracking-wider">
                  <Ship className="h-4 w-4" />
                  <span>1. Shipment Overview</span>
                </div>
                {expandedSections.overview ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
              {expandedSections.overview && (
                <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                  <div className="rounded-lg border border-border/40 bg-background/50 p-2.5">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">Shipment Reference</span>
                    <p className="font-mono font-bold text-foreground mt-0.5">{data.shipmentId}</p>
                  </div>
                  <div className="rounded-lg border border-border/40 bg-background/50 p-2.5">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">Current Live Status</span>
                    <p className="font-semibold text-foreground mt-0.5">{STATUS_LABEL[ship.liveStatus]}</p>
                  </div>
                  <div className="rounded-lg border border-border/40 bg-background/50 p-2.5">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">Booking Reference</span>
                    <p className="font-mono text-foreground mt-0.5">{data.bookingRef}</p>
                  </div>
                  <div className="rounded-lg border border-border/40 bg-background/50 p-2.5">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">Shipment Date (ATD)</span>
                    <p className="text-foreground mt-0.5">{fmtBahrainDateTime(ship.departure)}</p>
                  </div>
                  <div className="rounded-lg border border-border/40 bg-background/50 p-2.5">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">Carrier ETA</span>
                    <p className="font-semibold text-foreground mt-0.5">{fmtBahrainDateTime(ship.eta)}</p>
                  </div>
                  <div className="rounded-lg border border-border/40 bg-background/50 p-2.5">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">Supplier Promised ETA</span>
                    <p className="text-foreground mt-0.5">{fmtBahrainDateTime(ship.supplierPromisedEta)}</p>
                  </div>
                  <div className="rounded-lg border border-border/40 bg-background/50 p-2.5">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">Latest Audit Update</span>
                    <p className="font-mono text-[11px] text-foreground mt-0.5">{fmtBahrainDateTime(ship.lastEventAt)}</p>
                  </div>
                  <div className="rounded-lg border border-border/40 bg-background/50 p-2.5">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">Data Verification</span>
                    <p className="text-emerald-300 font-semibold mt-0.5 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Carrier Verified
                    </p>
                  </div>
                </div>
              )}
            </section>

            {/* 2. Cargo Manifest & Itemized Contents */}
            <section id="section-manifest" className="rounded-xl border border-border/70 bg-card/50 p-4">
              <div
                className="flex items-center justify-between cursor-pointer select-none"
                onClick={() => toggleSection("manifest")}
              >
                <div className="flex items-center gap-2 text-primary font-display text-sm font-bold uppercase tracking-wider">
                  <Package className="h-4 w-4" />
                  <span>2. Cargo Manifest &amp; Itemized Contents ({data.cargoItems.length} Lines)</span>
                </div>
                {expandedSections.manifest ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
              {expandedSections.manifest && (
                <div className="mt-3.5 space-y-3">
                  <ScrollTable maxHeight="max-h-[300px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border/50 text-[10px] uppercase">
                          <TableHead>SKU &amp; Part Number</TableHead>
                          <TableHead>Product Name &amp; Description</TableHead>
                          <TableHead>Manufacturer</TableHead>
                          <TableHead>HS Code</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead>Origin</TableHead>
                          <TableHead>Handling &amp; Hazard Class</TableHead>
                          <TableHead className="text-right">Line Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.cargoItems.map((item, idx) => (
                          <TableRow key={idx} className="border-border/40 text-xs">
                            <TableCell className="font-mono font-bold text-primary">{item.sku}</TableCell>
                            <TableCell>
                              <p className="font-semibold text-foreground">{item.productName}</p>
                              <p className="text-[10px] text-muted-foreground leading-tight">{item.description}</p>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{item.manufacturer}</TableCell>
                            <TableCell className="font-mono text-amber-300 font-semibold">{item.hsCode}</TableCell>
                            <TableCell className="text-right font-mono font-bold">
                              {item.quantity.toLocaleString()} {item.uom}
                            </TableCell>
                            <TableCell>{item.countryOfOrigin}</TableCell>
                            <TableCell>
                              <p className="text-[10px] font-medium text-foreground">{item.handlingClassification}</p>
                              <span className="text-[9px] text-emerald-300">{item.hazardousClass}</span>
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-foreground">
                              {fmtMoney(item.extendedPrice, data.valuation.currency)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollTable>
                </div>
              )}
            </section>

            {/* 3. Cargo Valuation & Financial Details */}
            <section id="section-valuation" className="rounded-xl border border-border/70 bg-card/50 p-4">
              <div
                className="flex items-center justify-between cursor-pointer select-none"
                onClick={() => toggleSection("valuation")}
              >
                <div className="flex items-center gap-2 text-primary font-display text-sm font-bold uppercase tracking-wider">
                  <DollarSign className="h-4 w-4" />
                  <span>3. Cargo Valuation &amp; Financial Details</span>
                </div>
                {expandedSections.valuation ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
              {expandedSections.valuation && (
                <div className="mt-3.5 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="rounded-lg border border-primary/30 bg-primary/10 p-3">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Total Cargo Value (FOB/CIF)</span>
                      <p className="font-display text-xl font-bold text-gold-grad mt-0.5">
                        {fmtMoney(data.valuation.totalCargoValue, data.valuation.currency)}
                      </p>
                      <span className="text-[9px] text-muted-foreground">≈ USD {data.valuation.totalCargoValueUsd.toLocaleString()}</span>
                    </div>
                    <div className="rounded-lg border border-border/50 bg-background/50 p-3">
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground">Declared Customs Value</span>
                      <p className="font-mono text-base font-bold text-foreground mt-0.5">
                        {fmtMoney(data.valuation.declaredCustomsValue, data.valuation.currency)}
                      </p>
                      <span className="text-[9px] text-muted-foreground">OFOQ Single Window Basis</span>
                    </div>
                    <div className="rounded-lg border border-border/50 bg-background/50 p-3">
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground">Freight &amp; Insurance</span>
                      <p className="font-mono text-base font-bold text-foreground mt-0.5">
                        {fmtMoney(Number(data.valuation.freightCharges) + Number(data.valuation.insuranceValue), data.valuation.currency)}
                      </p>
                      <span className="text-[9px] text-muted-foreground">Freight: {fmtMoney(data.valuation.freightCharges, data.valuation.currency)} · Ins: {fmtMoney(data.valuation.insuranceValue, data.valuation.currency)}</span>
                    </div>
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                      <span className="text-[10px] uppercase font-bold text-emerald-400">Total Landed Shipment Cost</span>
                      <p className="font-display text-xl font-bold text-emerald-300 mt-0.5">
                        {fmtMoney(data.valuation.totalLandedCost, data.valuation.currency)}
                      </p>
                      <span className="text-[9px] text-muted-foreground">Cargo + All Logistics &amp; Duties</span>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/50 bg-background/30 p-2.5 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Financial Architecture Notice: </span>
                    {data.valuation.financialNotes} Total logistics cost is strictly segregated from pure manufacturing cargo value.
                  </div>
                </div>
              )}
            </section>

            {/* 4. Weight, Dimensions & Packaging */}
            <section id="section-packaging" className="rounded-xl border border-border/70 bg-card/50 p-4">
              <div
                className="flex items-center justify-between cursor-pointer select-none"
                onClick={() => toggleSection("packaging")}
              >
                <div className="flex items-center gap-2 text-primary font-display text-sm font-bold uppercase tracking-wider">
                  <Scale className="h-4 w-4" />
                  <span>4. Weight, Dimensions &amp; Packaging Architecture</span>
                </div>
                {expandedSections.packaging ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
              {expandedSections.packaging && (
                <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="rounded-lg border border-border/40 bg-background/50 p-2.5">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">Gross Weight</span>
                    <p className="font-mono text-sm font-bold text-foreground mt-0.5">
                      {typeof data.packaging.grossWeightKg === "number" ? `${data.packaging.grossWeightKg.toLocaleString()} kg` : data.packaging.grossWeightKg}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/40 bg-background/50 p-2.5">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">Net Weight</span>
                    <p className="font-mono text-sm font-bold text-foreground mt-0.5">
                      {typeof data.packaging.netWeightKg === "number" ? `${data.packaging.netWeightKg.toLocaleString()} kg` : data.packaging.netWeightKg}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/40 bg-background/50 p-2.5">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">Total Cargo Volume</span>
                    <p className="font-mono text-sm font-bold text-foreground mt-0.5">
                      {typeof data.packaging.totalVolumeCbm === "number" ? `${data.packaging.totalVolumeCbm} m³ (CBM)` : data.packaging.totalVolumeCbm}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/40 bg-background/50 p-2.5">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">Dimensions</span>
                    <p className="font-mono text-xs text-foreground mt-0.5">{data.packaging.dimensionsMm}</p>
                  </div>
                  <div className="rounded-lg border border-border/40 bg-background/50 p-2.5">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">Package Count</span>
                    <p className="font-mono text-sm font-bold text-foreground mt-0.5">{data.packaging.packageCount}</p>
                  </div>
                  <div className="rounded-lg border border-border/40 bg-background/50 p-2.5">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">Pallet Count</span>
                    <p className="font-mono text-sm font-bold text-foreground mt-0.5">{data.packaging.palletCount}</p>
                  </div>
                  <div className="rounded-lg border border-border/40 bg-background/50 p-2.5">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">Container Type</span>
                    <p className="font-mono text-xs font-semibold text-amber-300 mt-0.5">{data.packaging.containerType}</p>
                  </div>
                  <div className="rounded-lg border border-border/40 bg-background/50 p-2.5">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">Loading Protocol</span>
                    <p className="text-xs text-foreground mt-0.5">{data.packaging.loadingDetails}</p>
                  </div>
                </div>
              )}
            </section>

            {/* 5. Companies & Business Relationships */}
            <section id="section-companies" className="rounded-xl border border-border/70 bg-card/50 p-4">
              <div
                className="flex items-center justify-between cursor-pointer select-none"
                onClick={() => toggleSection("companies")}
              >
                <div className="flex items-center gap-2 text-primary font-display text-sm font-bold uppercase tracking-wider">
                  <Building2 className="h-4 w-4" />
                  <span>5. Companies &amp; Business Relationships ({data.companies.length} Stakeholders)</span>
                </div>
                {expandedSections.companies ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
              {expandedSections.companies && (
                <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  {data.companies.map((co, idx) => (
                    <div key={idx} className="rounded-lg border border-border/50 bg-background/50 p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-primary">{co.role}</span>
                        <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {co.verificationStatus}
                        </span>
                      </div>
                      <p className="font-bold text-foreground text-xs leading-snug">{co.name}</p>
                      <p className="text-[10px] text-muted-foreground">{co.city ? `${co.city}, ` : ""}{co.country}</p>
                      {co.referenceNo && (
                        <p className="font-mono text-[9px] text-muted-foreground">Ref: {co.referenceNo}</p>
                      )}
                      {co.contactEmail && (
                        <p className="text-[9px] text-primary/80 truncate">{co.contactEmail}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 6. Route, Ports & Transportation */}
            <section id="section-route" className="rounded-xl border border-border/70 bg-card/50 p-4">
              <div
                className="flex items-center justify-between cursor-pointer select-none"
                onClick={() => toggleSection("route")}
              >
                <div className="flex items-center gap-2 text-primary font-display text-sm font-bold uppercase tracking-wider">
                  <Compass className="h-4 w-4" />
                  <span>6. Route, Ports &amp; Multi-Modal Transportation</span>
                </div>
                {expandedSections.route ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
              {expandedSections.route && (
                <div className="mt-3.5 space-y-3 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-lg border border-border/40 bg-background/50 p-2.5">
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground">Origin Port</span>
                      <p className="font-bold text-foreground mt-0.5">{ship.originPort}</p>
                      <span className="text-[10px] text-muted-foreground">{ship.originCountry}</span>
                      {onViewOriginPort && (
                        <button
                          type="button"
                          onClick={() => onViewOriginPort(ship.originPort)}
                          className="mt-1 text-[10px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Anchor className="h-3 w-3" /> Focus Origin Port
                        </button>
                      )}
                    </div>
                    <div className="rounded-lg border border-border/40 bg-background/50 p-2.5">
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground">Destination Port</span>
                      <p className="font-bold text-foreground mt-0.5">{ship.destPort}</p>
                      <span className="text-[10px] text-muted-foreground">{ship.destCountry}</span>
                      {onViewDestPort && (
                        <button
                          type="button"
                          onClick={() => onViewDestPort(ship.destPort)}
                          className="mt-1 text-[10px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Anchor className="h-3 w-3" /> Focus Dest Port
                        </button>
                      )}
                    </div>
                    <div className="rounded-lg border border-border/40 bg-background/50 p-2.5">
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground">Vessel &amp; Tracking Ref</span>
                      <p className="font-bold text-foreground mt-0.5">{ship.vesselName ?? ship.carrier ?? "Vessel"}</p>
                      <span className="font-mono text-[10px] text-muted-foreground">{ship.ref}</span>
                    </div>
                    <div className="rounded-lg border border-border/40 bg-background/50 p-2.5">
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground">Corridor Distance</span>
                      <p className="font-mono text-sm font-bold text-foreground mt-0.5">
                        {ship.routeDistanceNm ? `${ship.routeDistanceNm.toLocaleString()} nm` : "Direct Maritime Corridor"}
                      </p>
                      <span className="text-[10px] text-primary">{Math.round(ship.progress * 100)}% Journey Completed</span>
                    </div>
                  </div>
                  {ship.legs.length > 0 && (
                    <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Multi-Modal Freight Legs</p>
                      <div className="space-y-1.5">
                        {ship.legs.map((leg) => (
                          <div key={leg.seq} className="flex items-center justify-between text-xs py-1 border-b border-border/30 last:border-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-primary">Leg {leg.seq}</span>
                              <span className="font-semibold text-foreground uppercase text-[10px] px-1.5 py-0.5 rounded bg-muted/70">{leg.mode}</span>
                              <span className="text-muted-foreground">{leg.fromPoint} → {leg.toPoint}</span>
                            </div>
                            <span className="font-semibold text-xs text-primary">{leg.carrier ?? "NASS Carrier"} ({leg.status})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* 7. Customs & Regulatory Compliance */}
            <section id="section-customs" className="rounded-xl border border-border/70 bg-card/50 p-4">
              <div
                className="flex items-center justify-between cursor-pointer select-none"
                onClick={() => toggleSection("customs")}
              >
                <div className="flex items-center gap-2 text-primary font-display text-sm font-bold uppercase tracking-wider">
                  <ShieldCheck className="h-4 w-4" />
                  <span>7. Customs &amp; Regulatory Compliance</span>
                </div>
                {expandedSections.customs ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
              {expandedSections.customs && (
                <div className="mt-3.5 space-y-3 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-lg border border-border/40 bg-background/50 p-2.5">
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground">Customs Declaration Ref</span>
                      <p className="font-mono font-bold text-foreground mt-0.5">{data.customs.declarationRef}</p>
                    </div>
                    <div className="rounded-lg border border-border/40 bg-background/50 p-2.5">
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground">Clearance Status</span>
                      <p className="font-semibold text-foreground mt-0.5">{data.customs.clearanceStatus}</p>
                    </div>
                    <div className="rounded-lg border border-border/40 bg-background/50 p-2.5">
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground">Inspection Protocol</span>
                      <p className="text-foreground mt-0.5">{data.customs.inspectionStatus}</p>
                    </div>
                    <div className="rounded-lg border border-border/40 bg-background/50 p-2.5">
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground">Duty Payment Basis</span>
                      <p className="text-foreground mt-0.5">{data.customs.dutyPaymentStatus}</p>
                    </div>
                  </div>
                  {data.customs.holdNotice && (
                    <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-start gap-2">
                      <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                      <div>
                        <span className="font-bold">Active Regulatory Hold Notice: </span>
                        <span>{data.customs.holdNotice}</span>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="rounded-lg border border-border/40 bg-background/40 p-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Applicable Ministry Permits</p>
                      <ul className="space-y-1">
                        {data.customs.applicablePermits.map((p, i) => (
                          <li key={i} className="flex items-center gap-1.5 text-muted-foreground">
                            <span className="h-1 w-1 rounded-full bg-primary" />
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-lg border border-border/40 bg-background/40 p-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Verified Certificates on File</p>
                      <ul className="space-y-1">
                        {data.customs.certificates.map((c, i) => (
                          <li key={i} className="flex items-center gap-1.5 text-emerald-300">
                            <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-400" />
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* 8. Shipping Documents */}
            <section id="section-documents" className="rounded-xl border border-border/70 bg-card/50 p-4">
              <div
                className="flex items-center justify-between cursor-pointer select-none"
                onClick={() => toggleSection("documents")}
              >
                <div className="flex items-center gap-2 text-primary font-display text-sm font-bold uppercase tracking-wider">
                  <FileText className="h-4 w-4" />
                  <span>8. Shipping Documents &amp; Digital Dossier ({data.documents.length} Records)</span>
                </div>
                {expandedSections.documents ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
              {expandedSections.documents && (
                <div className="mt-3.5 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                    {data.documents.map((doc, idx) => (
                      <div key={idx} className="rounded-lg border border-border/50 bg-background/50 p-3 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-foreground text-xs">{doc.docType}</span>
                            <span
                              className={`text-[8px] font-bold px-1.5 py-0.2 rounded border ${doc.verificationStatus === "Verified"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                                }`}
                            >
                              {doc.verificationStatus}
                            </span>
                          </div>
                          <p className="font-mono text-primary font-bold text-[11px] mt-1">{doc.referenceNo}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{doc.issuer}</p>
                          {doc.notes && (
                            <p className="text-[10px] text-muted-foreground/80 mt-1 italic leading-tight">{doc.notes}</p>
                          )}
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-border/30 flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground">Issued: {doc.issueDate}</span>
                          <span className="text-primary font-semibold hover:underline cursor-pointer">View Spec</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* 9. Tracking Events & Operational History */}
            <section id="section-timeline" className="rounded-xl border border-border/70 bg-card/50 p-4">
              <div
                className="flex items-center justify-between cursor-pointer select-none"
                onClick={() => toggleSection("timeline")}
              >
                <div className="flex items-center gap-2 text-primary font-display text-sm font-bold uppercase tracking-wider">
                  <Clock className="h-4 w-4" />
                  <span>9. Tracking Events &amp; Operational Milestone History</span>
                </div>
                {expandedSections.timeline ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
              {expandedSections.timeline && (
                <div className="mt-3.5 space-y-2">
                  {ship.milestones.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">No milestone records published for this consignment.</p>
                  ) : (
                    <ol className="relative space-y-2 border-l border-primary/25 pl-4 ml-2">
                      {ship.milestones.map((m, i) => (
                        <li key={i} className="relative">
                          <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-background bg-primary" />
                          <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-foreground">{m.label}</span>
                              <span className="font-mono text-[10px] text-primary">{fmtBahrainDateTime(m.eventTime)}</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {m.location ? `Location: ${m.location} · ` : ""}Source: {m.source}
                            </p>
                            {m.note && (
                              <p className="text-[10px] italic text-muted-foreground/80 mt-1">{m.note}</p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              )}
            </section>

            {/* 10. Risks, Exceptions & Additional Charges */}
            <section id="section-charges" className="rounded-xl border border-border/70 bg-card/50 p-4">
              <div
                className="flex items-center justify-between cursor-pointer select-none"
                onClick={() => toggleSection("charges")}
              >
                <div className="flex items-center gap-2 text-primary font-display text-sm font-bold uppercase tracking-wider">
                  <ShieldAlert className="h-4 w-4" />
                  <span>10. Risks, Exceptions &amp; Demurrage Exposure</span>
                </div>
                {expandedSections.charges ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
              {expandedSections.charges && (
                <div className="mt-3.5 space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-lg border border-border/40 bg-background/50 p-2.5">
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground">Demurrage Clock Status</span>
                      <p className="font-semibold text-foreground mt-0.5">{data.charges.demurrageStatus}</p>
                      <span className="text-[10px] text-primary">
                        Free Days Remaining: {data.charges.demurrageFreeDaysRemaining}
                      </span>
                    </div>
                    <div className="rounded-lg border border-border/40 bg-background/50 p-2.5">
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground">Demurrage Tariff Rate</span>
                      <p className="font-mono text-foreground mt-0.5">{data.charges.demurrageRatePerDay}</p>
                      <span className="text-[10px] text-muted-foreground">Standard Carrier Agreement</span>
                    </div>
                    <div className="rounded-lg border border-border/40 bg-background/50 p-2.5">
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground">Estimated Demurrage Exposure</span>
                      <p className="font-mono font-bold text-emerald-400 mt-0.5">$0.00 USD (Within Free Time)</p>
                      <span className="text-[10px] text-muted-foreground">{data.charges.detentionStatus}</span>
                    </div>
                  </div>

                  {data.charges.exceptionNotes.length > 0 && (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
                      <p className="font-bold text-amber-300 uppercase text-[10px] tracking-wider mb-1">Documented Exceptions:</p>
                      <ul className="space-y-1">
                        {data.charges.exceptionNotes.map((note, i) => (
                          <li key={i} className="text-amber-200 flex items-start gap-1">
                            <span>•</span>
                            <span>{note}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-xs">
                    <span className="font-bold text-primary uppercase text-[10px] tracking-wider block mb-1">Recommended Next Operational Action:</span>
                    <p className="text-foreground leading-relaxed">{data.charges.recommendedAction}</p>
                  </div>
                </div>
              )}
            </section>

          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-border/50 bg-[#070b12] text-xs text-muted-foreground shrink-0">
            <span className="font-mono text-[10px]">
              NASS Board Executive Control Tower · Verified Operational Data · All Figures Traceable to Source Records
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-8 border-border/70 text-xs font-semibold"
              onClick={onClose}
            >
              Close Dossier (Esc)
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
