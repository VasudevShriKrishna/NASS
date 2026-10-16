"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, SendHorizonal, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { postJson } from "@/lib/client";
import { fmtDateTime } from "@/components/app/shared";
import { useAppStore } from "@/lib/app-state";
import type { AssistantResponse, AssistantSection, AssistantStructured } from "@/lib/assistant-types";

/* NASS Operations Assistant (Phase 6) — chat surface over the deterministic
 * query tools. The API returns BOTH a phrased answer and a deterministic
 * `structured` payload (spec 6.2 sections); structured cards render from tool
 * output alone, so they stay grounded even when the model is degraded. */

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  asOf?: string;
  degraded?: boolean;
  structured?: AssistantStructured;
  dataQuality?: string;
}

const GOLD = "#d4af37";

const GREETING = [
  "NASS Operations Assistant — I query the connected shipment, event, freight, document and decision records BEFORE answering, then cite them.",
  "I never invent positions, events, ETAs or quantities. If records are missing I say so; if a time is ambiguous I ask.",
  "All times are Bahrain local (UTC+3). Click any shipment chip to open its record.",
].join(" ");

const SUGGESTIONS = [
  "Where is SHP-8801 now?",
  "How much of the material on SHP-8801 is in transit, at the port, and received?",
  "Where was SHP-8804 at 14:00 Bahrain time yesterday?",
  "Which shipments are at KBSP right now?",
  "Which BOL is missing a container number?",
  "What requires action today?",
  "Show every update for SHP-8803 in chronological order",
];

function qualityTone(dq: string | undefined): string {
  const q = (dq ?? "").toLowerCase();
  if (q.startsWith("verified")) return "border-emerald-400/40 bg-emerald-400/10 text-emerald-300";
  if (q.startsWith("estimated") || q.startsWith("aging")) return "border-amber-400/40 bg-amber-400/10 text-amber-300";
  if (q.startsWith("stale") || q.startsWith("unavailable")) return "border-rose-400/40 bg-rose-400/10 text-rose-300";
  return "border-zinc-400/40 bg-zinc-400/10 text-zinc-300"; // simulated / other
}

/** Wrap record refs (SHP-xxxx, BOL nos, ACT-xxxx, …) in monospace spans. */
function RefLine({ text }: { text: string }) {
  const parts = text.split(/(\b(?:SHP|PO|GRN|ACT|EX|CN|ADJ|WO)[-][A-Z0-9]+|\b[A-Z]{3,5}-\d{3,5}\b|\b[A-Z]{4}\d{7}\b)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^(SHP|PO|GRN|ACT|EX|CN|ADJ|WO)-[A-Z0-9]+$/.test(p) || /^[A-Z]{3,5}-\d{3,5}$/.test(p) || /^[A-Z]{4}\d{7}$/.test(p) ? (
          <span key={i} className="font-mono text-[0.82em] tracking-tight" style={{ color: GOLD }}>
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

function StructuredCard({ structured, dataQuality, degraded }: { structured: AssistantStructured; dataQuality?: string; degraded?: boolean }) {
  const drillTo = useAppStore((s) => s.drillTo);
  return (
    <div className={cn("space-y-2 rounded-xl border p-3", degraded ? "border-amber-400/30 bg-amber-400/5" : "border-[#d4af37]/25 bg-[#d4af37]/[0.04]")}>
      <div className="flex flex-wrap items-center gap-2">
        {structured.shipmentRef || structured.ref ? (
          <button
            type="button"
            onClick={() => drillTo("import-tracking", structured.shipmentRef ?? structured.ref)}
            title="Open the underlying shipment record in Import Tracking"
            className="rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold transition-colors hover:bg-[#d4af37]/15"
            style={{ borderColor: `${GOLD}66`, color: GOLD }}
          >
            {structured.shipmentRef ?? structured.ref} ↗
          </button>
        ) : null}
        {dataQuality ? (
          <span className={cn("rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", qualityTone(dataQuality))} title="Data quality (spec 6.2)">
            {dataQuality}
          </span>
        ) : null}
      </div>
      {structured.sections.map((sec: AssistantSection) => (
        <div key={sec.key} className="border-l-2 pl-2.5" style={{ borderColor: `${GOLD}55` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: GOLD }}>
            {sec.label}
          </p>
          <div className="mt-0.5 space-y-0.5 text-xs leading-relaxed text-foreground/90">
            {sec.lines.map((l, i) => (
              <p key={i} className="whitespace-pre-wrap">
                <RefLine text={l} />
              </p>
            ))}
          </div>
        </div>
      ))}
      {structured.asOfEvents && structured.asOfEvents.length > 0 ? (
        <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-border/60 bg-background/40 p-2" aria-label="Chronological events (Bahrain time)">
          {structured.asOfEvents.map((e, i) => (
            <p key={i} className="flex flex-wrap items-baseline gap-x-2 text-[11px] leading-snug">
              <span className="font-mono text-[10px] text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-foreground/90">{e.label}</span>
              <span className="ml-auto font-mono text-[10px] text-muted-foreground">{e.eventTime}</span>
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AssistantView() {
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: GREETING }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  async function send(question: string) {
    const q = question.trim();
    if (!q || loading) return;
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setInput("");
    setLoading(true);
    const res = await postJson<AssistantResponse>("/api/assistant", { question: q });
    setLoading(false);
    if (res.ok && res.data) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.data!.answer,
          sources: res.data!.sources,
          asOf: res.data!.as_of,
          degraded: res.data!.degraded,
          structured: res.data!.structured,
          dataQuality: res.data!.dataQuality,
        },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `The assistant could not complete the retrieval (${res.error?.message ?? "request failed"}). Core workflows are unaffected — retry, or use the operational views directly.`,
        },
      ]);
    }
    inputRef.current?.focus();
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-220px)] w-full max-w-3xl min-h-[420px] flex-col">
      <Card className="flex min-h-0 flex-1 flex-col border-[#d4af37]/20">
        <CardHeader className="flex flex-col gap-0.5 border-b border-[#d4af37]/20 py-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <CardTitle className="font-display text-base font-semibold tracking-wide" style={{ color: GOLD }}>
              NASS Operations Assistant
            </CardTitle>
            <p className="text-[11px] text-muted-foreground">retrieval before generation · evidence in every answer</p>
          </div>
          <span
            className="w-fit rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{ borderColor: `${GOLD}55`, color: GOLD, backgroundColor: `${GOLD}14` }}
          >
            record-grounded · Bahrain time (UTC+3)
          </span>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-3 p-4">
          {/* Message area */}
          <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1" aria-live="polite">
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm border border-[#d4af37]/40 bg-[#d4af37]/15 px-3.5 py-2.5 text-sm text-foreground">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex justify-start">
                  <div className="max-w-[92%] space-y-2">
                    <div className="whitespace-pre-wrap rounded-2xl rounded-bl-sm border border-border bg-muted/40 px-3.5 py-2.5 text-sm">{m.content}</div>
                    {m.structured ? <StructuredCard structured={m.structured} dataQuality={m.dataQuality} degraded={m.degraded} /> : null}
                    {m.sources && m.sources.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Sources:</span>
                        {m.sources.map((s) => (
                          <span key={s} className="rounded-md border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-700 dark:border-[#d4af37]/25 dark:bg-zinc-900 dark:text-[#d4af37]/90">
                            {s}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {m.asOf ? <p className="text-[10px] text-muted-foreground">as of {fmtDateTime(m.asOf)}</p> : null}
                    {m.degraded ? (
                      <p className="inline-flex items-start gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-2 text-xs text-amber-900 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300">
                        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                        Model unavailable — deterministic fallback built from retrieved records; core workflows unaffected (Rule 10).
                      </p>
                    ) : null}
                  </div>
                </div>
              )
            )}
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> querying shipment, event and decision records…
              </div>
            ) : null}
          </div>

          {/* Suggestion chips */}
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                disabled={loading}
                onClick={() => send(s)}
                className={cn(
                  "rounded-full border border-[#d4af37]/35 bg-[#d4af37]/10 px-2.5 py-1 text-xs text-foreground/90 transition-colors hover:bg-[#d4af37]/20",
                  "disabled:cursor-not-allowed disabled:opacity-50"
                )}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input row */}
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about shipment positions, quantities, ports, documents, exceptions or actions…"
              aria-label="Question"
              maxLength={2000}
              disabled={loading}
              className="min-h-11 border-[#d4af37]/25 focus-visible:ring-[#d4af37]/40"
            />
            <Button type="submit" disabled={loading || !input.trim()} className="min-h-11 shrink-0 bg-[#d4af37] font-semibold text-black hover:bg-[#c5a02f]">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <SendHorizonal className="h-4 w-4" aria-hidden />}
              Send
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
