"use server";

import { after } from "next/server";
import { headers } from "next/headers";
import { contactSchema, newsletterSchema } from "@/lib/validations";
import { clientIpHash, rateLimit, verifyTurnstile } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { isServiceRoleConfigured } from "@/lib/server-env";
import { sendEmail, adminEmail } from "@/lib/email/send";

export type ActionResult = { ok: true; message: string } | { ok: false; message: string; fieldErrors?: Record<string, string> };

/** Newsletter signup: honeypot + rate limit + Zod, stored in Supabase. */
export async function subscribeNewsletter(input: unknown): Promise<ActionResult> {
  const parsed = newsletterSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Please check your email." };
  if (parsed.data.company) return { ok: true, message: "Thank you for joining!" }; // bot — pretend success
  if (!(await rateLimit("newsletter", 5, 600))) return { ok: false, message: "Too many attempts. Please try again in a few minutes." };
  if (!isServiceRoleConfigured()) return { ok: true, message: "Thank you for joining! (demo mode — not saved)" };

  const { error } = await createAdminClient()
    .from("newsletter_subscribers")
    .upsert({ email: parsed.data.email, source: parsed.data.source ?? "footer", is_active: true }, { onConflict: "email" });
  if (error) return { ok: false, message: "Something went wrong. Please try again." };
  return { ok: true, message: "Welcome to the journey! Look out for our next letter." };
}

/** Contact form: honeypot + rate limit + optional Turnstile, saved and emailed to the team. */
export async function submitContact(input: unknown): Promise<ActionResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { ok: false, message: "Please check the highlighted fields.", fieldErrors };
  }
  const d = parsed.data;
  if (d.website) return { ok: true, message: "Thank you! We'll be in touch soon." };
  if (!(await rateLimit("contact", 4, 900))) return { ok: false, message: "You've sent several messages recently. Please try again later." };
  if (!(await verifyTurnstile(d.turnstileToken))) return { ok: false, message: "Please complete the verification and try again." };
  if (!isServiceRoleConfigured()) return { ok: true, message: "Thank you! (demo mode — message not saved)" };

  const h = await headers();
  const { error } = await createAdminClient()
    .from("contact_messages")
    .insert({
      name: d.name,
      email: d.email,
      phone: d.phone || null,
      subject: d.subject || null,
      message: d.message,
      ip_hash: await clientIpHash(),
      user_agent: h.get("user-agent")?.slice(0, 300) ?? null,
    });
  if (error) return { ok: false, message: "We couldn't send your message. Please email us directly." };

  after(async () => {
    const to = await adminEmail();
    if (to) {
      await sendEmail({
        to,
        replyTo: d.email,
        subject: `New message from ${d.name}${d.subject ? ` — ${d.subject}` : ""}`,
        template: { kind: "admin-contact", name: d.name, email: d.email, phone: d.phone || null, message: d.message },
      });
    }
  });
  return { ok: true, message: "Thank you! Our team will reply within one business day." };
}
