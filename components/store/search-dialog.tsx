"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { ArrowRight, Clock, Search, TrendingUp, X } from "lucide-react";
import { useUi } from "@/lib/store/ui";
import { track } from "@/lib/analytics/client";
import { BLUR_DATA_URL, formatINR } from "@/lib/utils";

interface Result {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string | null;
  colours: string[];
}
interface SearchResponse {
  results: Result[];
  popular: string[];
  total: number;
}

const RECENT_KEY = "sc_recent_searches";
function readRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}
function saveRecent(q: string) {
  try {
    const next = [q, ...readRecent().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 6);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {}
}

/** Predictive search overlay with thumbnails, recent and popular searches. */
export function SearchDialog() {
  const { searchOpen, setSearch } = useUi();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const logged = useRef<string>("");
  const abort = useRef<AbortController | null>(null);

  // Recent searches are re-read each time the dialog opens
  const recent = useMemo(() => (searchOpen ? readRecent() : []), [searchOpen]);

  // Debounced fetch
  useEffect(() => {
    if (!searchOpen) return;
    const term = q.trim();
    const t = setTimeout(
      async () => {
        abort.current?.abort();
        abort.current = new AbortController();
        setLoading(true);
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: abort.current.signal });
          const json = (await res.json()) as SearchResponse;
          setData(json);
          setActive(-1);
          // Log meaningful searches once the user pauses typing
          if (term.length >= 2 && logged.current !== term) {
            logged.current = term;
            track("search", { search_query: term, results_count: json.total });
          }
        } catch {
          /* aborted */
        } finally {
          setLoading(false);
        }
      },
      term ? 220 : 0,
    );
    return () => clearTimeout(t);
  }, [q, searchOpen]);

  const submit = (term: string) => {
    const t = term.trim();
    if (!t) return;
    saveRecent(t);
    setSearch(false);
    router.push(`/search?q=${encodeURIComponent(t)}`);
  };

  const results = data?.results ?? [];
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(-1, a - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      saveRecent(q.trim() || results[active].name);
      setSearch(false);
      router.push(`/product/${results[active].slug}`);
    }
  };

  return (
    <Dialog.Root open={searchOpen} onOpenChange={setSearch}>
      <Dialog.Portal>
        <Dialog.Overlay className="animate-fade-in fixed inset-0 z-50 bg-[#1f1a17]/35" />
        <Dialog.Content
          className="bg-surface shadow-lift animate-fade-in fixed inset-x-0 top-0 z-50 max-h-[92dvh] overflow-y-auto focus:outline-none"
          aria-describedby={undefined}
        >
          <Dialog.Title className="sr-only">Search seicase</Dialog.Title>
          <div className="mx-auto max-w-5xl px-4 pt-4 pb-8 md:px-8 md:pt-6">
            <form
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                submit(q);
              }}
              className="border-foreground/80 flex items-center gap-3 border-b pb-2"
            >
              <Search className="text-muted size-5 shrink-0 stroke-[1.5]" aria-hidden="true" />
              <input
                autoFocus
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search totes, wallets, colours…"
                aria-label="Search products"
                aria-controls="search-results"
                aria-activedescendant={active >= 0 ? `sr-${active}` : undefined}
                className="placeholder:text-muted/70 h-12 flex-1 bg-transparent font-serif text-2xl focus:outline-none md:text-3xl"
              />
              <Dialog.Close
                className="hover:bg-surface-muted inline-flex size-11 items-center justify-center rounded-full"
                aria-label="Close search"
              >
                <X className="size-5 stroke-[1.5]" />
              </Dialog.Close>
            </form>

            <div className="mt-6 grid gap-8 md:grid-cols-[220px_1fr]">
              <aside className="space-y-6 text-sm">
                {recent.length > 0 && !q && (
                  <div>
                    <p className="text-muted mb-2 text-xs tracking-[0.16em] uppercase">Recent</p>
                    <ul className="space-y-1">
                      {recent.map((r) => (
                        <li key={r}>
                          <button type="button" onClick={() => setQ(r)} className="hover:text-cognac flex h-9 items-center gap-2">
                            <Clock className="text-muted size-3.5 stroke-[1.5]" aria-hidden="true" /> {r}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div>
                  <p className="text-muted mb-2 text-xs tracking-[0.16em] uppercase">Popular</p>
                  <ul className="flex flex-wrap gap-2 md:block md:space-y-1">
                    {(data?.popular ?? []).map((p) => (
                      <li key={p}>
                        <button
                          type="button"
                          onClick={() => setQ(p)}
                          className="hover:text-cognac flex h-9 items-center gap-2 rounded-full border px-3 capitalize md:rounded-none md:border-0 md:px-0"
                        >
                          <TrendingUp className="text-muted size-3.5 stroke-[1.5]" aria-hidden="true" /> {p}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </aside>

              <div>
                <p className="text-muted mb-3 text-xs tracking-[0.16em] uppercase" aria-live="polite">
                  {loading ? "Searching…" : q.trim() ? `${data?.total ?? 0} results for “${q.trim()}”` : "Trending now"}
                </p>
                {q.trim() && !loading && results.length === 0 ? (
                  <p className="text-muted py-6">No products match that search. Try “tote”, “wallet” or a colour like “olive”.</p>
                ) : (
                  <ul
                    id="search-results"
                    role="listbox"
                    aria-label="Search results"
                    className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
                  >
                    {results.map((r, i) => (
                      <li key={r.id} id={`sr-${i}`} role="option" aria-selected={active === i}>
                        <Link
                          href={`/product/${r.slug}`}
                          onClick={() => {
                            if (q.trim()) saveRecent(q.trim());
                            setSearch(false);
                          }}
                          className={`group block rounded-lg p-1 ${active === i ? "ring-cognac/40 ring-2" : ""}`}
                        >
                          <Image
                            src={r.image || "/images/placeholder.webp"}
                            alt=""
                            width={240}
                            height={300}
                            sizes="(max-width: 640px) 45vw, 200px"
                            className="bg-surface-muted aspect-[4/5] w-full rounded-md object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                            placeholder="blur"
                            blurDataURL={BLUR_DATA_URL}
                          />
                          <p className="mt-2 font-serif text-lg leading-tight">{r.name}</p>
                          <p className="text-muted text-sm">{formatINR(r.price)}</p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {q.trim() && results.length > 0 && (
                  <button
                    type="button"
                    onClick={() => submit(q)}
                    className="mt-6 inline-flex items-center gap-2 text-sm underline-offset-4 hover:underline"
                  >
                    See all results <ArrowRight className="size-4 stroke-[1.5]" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
