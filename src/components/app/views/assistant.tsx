"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, SendHorizonal, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { postJson } from "@/lib/client";
import { fmtDateTime } from "@/components/app/shared";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  asOf?: string;
  degraded?: boolean;
}

const GREETING = [
  "Grounded operations assistant. My query contract (M20): retrieve source records first, then give a deterministic, grounded answer with an explanation.",
  "I state \u201cunknown/unavailable\u201d when connected source coverage is absent. I never invent container locations, ETAs, receipts or asset conditions, and a vessel AIS position is never treated as a container position.",
  "Ask about shipments, BOLs, exceptions, stock or assets. Every answer cites the source records it used and the as-of time.",
].join(" ");

const SUGGESTIONS = [
  "Which shipments have slipped against supplier-confirmed ETD/ETA?",
  "What is the latest source-reported location of SHP-8804?",
  "Which BOL is missing a container number?",
  "What stock is available at each warehouse?",
  "Which assets have abnormal telemetry or missed inspections?",
  "Which PRs are waiting for approval or sourcing?",
];

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
    const res = await postJson<{ answer: string; as_of: string; sources: string[]; degraded?: boolean }>("/api/assistant", { question: q });
    setLoading(false);
    if (res.ok && res.data) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.data!.answer, sources: res.data!.sources, asOf: res.data!.as_of, degraded: res.data!.degraded },
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
      <Card className="flex min-h-0 flex-1 flex-col">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 border-b py-3">
          <CardTitle className="text-sm font-semibold">Grounded conversational assistant (M20)</CardTitle>
          <span className="rounded-md border border-teal-300 bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold text-teal-800 dark:border-teal-400/25 dark:bg-teal-400/10 dark:text-teal-300">
            retrieval before generation
          </span>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-3 p-4">
          {/* Message area */}
          <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1" aria-live="polite">
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-teal-600 px-3.5 py-2.5 text-sm text-white">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex justify-start">
                  <div className="max-w-[92%] space-y-2">
                    <div className="whitespace-pre-wrap rounded-2xl rounded-bl-sm border bg-muted/40 px-3.5 py-2.5 text-sm">{m.content}</div>
                    {m.sources && m.sources.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Sources:</span>
                        {m.sources.map((s) => (
                          <span key={s} className="rounded-md border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-700 dark:border-zinc-400/25 dark:bg-zinc-900 dark:text-zinc-300">
                            {s}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {m.asOf ? <p className="text-[10px] text-muted-foreground">as of {fmtDateTime(m.asOf)}</p> : null}
                    {m.degraded ? (
                      <p className="inline-flex items-start gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-2 text-xs text-amber-900 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300">
                        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                        Model unavailable — deterministic fallback used; core workflows unaffected (Rule 10).
                      </p>
                    ) : null}
                  </div>
                </div>
              )
            )}
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> retrieving source records…
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
                  "rounded-full border border-teal-300 bg-teal-50 px-2.5 py-1 text-xs text-teal-900 transition-colors hover:bg-teal-100",
                  "disabled:cursor-not-allowed disabled:opacity-50 dark:border-teal-400/25 dark:bg-teal-400/10 dark:text-teal-200 dark:hover:bg-teal-900"
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
              placeholder="Ask about shipments, BOLs, stock, assets or open cases…"
              aria-label="Question"
              maxLength={2000}
              disabled={loading}
              className="min-h-11"
            />
            <Button type="submit" disabled={loading || !input.trim()} className="min-h-11 shrink-0">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <SendHorizonal className="h-4 w-4" aria-hidden />}
              Send
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
