"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import type { WishlistItem } from "@/lib/store/wishlist";

/** Adds/removes a product in the signed-in user's saved wishlist (RLS: own rows only). */
export async function toggleWishlistServer(productId: string, saved: boolean) {
  if (!isSupabaseConfigured) return { ok: true };
  const id = z.string().uuid().parse(productId);
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  const supabase = await createClient();
  if (saved) await supabase.from("wishlists").upsert({ user_id: user.id, product_id: id }, { onConflict: "user_id,product_id" });
  else await supabase.from("wishlists").delete().eq("user_id", user.id).eq("product_id", id);
  return { ok: true };
}

/** Merges the browser wishlist into the account and returns the combined list. */
export async function syncWishlist(localIds: string[]): Promise<WishlistItem[] | null> {
  if (!isSupabaseConfigured) return null;
  const user = await getCurrentUser();
  if (!user) return null;
  const ids = z.array(z.string().uuid()).max(200).parse(localIds);
  const supabase = await createClient();
  if (ids.length) {
    await supabase
      .from("wishlists")
      .upsert(ids.map((product_id) => ({ user_id: user.id, product_id })), { onConflict: "user_id,product_id", ignoreDuplicates: true });
  }
  const { data } = await supabase
    .from("wishlists")
    .select("created_at, products(id, slug, name, price, product_images(url, is_primary, sort_order, kind))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return (data ?? [])
    .map((w): WishlistItem | null => {
      const p = w.products as unknown as {
        id: string;
        slug: string;
        name: string;
        price: number;
        product_images: { url: string; is_primary: boolean; sort_order: number; kind: string }[];
      } | null;
      if (!p) return null;
      const img = [...p.product_images].filter((i) => i.kind === "gallery").sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)[0];
      return { productId: p.id, slug: p.slug, name: p.name, price: Number(p.price), image: img?.url ?? null, addedAt: Date.parse(w.created_at) };
    })
    .filter((x): x is WishlistItem => !!x);
}
