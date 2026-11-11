import { NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { serverEnv } from "@/lib/server-env";

/**
 * On-demand cache refresh for external tools (e.g. a Supabase database
 * webhook): POST /api/revalidate { "tags": ["products"] }
 * Header: Authorization: Bearer <REVALIDATE_SECRET>
 * (Admin-panel edits already refresh the store automatically.)
 */
export async function POST(request: NextRequest) {
  if (!serverEnv.revalidateSecret || request.headers.get("authorization") !== `Bearer ${serverEnv.revalidateSecret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as { tags?: string[] };
  const tags = (body.tags ?? ["products", "content", "settings"]).filter((t) => typeof t === "string" && t.length < 200).slice(0, 50);
  for (const t of tags) revalidateTag(t, { expire: 0 });
  return NextResponse.json({ ok: true, revalidated: tags });
}
