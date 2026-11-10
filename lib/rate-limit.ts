import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { isServiceRoleConfigured, serverEnv } from "@/lib/server-env";

const memory = new Map<string, { start: number; count: number }>();

/** The caller's IP, hashed (we never store raw IPs). */
export async function clientIpHash() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return createHash("sha256").update(`${serverEnv.ipHashSalt}:${ip}`).digest("hex").slice(0, 32);
}

/**
 * Fixed-window rate limit. Uses Postgres (shared across all serverless
 * instances) when Supabase is configured, otherwise an in-memory map.
 * Returns true when the request is allowed.
 */
export async function rateLimit(action: string, limit: number, windowSeconds: number, identifier?: string) {
  const id = identifier ?? (await clientIpHash());
  const key = `${action}:${id}`;
  if (isServiceRoleConfigured()) {
    const { data, error } = await createAdminClient().rpc("check_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (!error) return data === true;
  }
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || now - entry.start > windowSeconds * 1000) {
    memory.set(key, { start: now, count: 1 });
    return true;
  }
  entry.count++;
  return entry.count <= limit;
}

/** Verifies a Cloudflare Turnstile token when Turnstile is configured. */
export async function verifyTurnstile(token: string | null | undefined) {
  if (!serverEnv.turnstileSecret) return true;
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret: serverEnv.turnstileSecret, response: token }),
    });
    const json = (await res.json()) as { success: boolean };
    return json.success;
  } catch {
    return false;
  }
}
