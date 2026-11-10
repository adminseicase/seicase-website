/**
 * Central place to read environment variables.
 * NEXT_PUBLIC_* values are inlined into the browser bundle; everything else
 * stays on the server. See .env.example for what each variable does.
 */
export const env = {
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
  turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "",
  ga4Id: process.env.NEXT_PUBLIC_GA4_ID || "",
  metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID || "",
  vercelAnalytics: process.env.NEXT_PUBLIC_VERCEL_ANALYTICS === "1",
} as const;

/** True once the Supabase URL and anon key are set. Without them the
 *  storefront runs in read-only demo mode using lib/demo/seed-data.ts. */
export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);
