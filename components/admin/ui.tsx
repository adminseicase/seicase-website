import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl md:text-4xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, actions, children, className }: { title?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border bg-surface p-5", className)}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="font-sans text-sm font-medium">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCard({ label, value, delta, hint }: { label: string; value: string; delta?: number | null; hint?: string }) {
  const up = (delta ?? 0) >= 0;
  return (
    <div className="rounded-xl border bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1.5 text-2xl font-medium tabular-nums">{value}</p>
      <div className="mt-1 flex items-center gap-2 text-xs">
        {delta != null && Number.isFinite(delta) && (
          <span className={cn("inline-flex items-center gap-0.5", up ? "text-success" : "text-danger")}>
            {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
        {hint && <span className="text-muted">{hint}</span>}
      </div>
    </div>
  );
}

export function pctChange(cur: number, prev: number) {
  if (!prev) return cur ? 100 : 0;
  return ((cur - prev) / prev) * 100;
}

export function Table({ head, children, empty }: { head: React.ReactNode[]; children: React.ReactNode; empty?: string }) {
  const hasRows = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <div className="overflow-x-auto rounded-xl border bg-surface">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b bg-surface-muted/50 text-xs text-muted">
          <tr>
            {head.map((h, i) => (
              <th key={i} scope="col" className="whitespace-nowrap px-4 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {hasRows ? (
            children
          ) : (
            <tr>
              <td colSpan={head.length} className="px-4 py-12 text-center text-muted">
                {empty ?? "Nothing here yet."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-middle", className)}>{children}</td>;
}

export function Pagination({ page, total, pageSize, basePath, params }: { page: number; total: number; pageSize: number; basePath: string; params: Record<string, string | string[] | undefined> }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (p: number) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => typeof v === "string" && k !== "page" && sp.set(k, v));
    sp.set("page", String(p));
    return `${basePath}?${sp}`;
  };
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-muted">
      <p>
        {total.toLocaleString("en-IN")} result{total === 1 ? "" : "s"} · Page {page} of {pages}
      </p>
      <div className="flex gap-1">
        <Link aria-disabled={page <= 1} href={href(Math.max(1, page - 1))} className={cn("inline-flex size-9 items-center justify-center rounded-lg border bg-surface", page <= 1 && "pointer-events-none opacity-40")} aria-label="Previous page">
          <ChevronLeft className="size-4" />
        </Link>
        <Link aria-disabled={page >= pages} href={href(Math.min(pages, page + 1))} className={cn("inline-flex size-9 items-center justify-center rounded-lg border bg-surface", page >= pages && "pointer-events-none opacity-40")} aria-label="Next page">
          <ChevronRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}

export function FilterLinks({ basePath, param, value, options, params }: { basePath: string; param: string; value: string; options: { value: string; label: string; count?: number }[]; params: Record<string, string | string[] | undefined> }) {
  return (
    <div className="scrollbar-none -mx-1 mb-4 flex gap-1 overflow-x-auto px-1">
      {options.map((o) => {
        const sp = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => typeof v === "string" && k !== param && k !== "page" && sp.set(k, v));
        if (o.value) sp.set(param, o.value);
        return (
          <Link key={o.value} href={`${basePath}${sp.size ? `?${sp}` : ""}`} className={cn("inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-xs", value === o.value ? "border-foreground bg-foreground text-background" : "bg-surface hover:border-foreground")}>
            {o.label}
            {o.count != null && <span className="opacity-70">{o.count}</span>}
          </Link>
        );
      })}
    </div>
  );
}

export function AdminSkeleton() {
  return (
    <div className="flex min-h-dvh">
      <div className="hidden w-64 border-r bg-surface lg:block" />
      <div className="flex-1 space-y-4 p-8">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted">{children}</p>;
}
