import "server-only";
import { updateTag } from "next/cache";
import sanitize from "sanitize-html";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SessionUser } from "@/lib/auth";
import type { Json } from "@/lib/supabase/database.types";

/** Records who changed what (Admin → Audit log). Never throws. */
export async function audit(
  actor: SessionUser,
  action: string,
  entity: string,
  entityId: string | null,
  summary: string,
  changes?: unknown,
) {
  try {
    await createAdminClient()
      .from("audit_logs")
      .insert({
        actor_id: actor.id,
        actor_email: actor.email,
        action,
        entity,
        entity_id: entityId,
        summary,
        changes: (changes ?? null) as Json,
      });
  } catch (e) {
    console.error("[audit]", e);
  }
}

/** Refreshes storefront caches immediately after an admin edit (read-your-own-writes). */
export function refresh(...tags: string[]) {
  for (const t of tags) updateTag(t);
}

/** Allow only safe, editorial HTML from the rich-text editor. */
export function cleanHtml(html: string | null | undefined) {
  return sanitize(html ?? "", {
    allowedTags: ["p", "br", "h2", "h3", "h4", "strong", "b", "em", "i", "u", "ul", "ol", "li", "a", "blockquote", "img", "hr"],
    allowedAttributes: { a: ["href", "target", "rel"], img: ["src", "alt", "width", "height"], h2: ["id"], h3: ["id"] },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    transformTags: { a: sanitize.simpleTransform("a", { rel: "noopener noreferrer" }) },
  }).trim();
}

export type ActionResult<T = undefined> = { ok: true; message: string; data?: T } | { ok: false; message: string };

export function fail(e: unknown): { ok: false; message: string } {
  const message =
    e instanceof Error
      ? e.message
      : typeof e === "object" && e && "message" in e
        ? String((e as { message: string }).message)
        : "Something went wrong";
  return { ok: false, message: message.includes("duplicate key") ? "That slug / code is already in use." : message };
}
