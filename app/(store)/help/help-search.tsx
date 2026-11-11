"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

/** Instant FAQ search — opens and scrolls to the matching answer. */
export function HelpSearch({ faqs }: { faqs: { id: string; question: string; answer: string }[] }) {
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 2) return [];
    return faqs.filter((f) => `${f.question} ${f.answer}`.toLowerCase().includes(t)).slice(0, 6);
  }, [q, faqs]);
  return (
    <div className="relative mt-7 max-w-md">
      <label htmlFor="help-search" className="sr-only">
        Search for help
      </label>
      <div className="border-border-strong bg-surface focus-within:border-cognac flex h-12 items-center gap-2 rounded-full border px-4">
        <Search className="text-muted size-4 stroke-[1.5]" aria-hidden="true" />
        <input
          id="help-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search for help…"
          className="flex-1 bg-transparent text-sm focus:outline-none"
          autoComplete="off"
        />
      </div>
      {q.trim().length >= 2 && (
        <ul
          className="bg-surface shadow-lift absolute inset-x-0 top-14 z-10 overflow-hidden rounded-xl border"
          role="listbox"
          aria-label="Matching questions"
        >
          {results.length === 0 && <li className="text-muted p-4 text-sm">No answers found — try another word or contact us.</li>}
          {results.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                className="hover:bg-surface-muted block w-full px-4 py-3 text-left text-sm"
                onClick={() => {
                  const el = document.getElementById(`q-${f.id}`) as HTMLDetailsElement | null;
                  if (el) {
                    el.open = true;
                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                  }
                  setQ("");
                }}
              >
                {f.question}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
