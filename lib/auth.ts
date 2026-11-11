import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { UserRole } from "@/lib/types";

export interface SessionUser {
  id: string;
  email: string | null;
  fullName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: UserRole;
  isBlocked: boolean;
}

/**
 * Data Access Layer: the one place that turns the auth cookie into a user.
 * Memoised per request with React.cache. Reads cookies, so call it inside a
 * <Suspense> boundary or a route segment with `instant = false`.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, avatar_url, role, is_blocked, email")
    .eq("id", claims.sub)
    .maybeSingle();
  return {
    id: claims.sub,
    email: (profile?.email ?? (claims.email as string | undefined)) || null,
    fullName: profile?.full_name ?? null,
    phone: profile?.phone ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    role: profile?.role ?? "customer",
    isBlocked: profile?.is_blocked ?? false,
  };
});

export async function requireUser(next = "/account") {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireStaff() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin-login?next=/admin");
  if (user.isBlocked || (user.role !== "staff" && user.role !== "admin")) redirect("/");
  return user;
}

export async function requireAdmin() {
  const user = await requireStaff();
  if (user.role !== "admin") redirect("/admin?denied=1");
  return user;
}

/** For Server Actions: returns the staff user or throws (never redirects). */
export async function assertStaff() {
  const user = await getCurrentUser();
  if (!user || user.isBlocked || (user.role !== "staff" && user.role !== "admin")) {
    throw new Error("You don't have permission to do that.");
  }
  return user;
}

export async function assertAdmin() {
  const user = await assertStaff();
  if (user.role !== "admin") throw new Error("Only admins can do that.");
  return user;
}
