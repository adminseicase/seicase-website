import Link from "next/link";
import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { FilterLinks, PageHeader, Table, Td, Card } from "@/components/admin/ui";
import { SearchInput } from "@/components/admin/controls";
import { StockAdjuster } from "@/components/admin/widgets";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Inventory" };

export default async function InventoryPage({ searchParams }: PageProps<"/admin/inventory">) {
  const sp = await searchParams;
  const filter = typeof sp.filter === "string" ? sp.filter : "";
  const q = typeof sp.q === "string" ? sp.q.toLowerCase() : "";
  const supabase = await createClient();
  const [{ data: variants }, { data: moves }] = await Promise.all([
    supabase
      .from("product_variants")
      .select("id, sku, colour_name, colour_hex, stock, products!inner(id, name, status, low_stock_threshold)")
      .neq("products.status", "archived")
      .order("stock")
      .limit(2000),
    supabase
      .from("inventory_movements")
      .select("id, change, stock_after, type, reason, created_at, product_variants(sku, colour_name, products(name)), charms(name)")
      .order("created_at", { ascending: false })
      .limit(40),
  ]);
  const rows = (variants ?? [])
    .map((v) => {
      const p = v.products as unknown as { id: string; name: string; status: string; low_stock_threshold: number };
      return { ...v, product: p, level: v.stock === 0 ? "out" : v.stock <= p.low_stock_threshold ? "low" : "ok" };
    })
    .filter((r) => (filter === "low" ? r.level !== "ok" : filter === "out" ? r.level === "out" : true))
    .filter((r) => !q || `${r.product.name} ${r.sku} ${r.colour_name}`.toLowerCase().includes(q));
  const low = (variants ?? []).filter(
    (v) => v.stock > 0 && v.stock <= (v.products as unknown as { low_stock_threshold: number }).low_stock_threshold,
  ).length;
  const out = (variants ?? []).filter((v) => v.stock === 0).length;

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Stock per colour, with low-stock alerts and a full movement history."
        actions={
          <Button asChild variant="outline" size="sm">
            <a href="/api/admin/export?type=inventory">
              <Download /> Export CSV
            </a>
          </Button>
        }
      />
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <FilterLinks
          basePath="/admin/inventory"
          param="filter"
          value={filter}
          params={sp}
          options={[
            { value: "", label: "All", count: variants?.length ?? 0 },
            { value: "low", label: "Low & out", count: low + out },
            { value: "out", label: "Out of stock", count: out },
          ]}
        />
        <SearchInput placeholder="Product, SKU or colour…" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Table head={["Product", "Colour", "SKU", "Stock", "Alert at", ""]} empty="No variants match.">
          {rows.map((r) => (
            <tr key={r.id}>
              <Td>
                <Link href={`/admin/products/${r.product.id}`} className="hover:text-cognac">
                  {r.product.name}
                </Link>
              </Td>
              <Td>
                <span className="inline-flex items-center gap-2">
                  <span className="size-3 rounded-full border border-black/10" style={{ background: r.colour_hex }} />
                  {r.colour_name}
                </span>
              </Td>
              <Td className="font-mono text-xs">{r.sku}</Td>
              <Td>
                <span className="mr-2 tabular-nums">{r.stock}</span>
                {r.level === "out" && <Badge tone="danger">Out</Badge>}
                {r.level === "low" && <Badge tone="warning">Low</Badge>}
              </Td>
              <Td className="text-muted">{r.product.low_stock_threshold}</Td>
              <Td>
                <StockAdjuster variantId={r.id} label={`${r.product.name} · ${r.colour_name} (${r.sku}) — currently ${r.stock}`} />
              </Td>
            </tr>
          ))}
        </Table>
        <Card title="Recent stock movements">
          <ul className="divide-y text-sm">
            {(moves ?? []).map((m) => {
              const v = m.product_variants as unknown as { sku: string; colour_name: string; products: { name: string } } | null;
              const c = m.charms as unknown as { name: string } | null;
              return (
                <li key={m.id} className="py-2">
                  <p className="flex justify-between gap-2">
                    <span className="truncate">{v ? `${v.products?.name} · ${v.colour_name}` : c?.name}</span>
                    <span className={m.change > 0 ? "text-success" : "text-danger"}>
                      {m.change > 0 ? "+" : ""}
                      {m.change}
                    </span>
                  </p>
                  <p className="text-muted text-xs">
                    <span className="capitalize">{m.type}</span> · {m.reason} · now {m.stock_after} · {formatDateTime(m.created_at)}
                  </p>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </>
  );
}
