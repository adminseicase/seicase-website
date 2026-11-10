import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

let publicClient: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Anonymous, cookie-free client for public catalogue/content reads inside
 * "use cache" functions. RLS limits it to published data.
 */
export function createPublicClient() {
  if (!publicClient) {
    publicClient = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return publicClient;
}
