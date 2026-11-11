import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { isSupabaseConfigured } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/public";
import { buildCatalog, categories as demoCategories, styles as demoStyles, collections as demoCollections } from "@/lib/demo/seed-data";
import type { Charm, Product, ProductCardData, ProductDetail, ProductImage, ProductVariant, Review, Taxonomy } from "@/lib/types";

/**
 * Cache tags used across the app. Admin actions call updateTag()/revalidateTag()
 * with these so edits appear on the storefront immediately.
 */
export const TAGS = {
  products: "products",
  product: (slug: string) => `product:${slug}`,
  taxonomies: "taxonomies",
  charms: "charms",
  reviews: (productId: string) => `reviews:${productId}`,
  content: "content",
  settings: "settings",
  journal: "journal",
} as const;

/** Product card plus the fields the shop filters and sorts on. */
export interface ListedProduct extends ProductCardData {
  category_id: string | null;
  collection_id: string | null;
  style_ids: string[];
  material: string | null;
  is_trending: boolean;
  is_featured: boolean;
  total_sold: number;
  sort_order: number;
  created_at: string;
  short_description: string | null;
  search_text: string;
}

type RawProduct = Product & {
  product_variants: ProductVariant[];
  product_images: ProductImage[];
  product_styles: { style_id: string }[];
  categories: { slug: string } | null;
};

function toListed(p: RawProduct): ListedProduct {
  const variants = [...(p.product_variants ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const def = variants.find((v) => v.is_default) ?? variants[0];
  const gallery = (p.product_images ?? []).filter((i) => i.kind === "gallery").sort((a, b) => a.sort_order - b.sort_order);
  const forDefault = gallery.filter((i) => !def || i.variant_id === def.id || i.variant_id === null);
  const primary = forDefault.find((i) => i.is_primary) ?? forDefault[0] ?? gallery[0];
  const hover = forDefault.find((i) => i !== primary) ?? null;
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: Number(def?.price_override ?? p.price),
    compare_at_price: p.compare_at_price != null ? Number(p.compare_at_price) : null,
    rating_avg: Number(p.rating_avg),
    rating_count: p.rating_count,
    is_new: p.is_new,
    image: primary?.url ?? null,
    image_alt: primary?.alt ?? p.name,
    hover_image: hover?.url ?? null,
    colours: variants.map((v) => ({ name: v.colour_name, hex: v.colour_hex })),
    in_stock: variants.some((v) => v.stock > 0),
    category_slug: p.categories?.slug ?? null,
    default_variant_id: def?.id ?? null,
    category_id: p.category_id,
    collection_id: p.collection_id,
    style_ids: (p.product_styles ?? []).map((s) => s.style_id),
    material: p.material,
    is_trending: p.is_trending,
    is_featured: p.is_featured,
    total_sold: p.total_sold,
    sort_order: p.sort_order,
    created_at: p.created_at,
    short_description: p.short_description,
    search_text: `${p.name} ${p.short_description ?? ""} ${p.material ?? ""} ${variants.map((v) => v.colour_name).join(" ")}`.toLowerCase(),
  };
}

function demoRawProducts(): RawProduct[] {
  const c = buildCatalog();
  return c.products.map((p) => ({
    ...p,
    product_variants: c.variants.filter((v) => v.product_id === p.id),
    product_images: c.images.filter((i) => i.product_id === p.id),
    product_styles: c.productStyles.filter((s) => s.product_id === p.id).map((s) => ({ style_id: s.style_id })),
    categories: { slug: demoCategories.find((x) => x.id === p.category_id)?.slug ?? "" },
  }));
}

const PRODUCT_SELECT = "*, product_variants(*), product_images(*), product_styles(style_id), categories(slug)" as const;

/** Every published product as a filterable card. Cached and shared by all shop pages. */
export async function getAllProducts(): Promise<ListedProduct[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.products);
  if (!isSupabaseConfigured) return demoRawProducts().map(toListed);
  const { data, error } = await createPublicClient()
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("product_images.kind", "gallery")
    .order("sort_order")
    .overrideTypes<RawProduct[], { merge: false }>();
  if (error) throw new Error(`Failed to load products: ${error.message}`);
  return (data ?? []).map(toListed);
}

export async function getProductSlugs(): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.products);
  if (!isSupabaseConfigured) return buildCatalog().products.map((p) => p.slug);
  const { data } = await createPublicClient().from("products").select("slug");
  return (data ?? []).map((p) => p.slug);
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.products, TAGS.product(slug));
  if (!isSupabaseConfigured) {
    const c = buildCatalog();
    const p = c.products.find((x) => x.slug === slug);
    if (!p) return null;
    const cat = demoCategories.find((x) => x.id === p.category_id);
    const styleIds = c.productStyles.filter((s) => s.product_id === p.id).map((s) => s.style_id);
    return {
      ...p,
      category: cat ? { id: cat.id, name: cat.name, slug: cat.slug } : null,
      styles: demoStyles.filter((s) => styleIds.includes(s.id)).map(({ id, name, slug }) => ({ id, name, slug })),
      variants: c.variants.filter((v) => v.product_id === p.id).sort((a, b) => a.sort_order - b.sort_order),
      images: c.images.filter((i) => i.product_id === p.id).sort((a, b) => a.sort_order - b.sort_order),
    };
  }
  const { data, error } = await createPublicClient()
    .from("products")
    .select("*, categories(id, name, slug), product_variants(*), product_images(*), product_styles(styles(id, name, slug))")
    .eq("slug", slug)
    .maybeSingle()
    .overrideTypes<
      | (Product & {
          categories: { id: string; name: string; slug: string } | null;
          product_variants: ProductVariant[];
          product_images: ProductImage[];
          product_styles: { styles: { id: string; name: string; slug: string } | null }[];
        })
      | null,
      { merge: false }
    >();
  if (error) throw new Error(`Failed to load product: ${error.message}`);
  if (!data) return null;
  const { categories, product_variants, product_images, product_styles, ...rest } = data;
  return {
    ...rest,
    price: Number(rest.price),
    compare_at_price: rest.compare_at_price != null ? Number(rest.compare_at_price) : null,
    category: categories,
    styles: product_styles.map((s) => s.styles).filter((s): s is NonNullable<typeof s> => !!s),
    variants: [...product_variants].sort((a, b) => a.sort_order - b.sort_order),
    images: [...product_images].sort((a, b) => a.sort_order - b.sort_order),
  };
}

export async function getCategories(): Promise<Taxonomy[]> {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.taxonomies);
  if (!isSupabaseConfigured) return demoCategories;
  const { data } = await createPublicClient().from("categories").select("*").order("sort_order");
  return (data ?? []) as Taxonomy[];
}

export async function getStyles(): Promise<Taxonomy[]> {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.taxonomies);
  if (!isSupabaseConfigured) return demoStyles;
  const { data } = await createPublicClient().from("styles").select("*").order("sort_order");
  return (data ?? []) as Taxonomy[];
}

export async function getCollections(): Promise<Taxonomy[]> {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.taxonomies);
  if (!isSupabaseConfigured) return demoCollections;
  const { data } = await createPublicClient().from("collections").select("*").order("sort_order");
  return (data ?? []) as Taxonomy[];
}

export async function getCharms(): Promise<Charm[]> {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.charms);
  if (!isSupabaseConfigured) return buildCatalog().charms;
  const { data } = await createPublicClient().from("charms").select("*").order("sort_order");
  return ((data ?? []) as Charm[]).map((c) => ({ ...c, price: Number(c.price) }));
}

export async function getProductReviews(productId: string): Promise<Review[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.reviews(productId));
  if (!isSupabaseConfigured) return buildCatalog().reviews.filter((r) => r.product_id === productId);
  const { data } = await createPublicClient()
    .from("reviews")
    .select("id, product_id, author_name, rating, title, body, images, status, is_verified, admin_reply, created_at")
    .eq("product_id", productId)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []) as Review[];
}

/* ------------------------- in-memory helpers (pure) ------------------------ */

export type SortKey = "featured" | "newest" | "price-asc" | "price-desc" | "best-selling";

export interface ShopFilters {
  category?: string;
  style?: string;
  colours?: string[];
  min?: number;
  max?: number;
  materials?: string[];
  availability?: "in-stock" | "all";
  sort?: SortKey;
  q?: string;
  newIn?: boolean;
}

export function filterProducts(all: ListedProduct[], f: ShopFilters, ids: { categoryId?: string; styleId?: string }) {
  let list = all;
  if (f.newIn) list = list.filter((p) => p.is_new);
  if (ids.categoryId) list = list.filter((p) => p.category_id === ids.categoryId);
  if (ids.styleId) list = list.filter((p) => p.style_ids.includes(ids.styleId!));
  if (f.colours?.length) {
    const wanted = f.colours.map((c) => c.toLowerCase());
    list = list.filter((p) => p.colours.some((c) => wanted.includes(c.name.toLowerCase())));
  }
  if (f.materials?.length) {
    list = list.filter((p) => f.materials!.some((m) => (p.material ?? "").toLowerCase().includes(m.toLowerCase())));
  }
  if (f.min != null) list = list.filter((p) => p.price >= f.min!);
  if (f.max != null) list = list.filter((p) => p.price <= f.max!);
  if (f.availability === "in-stock") list = list.filter((p) => p.in_stock);
  if (f.q) {
    const terms = f.q.toLowerCase().split(/\s+/).filter(Boolean);
    list = list.filter((p) => terms.every((t) => p.search_text.includes(t)));
  }
  const sorted = [...list];
  switch (f.sort) {
    case "newest":
      sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
      break;
    case "price-asc":
      sorted.sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      sorted.sort((a, b) => b.price - a.price);
      break;
    case "best-selling":
      sorted.sort((a, b) => b.total_sold - a.total_sold);
      break;
    default:
      sorted.sort((a, b) => Number(b.is_featured) - Number(a.is_featured) || a.sort_order - b.sort_order);
  }
  return sorted;
}

/** Simple relevance search used by predictive search and /search. */
export function searchProducts(all: ListedProduct[], query: string, limit = 8) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/).filter(Boolean);
  return all
    .map((p) => {
      let score = 0;
      const name = p.name.toLowerCase();
      for (const t of terms) {
        if (name.includes(t)) score += 3;
        else if (p.search_text.includes(t)) score += 1;
        else return null;
      }
      if (name.startsWith(q) || name.startsWith(`the ${q}`)) score += 2;
      return { p, score };
    })
    .filter((x): x is { p: ListedProduct; score: number } => !!x)
    .sort((a, b) => b.score - a.score || b.p.total_sold - a.p.total_sold)
    .slice(0, limit)
    .map((x) => x.p);
}

export function toCard(p: ListedProduct): ProductCardData {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    compare_at_price: p.compare_at_price,
    rating_avg: p.rating_avg,
    rating_count: p.rating_count,
    is_new: p.is_new,
    image: p.image,
    image_alt: p.image_alt,
    hover_image: p.hover_image,
    colours: p.colours,
    in_stock: p.in_stock,
    category_slug: p.category_slug,
    default_variant_id: p.default_variant_id,
  };
}
