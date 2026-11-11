"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { bulkProducts, setVariantStock } from "@/lib/actions/admin/products";
import { cn, formatINR } from "@/lib/utils";

interface Row {
  id: string;
  name: string;
  slug: string;
  status: string;
  price: number;
  featured: boolean;
  category: string;
  image: string | null;
  variants: { id: string; sku: string; colour: string; hex: string; stock: number }[];
}

function StockCell({ v }: { v: Row["variants"][number] }) {
  const router = useRouter();
  const [value, setValue] = useState(String(v.stock));
  const [pending, start] = useTransition();
  const dirty = Number(value) !== v.stock;
  return (
    <form
      className="flex items-center gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await setVariantStock(v.id, Number(value));
          if (r.ok) toast.success(`${v.sku}: ${r.message}`);
          else toast.error(r.message);
          router.refresh();
        });
      }}
    >
      <span className="size-3 shrink-0 rounded-full border border-black/10" style={{ background: v.hex }} title={v.colour} />
      <input
        type="number"
        min={0}
        aria-label={`Stock for ${v.colour} (${v.sku})`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={cn(
          "bg-background h-8 w-16 rounded-md border px-2 text-xs tabular-nums",
          v.stock === 0 ? "border-danger" : v.stock <= 5 && "border-warning",
        )}
      />
      {dirty && (
        <button type="submit" disabled={pending} className="bg-foreground text-background h-8 rounded-md px-2 text-[11px]">
          Save
        </button>
      )}
    </form>
  );
}

/** Product list with multi-select bulk actions and inline per-colour stock editing. */
export function ProductTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const all = rows.length > 0 && selected.length === rows.length;
  const run = (action: Parameters<typeof bulkProducts>[1]) => {
    if (action === "delete" && !confirm(`Delete ${selected.length} product(s) permanently? Consider archiving instead.`)) return;
    start(async () => {
      const r = await bulkProducts(selected, action);
      if (r.ok) {
        toast.success(r.message);
        setSelected([]);
      } else toast.error(r.message);
      router.refresh();
    });
  };

  return (
    <>
      {selected.length > 0 && (
        <div className="bg-surface shadow-soft sticky top-16 z-20 mb-3 flex flex-wrap items-center gap-2 rounded-xl border p-3">
          <span className="mr-2 text-sm">{selected.length} selected</span>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run("publish")}>
            Publish
          </Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run("draft")}>
            Move to draft
          </Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run("feature")}>
            Feature
          </Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run("archive")}>
            Archive
          </Button>
          <Button size="sm" variant="danger" disabled={pending} onClick={() => run("delete")}>
            Delete
          </Button>
        </div>
      )}
      <div className="bg-surface overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-surface-muted/50 text-muted border-b text-xs">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={all}
                  onChange={(e) => setSelected(e.target.checked ? rows.map((r) => r.id) : [])}
                  className="accent-foreground"
                />
              </th>
              <th className="px-2 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Stock by colour (edit inline)</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="text-muted px-4 py-12 text-center">
                  No products found.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className={cn(selected.includes(r.id) && "bg-surface-muted/50")}>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label={`Select ${r.name}`}
                    checked={selected.includes(r.id)}
                    onChange={(e) => setSelected((s) => (e.target.checked ? [...s, r.id] : s.filter((x) => x !== r.id)))}
                    className="accent-foreground"
                  />
                </td>
                <td className="px-2 py-3">
                  <Link href={`/admin/products/${r.id}`} className="hover:text-cognac flex items-center gap-3">
                    {r.image ? (
                      <Image src={r.image} alt="" width={44} height={55} className="h-[55px] w-11 rounded-md object-cover" />
                    ) : (
                      <span className="bg-surface-muted h-[55px] w-11 rounded-md" />
                    )}
                    <span>
                      <span className="font-medium">{r.name}</span>
                      {r.featured && <span className="text-cognac ml-2 text-xs">★ Featured</span>}
                      <span className="text-muted block text-xs">/{r.slug}</span>
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="text-muted px-4 py-3">{r.category}</td>
                <td className="px-4 py-3 tabular-nums">{formatINR(r.price)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {r.variants.map((v) => (
                      <StockCell key={v.id} v={v} />
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
