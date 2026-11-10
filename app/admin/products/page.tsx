import Link from "next/link";
import { Download, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listParams, pgLike } from "@/lib/admin/queries";
import { FilterLinks, PageHeader, Pagination } from "@/components/admin/ui";
import { SearchInput } from "@/components/admin/controls";
import { ProductTable } from "@/components/admin/product-table";
import { ImportProducts } from "@/components/admin/import-products";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Products" };

export default async function ProductsPage({ searchParams }: PageProps<"/admin/products">) {
  const sp = await searchParams;
  const { page, from, to, pageSize, q, get } = listParams(sp, 30);
  const status = get("status");
  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select("id, name, slug, status, price, is_featured, is_trending, updated_at, categories(name), product_variants(id, sku, colour_name, colour_hex, stock), product_images(url, is_primary, sort_order, kind)", { count: "exact" })
    .order("sort_order")
    .order("created_at", { ascending: false })
    .range(from, to);
  if (q) query = query.or(`name.ilike.${pgLike(q)},slug.ilike.${pgLike(q)}`);
  if (status) query = query.eq("status", status as "draft" | "published" | "archived");
  const { data, count } = await query;
  const rows = (data ?? []).map((p) => {
    const img = p.product_images.filter((i) => i.kind === "gallery").sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)[0];
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      status: p.status,
      price: Number(p.price),
      featured: p.is_featured,
      category: (p.categories as unknown as { name: string } | null)?.name ?? "—",
      image: img?.url ?? null,
      variants: p.product_variants.map((v) => ({ id: v.id, sku: v.sku, colour: v.colour_name, hex: v.colour_hex, stock: v.stock })),
    };
  });

  return (
    <>
      <PageHeader
        title="Products"
        description="Create, edit and organise your catalogue. Changes appear on the store immediately."
        actions={
          <>
            <ImportProducts />
            <Button asChild variant="outline" size="sm">
              <a href="/api/admin/export?type=products">
                <Download /> Export CSV
              </a>
            </Button>
            <Button asChild size="sm">
              <Link href="/admin/products/new">
                <Plus /> Add product
              </Link>
            </Button>
          </>
        }
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <FilterLinks
          basePath="/admin/products"
          param="status"
          value={status}
          params={sp}
          options={[
            { value: "", label: "All" },
            { value: "published", label: "Published" },
            { value: "draft", label: "Drafts" },
            { value: "archived", label: "Archived" },
          ]}
        />
        <SearchInput placeholder="Search products…" />
      </div>
      <ProductTable rows={rows} />
      <Pagination page={page} total={count ?? 0} pageSize={pageSize} basePath="/admin/products" params={sp} />
    </>
  );
}
