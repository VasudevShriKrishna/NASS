"use client";

import { useEffect } from "react";
import { useAppStore, type ViewId } from "@/lib/app-state";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CaseStateBadge, EvidenceBadge, FreshnessBadge } from "@/components/app/shared";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Activity,
  Anchor,
  ArrowLeftRight,
  BellRing,
  Boxes,
  Building2,
  ClipboardCheck,
  Compass,
  Container,
  FileCheck2,
  Gauge,
  Gavel,
  LayoutDashboard,
  Menu,
  MessageSquareText,
  PackageSearch,
  ShieldCheck,
  Warehouse,
  XCircle,
} from "lucide-react";
import { ControlTowerView } from "@/components/app/views/control-tower";
import { ProcurementView } from "@/components/app/views/procurement";
import { SuppliersView } from "@/components/app/views/suppliers";
import { ImportTrackingView } from "@/components/app/views/import-tracking";
import { BolIntelligenceView } from "@/components/app/views/bol-intelligence";
import { InventoryView } from "@/components/app/views/inventory";
import { ReceivingView } from "@/components/app/views/receiving";
import { ProjectsView } from "@/components/app/views/projects";
import { AssetsView } from "@/components/app/views/assets";
import { ExceptionsView } from "@/components/app/views/exceptions";
import { ActionsView } from "@/components/app/views/actions";
import { AssistantView } from "@/components/app/views/assistant";
import { GovernanceView } from "@/components/app/views/governance";
import { ArchitectureView } from "@/components/app/views/architecture";

const NAV: { group: string; items: { id: ViewId; label: string; icon: React.ReactNode }[] }[] = [
  {
    group: "Command",
    items: [
      { id: "control-tower", label: "Control Tower", icon: <LayoutDashboard className="h-4 w-4" /> },
      { id: "assistant", label: "Ops Assistant", icon: <MessageSquareText className="h-4 w-4" /> },
    ],
  },
  {
    group: "Procure (M04–M07)",
    items: [
      { id: "procurement", label: "PR · RFQ · PO · Contracts", icon: <ClipboardCheck className="h-4 w-4" /> },
      { id: "suppliers", label: "Suppliers & Scorecards", icon: <Building2 className="h-4 w-4" /> },
    ],
  },
  {
    group: "Import (M08–M11)",
    items: [
      { id: "import-tracking", label: "Shipment Tracking", icon: <Container className="h-4 w-4" /> },
      { id: "bol-intelligence", label: "BOL Intelligence", icon: <Anchor className="h-4 w-4" /> },
    ],
  },
  {
    group: "Warehouse & Assets (M12–M15)",
    items: [
      { id: "inventory", label: "Inventory", icon: <Warehouse className="h-4 w-4" /> },
      { id: "receiving", label: "Receiving & QC", icon: <PackageSearch className="h-4 w-4" /> },
      { id: "projects", label: "Project Materials", icon: <Compass className="h-4 w-4" /> },
      { id: "assets", label: "Assets & Telemetry", icon: <Gauge className="h-4 w-4" /> },
    ],
  },
  {
    group: "Operate (M16–M19)",
    items: [
      { id: "exceptions", label: "Exceptions (Closed Loop)", icon: <BellRing className="h-4 w-4" /> },
      { id: "actions", label: "Actions & Approvals", icon: <ArrowLeftRight className="h-4 w-4" /> },
    ],
  },
  {
    group: "Govern (M22–M23)",
    items: [{ id: "governance", label: "Audit · Evidence · Health", icon: <ShieldCheck className="h-4 w-4" /> }],
  },
  {
    group: "Reference",
    items: [
      { id: "architecture", label: "Architecture & Spec", icon: <FileCheck2 className="h-4 w-4" /> },
    ],
  },
];

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const { view, setView } = useAppStore();
  return (
    <nav aria-label="Main navigation" className="flex flex-col gap-4 px-3 py-4">
      {NAV.map((g) => (
        <div key={g.group}>
          <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{g.group}</p>
          <div className="flex flex-col gap-0.5">
            {g.items.map((it) => (
              <button
                key={it.id}
                onClick={() => {
                  setView(it.id);
                  onNavigate?.();
                }}
                aria-current={view === it.id ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-md border-l-2 border-transparent px-2.5 py-2 text-left text-[13px] font-medium transition-colors",
                  view === it.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                {it.icon}
                {it.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-4 pt-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#f3dc8e] via-[#d4af37] to-[#8a6a1f] text-[#1a1408] shadow-[0_0_18px_oklch(0.79_0.135_88/25%)]">
        <Boxes className="h-5 w-5" />
      </div>
      <div className="min-w-0 leading-tight">
        <p className="truncate font-display text-sm font-bold tracking-wide">
          NASS <span className="text-gold-grad">Supply Chain Intelligence</span>
        </p>
        <p className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.28em] text-muted-foreground">Closed-loop control tower</p>
      </div>
    </div>
  );
}

export default function Home() {
  const { view, drill, drillTo, clearDrill } = useAppStore();

  // Consume cross-view drill once the target view mounts.
  useEffect(() => {
    if (drill) clearDrill();
  }, [drill, clearDrill]);

  const drillRef = drill?.view === view ? drill.ref : null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-primary/15 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex h-14 items-center gap-3 px-4">
          {/* Mobile nav */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden" aria-label="Open navigation">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <Brand />
              <Separator className="mt-3" />
              <ScrollArea className="h-[calc(100vh-5.5rem)]">
                <NavItems onNavigate={() => undefined} />
              </ScrollArea>
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Boxes className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold">NASS SCI</span>
          </div>

          <div className="hidden items-center gap-2 lg:flex">
            <Activity className="h-4 w-4 text-primary" />
            <h1 className="text-sm font-semibold tracking-tight">
              {NAV.flatMap((g) => g.items).find((i) => i.id === view)?.label ?? "Control Tower"}
            </h1>
          </div>

          <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
            <span className="hidden md:inline-flex items-center gap-1 rounded-md border border-teal-300 bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold text-teal-800 dark:border-teal-400/25 dark:bg-teal-400/10 dark:text-teal-300">
              <Gavel className="h-3 w-3" /> READ-ONLY SCOPE (M01)
            </span>
            <EvidenceBadge label="PROPOSED TARGET CAPABILITY" />
            <FreshnessBadge value="fresh" />
            <ThemeToggle />
          </div>
        </div>
        {/* gold hairline */}
        <div className="hairline-gold h-px w-full" aria-hidden />
      </header>

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-64 shrink-0 border-r border-primary/10 bg-sidebar lg:block">
          <ScrollArea className="h-full">
            <Brand />
            <Separator className="mt-3" />
            <NavItems />
          </ScrollArea>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 px-3 py-4 sm:px-5 sm:py-5">
          {drillRef ? (
            <button
              onClick={() => drillTo(view)}
              className="mb-3 inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
            >
              <XCircle className="h-3.5 w-3.5" /> Focused on <span className="font-mono font-semibold">{drillRef}</span> — click to clear
            </button>
          ) : null}
          {view === "control-tower" && <ControlTowerView drillRef={drillRef} />}
          {view === "procurement" && <ProcurementView />}
          {view === "suppliers" && <SuppliersView />}
          {view === "import-tracking" && <ImportTrackingView drillRef={drillRef} />}
          {view === "bol-intelligence" && <BolIntelligenceView drillRef={drillRef} />}
          {view === "inventory" && <InventoryView />}
          {view === "receiving" && <ReceivingView />}
          {view === "projects" && <ProjectsView />}
          {view === "assets" && <AssetsView />}
          {view === "exceptions" && <ExceptionsView drillRef={drillRef} />}
          {view === "actions" && <ActionsView drillRef={drillRef} />}
          {view === "assistant" && <AssistantView />}
          {view === "governance" && <GovernanceView />}
          {view === "architecture" && <ArchitectureView />}
        </main>
      </div>

      {/* Sticky footer (MT layout rule): mt-auto + min-h-screen root */}
      <footer className="mt-auto border-t border-primary/10 bg-sidebar/60">
        <div className="hairline-gold h-px w-full" aria-hidden />
        <div className="flex flex-col items-center justify-between gap-2 px-4 py-3 text-[11px] text-muted-foreground sm:flex-row">
          <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center sm:text-left">
            <span className="font-semibold text-foreground">NASS <span className="text-gold-grad">Closed-Loop Supply Chain Intelligence</span></span>
            <span>· skill spec v1.0.0</span>
            <span>· evidence-before-assertion · vessel ≠ container · verified outcomes only</span>
          </p>
          <p className="flex items-center gap-1.5 whitespace-nowrap">
            <Anchor className="h-3 w-3 text-primary/70" /> Modules M01–M23 · Workflows A–E · Single operational backbone
          </p>
        </div>
      </footer>
    </div>
  );
}
