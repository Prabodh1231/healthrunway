"use client";

import { useState } from "react";
import { Languages, Loader2, Sparkles } from "lucide-react";

type Lang = "en" | "hi";

/** Asks the server for a plain-language explanation; falls back to a rule-based summary. */
export function AiExplainer(props: {
  facts: Record<string, string | number | boolean>;
  actions: string[];
  fallback: string;
}) {
  const [lang, setLang] = useState<Lang>("en");
  const [state, setState] = useState<{ status: "idle" | "loading" | "done"; text?: string; note?: string }>({
    status: "idle",
  });

  async function explain(language: Lang) {
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, facts: props.facts, actions: props.actions }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Request failed");
      setState({ status: "done", text: body.text });
    } catch (e) {
      setState({
        status: "done",
        text: props.fallback,
        note: `AI explanation unavailable (${e instanceof Error ? e.message : "error"}). Showing the standard summary.`,
      });
    }
  }

  return (
    <div className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Sparkles size={18} className="text-brand" /> Your plan in plain words
        </h2>
        <div className="flex items-center gap-2">
          <Languages size={16} className="text-muted" />
          {(["en", "hi"] as Lang[]).map((l) => (
            <button
              key={l}
              onClick={() => {
                setLang(l);
                if (state.status === "done") explain(l);
              }}
              aria-pressed={lang === l}
              className={`rounded-lg px-2.5 py-1 text-sm font-medium ${
                lang === l ? "bg-brand-soft text-brand-strong" : "text-muted hover:text-foreground"
              }`}
            >
              {l === "en" ? "English" : "हिंदी"}
            </button>
          ))}
        </div>
      </div>

      {state.status === "idle" && (
        <div className="mt-4">
          <p className="text-sm text-muted">
            AI turns your numbers into a short, prioritised plan. It only uses the figures above and never gives
            medical advice.
          </p>
          <button className="btn btn-primary mt-4" onClick={() => explain(lang)}>
            <Sparkles size={16} /> Explain my results
          </button>
        </div>
      )}
      {state.status === "loading" && (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted">
          <Loader2 size={16} className="animate-spin" /> Writing your plan…
        </p>
      )}
      {state.status === "done" && (
        <div className="mt-4">
          <div className="whitespace-pre-line text-[15px] leading-relaxed">{state.text}</div>
          {state.note && <p className="mt-3 text-xs text-muted">{state.note}</p>}
        </div>
      )}
    </div>
  );
}
