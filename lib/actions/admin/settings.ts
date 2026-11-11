"use server";

import { z } from "zod";
import { assertAdmin, assertStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { TAGS } from "@/lib/data/catalog";
import { audit, fail, refresh, type ActionResult } from "@/lib/admin/helpers";
import type { Json } from "@/lib/supabase/database.types";

const s = (max = 300) => z.string().trim().max(max);
const n = z.coerce.number().min(0);

const SCHEMAS = {
  announcement: z.object({
    enabled: z.boolean(),
    messages: z.array(s(120)).max(4),
    link: s(200)
      .nullable()
      .transform((v) => v || null),
  }),
  homepage: z.object({
    sections: z
      .array(
        z.object({
          id: z.enum(["hero", "trust", "categories", "crafted", "trending", "styles", "lifestyle", "newsletter"]),
          visible: z.boolean(),
        }),
      )
      .length(8),
  }),
  trust_strip: z.object({
    items: z
      .array(z.object({ icon: z.enum(["leather", "design", "shipping", "returns", "secure"]), title: s(40), subtitle: s(40) }))
      .min(1)
      .max(6),
  }),
  banners: z.object({
    crafted: z.object({
      title: s(80),
      body: s(300),
      link_label: s(40),
      link_href: s(200),
      image: s(500),
      video_url: s(500)
        .nullable()
        .transform((v) => v || null),
      video_poster: s(500),
      video_label: s(60),
    }),
    lifestyle: z.object({ title: s(80), body: s(300), cta_label: s(40), cta_href: s(200), image: s(500) }),
    newsletter: z.object({ title: s(80), body: s(300) }),
  }),
  store: z.object({
    name: s(60),
    legal_name: s(120),
    email: z.string().email(),
    phone: s(30),
    whatsapp: s(30).nullable(),
    address_line: s(200),
    city: s(60),
    state: s(60),
    pincode: s(10),
    hours: s(80),
    gstin: s(20)
      .nullable()
      .transform((v) => v || null),
    map_lat: z.coerce.number().min(-90).max(90),
    map_lng: z.coerce.number().min(-180).max(180),
  }),
  shipping: z.object({
    free_threshold: n,
    flat_rate: n,
    cod_enabled: z.boolean(),
    cod_fee: n,
    cod_max_order: n,
    return_window_days: z.coerce.number().int().min(0).max(90),
    metro_days: s(20),
    standard_days: s(20),
  }),
  social: z.object({ instagram: s(200).nullable(), pinterest: s(200).nullable(), youtube: s(200).nullable(), facebook: s(200).nullable() }),
  notifications: z.object({ admin_email: z.string().email(), low_stock_email: z.boolean(), new_order_email: z.boolean() }),
} as const;
type Key = keyof typeof SCHEMAS;
const CONTENT_KEYS: Key[] = ["announcement", "homepage", "trust_strip", "banners"];

export async function saveSetting(key: Key, value: unknown): Promise<ActionResult> {
  try {
    if (!(key in SCHEMAS)) return { ok: false, message: "Unknown setting" };
    const user = CONTENT_KEYS.includes(key) ? await assertStaff() : await assertAdmin();
    const parsed = (SCHEMAS[key] as z.ZodTypeAny).safeParse(value);
    if (!parsed.success) return { ok: false, message: `${parsed.error.issues[0]?.path.join(".")}: ${parsed.error.issues[0]?.message}` };
    const { error } = await createAdminClient()
      .from("site_settings")
      .upsert(
        { key, value: parsed.data as Json, is_public: key !== "notifications", updated_by: user.id, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
    if (error) throw error;
    await audit(user, "settings.update", "site_settings", key, `Updated ${key}`, parsed.data);
    refresh(TAGS.settings);
    return { ok: true, message: "Saved — live on the store now" };
  } catch (e) {
    return fail(e);
  }
}
