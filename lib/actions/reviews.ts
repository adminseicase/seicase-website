"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { reviewSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rate-limit";

export async function canReview(productId: string): Promise<{ status: "login" | "not-buyer" | "already" | "ok" }> {
  const id = z.string().uuid().safeParse(productId);
  if (!id.success || !isSupabaseConfigured) return { status: "login" };
  const user = await getCurrentUser();
  if (!user) return { status: "login" };
  const supabase = await createClient();
  const [{ data: bought }, { data: existing }] = await Promise.all([
    supabase.rpc("has_purchased", { p_product_id: id.data, p_user_id: user.id }),
    supabase.from("reviews").select("id").eq("product_id", id.data).eq("user_id", user.id).maybeSingle(),
  ]);
  if (existing) return { status: "already" };
  return { status: bought ? "ok" : "not-buyer" };
}

export async function submitReview(input: unknown) {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Please check your review." };
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Please sign in first." };
  if (!(await rateLimit("review", 5, 3600, user.id))) return { ok: false, message: "Please try again later." };
  const supabase = await createClient();
  // RLS re-checks: own user id, status=pending and has_purchased()
  const { error } = await supabase.from("reviews").insert({
    product_id: parsed.data.productId,
    user_id: user.id,
    author_name: user.fullName ? `${user.fullName.split(" ")[0]} ${user.fullName.split(" ")[1]?.[0] ?? ""}`.trim() : "seicase customer",
    rating: parsed.data.rating,
    title: parsed.data.title || null,
    body: parsed.data.body,
    images: parsed.data.images ?? [],
    status: "pending",
    is_verified: true,
  });
  if (error)
    return { ok: false, message: error.code === "23505" ? "You've already reviewed this product." : "We couldn't save your review." };
  return { ok: true, message: "Thank you! Your review will appear once it's approved." };
}
