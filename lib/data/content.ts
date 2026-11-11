import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { isSupabaseConfigured } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/public";
import { TAGS } from "@/lib/data/catalog";
import {
  defaultSettings,
  faqs as demoFaqs,
  heroSlides as demoSlides,
  journalPosts as demoPosts,
  pages as demoPages,
} from "@/lib/demo/seed-data";
import type { CmsPage, Faq, HeroSlide, JournalPost, SiteSettings } from "@/lib/types";

/** All public site settings, merged over sensible defaults. */
export async function getSiteSettings(): Promise<SiteSettings> {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.settings);
  if (!isSupabaseConfigured) return defaultSettings;
  const { data } = await createPublicClient().from("site_settings").select("key, value").eq("is_public", true);
  const merged = structuredClone(defaultSettings) as unknown as Record<string, unknown>;
  for (const row of data ?? []) {
    const base = merged[row.key];
    merged[row.key] =
      base && typeof base === "object" && !Array.isArray(base) && row.value && typeof row.value === "object"
        ? { ...(base as object), ...(row.value as object) }
        : row.value;
  }
  return merged as unknown as SiteSettings;
}

export async function getHeroSlides(): Promise<HeroSlide[]> {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.content);
  if (!isSupabaseConfigured) return demoSlides;
  const { data } = await createPublicClient().from("hero_slides").select("*").eq("is_active", true).order("sort_order");
  return (data ?? []) as HeroSlide[];
}

export async function getFaqs(): Promise<Faq[]> {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.content);
  if (!isSupabaseConfigured) return demoFaqs;
  const { data } = await createPublicClient().from("faqs").select("*").order("category").order("sort_order");
  return (data ?? []) as Faq[];
}

export async function getPage(slug: string): Promise<CmsPage | null> {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.content, `page:${slug}`);
  if (!isSupabaseConfigured) return demoPages.find((p) => p.slug === slug) ?? null;
  const { data } = await createPublicClient().from("pages").select("*").eq("slug", slug).maybeSingle();
  return (data as CmsPage | null) ?? null;
}

export async function getJournalPosts(): Promise<JournalPost[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.journal);
  if (!isSupabaseConfigured) return demoPosts;
  const { data } = await createPublicClient().from("journal_posts").select("*").order("published_at", { ascending: false });
  return (data ?? []) as JournalPost[];
}

export async function getJournalPost(slug: string): Promise<JournalPost | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.journal, `post:${slug}`);
  if (!isSupabaseConfigured) return demoPosts.find((p) => p.slug === slug) ?? null;
  const { data } = await createPublicClient().from("journal_posts").select("*").eq("slug", slug).maybeSingle();
  return (data as JournalPost | null) ?? null;
}
