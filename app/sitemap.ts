import type { MetadataRoute } from "next";
import { getAllProducts, getCategories, getStyles } from "@/lib/data/catalog";
import { getJournalPosts } from "@/lib/data/content";
import { absoluteUrl } from "@/lib/utils";

/** sitemap.xml — products, categories, styles, journal and content pages. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, styles, posts] = await Promise.all([getAllProducts(), getCategories(), getStyles(), getJournalPosts()]);
  const page = (path: string, priority = 0.5, changeFrequency: "daily" | "weekly" | "monthly" | "yearly" = "monthly") => ({
    url: absoluteUrl(path),
    priority,
    changeFrequency,
  });
  return [
    page("/", 1, "daily"),
    page("/shop", 0.9, "daily"),
    page("/shop/new-in", 0.8, "weekly"),
    ...categories.filter((c) => c.is_visible).map((c) => page(`/shop/${c.slug}`, 0.8, "weekly")),
    ...styles.filter((s) => s.is_visible).map((s) => page(`/style/${s.slug}`, 0.7, "weekly")),
    ...products.map((p) => ({ ...page(`/product/${p.slug}`, 0.9, "weekly"), images: p.image ? [absoluteUrl(p.image)] : undefined })),
    page("/journal", 0.6, "weekly"),
    ...posts
      .filter((p) => p.status === "published")
      .map((p) => ({ ...page(`/journal/${p.slug}`, 0.5), lastModified: p.updated_at ?? p.published_at ?? undefined })),
    ...["our-story", "help", "contact", "care-guide", "shipping-policy", "returns-and-exchanges"].map((s) => page(`/${s}`, 0.5)),
    ...["privacy-policy", "terms-of-service"].map((s) => page(`/${s}`, 0.2, "yearly")),
  ];
}
