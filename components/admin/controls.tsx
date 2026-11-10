"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";

/** Search box that writes ?q= to the URL (debounced). */
export function SearchInput({ placeholder = "Search…" }: { placeholder?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");
  return (
    <form
      role="search"
      className="flex h-10 w-full max-w-xs items-center gap-2 rounded-lg border bg-surface px-3"
      onSubmit={(e) => {
        e.preventDefault();
        const sp = new URLSearchParams(params.toString());
        if (value.trim()) sp.set("q", value.trim());
        else sp.delete("q");
        sp.delete("page");
        router.replace(`${pathname}${sp.size ? `?${sp}` : ""}`);
      }}
    >
      <Search className="size-4 text-muted" aria-hidden="true" />
      <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="min-w-0 flex-1 bg-transparent text-sm focus:outline-none" />
    </form>
  );
}

/** Runs a server action with confirm + toast + refresh. */
export function ActionButton({
  action,
  confirm: confirmText,
  children,
  ...props
}: Omit<ButtonProps, "onClick" | "action"> & { action: () => Promise<{ ok: boolean; message: string }>; confirm?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      {...props}
      disabled={pending || props.disabled}
      onClick={() => {
        if (confirmText && !window.confirm(confirmText)) return;
        start(async () => {
          const r = await action();
          if (r.ok) toast.success(r.message);
          else toast.error(r.message);
          router.refresh();
        });
      }}
    >
      {children}
    </Button>
  );
}

/** Date range picker for analytics (presets + custom), synced to ?from&to. */
export function DateRangePicker() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const [from, setFrom] = useState(params.get("from") ?? "");
  const [to, setTo] = useState(params.get("to") ?? "");
  const go = (f: string, t: string) => {
    const sp = new URLSearchParams(params.toString());
    sp.set("from", f);
    sp.set("to", t);
    router.replace(`${pathname}?${sp}`);
  };
  const preset = (days: number) => {
    const t = new Date();
    const f = new Date(Date.now() - (days - 1) * 86_400_000);
    setFrom(iso(f));
    setTo(iso(t));
    go(iso(f), iso(t));
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      {[7, 30, 90, 365].map((d) => (
        <button key={d} type="button" onClick={() => preset(d)} className="h-9 rounded-lg border bg-surface px-3 text-xs hover:border-foreground">
          {d === 365 ? "12 months" : `${d} days`}
        </button>
      ))}
      <form
        className="flex items-center gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          if (from && to) go(from, to);
        }}
      >
        <label className="sr-only" htmlFor="dr-from">
          From
        </label>
        <input id="dr-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 rounded-lg border bg-surface px-2 text-xs" />
        <span className="text-xs text-muted">to</span>
        <label className="sr-only" htmlFor="dr-to">
          To
        </label>
        <input id="dr-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 rounded-lg border bg-surface px-2 text-xs" />
        <button type="submit" className="h-9 rounded-lg bg-foreground px-3 text-xs text-background">
          Apply
        </button>
      </form>
    </div>
  );
}
