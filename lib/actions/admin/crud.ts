"use server";

import { z } from "zod";
import { assertAdmin, assertStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TAGS } from "@/lib/data/catalog";
import { audit, cleanHtml, fail, refresh, type ActionResult } from "@/lib/admin/helpers";
import { slugify } from "@/lib/utils";

/**
 * Generic create/update/delete for simple admin tables. Each table has its
 * own Zod schema and the cache tags to refresh after a change.
 */
const str = (max = 200) => z.string().trim().max(max).nullable().optional().transform((v) => (v === "" ? null : v ?? null));
const reqStr = (max = 200) => z.string().trim().min(1, "Required").max(max);
const int = z.coerce.number().int().default(0);
const money = z.coerce.number().min(0);
const optMoney = z.union([z.literal(""), z.null(), z.undefined(), z.coerce.number().min(0)]).transform((v) => (v === "" || v == null ? null : Number(v)));
const optInt = z.union([z.literal(""), z.null(), z.undefined(), z.coerce.number().int().min(0)]).transform((v) => (v === "" || v == null ? null : Number(v)));
const optDate = z.union([z.literal(""), z.null(), z.undefined(), z.string()]).transform((v) => (v ? new Date(v).toISOString() : null));

const taxonomy = z.object({
  name: reqStr(80),
  slug: z.string().optional(),
  description: str(500),
  image_url: str(500),
  sort_order: int,
  is_visible: z.boolean().default(true),
  seo_title: str(70),
  seo_description: str(170),
});

const TABLES = {
  categories: { schema: taxonomy, slugFrom: "name", tags: [TAGS.taxonomies, TAGS.products], admin: false },
  styles: { schema: taxonomy, slugFrom: "name", tags: [TAGS.taxonomies, TAGS.products], admin: false },
  collections: { schema: taxonomy, slugFrom: "name", tags: [TAGS.taxonomies, TAGS.products], admin: false },
  charms: {
    schema: z.object({ name: reqStr(80), slug: z.string().optional(), description: str(300), price: money, cost_price: optMoney, image_url: str(500), stock: int, is_active: z.boolean().default(true), sort_order: int }),
    slugFrom: "name",
    tags: [TAGS.charms],
    admin: false,
  },
  coupons: {
    schema: z.object({
      code: z.string().trim().min(3).max(30).transform((v) => v.toUpperCase().replace(/\s+/g, "")),
      description: str(200),
      type: z.enum(["percentage", "flat"]),
      value: z.coerce.number().positive("Enter a value above 0"),
      min_order: money.default(0),
      max_discount: optMoney,
      usage_limit: optInt,
      per_customer_limit: optInt,
      starts_at: optDate,
      expires_at: optDate,
      is_active: z.boolean().default(true),
      auto_apply: z.boolean().default(false),
    }),
    tags: [],
    admin: false,
  },
  faqs: {
    schema: z.object({ question: reqStr(300), answer: reqStr(3000), category: reqStr(40), sort_order: int, is_popular: z.boolean().default(false), is_visible: z.boolean().default(true) }),
    tags: [TAGS.content],
    admin: false,
  },
  hero_slides: {
    schema: z.object({
      eyebrow: str(60),
      title: reqStr(80),
      subtitle: str(200),
      cta_label: str(40),
      cta_href: str(200),
      image_url: reqStr(500),
      mobile_image_url: str(500),
      alt: str(200),
      text_tone: z.enum(["dark", "light"]).default("dark"),
      sort_order: int,
      is_active: z.boolean().default(true),
    }),
    tags: [TAGS.content],
    admin: false,
  },
  journal_posts: {
    schema: z.object({
      title: reqStr(160),
      slug: z.string().optional(),
      excerpt: str(300),
      content: z.string().max(100000).transform((v) => cleanHtml(v)),
      cover_image: str(500),
      author: str(80),
      tags: z.union([z.array(z.string()), z.string()]).transform((v) => (Array.isArray(v) ? v : v.split(",").map((t) => t.trim()).filter(Boolean))),
      status: z.enum(["draft", "published", "archived"]),
      published_at: optDate,
      seo_title: str(70),
      seo_description: str(170),
    }),
    slugFrom: "title",
    tags: [TAGS.journal],
    admin: false,
  },
  pages: {
    schema: z.object({
      title: reqStr(120),
      slug: z.string().optional(),
      subtitle: str(200),
      content: z.string().max(100000).transform((v) => cleanHtml(v)),
      hero_image: str(500),
      seo_title: str(70),
      seo_description: str(170),
      is_published: z.boolean().default(true),
    }),
    slugFrom: "title",
    tags: [TAGS.content],
    admin: false,
  },
} as const;

export type CrudTable = keyof typeof TABLES;

export async function saveRecord(table: CrudTable, id: string | null, values: Record<string, unknown>): Promise<ActionResult<{ id: string }>> {
  try {
    const cfg = TABLES[table];
    if (!cfg) return { ok: false, message: "Unknown table" };
    const user = cfg.admin ? await assertAdmin() : await assertStaff();
    const parsed = (cfg.schema as z.ZodTypeAny).safeParse(values);
    if (!parsed.success) return { ok: false, message: `${String(parsed.error.issues[0]?.path[0] ?? "")} ${parsed.error.issues[0]?.message}`.trim() };
    const row = parsed.data as Record<string, unknown>;
    if ("slugFrom" in cfg && cfg.slugFrom) row.slug = slugify(String(row.slug || row[cfg.slugFrom] || ""));
    if (table === "journal_posts" && row.status === "published" && !row.published_at) row.published_at = new Date().toISOString();
    const supabase = await createClient();
    // Dynamic table name: types are checked per-table by the Zod schemas above.
    const q = supabase.from(table as "faqs") as unknown as {
      update: (r: unknown) => { eq: (c: string, v: string) => { select: (s: string) => { single: () => Promise<{ data: { id: string } | null; error: unknown }> } } };
      insert: (r: unknown) => { select: (s: string) => { single: () => Promise<{ data: { id: string } | null; error: unknown }> } };
    };
    const { data, error } = id ? await q.update(row).eq("id", id).select("id").single() : await q.insert(row).select("id").single();
    if (error || !data) throw error ?? new Error("Save failed");
    await audit(user, `${table}.${id ? "update" : "create"}`, table, data.id, `${id ? "Updated" : "Created"} ${String(row.name ?? row.title ?? row.code ?? row.question ?? "")}`.slice(0, 200));
    refresh(...cfg.tags, ...(table === "pages" && row.slug ? [`page:${row.slug}`] : []), ...(table === "journal_posts" && row.slug ? [`post:${row.slug}`] : []));
    return { ok: true, message: "Saved", data: { id: data.id } };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteRecord(table: CrudTable, id: string): Promise<ActionResult> {
  try {
    const cfg = TABLES[table];
    const user = cfg.admin ? await assertAdmin() : await assertStaff();
    const supabase = await createClient();
    const { error } = await supabase.from(table as "faqs").delete().eq("id", z.string().uuid().parse(id));
    if (error) throw error;
    await audit(user, `${table}.delete`, table, id, `Deleted from ${table}`);
    refresh(...cfg.tags);
    return { ok: true, message: "Deleted" };
  } catch (e) {
    return fail(e);
  }
}
