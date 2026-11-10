import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { isServiceRoleConfigured } from "@/lib/server-env";
import { rateLimit } from "@/lib/rate-limit";
import { parseUserAgent } from "@/lib/analytics/ua";

const EVENTS = [
  "page_view",
  "product_view",
  "search",
  "add_to_cart",
  "remove_from_cart",
  "add_to_wishlist",
  "begin_checkout",
  "payment_initiated",
  "purchase",
  "payment_failed",
  "newsletter_signup",
  "contact_submit",
] as const;

const eventSchema = z.object({
  event_name: z.enum(EVENTS),
  session_id: z.string().min(4).max(80),
  path: z.string().max(500).optional(),
  referrer: z.string().max(1000).nullable().optional(),
  utm: z.record(z.string(), z.string().max(100)).optional(),
  screen: z.number().int().min(0).max(10000).optional(),
  product_id: z.string().uuid().nullable().optional(),
  order_id: z.string().uuid().nullable().optional(),
  search_query: z.string().max(120).optional(),
  results_count: z.number().int().min(0).max(100000).optional(),
  value: z.number().min(0).max(10_000_000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
const bodySchema = z.object({ events: z.array(eventSchema).min(1).max(25) });

const BOT = /bot|crawl|spider|slurp|headless|preview|facebookexternalhit|whatsapp|monitor/i;

/**
 * First-party analytics beacon (POST /api/track).
 * Enriches events with device, browser and Vercel geo headers, then stores
 * them in Supabase with the service role. Always answers 204 quickly.
 */
export async function POST(request: NextRequest) {
  const ua = request.headers.get("user-agent") ?? "";
  if (!isServiceRoleConfigured() || BOT.test(ua)) return new NextResponse(null, { status: 204 });

  let parsed;
  try {
    parsed = bodySchema.safeParse(await request.json());
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  if (!parsed.success) return new NextResponse(null, { status: 400 });

  const sid = parsed.data.events[0].session_id;
  if (!(await rateLimit("track", 300, 600, sid))) return new NextResponse(null, { status: 429 });

  // Identify the signed-in user (if any) from the auth cookie — verified, never trusted from the body.
  let userId: string | null = null;
  if (request.cookies.getAll().some((c) => c.name.includes("-auth-token"))) {
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} },
    });
    const { data } = await supabase.auth.getClaims();
    userId = (data?.claims?.sub as string | undefined) ?? null;
  }

  const { device, browser, os } = parseUserAgent(ua, parsed.data.events[0].screen);
  const decode = (v: string | null) => {
    if (!v) return null;
    try {
      return decodeURIComponent(v);
    } catch {
      return v;
    }
  };
  const country = request.headers.get("x-vercel-ip-country");
  const region = decode(request.headers.get("x-vercel-ip-country-region"));
  const city = decode(request.headers.get("x-vercel-ip-city"));

  const rows = parsed.data.events.map((e) => {
    let referrerHost: string | null = null;
    if (e.referrer) {
      try {
        referrerHost = new URL(e.referrer).hostname;
      } catch {}
    }
    return {
      event_name: e.event_name,
      session_id: e.session_id,
      user_id: userId,
      product_id: e.product_id ?? null,
      order_id: e.order_id ?? null,
      path: e.path ?? null,
      referrer: e.referrer ?? null,
      referrer_host: referrerHost,
      utm_source: e.utm?.source ?? null,
      utm_medium: e.utm?.medium ?? null,
      utm_campaign: e.utm?.campaign ?? null,
      utm_term: e.utm?.term ?? null,
      utm_content: e.utm?.content ?? null,
      device_type: device,
      browser,
      os,
      country,
      region,
      city,
      search_query: e.search_query ?? null,
      results_count: e.results_count ?? null,
      value: e.value ?? null,
      metadata: (e.metadata as Record<string, string>) ?? null,
    };
  });

  const { error } = await createAdminClient().from("analytics_events").insert(rows);
  if (error) console.error("[track] insert failed", error.message);
  return new NextResponse(null, { status: 204 });
}
