import "server-only";
import { render } from "@react-email/components";
import { Resend } from "resend";
import { env } from "@/lib/env";
import { isServiceRoleConfigured, serverEnv } from "@/lib/server-env";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  AbandonedCartEmail,
  AdminContactEmail,
  AdminNewOrderEmail,
  LowStockEmail,
  OrderConfirmationEmail,
  OrderStatusEmail,
  ReturnUpdateEmail,
  WelcomeEmail,
  type EmailOrder,
  type EmailOrderItem,
} from "@/emails/templates";

export type EmailTemplate =
  | { kind: "order-confirmation"; order: EmailOrder }
  | {
      kind: "order-status";
      orderNumber: string;
      customerName: string;
      status: string;
      orderUrl: string;
      tracking?: { number: string | null; courier: string | null; url: string | null } | null;
      note?: string | null;
    }
  | { kind: "welcome"; name: string | null }
  | { kind: "return-update"; customerName: string; orderNumber: string; status: string; refundAmount?: number | null; note?: string | null }
  | { kind: "abandoned-cart"; name: string | null; items: EmailOrderItem[]; recoverUrl: string }
  | { kind: "admin-contact"; name: string; email: string; phone: string | null; message: string }
  | { kind: "admin-new-order"; order: EmailOrder; adminUrl: string }
  | { kind: "low-stock"; items: { product: string; colour: string; sku: string; stock: number }[] };

function element(t: EmailTemplate) {
  const siteUrl = env.siteUrl;
  switch (t.kind) {
    case "order-confirmation":
      return <OrderConfirmationEmail order={t.order} siteUrl={siteUrl} />;
    case "order-status":
      return <OrderStatusEmail {...t} siteUrl={siteUrl} />;
    case "welcome":
      return <WelcomeEmail name={t.name} siteUrl={siteUrl} />;
    case "return-update":
      return <ReturnUpdateEmail {...t} siteUrl={siteUrl} />;
    case "abandoned-cart":
      return <AbandonedCartEmail {...t} siteUrl={siteUrl} />;
    case "admin-contact":
      return <AdminContactEmail {...t} siteUrl={siteUrl} />;
    case "admin-new-order":
      return <AdminNewOrderEmail {...t} siteUrl={siteUrl} />;
    case "low-stock":
      return <LowStockEmail items={t.items} siteUrl={siteUrl} />;
  }
}

export async function renderEmail(t: EmailTemplate) {
  const el = element(t);
  return { html: await render(el), text: await render(el, { plainText: true }) };
}

let resend: Resend | null = null;

/**
 * Sends an email through Resend. When RESEND_API_KEY is missing (local
 * development) the email is logged instead, so flows never break.
 */
export async function sendEmail({
  to,
  subject,
  template,
  replyTo,
}: {
  to: string | string[];
  subject: string;
  template: EmailTemplate;
  replyTo?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const { html, text } = await renderEmail(template);
    if (!serverEnv.resendApiKey) {
      console.info(
        `[email:dev] To: ${Array.isArray(to) ? to.join(", ") : to} · ${subject} (${template.kind}) — set RESEND_API_KEY to send.`,
      );
      return { ok: true };
    }
    resend ??= new Resend(serverEnv.resendApiKey);
    const { data, error } = await resend.emails.send({ from: serverEnv.emailFrom, to, subject, html, text, replyTo });
    if (error) {
      console.error("[email] send failed", error);
      return { ok: false, error: error.message };
    }
    return { ok: true, id: data?.id };
  } catch (e) {
    console.error("[email] render/send error", e);
    return { ok: false, error: e instanceof Error ? e.message : "unknown" };
  }
}

/** Where admin notifications go: env override → settings.notifications → store email. */
export async function adminEmail(): Promise<string | null> {
  if (serverEnv.adminNotificationEmail) return serverEnv.adminNotificationEmail;
  if (!isServiceRoleConfigured()) return null;
  const { data } = await createAdminClient().from("site_settings").select("key, value").in("key", ["notifications", "store"]);
  const notif = data?.find((d) => d.key === "notifications")?.value as { admin_email?: string } | undefined;
  const store = data?.find((d) => d.key === "store")?.value as { email?: string } | undefined;
  return notif?.admin_email || store?.email || null;
}
