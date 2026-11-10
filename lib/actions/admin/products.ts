"use server";

import { z } from "zod";
import { assertStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TAGS } from "@/lib/data/catalog";
import { audit, cleanHtml, fail, refresh, type ActionResult } from "@/lib/admin/helpers";
import { slugify } from "@/lib/utils";

const num = z.coerce.number();
const optNum = z.union([z.literal(""), z.null(), z.undefined(), z.coerce.number()]).transform((v) => (v === "" || v == null ? null : Number(v)));

const variantSchema = z.object({
  id: z.string().uuid(),
  colour_name: z.string().trim().min(1, "Colour name is required").max(40),
  colour_hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Use a hex colour like #9C5A33"),
  sku: z.string().trim().min(2, "SKU is required").max(40),
  stock: z.coerce.number().int().min(0),
  price_override: optNum,
  is_default: z.boolean(),
  sort_order: z.number().int(),
});
const imageSchema = z.object({
  id: z.string().uuid(),
  url: z.string().min(1),
  alt: z.string().max(200).nullable().optional(),
  variant_id: z.string().uuid().nullable().optional(),
  kind: z.enum(["gallery", "spin"]),
  sort_order: z.number().int(),
  is_primary: z.boolean(),
});
const productInput = z.object({
  id: z.string().uuid().nullable(),
  name: z.string().trim().min(2, "Name is required").max(120),
  slug: z.string().trim().max(120).optional(),
  short_description: z.string().trim().max(300).nullable().optional(),
  description: z.string().max(20000).nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  collection_id: z.string().uuid().nullable().optional(),
  style_ids: z.array(z.string().uuid()).default([]),
  material: z.string().max(200).nullable().optional(),
  dimensions: z.string().max(100).nullable().optional(),
  width_cm: optNum,
  height_cm: optNum,
  depth_cm: optNum,
  strap_drop_cm: optNum,
  weight_g: optNum,
  care_instructions: z.string().max(2000).nullable().optional(),
  price: num.pipe(z.number().min(0, "Price can't be negative")),
  compare_at_price: optNum,
  cost_price: optNum,
  gst_rate: num.pipe(z.number().min(0).max(28)),
  status: z.enum(["draft", "published", "archived"]),
  publish_at: z.string().nullable().optional(),
  is_featured: z.boolean(),
  is_trending: z.boolean(),
  is_new: z.boolean(),
  low_stock_threshold: z.coerce.number().int().min(0).max(1000),
  seo_title: z.string().max(70).nullable().optional(),
  seo_description: z.string().max(170).nullable().optional(),
  variants: z.array(variantSchema).min(1, "Add at least one colour / variant"),
  images: z.array(imageSchema).max(80),
});
export type ProductInput = z.input<typeof productInput>;

export async function saveProduct(input: unknown): Promise<ActionResult<{ id: string; slug: string }>> {
  try {
    const user = await assertStaff();
    const parsed = productInput.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Please check the form" };
    const d = parsed.data;
    const supabase = await createClient();
    const slug = slugify(d.slug || d.name);
    const { data: before } = d.id ? await supabase.from("products").select("slug, price, status").eq("id", d.id).maybeSingle() : { data: null };

    const row = {
      name: d.name,
      slug,
      short_description: d.short_description || null,
      description: cleanHtml(d.description),
      category_id: d.category_id || null,
      collection_id: d.collection_id || null,
      material: d.material || null,
      dimensions: d.dimensions || (d.width_cm && d.height_cm ? `${d.width_cm} × ${d.height_cm}${d.depth_cm ? ` × ${d.depth_cm}` : ""} cm` : null),
      width_cm: d.width_cm,
      height_cm: d.height_cm,
      depth_cm: d.depth_cm,
      strap_drop_cm: d.strap_drop_cm,
      weight_g: d.weight_g,
      care_instructions: d.care_instructions || null,
      price: d.price,
      compare_at_price: d.compare_at_price,
      cost_price: d.cost_price,
      gst_rate: d.gst_rate,
      status: d.status,
      publish_at: d.publish_at ? new Date(d.publish_at).toISOString() : null,
      is_featured: d.is_featured,
      is_trending: d.is_trending,
      is_new: d.is_new,
      has_spin: d.images.some((i) => i.kind === "spin"),
      low_stock_threshold: d.low_stock_threshold,
      seo_title: d.seo_title || null,
      seo_description: d.seo_description || null,
    };
    const { data: saved, error } = d.id
      ? await supabase.from("products").update(row).eq("id", d.id).select("id").single()
      : await supabase.from("products").insert({ ...row, created_by: user.id }).select("id").single();
    if (error || !saved) throw error ?? new Error("Save failed");
    const productId = saved.id;

    // Styles
    await supabase.from("product_styles").delete().eq("product_id", productId);
    if (d.style_ids.length) await supabase.from("product_styles").insert(d.style_ids.map((style_id) => ({ product_id: productId, style_id })));

    // Variants: upsert details, then log stock changes through set_stock()
    const { data: existing } = await supabase.from("product_variants").select("id, stock").eq("product_id", productId);
    const existingMap = new Map((existing ?? []).map((v) => [v.id, v.stock]));
    const keepIds = d.variants.map((v) => v.id);
    const removed = (existing ?? []).filter((v) => !keepIds.includes(v.id)).map((v) => v.id);
    if (removed.length) await supabase.from("product_variants").delete().in("id", removed);
    const hasDefault = d.variants.some((v) => v.is_default);
    for (const [i, v] of d.variants.entries()) {
      const base = { product_id: productId, colour_name: v.colour_name, colour_hex: v.colour_hex.toUpperCase(), sku: v.sku.toUpperCase(), price_override: v.price_override, is_default: hasDefault ? v.is_default : i === 0, sort_order: i };
      if (existingMap.has(v.id)) {
        const { error: ve } = await supabase.from("product_variants").update(base).eq("id", v.id);
        if (ve) throw ve;
        if (existingMap.get(v.id) !== v.stock) await supabase.rpc("set_stock", { p_variant_id: v.id, p_stock: v.stock, p_reason: "Edited in product form" });
      } else {
        const { error: ve } = await supabase.from("product_variants").insert({ ...base, id: v.id, stock: 0 });
        if (ve) throw ve;
        if (v.stock > 0) await supabase.rpc("adjust_stock", { p_variant_id: v.id, p_change: v.stock, p_type: "restock", p_reason: "Initial stock" });
      }
    }

    // Images: replace the set (simple and consistent)
    await supabase.from("product_images").delete().eq("product_id", productId);
    if (d.images.length) {
      const primaryId = d.images.find((i) => i.is_primary && i.kind === "gallery")?.id ?? d.images.find((i) => i.kind === "gallery")?.id;
      const { error: ie } = await supabase.from("product_images").insert(
        d.images.map((im) => ({
          id: im.id,
          product_id: productId,
          url: im.url,
          alt: im.alt || `${d.name}`,
          variant_id: im.variant_id && keepIds.includes(im.variant_id) ? im.variant_id : null,
          kind: im.kind,
          sort_order: im.sort_order,
          is_primary: im.id === primaryId,
        })),
      );
      if (ie) throw ie;
    }

    await audit(user, d.id ? "product.update" : "product.create", "product", productId, `${d.id ? "Updated" : "Created"} ${d.name}`, {
      before,
      after: { slug, price: d.price, status: d.status },
    });
    refresh(TAGS.products, TAGS.product(slug), ...(before?.slug && before.slug !== slug ? [TAGS.product(before.slug)] : []));
    return { ok: true, message: d.id ? "Product saved" : "Product created", data: { id: productId, slug } };
  } catch (e) {
    return fail(e);
  }
}

export async function duplicateProduct(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await assertStaff();
    const supabase = await createClient();
    const { data: p } = await supabase.from("products").select("*, product_variants(*), product_images(*), product_styles(style_id)").eq("id", id).single();
    if (!p) return { ok: false, message: "Product not found" };
    const { product_variants, product_images, product_styles, id: _id, created_at: _c, updated_at: _u, search_text: _s, rating_avg: _r, rating_count: _rc, total_sold: _t, ...rest } = p;
    const suffix = Math.random().toString(36).slice(2, 6);
    const { data: copy, error } = await supabase.from("products").insert({ ...rest, name: `${p.name} (Copy)`, slug: `${p.slug}-copy-${suffix}`, status: "draft", created_by: user.id }).select("id").single();
    if (error || !copy) throw error;
    const idMap = new Map<string, string>();
    for (const v of product_variants) {
      const nid = crypto.randomUUID();
      idMap.set(v.id, nid);
      await supabase.from("product_variants").insert({ id: nid, product_id: copy.id, colour_name: v.colour_name, colour_hex: v.colour_hex, sku: `${v.sku}-${suffix}`.toUpperCase(), stock: 0, price_override: v.price_override, is_default: v.is_default, sort_order: v.sort_order });
    }
    if (product_images.length)
      await supabase.from("product_images").insert(product_images.map((im) => ({ product_id: copy.id, url: im.url, alt: im.alt, kind: im.kind, sort_order: im.sort_order, is_primary: im.is_primary, variant_id: im.variant_id ? idMap.get(im.variant_id) ?? null : null })));
    if (product_styles.length) await supabase.from("product_styles").insert(product_styles.map((s) => ({ product_id: copy.id, style_id: s.style_id })));
    await audit(user, "product.duplicate", "product", copy.id, `Duplicated ${p.name}`);
    return { ok: true, message: "Duplicated as a draft", data: { id: copy.id } };
  } catch (e) {
    return fail(e);
  }
}

export async function bulkProducts(ids: string[], action: "publish" | "draft" | "archive" | "delete" | "feature" | "unfeature"): Promise<ActionResult> {
  try {
    const user = await assertStaff();
    const list = z.array(z.string().uuid()).min(1).max(500).parse(ids);
    const supabase = await createClient();
    const { data: rows } = await supabase.from("products").select("slug").in("id", list);
    let error;
    if (action === "delete") ({ error } = await supabase.from("products").delete().in("id", list));
    else if (action === "feature" || action === "unfeature") ({ error } = await supabase.from("products").update({ is_featured: action === "feature" }).in("id", list));
    else ({ error } = await supabase.from("products").update({ status: action === "publish" ? "published" : action === "draft" ? "draft" : "archived" }).in("id", list));
    if (error) throw error;
    await audit(user, `product.bulk_${action}`, "product", null, `${action} ${list.length} products`, { ids: list });
    refresh(TAGS.products, ...(rows ?? []).map((r) => TAGS.product(r.slug)));
    return { ok: true, message: `${list.length} product${list.length > 1 ? "s" : ""} updated` };
  } catch (e) {
    return fail(e);
  }
}

export async function setVariantStock(variantId: string, stock: number): Promise<ActionResult> {
  try {
    const user = await assertStaff();
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("set_stock", { p_variant_id: z.string().uuid().parse(variantId), p_stock: z.number().int().min(0).max(100000).parse(stock), p_reason: "Inline edit" });
    if (error) throw error;
    const { data: v } = await supabase.from("product_variants").select("sku, products(slug)").eq("id", variantId).single();
    await audit(user, "inventory.set", "variant", variantId, `Set ${v?.sku} stock to ${data}`);
    refresh(TAGS.products, TAGS.product((v?.products as unknown as { slug: string })?.slug ?? ""));
    return { ok: true, message: `Stock set to ${data}` };
  } catch (e) {
    return fail(e);
  }
}

export async function adjustStock(input: unknown): Promise<ActionResult> {
  try {
    const user = await assertStaff();
    const d = z.object({ variantId: z.string().uuid(), change: z.number().int().min(-100000).max(100000), type: z.enum(["restock", "return", "adjustment"]), reason: z.string().trim().min(2, "Please add a reason").max(200) }).parse(input);
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("adjust_stock", { p_variant_id: d.variantId, p_change: d.change, p_type: d.type, p_reason: d.reason });
    if (error) throw error;
    await audit(user, "inventory.adjust", "variant", d.variantId, `${d.change > 0 ? "+" : ""}${d.change} (${d.type}): ${d.reason}`);
    refresh(TAGS.products);
    return { ok: true, message: `Stock is now ${data}` };
  } catch (e) {
    return fail(e);
  }
}

/** CSV import: one row per variant. Creates or updates products matched by slug and variants by SKU. */
export async function importProducts(rows: Record<string, string>[]): Promise<ActionResult> {
  try {
    const user = await assertStaff();
    if (!Array.isArray(rows) || rows.length > 2000) return { ok: false, message: "Upload up to 2,000 rows at a time." };
    const supabase = await createClient();
    const { data: cats } = await supabase.from("categories").select("id, slug");
    const groups = new Map<string, Record<string, string>[]>();
    for (const r of rows) {
      const slug = slugify(r.slug || r.name || "");
      if (!slug) continue;
      groups.set(slug, [...(groups.get(slug) ?? []), r]);
    }
    let created = 0;
    let updated = 0;
    for (const [slug, list] of groups) {
      const r = list[0];
      const price = Number(r.price);
      if (!r.name || !Number.isFinite(price)) continue;
      const { data: existing } = await supabase.from("products").select("id").eq("slug", slug).maybeSingle();
      const row = {
        name: r.name,
        slug,
        price,
        compare_at_price: r.compare_at_price ? Number(r.compare_at_price) : null,
        cost_price: r.cost_price ? Number(r.cost_price) : null,
        gst_rate: r.gst_rate ? Number(r.gst_rate) : 18,
        status: (["draft", "published", "archived"].includes(r.status) ? r.status : "draft") as "draft" | "published" | "archived",
        material: r.material || null,
        short_description: r.short_description || null,
        category_id: cats?.find((c) => c.slug === r.category)?.id ?? null,
      };
      const { data: p, error } = existing ? await supabase.from("products").update(row).eq("id", existing.id).select("id").single() : await supabase.from("products").insert({ ...row, created_by: user.id }).select("id").single();
      if (error || !p) continue;
      existing ? updated++ : created++;
      for (const [i, v] of list.entries()) {
        if (!v.sku) continue;
        const { data: ev } = await supabase.from("product_variants").select("id").eq("sku", v.sku.toUpperCase()).maybeSingle();
        const vrow = { product_id: p.id, colour_name: v.colour_name || "Default", colour_hex: /^#[0-9a-f]{6}$/i.test(v.colour_hex) ? v.colour_hex : "#9C5A33", sku: v.sku.toUpperCase(), price_override: v.price_override ? Number(v.price_override) : null, sort_order: i, is_default: i === 0 };
        if (ev) {
          await supabase.from("product_variants").update(vrow).eq("id", ev.id);
          if (v.stock !== undefined && v.stock !== "") await supabase.rpc("set_stock", { p_variant_id: ev.id, p_stock: Number(v.stock), p_reason: "CSV import" });
        } else {
          const id = crypto.randomUUID();
          await supabase.from("product_variants").insert({ ...vrow, id, stock: 0 });
          if (Number(v.stock) > 0) await supabase.rpc("adjust_stock", { p_variant_id: id, p_change: Number(v.stock), p_type: "restock", p_reason: "CSV import" });
        }
      }
    }
    await audit(user, "product.import", "product", null, `CSV import: ${created} created, ${updated} updated`);
    refresh(TAGS.products);
    return { ok: true, message: `Imported: ${created} new, ${updated} updated` };
  } catch (e) {
    return fail(e);
  }
}
