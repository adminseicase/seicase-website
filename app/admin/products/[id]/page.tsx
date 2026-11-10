import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm, type ProductFormValue } from "@/components/admin/product-form";

export const metadata = { title: "Edit product" };

const toLocal = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() + 5.5 * 3600_000).toISOString().slice(0, 16) : "");
const s = (v: unknown) => (v == null ? "" : String(v));

export default async function ProductEditPage({ params }: PageProps<"/admin/products/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const [cats, cols, sts] = await Promise.all([
    supabase.from("categories").select("id, name").order("sort_order"),
    supabase.from("collections").select("id, name").order("sort_order"),
    supabase.from("styles").select("id, name").order("sort_order"),
  ]);

  let initial: ProductFormValue;
  if (id === "new") {
    initial = {
      id: null, name: "", slug: "", short_description: "", description: "", category_id: "", collection_id: "", style_ids: [], material: "Full-grain leather", dimensions: "",
      width_cm: "", height_cm: "", depth_cm: "", strap_drop_cm: "", weight_g: "",
      care_instructions: "Wipe gently with a soft, dry cloth. Keep away from direct sunlight, heat and moisture. Condition every 3–6 months.",
      price: "", compare_at_price: "", cost_price: "", gst_rate: "18", status: "draft", publish_at: "", is_featured: false, is_trending: false, is_new: true, low_stock_threshold: "5",
      seo_title: "", seo_description: "", variants: [], images: [],
    };
  } else {
    const { data: p } = await supabase.from("products").select("*, product_variants(*), product_images(*), product_styles(style_id)").eq("id", id).maybeSingle();
    if (!p) notFound();
    initial = {
      id: p.id, name: p.name, slug: p.slug, short_description: s(p.short_description), description: s(p.description), category_id: s(p.category_id), collection_id: s(p.collection_id),
      style_ids: p.product_styles.map((x) => x.style_id), material: s(p.material), dimensions: s(p.dimensions), width_cm: s(p.width_cm), height_cm: s(p.height_cm), depth_cm: s(p.depth_cm),
      strap_drop_cm: s(p.strap_drop_cm), weight_g: s(p.weight_g), care_instructions: s(p.care_instructions), price: s(p.price), compare_at_price: s(p.compare_at_price), cost_price: s(p.cost_price),
      gst_rate: String(Number(p.gst_rate)), status: p.status, publish_at: toLocal(p.publish_at), is_featured: p.is_featured, is_trending: p.is_trending, is_new: p.is_new,
      low_stock_threshold: String(p.low_stock_threshold), seo_title: s(p.seo_title), seo_description: s(p.seo_description),
      variants: [...p.product_variants].sort((a, b) => a.sort_order - b.sort_order).map((v) => ({ id: v.id, colour_name: v.colour_name, colour_hex: v.colour_hex, sku: v.sku, stock: String(v.stock), price_override: s(v.price_override), is_default: v.is_default })),
      images: p.product_images.map((i) => ({ id: i.id, url: i.url, alt: i.alt, variant_id: i.variant_id, kind: i.kind as "gallery" | "spin", sort_order: i.sort_order, is_primary: i.is_primary })),
    };
  }
  return (
    <>
      <Link href="/admin/products" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> Products
      </Link>
      <PageHeader title={initial.id ? initial.name : "New product"} />
      <ProductForm initial={initial} categories={cats.data ?? []} collections={cols.data ?? []} styles={sts.data ?? []} />
    </>
  );
}
