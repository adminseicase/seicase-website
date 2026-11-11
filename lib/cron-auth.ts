import "server-only";
import type { NextRequest } from "next/server";
import { serverEnv } from "@/lib/server-env";

/** Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. */
export function isAuthorizedCron(request: NextRequest) {
  const secret = serverEnv.cronSecret;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}
