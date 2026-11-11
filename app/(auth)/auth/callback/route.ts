import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Handles every Supabase auth redirect: OAuth (Google) and email links
 * (confirm sign-up, magic link, password reset) using PKCE `code` or `token_hash`.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const nextParam = url.searchParams.get("next");
  const next = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/account";
  const supabase = await createClient();

  let error: string | null = null;
  if (code) {
    const r = await supabase.auth.exchangeCodeForSession(code);
    error = r.error?.message ?? null;
  } else if (tokenHash && type) {
    const r = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    error = r.error?.message ?? null;
  } else {
    error = "Missing code";
  }

  const dest = new URL(
    error
      ? `/login?error=${encodeURIComponent("That link has expired. Please try again.")}`
      : type === "recovery"
        ? "/reset-password"
        : next,
    url.origin,
  );
  return NextResponse.redirect(dest);
}
