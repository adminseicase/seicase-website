"use server";

import { z } from "zod";
import { getAllProducts, getCharms } from "@/lib/data/catalog";
import { buildCatalog } from "@/lib/demo/seed-data";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { isServiceRoleConfigured } from "@/lib/server-env";
import { getCurrentUser } from "@/lib/auth";
import { emailSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rate-limit";

const linesSchema = z
  .array(
    z.object({
      variantId: z.string().uuid(),
      quantity: z.number().int().min(1).max(10),
      charmId: z.string().uuid().nullable().optional(),
    }),
  )
  .max(30);

export interface ValidatedLine {
  variantId: string;
  charmId: string | null;
  available: boolean;
  stock: number;
  price: number;
  charmPrice: number | null;
  name: string;
  colour: string;
}

/** Live price + stock for each line in the bag (prices always from the server). */
export async function validateCart(input: unknown): Promise<ValidatedLine[]> {
  const lines = linesSchema.parse(input);
  if (!lines.length) return [];
  const variantIds = [...new Set(lines.map((l) => l.variantId))];

  let variants: { id: string; stock: number; price: number; name: string; colour: string; published: boolean }[] = [];
  if (isSupabaseConfigured && isServiceRoleConfigured()) {
    const { data } = await createAdminClient()
      .from("product_variants")
      .select("id, stock, price_override, colour_name, products!inner(name, price, status, publish_at)")
      .in("id", variantIds);
    variants = (data ?? []).map((v) => {
      const p = v.products as unknown as { name: string; price: number; status: string; publish_at: string | null };
      return {
        id: v.id,
        stock: v.stock,
        price: Number(v.price_override ?? p.price),
        name: p.name,
        colour: v.colour_name,
        published: p.status === "published" && (!p.publish_at || new Date(p.publish_at) <= new Date()),
      };
    });
  } else {
    const c = buildCatalog();
    const all = await getAllProducts();
    variants = c.variants
      .filter((v) => variantIds.includes(v.id))
      .map((v) => {
        const p = c.products.find((x) => x.id === v.product_id)!;
        return {
          id: v.id,
          stock: v.stock,
          price: Number(v.price_override ?? p.price),
          name: p.name,
          colour: v.colour_name,
          published: all.some((a) => a.id === p.id),
        };
      });
  }
  const charms = await getCharms();
  return lines.map((l) => {
    const v = variants.find((x) => x.id === l.variantId);
    const charm = l.charmId ? charms.find((c) => c.id === l.charmId && c.is_active) : null;
    return {
      variantId: l.variantId,
      charmId: l.charmId ?? null,
      available: !!v && v.published && v.stock > 0 && (!l.charmId || (!!charm && charm.stock > 0)),
      stock: v?.stock ?? 0,
      price: v?.price ?? 0,
      charmPrice: charm ? Number(charm.price) : null,
      name: v?.name ?? "Unavailable item",
      colour: v?.colour ?? "",
    };
  });
}

/**
 * Keeps a server copy of the bag for abandoned-cart recovery. Only stored
 * when we can contact the shopper later (signed in, or email given at checkout).
 */
export async function syncServerCart(input: { lines: unknown; sessionId: string; email?: string | null }) {
  if (!isSupabaseConfigured || !isServiceRoleConfigured()) return { ok: true };
  const lines = linesSchema.safeParse(input.lines);
  if (!lines.success) return { ok: false };
  const sessionId = z.string().min(8).max(80).safeParse(input.sessionId);
  if (!sessionId.success) return { ok: false };
  if (!(await rateLimit("cart-sync", 60, 600, sessionId.data))) return { ok: false };

  const user = await getCurrentUser();
  const email = input.email ? emailSchema.safeParse(input.email) : null;
  if (!user && !email?.success) return { ok: true };

  const validated = await validateCart(lines.data);
  const subtotal = validated.reduce((s, v, i) => s + (v.price + (v.charmPrice ?? 0)) * lines.data[i].quantity, 0);
  const itemCount = lines.data.reduce((s, l) => s + l.quantity, 0);
  const admin = createAdminClient();

  const cartRow = {
    email: (user?.email ?? (email?.success ? email.data : null)) || null,
    session_id: sessionId.data,
    status: "active" as const,
    subtotal,
    item_count: itemCount,
    last_activity_at: new Date().toISOString(),
  };
  const { data: cart } = user
    ? await admin
        .from("carts")
        .upsert({ ...cartRow, user_id: user.id }, { onConflict: "user_id" })
        .select("id")
        .single()
    : await admin.from("carts").upsert(cartRow, { onConflict: "session_id" }).select("id").single();
  if (!cart) return { ok: false };

  await admin.from("cart_items").delete().eq("cart_id", cart.id);
  if (lines.data.length) {
    const c = buildCatalog();
    const productIds = isServiceRoleConfigured()
      ? ((
          await admin
            .from("product_variants")
            .select("id, product_id")
            .in(
              "id",
              lines.data.map((l) => l.variantId),
            )
        ).data ?? [])
      : c.variants.map((v) => ({ id: v.id, product_id: v.product_id }));
    await admin.from("cart_items").insert(
      lines.data
        .map((l, i) => ({
          cart_id: cart.id,
          variant_id: l.variantId,
          product_id: productIds.find((p) => p.id === l.variantId)?.product_id ?? "",
          charm_id: l.charmId ?? null,
          quantity: l.quantity,
          unit_price: validated[i].price,
        }))
        .filter((r) => r.product_id),
    );
  }
  return { ok: true };
}
