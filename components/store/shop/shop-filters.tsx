"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, SlidersHorizontal, X } from "lucide-react";
import { LazySheet as Sheet } from "@/components/ui/lazy-sheet";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/input";
import { cn, formatINR } from "@/lib/utils";

interface Props {
  total: number;
  colours: { name: string; hex: string }[];
  materials: string[];
  priceBounds: [number, number];
  categories: { label: string; value: string }[];
  styles: { label: string; value: string }[];
  children: React.ReactNode;
}

const SORTS = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "best-selling", label: "Best-selling" },
];

const PRICE_PRESETS = [
  { label: "Under ₹2,000", min: undefined, max: 2000 },
  { label: "₹2,000 – ₹5,000", min: 2000, max: 5000 },
  { label: "₹5,000 – ₹9,000", min: 5000, max: 9000 },
  { label: "Above ₹9,000", min: 9000, max: undefined },
];

/** Filters & sort. Everything lives in the URL so results can be shared and indexed. */
export function ShopFilters(props: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);

  const getList = (k: string) => (params.get(k) ?? "").split(",").filter(Boolean);
  const update = (mut: (p: URLSearchParams) => void) => {
    const p = new URLSearchParams(params.toString());
    mut(p);
    p.delete("page");
    start(() => router.replace(`${pathname}${p.size ? `?${p}` : ""}`, { scroll: false }));
  };
  const toggleInList = (k: string, v: string) =>
    update((p) => {
      const cur = getList(k);
      const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
      if (next.length) p.set(k, next.join(","));
      else p.delete(k);
    });
  const setSingle = (k: string, v: string | null) => update((p) => (v ? p.set(k, v) : p.delete(k)));

  const activeCount = ["colour", "material", "min", "max", "availability", "category", "style"].filter((k) => params.get(k)).length;
  const curMin = params.get("min");
  const curMax = params.get("max");

  const panel = (
    <div className="space-y-7">
      {props.categories.length > 0 && (
        <fieldset>
          <legend className="text-muted mb-3 text-xs tracking-[0.16em] uppercase">Category</legend>
          <ul className="space-y-1">
            {props.categories.map((c) => {
              const on = params.get("category") === c.value;
              return (
                <li key={c.value}>
                  <button
                    type="button"
                    onClick={() => setSingle("category", on ? null : c.value)}
                    className={cn(
                      "flex min-h-9 items-center gap-2 text-sm",
                      on ? "font-medium" : "text-foreground/80 hover:text-foreground",
                    )}
                    aria-pressed={on}
                  >
                    <span
                      className={cn(
                        "inline-flex size-4 items-center justify-center rounded-sm border",
                        on && "border-foreground bg-foreground text-background",
                      )}
                    >
                      {on && <Check className="size-3" />}
                    </span>
                    {c.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}
      {props.styles.length > 0 && (
        <fieldset>
          <legend className="text-muted mb-3 text-xs tracking-[0.16em] uppercase">Style</legend>
          <ul className="space-y-1">
            {props.styles.map((s) => {
              const on = params.get("style") === s.value;
              return (
                <li key={s.value}>
                  <button
                    type="button"
                    onClick={() => setSingle("style", on ? null : s.value)}
                    className={cn(
                      "flex min-h-9 items-center gap-2 text-sm",
                      on ? "font-medium" : "text-foreground/80 hover:text-foreground",
                    )}
                    aria-pressed={on}
                  >
                    <span
                      className={cn(
                        "inline-flex size-4 items-center justify-center rounded-sm border",
                        on && "border-foreground bg-foreground text-background",
                      )}
                    >
                      {on && <Check className="size-3" />}
                    </span>
                    {s.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}
      <fieldset>
        <legend className="text-muted mb-3 text-xs tracking-[0.16em] uppercase">Colour</legend>
        <ul className="flex flex-wrap gap-2">
          {props.colours.map((c) => {
            const on = getList("colour")
              .map((x) => x.toLowerCase())
              .includes(c.name.toLowerCase());
            return (
              <li key={c.name}>
                <button
                  type="button"
                  onClick={() => toggleInList("colour", c.name.toLowerCase())}
                  aria-pressed={on}
                  aria-label={c.name}
                  title={c.name}
                  className={cn(
                    "inline-flex size-11 items-center justify-center rounded-full border-2 transition-colors",
                    on ? "border-foreground" : "hover:border-border-strong border-transparent",
                  )}
                >
                  <span className="size-7 rounded-full border border-black/10" style={{ background: c.hex }} />
                </button>
              </li>
            );
          })}
        </ul>
      </fieldset>
      <fieldset>
        <legend className="text-muted mb-3 text-xs tracking-[0.16em] uppercase">Price</legend>
        <ul className="space-y-1">
          {PRICE_PRESETS.map((pr) => {
            const on = (curMin ?? "") === String(pr.min ?? "") && (curMax ?? "") === String(pr.max ?? "");
            return (
              <li key={pr.label}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    update((p) => {
                      p.delete("min");
                      p.delete("max");
                      if (!on) {
                        if (pr.min) p.set("min", String(pr.min));
                        if (pr.max) p.set("max", String(pr.max));
                      }
                    })
                  }
                  className={cn("flex min-h-9 items-center gap-2 text-sm", on ? "font-medium" : "text-foreground/80 hover:text-foreground")}
                >
                  <span
                    className={cn(
                      "inline-flex size-4 items-center justify-center rounded-full border",
                      on && "border-foreground border-[5px]",
                    )}
                  />
                  {pr.label}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="text-muted mt-2 text-xs">
          Range in this edit: {formatINR(props.priceBounds[0])} – {formatINR(props.priceBounds[1])}
        </p>
      </fieldset>
      {props.materials.length > 0 && (
        <fieldset>
          <legend className="text-muted mb-3 text-xs tracking-[0.16em] uppercase">Material</legend>
          <ul className="space-y-1">
            {props.materials.map((m) => {
              const on = getList("material").includes(m.toLowerCase());
              return (
                <li key={m}>
                  <button
                    type="button"
                    onClick={() => toggleInList("material", m.toLowerCase())}
                    aria-pressed={on}
                    className={cn(
                      "flex min-h-9 items-center gap-2 text-sm",
                      on ? "font-medium" : "text-foreground/80 hover:text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex size-4 items-center justify-center rounded-sm border",
                        on && "border-foreground bg-foreground text-background",
                      )}
                    >
                      {on && <Check className="size-3" />}
                    </span>
                    {m} leather
                  </button>
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}
      <fieldset>
        <legend className="text-muted mb-3 text-xs tracking-[0.16em] uppercase">Availability</legend>
        <label className="flex min-h-9 cursor-pointer items-center gap-3 text-sm">
          <input
            type="checkbox"
            className="accent-foreground size-4"
            checked={params.get("availability") === "in-stock"}
            onChange={(e) => setSingle("availability", e.target.checked ? "in-stock" : null)}
          />
          In stock only
        </label>
      </fieldset>
      {activeCount > 0 && (
        <button
          type="button"
          onClick={() => start(() => router.replace(pathname, { scroll: false }))}
          className="inline-flex items-center gap-1.5 text-sm underline underline-offset-4"
        >
          <X className="size-3.5" /> Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
      <aside className="hidden lg:block" aria-label="Filters">
        <div className="sticky top-24">{panel}</div>
      </aside>
      <div>
        <div className="mb-6 flex items-center justify-between gap-3 border-y py-3 lg:border-t-0 lg:pt-0">
          <button type="button" onClick={() => setOpen(true)} className="inline-flex h-11 items-center gap-2 text-sm lg:hidden">
            <SlidersHorizontal className="size-4 stroke-[1.5]" /> Filter{activeCount ? ` (${activeCount})` : ""}
          </button>
          <p className="text-muted hidden text-sm lg:block" aria-live="polite">
            {pending ? "Updating…" : `${props.total} ${props.total === 1 ? "piece" : "pieces"}`}
          </p>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted hidden sm:inline">Sort by</span>
            <NativeSelect
              aria-label="Sort products"
              className="h-10 w-48 text-sm"
              value={params.get("sort") ?? "featured"}
              onChange={(e) => setSingle("sort", e.target.value === "featured" ? null : e.target.value)}
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </NativeSelect>
          </label>
        </div>
        {props.children}
      </div>
      {open && (
        <Sheet open={open} onOpenChange={setOpen} side="left" title="Filter" description="Filter products">
          <div className="flex-1 overflow-y-auto p-5">{panel}</div>
          <div className="border-t p-5">
            <Button className="w-full" size="lg" onClick={() => setOpen(false)}>
              Show {props.total} {props.total === 1 ? "piece" : "pieces"}
            </Button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
