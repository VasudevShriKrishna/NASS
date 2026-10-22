"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAppStore, parseViewFromPath, type ViewId } from "@/lib/app-state";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CaseStateBadge, EvidenceBadge, FreshnessBadge } from "@/components/app/shared";
import { ThemeToggle } from "@/components/theme-toggle";
import { LiveTraceabilityView } from "@/components/app/views/live";
import { PageFade, PulsingDot } from "@/components/app/motion";
import { LiveClock } from "@/components/app/live-clock";
import { AmbientGoldField } from "@/components/app/ambient";
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
  Crown,
  FileCheck2,
  Gauge,
  Gavel,
  LayoutDashboard,
  Menu,
  MessageSquareText,
  PackageSearch,
  PanelLeft,
  PanelLeftClose,
  RadioTower,
  Search,
  ShieldCheck,
  Warehouse,
  X,
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
// import { AssistantView } from "@/components/app/views/assistant";
import { GovernanceView } from "@/components/app/views/governance";
import { ArchitectureView } from "@/components/app/views/architecture";
import { CeoTowerView } from "@/components/app/views/ceo-tower";
import { VoiceCopilot } from "@/components/app/voice-copilot";

const NAV: { group: string; items: { id: ViewId; label: string; icon: React.ReactNode }[] }[] = [
  {
    group: "Command",
    items: [
      { id: "ceo-tower", label: "CEO Decision Tower", icon: <Crown className="h-4 w-4 text-amber-400" /> },
      { id: "live", label: "Live Traceability", icon: <RadioTower className="h-4 w-4" /> },
      { id: "control-tower", label: "Control Tower", icon: <LayoutDashboard className="h-4 w-4" /> },
      // { id: "assistant", label: "Operations Assistant", icon: <MessageSquareText className="h-4 w-4" /> },
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
      { id: "actions", label: "Decision Management", icon: <ArrowLeftRight className="h-4 w-4" /> },
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

function NavItems({
  onNavigate,
  searchQuery = "",
  onSearchClear,
}: {
  onNavigate?: () => void;
  searchQuery?: string;
  onSearchClear?: () => void;
}) {
  const { view, setView } = useAppStore();
  const q = searchQuery.trim().toLowerCase();

  const filteredNav = NAV.map((g) => {
    const groupMatches = g.group.toLowerCase().includes(q);
    const matchingItems = g.items.filter(
      (it) => it.label.toLowerCase().includes(q) || it.id.toLowerCase().includes(q) || groupMatches
    );
    return {
      group: g.group,
      items: matchingItems,
    };
  }).filter((g) => g.items.length > 0);

  if (q && filteredNav.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-xs text-muted-foreground">
        <p className="font-semibold text-foreground/80">No modules found</p>
        <p className="mt-1 text-[11px] text-muted-foreground/70">
          No matches for &ldquo;{searchQuery}&rdquo;
        </p>
        {onSearchClear && (
          <button
            type="button"
            onClick={onSearchClear}
            className="mt-3 inline-flex items-center gap-1 rounded border border-border px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-muted transition-colors"
          >
            Clear filter
          </button>
        )}
      </div>
    );
  }

  return (
    <nav aria-label="Main navigation" className="flex flex-col gap-4 px-3 py-3">
      {filteredNav.map((g) => (
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
                <span className="truncate">{it.label}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SidebarHeader({
  onCollapse,
  isSearchOpen,
  onToggleSearch,
  searchQuery,
  onSearchChange,
}: {
  onCollapse: () => void;
  isSearchOpen: boolean;
  onToggleSearch: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}) {
  return (
    <div className="shrink-0 pt-3 px-3">
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#f3dc8e] via-[#d4af37] to-[#8a6a1f] text-[#1a1408] shadow-[0_0_12px_oklch(0.79_0.135_88/20%)]">
            <Boxes className="h-4 w-4" />
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate font-display text-[13px] font-bold tracking-wide">
              NASS <span className="text-gold-grad">Control Tower</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={onToggleSearch}
            title={isSearchOpen ? "Close search" : "Search modules (Filter)"}
            aria-label="Toggle module search"
            className={cn(
              "cursor-pointer flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              isSearchOpen && "bg-primary/10 text-primary border border-primary/30"
            )}
          >
            <Search className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onCollapse}
            title="Collapse sidebar (Ctrl+B)"
            aria-label="Collapse sidebar"
            className="cursor-pointer flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isSearchOpen && (
        <div className="mt-2.5 relative flex items-center">
          <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground/70 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Filter modules..."
            autoFocus
            className="w-full h-7.5 pl-8 pr-7 text-xs rounded-md bg-muted/40 border border-border/70 focus:outline-none focus:border-primary/60 text-foreground placeholder:text-muted-foreground/60 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
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
          NASS <span className="text-gold-grad">Executive Control Tower</span>
        </p>
        <p className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.22em] text-muted-foreground">Freight Traceability · Decision Management · Operations Assistant</p>
      </div>
    </div>
  );
}

function GrokBotIcon({ className = "h-4 w-4", active = false }: { className?: string; active?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("transition-transform duration-300", active && "scale-105", className)}
    >
      <defs>
        <linearGradient id="grokGold" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fceda4" />
          <stop offset="45%" stopColor="#d4af37" />
          <stop offset="100%" stopColor="#8a6a1f" />
        </linearGradient>
      </defs>
      {/* Hex/Squircle faceted frame */}
      <path
        d="M12 2.5L20 7V17L12 21.5L4 17V7L12 2.5Z"
        stroke="url(#grokGold)"
        strokeWidth="1.6"
        strokeLinejoin="round"
        className={cn(active ? "opacity-100" : "opacity-85")}
      />
      {/* Grok-style forward slash with faceted crossbars */}
      <path
        d="M8.5 15.5L15.5 8.5"
        stroke="url(#grokGold)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M14.5 15.5L16.5 13.5"
        stroke="url(#grokGold)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M7.5 10.5L9.5 8.5"
        stroke="url(#grokGold)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* Center cybernetic pulse dot */}
      <circle cx="12" cy="12" r="1.5" fill="#fceda4" />
    </svg>
  );
}

export default function Home() {
  const {
    view,
    setView,
    drill,
    drillTo,
    clearDrill,
    openTrace,
    isVoiceCopilotOpen,
    toggleVoiceCopilot,
  } = useAppStore();
  const [navOpen, setNavOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [isResizing, setIsResizing] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const widthRef = useRef(sidebarWidth);

  useEffect(() => {
    widthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  // Synchronize URL path on initial mount and when user clicks browser back/forward buttons
  useEffect(() => {
    const handleUrlSync = () => {
      if (typeof window === "undefined") return;
      const detectedView = parseViewFromPath(window.location.pathname);
      const searchParams = new URLSearchParams(window.location.search);
      const ref = searchParams.get("ref");
      const ship = searchParams.get("ship");

      if (detectedView) {
        if (ref) {
          useAppStore.setState({
            view: detectedView,
            drill: { view: detectedView, ref },
          });
        } else if (detectedView === "live" && ship) {
          useAppStore.setState({
            view: "live",
            traceShip: ship,
          });
        } else {
          useAppStore.setState({
            view: detectedView,
            drill: null,
          });
        }
      }
    };

    handleUrlSync();
    window.addEventListener("popstate", handleUrlSync);
    return () => window.removeEventListener("popstate", handleUrlSync);
  }, []);

  // Restore sidebar preferences from localStorage
  useEffect(() => {
    try {
      const savedOpen = localStorage.getItem("nass_sidebar_open");
      if (savedOpen !== null) {
        setIsSidebarOpen(savedOpen === "true");
      }
      const savedWidth = localStorage.getItem("nass_sidebar_width");
      if (savedWidth) {
        const parsed = parseInt(savedWidth, 10);
        if (!isNaN(parsed) && parsed >= 180 && parsed <= 480) {
          setSidebarWidth(parsed);
        }
      }
    } catch { }
  }, []);

  // Persist sidebar open state
  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("nass_sidebar_open", String(next));
      } catch { }
      return next;
    });
  }, []);

  // Keyboard shortcut listeners: Ctrl+B (sidebar) or Ctrl+J (voice copilot)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key.toLowerCase() === "b" || (e.shiftKey && e.key.toLowerCase() === "s"))
      ) {
        e.preventDefault();
        toggleSidebar();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        toggleVoiceCopilot();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar, toggleVoiceCopilot]);

  // Mouse drag listeners for sidebar resizing
  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.classList.add("select-none", "cursor-col-resize");
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.min(480, Math.max(180, e.clientX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.classList.remove("select-none", "cursor-col-resize");
      try {
        localStorage.setItem("nass_sidebar_width", String(widthRef.current));
      } catch { }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.classList.remove("select-none", "cursor-col-resize");
    };
  }, [isResizing]);

  // Deep links: /?view=trace[&ship=SHP-8801] opens the Live Command overlay (shareable, new-tab safe)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("view") === "trace") {
      const ship = q.get("ship");
      openTrace(ship);
    }
  }, [openTrace]);

  // Consume cross-view drill once the target view mounts.
  useEffect(() => {
    if (drill) clearDrill();
  }, [drill, clearDrill]);

  const drillRef = drill?.view === view ? drill.ref : null;

  return (
    <div className="isolate flex min-h-screen flex-col bg-background">
      {/* Ambient gold field — drifting glow + specks (behind all content) */}
      <AmbientGoldField />

      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-primary/15 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex h-14 items-center gap-3 px-4">
          {/* Mobile nav */}
          <Sheet open={navOpen} onOpenChange={setNavOpen}>
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
                <NavItems onNavigate={() => setNavOpen(false)} />
              </ScrollArea>
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Boxes className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold">NASS CT</span>
          </div>

          <div className="hidden items-center gap-2 lg:flex">
            {/* ChatGPT-style sidebar toggle button */}
            <button
              type="button"
              onClick={toggleSidebar}
              title={isSidebarOpen ? "Collapse sidebar (Ctrl+B)" : "Open sidebar (Ctrl+B)"}
              aria-label={isSidebarOpen ? "Collapse sidebar" : "Open sidebar"}
              className={cn(
                "cursor-pointer inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-all mr-1",
                !isSidebarOpen
                  ? "border-primary/60 bg-primary/15 text-primary shadow-[0_0_12px_rgba(212,175,55,0.3)] hover:bg-primary/25"
                  : "border-border/60 bg-card/40 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-muted"
              )}
            >
              {isSidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
            </button>

            <Activity className="h-4 w-4 text-primary" />
            <h1 className="text-sm font-semibold tracking-tight">
              {NAV.flatMap((g) => g.items).find((i) => i.id === view)?.label ?? "Control Tower"}
            </h1>
            <button
              type="button"
              onClick={() => openTrace()}
              title="Open the NASS Freight Traceability Map"
              className="ml-1 hidden cursor-pointer items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary transition-colors hover:bg-primary/20 md:inline-flex"
            >
              <PulsingDot /> live map
            </button>
            <LiveClock
              prefix="ops"
              className="hidden xl:inline-flex items-center rounded-md border border-border/70 bg-card/60 px-2 py-1 text-[11px] font-semibold"
            />
          </div>

          <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
            <span className="hidden md:inline-flex items-center gap-1 rounded-md border border-teal-300 bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold text-teal-800 dark:border-teal-400/25 dark:bg-teal-400/10 dark:text-teal-300">
              <Gavel className="h-3 w-3" /> READ-ONLY SCOPE (M01)
            </span>
            <EvidenceBadge label="PROPOSED TARGET CAPABILITY" />
            <FreshnessBadge value="fresh" />

            {/* Dedicated Theme Toggle in Header Bar */}
            <ThemeToggle />
          </div>
        </div>
        {/* gold hairline */}
        <div className="hairline-gold h-px w-full" aria-hidden />
      </header>

      <div className={cn("flex flex-1", isResizing && "select-none")}>
        {/* Desktop sidebar - clean sticky top-14 positioning WITHOUT relative */}
        <aside
          style={{ width: isSidebarOpen ? `${sidebarWidth}px` : "0px" }}
          className={cn(
            "sticky top-14 hidden h-[calc(100vh-3.5rem)] shrink-0 border-primary/10 bg-sidebar lg:block z-30 overflow-hidden",
            isSidebarOpen ? "border-r" : "border-r-0",
            !isResizing && "transition-[width] duration-300 ease-in-out"
          )}
        >
          <div
            style={{ width: `${sidebarWidth}px` }}
            className="flex h-full flex-col justify-between"
          >
            <SidebarHeader
              onCollapse={toggleSidebar}
              isSearchOpen={isSearchOpen}
              onToggleSearch={() => {
                setIsSearchOpen((prev) => {
                  if (prev) setSearchQuery("");
                  return !prev;
                });
              }}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
            <Separator className="mt-2.5" />
            <ScrollArea className="flex-1 overflow-y-auto">
              <NavItems searchQuery={searchQuery} onSearchClear={() => setSearchQuery("")} />
            </ScrollArea>
          </div>

          {/* Draggable vertical resize handle on right border */}
          {isSidebarOpen && (
            <div
              onMouseDown={startResizing}
              role="separator"
              aria-orientation="vertical"
              title="Drag to resize sidebar width (180px – 480px)"
              className={cn(
                "absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize z-40 transition-colors group select-none",
                isResizing ? "bg-primary" : "hover:bg-primary/50"
              )}
            >
              <div
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 right-[2px] h-8 w-[2px] rounded-full transition-colors",
                  isResizing ? "bg-primary-foreground" : "group-hover:bg-primary/80"
                )}
              />
            </div>
          )}
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 px-3 py-4 sm:px-5 sm:py-5">
          <PageFade viewKey={view}>
            {drillRef ? (
              <button
                onClick={() => drillTo(view)}
                className="mb-3 inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
              >
                <XCircle className="h-3.5 w-3.5" /> Focused on <span className="font-mono font-semibold">{drillRef}</span> — click to clear
              </button>
            ) : null}
            {view === "ceo-tower" && <CeoTowerView drillRef={drillRef ?? undefined} />}
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
            {/* {view === "assistant" && <AssistantView />} */}
            {view === "governance" && <GovernanceView />}
            {view === "architecture" && <ArchitectureView />}
          </PageFade>
        </main>
      </div>

      {/* Sticky footer (MT layout rule): mt-auto + min-h-screen root */}
      <footer className="mt-auto border-t border-primary/10 bg-sidebar/60">
        <div className="hairline-gold h-px w-full" aria-hidden />
        <div className="flex flex-col items-center justify-between gap-2 px-4 py-3 text-[11px] text-muted-foreground sm:flex-row">
          <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center sm:text-left">
            <span className="font-semibold text-foreground">NASS <span className="text-gold-grad">Executive Control Tower</span></span>
            <span>· Freight Traceability, Decision Management &amp; Operations Assistant</span>
            <span>· evidence-before-assertion · vessel ≠ container · verified outcomes only</span>
          </p>
          <p className="flex items-center gap-1.5 whitespace-nowrap">
            <Anchor className="h-3 w-3 text-primary/70" /> Modules M01–M23 · Workflows A–E · Single operational backbone
          </p>
        </div>
      </footer>

      {/* NASS Freight Traceability Map — full-screen overlay.
          Rendered OUTSIDE PageFade/main: framer-motion's filter on PageFade
          would trap position:fixed inside a transformed containing block. */}
      {view === "live" && <LiveTraceabilityView drillRef={drillRef} />}

      {/* Website-Wide Voice AI Copilot (Sarvam STT/TTS + Sarvam 105B Reasoning & MCP) */}
      <VoiceCopilot />
    </div>
  );
}
