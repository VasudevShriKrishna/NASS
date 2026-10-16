"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, BookOpenText, CheckSquare, CircleHelp, Layers3, ListChecks } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { EvidenceBadge, StatusPill } from "@/components/app/shared";
import {
  API_GROUPS,
  ARCHITECTURE_INTERPRETATION,
  BOL_EXCEPTION_CATALOGUE,
  DATA_QUALITY_RULES,
  ENTITY_MODEL,
  EVENT_ENVELOPE,
  EVIDENCE_MAP,
  EVIDENCE_VOCABULARY,
  FAILURE_MATRIX,
  METRICS,
  MODULES,
  NON_NEGOTIABLE_RULES,
  OPERATING_CONTEXT,
  OUTPUT_FORMAT_SECTIONS,
  PHASES,
  REFERENCE_ARCHITECTURE_MERMAID,
  RELATIONSHIP_RULES,
  SPEC_META,
  STATE_MACHINES,
  TWO_PASS_REVIEW,
  WORKFLOWS,
} from "@/lib/spec-data";

/* ── Client-only Mermaid renderer (dynamic import, unique ids, strict-mode guard) ── */
let mermaidSeq = 0;
function Mermaid({ chart }: { chart: string }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const startedRef = useRef(false);
  const [failed, setFailed] = useState(false);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({ startOnLoad: false, theme: "neutral", securityLevel: "loose" });
        const id = `arch-${Date.now().toString(36)}-${++mermaidSeq}`;
        const { svg } = await mermaid.render(id, chart);
        if (cancelled) return;
        if (hostRef.current) {
          hostRef.current.innerHTML = svg;
          setRendered(true);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chart]);

  if (failed) {
    return (
      <div className="overflow-auto rounded-lg border bg-card p-4">
        <p className="mb-2 text-xs font-semibold text-rose-700 dark:text-rose-400">Diagram renderer unavailable — showing the Mermaid source:</p>
        <pre className="min-w-[900px] font-mono text-xs leading-relaxed">{chart}</pre>
      </div>
    );
  }
  return (
    <div className="overflow-auto rounded-lg border bg-card p-4">
      {!rendered ? <p className="py-8 text-center text-sm text-muted-foreground">Rendering reference architecture diagram…</p> : null}
      <div ref={hostRef} className={cn("min-w-[900px]", !rendered && "hidden")} role="img" aria-label="Reference architecture diagram" />
    </div>
  );
}

/* ── Small helpers ── */
function RuleLine({ rule }: { rule: string }) {
  const idx = rule.indexOf(". ");
  const lead = idx > 0 ? `${rule.slice(0, idx + 1)}` : rule;
  const rest = idx > 0 ? rule.slice(idx + 2) : "";
  return (
    <li className="text-sm leading-relaxed">
      <span className="font-semibold">{lead}</span> {rest}
    </li>
  );
}

function CalloutNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-2 text-xs text-amber-900 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300">
      {children}
    </p>
  );
}

function LabelChip({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-md border border-teal-300 bg-teal-50 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-teal-800 dark:border-teal-400/25 dark:bg-teal-400/10 dark:text-teal-300">
      {text}
    </span>
  );
}

const EVIDENCE_LABELS = [
  "PUBLICLY EVIDENCED",
  "PROPOSED TARGET CAPABILITY",
  "REQUIRES CUSTOMER DATA/INTEGRATION",
  "REQUIRES DEMO/VALIDATION",
  "NOT CONFIRMED",
];

export function ArchitectureView() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <BookOpenText className="h-5 w-5 text-teal-700 dark:text-teal-400" aria-hidden />
          <h2 className="text-lg font-bold">Architecture &amp; Spec — exact extraction of upload/K.md</h2>
          <Badge variant="outline" className="font-mono">
            v{SPEC_META.version}
          </Badge>
          <Badge variant="outline" className="font-mono text-[10px]">
            {SPEC_META.name}
          </Badge>
        </div>
        <p className="max-w-4xl text-sm text-muted-foreground">{SPEC_META.description}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Evidence labels:</span>
          {EVIDENCE_LABELS.map((l) => (
            <EvidenceBadge key={l} label={l} />
          ))}
        </div>
      </div>

      <Accordion type="multiple" defaultValue={["s-purpose", "s-rules"]} className="space-y-3">
        {/* 1. Purpose */}
        <AccordionItem value="s-purpose" className="rounded-lg border bg-card px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Badge variant="outline" className="font-mono">§2</Badge> 1. Purpose &amp; operating context
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-3">
            <p className="text-sm leading-relaxed">
              A single operational view backed by connected source records — not an AI chatbot on top of disconnected data. Every
              operational alert must be traceable to evidence, assigned to an owner, worked through an approved action, and closed
              only after the outcome is verified.
            </p>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Operating context</p>
            <ul className="space-y-1.5">
              {OPERATING_CONTEXT.map((o) => (
                <li key={o} className="flex gap-2 text-sm leading-relaxed">
                  <CircleHelp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  {o}
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>

        {/* 2. Non-negotiable rules */}
        <AccordionItem value="s-rules" className="rounded-lg border bg-card px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Badge variant="outline" className="font-mono">§3</Badge> 2. Non-negotiable design rules
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <ol className="list-decimal space-y-2 pl-5">
              {NON_NEGOTIABLE_RULES.map((r) => (
                <RuleLine key={r} rule={r} />
              ))}
            </ol>
          </AccordionContent>
        </AccordionItem>

        {/* 3. Reference architecture */}
        <AccordionItem value="s-arch" className="rounded-lg border bg-card px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Badge variant="outline" className="font-mono">§7</Badge> 3. Reference architecture
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <Mermaid chart={REFERENCE_ARCHITECTURE_MERMAID} />
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Interpretation notes</p>
              <ul className="list-disc space-y-1 pl-5">
                {ARCHITECTURE_INTERPRETATION.map((t) => (
                  <li key={t} className="text-sm leading-relaxed">
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 4. Canonical entities */}
        <AccordionItem value="s-entities" className="rounded-lg border bg-card px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Badge variant="outline" className="font-mono">§8.1</Badge> 4. Canonical entities &amp; relationship rules
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-xs tabular-nums">
                <thead className="bg-muted/50">
                  <tr className="text-left uppercase tracking-wide text-muted-foreground">
                    <th className="px-2.5 py-2 font-medium">#</th>
                    <th className="px-2.5 py-2 font-medium">Entity</th>
                    <th className="px-2.5 py-2 font-medium">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {ENTITY_MODEL.map((e, i) => (
                    <tr key={e.id} className={cn("border-t border-border/60", i % 2 === 1 && "bg-muted/30")}>
                      <td className="px-2.5 py-1.5 font-mono">{e.id}</td>
                      <td className="px-2.5 py-1.5 font-semibold">{e.name}</td>
                      <td className="px-2.5 py-1.5 leading-relaxed">{e.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Relationship rules (§8.2)</p>
              <ul className="list-disc space-y-1 pl-5">
                {RELATIONSHIP_RULES.map((r) => (
                  <li key={r} className="text-sm leading-relaxed">
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 5. Modules */}
        <AccordionItem value="s-modules" className="rounded-lg border bg-card px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Badge variant="outline" className="font-mono">§9</Badge> 5. Modules M01–M23
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <Accordion type="single" collapsible className="space-y-2">
              {MODULES.map((m) => (
                <AccordionItem key={m.id} value={m.id} className="rounded-md border px-3">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex flex-wrap items-center gap-2 text-left text-sm">
                      <Badge variant="outline" className="font-mono">
                        {m.id}
                      </Badge>
                      {m.name}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-2">
                    <p className="text-sm leading-relaxed">
                      <span className="font-semibold">Purpose.</span> {m.purpose}
                    </p>
                    <p className="text-sm leading-relaxed">
                      <span className="font-semibold">Capabilities.</span> {m.capabilities}
                    </p>
                    {m.controls ? (
                      <p className="text-sm leading-relaxed">
                        <span className="font-semibold">Controls.</span> {m.controls}
                      </p>
                    ) : null}
                    {m.rules ? (
                      <p className="text-sm leading-relaxed">
                        <span className="font-semibold">Rules.</span> {m.rules}
                      </p>
                    ) : null}
                    {m.acceptance ? (
                      <p className="text-sm leading-relaxed">
                        <span className="font-semibold">Acceptance.</span> {m.acceptance}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-2">
                      <LabelChip text="IN THIS APP" />
                      <span className="text-sm">{m.implementedInApp}</span>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </AccordionContent>
        </AccordionItem>

        {/* 6. Workflows */}
        <AccordionItem value="s-workflows" className="rounded-lg border bg-card px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Badge variant="outline" className="font-mono">§10</Badge> 6. Closed-loop workflows A–E
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <CalloutNote>
              All workflows implement detect → enrich → validate → prioritize → assign → investigate → propose action → approve when
              required → execute → verify → close → learn.
            </CalloutNote>
            {WORKFLOWS.map((w) => (
              <div key={w.id} className="rounded-md border p-3">
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <Badge variant="outline" className="font-mono">
                    Workflow {w.id}
                  </Badge>
                  {w.name}
                </p>
                <ol className="list-decimal space-y-1 pl-5">
                  {w.steps.map((s, i) => (
                    <li key={`${w.id}-${i}`} className="text-sm leading-relaxed">
                      {s}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <ListChecks className="h-3.5 w-3.5" aria-hidden /> BOL exception catalogue (detected field-level)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {BOL_EXCEPTION_CATALOGUE.map((c) => (
                  <span key={c} className="rounded-md border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-700 dark:border-zinc-400/25 dark:bg-zinc-900 dark:text-zinc-300">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 7. Event & API contracts */}
        <AccordionItem value="s-contracts" className="rounded-lg border bg-card px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Badge variant="outline" className="font-mono">§11</Badge> 7. Event &amp; API contracts
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Event envelope (§11.1)</p>
            <pre className="overflow-auto rounded-md border bg-muted/40 p-3 font-mono text-xs leading-relaxed">{EVENT_ENVELOPE}</pre>
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">API groups</p>
              <ul className="space-y-1">
                {API_GROUPS.map((g) => (
                  <li key={g} className="font-mono text-xs leading-relaxed">
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 8. State machines */}
        <AccordionItem value="s-machines" className="rounded-lg border bg-card px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Badge variant="outline" className="font-mono">§13.1</Badge> 8. State machines per domain
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            {STATE_MACHINES.map((sm) => (
              <div key={sm.domain}>
                <p className="mb-1.5 text-sm font-semibold">{sm.domain}</p>
                <div className="flex flex-wrap items-center gap-x-1 gap-y-1.5">
                  {sm.states.map((s, i) => (
                    <span key={s} className="inline-flex items-center gap-1">
                      {i > 0 ? <ArrowRight className="h-3 w-3 text-muted-foreground/60" aria-hidden /> : null}
                      <StatusPill value={s} />
                    </span>
                  ))}
                </div>
                {sm.note ? <p className="mt-1 text-xs text-muted-foreground">{sm.note}</p> : null}
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>

        {/* 9. Failure matrix */}
        <AccordionItem value="s-failure" className="rounded-lg border bg-card px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Badge variant="outline" className="font-mono">§12</Badge> 9. Runtime failure matrix
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr className="text-left uppercase tracking-wide text-muted-foreground">
                    <th className="px-2.5 py-2 font-medium">Condition</th>
                    <th className="px-2.5 py-2 font-medium">Required behavior</th>
                    <th className="px-2.5 py-2 font-medium">Never do this</th>
                  </tr>
                </thead>
                <tbody>
                  {FAILURE_MATRIX.map((f, i) => (
                    <tr key={f.condition} className={cn("border-t border-border/60 align-top", i % 2 === 1 && "bg-muted/30")}>
                      <td className="px-2.5 py-2 font-semibold">{f.condition}</td>
                      <td className="px-2.5 py-2 leading-relaxed">{f.required}</td>
                      <td className="bg-rose-50/70 px-2.5 py-2 leading-relaxed text-rose-900 dark:bg-rose-400/10/50 dark:text-rose-200">{f.never}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 10. Data quality + metrics */}
        <AccordionItem value="s-quality" className="rounded-lg border bg-card px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Badge variant="outline" className="font-mono">§15/§16</Badge> 10. Data quality rules &amp; metrics
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Data quality rules (§15)</p>
              <ul className="list-disc space-y-1 pl-5">
                {DATA_QUALITY_RULES.map((r) => (
                  <li key={r} className="text-sm leading-relaxed">
                    {r}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Metrics (§16)</p>
              <ul className="list-disc space-y-1 pl-5">
                {METRICS.map((m) => (
                  <li key={m} className="text-sm leading-relaxed">
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 11. Phases */}
        <AccordionItem value="s-phases" className="rounded-lg border bg-card px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Badge variant="outline" className="font-mono">§17</Badge> 11. Implementation phases &amp; decision gates
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {PHASES.map((p) => (
                <div key={p.phase} className="rounded-md border p-3">
                  <p className="mb-1 flex items-center gap-2 text-sm font-semibold">
                    <Layers3 className="h-4 w-4 text-teal-700 dark:text-teal-400" aria-hidden />
                    {p.phase} — {p.name}
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{p.detail}</p>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 12. Evidence map */}
        <AccordionItem value="s-evidence" className="rounded-lg border bg-card px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Badge variant="outline" className="font-mono">§18</Badge> 12. Evidence map &amp; vocabulary
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr className="text-left uppercase tracking-wide text-muted-foreground">
                    <th className="px-2.5 py-2 font-medium">Ref</th>
                    <th className="px-2.5 py-2 font-medium">Described</th>
                    <th className="px-2.5 py-2 font-medium">Relevance</th>
                    <th className="px-2.5 py-2 font-medium">Must-not-claim</th>
                  </tr>
                </thead>
                <tbody>
                  {EVIDENCE_MAP.map((r, i) => (
                    <tr key={r.ref} className={cn("border-t border-border/60 align-top", i % 2 === 1 && "bg-muted/30")}>
                      <td className="px-2.5 py-2 font-semibold">{r.ref}</td>
                      <td className="px-2.5 py-2 leading-relaxed">{r.described}</td>
                      <td className="px-2.5 py-2 leading-relaxed">{r.relevance}</td>
                      <td className="bg-rose-50/70 px-2.5 py-2 leading-relaxed text-rose-900 dark:bg-rose-400/10/50 dark:text-rose-200">{r.mustNotClaim}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Evidence vocabulary</p>
              <ul className="space-y-1">
                {EVIDENCE_VOCABULARY.map((v) => (
                  <li key={v.term} className="text-sm leading-relaxed">
                    <span className="font-semibold">{v.term}</span> — {v.meaning}
                  </li>
                ))}
              </ul>
            </div>
            <CalloutNote>
              A public case study proves a capability was published; it does not prove integration, licensing or deployment for NASS.
            </CalloutNote>
          </AccordionContent>
        </AccordionItem>

        {/* 13. Two-pass review */}
        <AccordionItem value="s-twopass" className="rounded-lg border bg-card px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Badge variant="outline" className="font-mono">§20</Badge> 13. Two-pass review
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {[TWO_PASS_REVIEW.pass1, TWO_PASS_REVIEW.pass2].map((pass) => (
                <div key={pass.title} className="rounded-md border p-3">
                  <p className="mb-2 text-sm font-semibold">{pass.title}</p>
                  <ul className="space-y-1.5">
                    {pass.items.map((it) => (
                      <li key={it} className="flex gap-2 text-sm leading-relaxed">
                        <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 14. Output format */}
        <AccordionItem value="s-output" className="rounded-lg border bg-card px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Badge variant="outline" className="font-mono">§21</Badge> 14. Output format
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <ol className="list-decimal space-y-1 pl-5">
              {OUTPUT_FORMAT_SECTIONS.map((s) => (
                <li key={s} className="text-sm leading-relaxed">
                  {s}
                </li>
              ))}
            </ol>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
