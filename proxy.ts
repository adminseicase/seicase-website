import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next.js 16 "proxy" (formerly middleware).
 * - Refreshes the Supabase auth cookie for signed-in areas.
 * - Redirects anonymous visitors away from /account and /admin.
 * - Allows only staff/admin roles into /admin (checked again in every admin
 *   page and Server Action, and enforced by RLS in the database).
 *
 * It deliberately does NOT run on the public storefront so static pages are
 * served straight from the CDN with no extra latency.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const { response, userId, supabase } = await updateSession(request);

  // "/admin" or "/admin/…" only — not "/admin-login"
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const needsUser = pathname.startsWith("/account") || isAdmin;
  if (needsUser && !userId) {
    const url = request.nextUrl.clone();
    url.pathname = isAdmin ? "/admin-login" : "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  if (isAdmin && supabase && userId) {
    const { data: profile } = await supabase.from("profiles").select("role, is_blocked").eq("id", userId).maybeSingle();
    if (!profile || profile.is_blocked || (profile.role !== "admin" && profile.role !== "staff")) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  // Signed-in staff skip the admin sign-in page (customers stay, so they can switch accounts)
  if (pathname === "/admin-login" && supabase && userId) {
    const { data: profile } = await supabase.from("profiles").select("role, is_blocked").eq("id", userId).maybeSingle();
    if (profile && !profile.is_blocked && (profile.role === "admin" || profile.role === "staff")) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  // Signed-in users don't need the login/sign-up pages
  if ((pathname === "/login" || pathname === "/signup") && userId) {
    const next = request.nextUrl.searchParams.get("next");
    const url = request.nextUrl.clone();
    url.pathname = next && next.startsWith("/") && !next.startsWith("//") ? next : "/account";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/admin-login", "/account/:path*", "/checkout/:path*", "/login", "/signup", "/auth/:path*", "/reset-password"],
};
