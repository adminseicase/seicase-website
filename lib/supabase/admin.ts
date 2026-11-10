import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

let adminClient: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Service-role client. BYPASSES Row Level Security — use only in trusted
 * server code (checkout, webhooks, cron jobs, verified admin actions).
 * Never import this from a Client Component.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set. See docs/SETUP.md.");
  }
  if (!adminClient) {
    adminClient = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
}
