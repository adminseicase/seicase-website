"use server";

import { assertStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function getRealtime() {
  await assertStaff();
  const supabase = await createClient();
  const { data } = await supabase.rpc("analytics_realtime");
  return data as unknown;
}

/** Manually refresh the materialized views (normally pg_cron does it every 15 min). */
export async function refreshAnalytics() {
  await assertStaff();
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const { error } = await createAdminClient().rpc("refresh_analytics_views");
  return error ? { ok: false, message: error.message } : { ok: true, message: "Analytics refreshed" };
}
