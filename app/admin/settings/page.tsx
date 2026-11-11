import { CircleCheck, CircleX } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { defaultSettings } from "@/lib/demo/seed-data";
import { Card, PageHeader, Table, Td } from "@/components/admin/ui";
import { NotificationsForm, ShippingForm, SocialForm, StoreForm } from "@/components/admin/settings-forms";
import { RoleForm, TestEmailButtons } from "@/components/admin/widgets";
import { env } from "@/lib/env";
import { isEmailConfigured, isRazorpayConfigured, serverEnv } from "@/lib/server-env";
import type { SiteSettings } from "@/lib/types";

export const metadata = { title: "Settings" };

function Status({ ok, label, hint }: { ok: boolean; label: string; hint: string }) {
  return (
    <li className="flex items-start gap-3 py-2 text-sm">
      {ok ? <CircleCheck className="text-success mt-0.5 size-4 shrink-0" /> : <CircleX className="text-danger mt-0.5 size-4 shrink-0" />}
      <span>
        <span className="font-medium">{label}</span>
        <span className="text-muted block text-xs">{hint}</span>
      </span>
    </li>
  );
}

export default async function SettingsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: rows }, { data: staff }] = await Promise.all([
    supabase.from("site_settings").select("key, value"),
    supabase.from("profiles").select("id, full_name, email, role").in("role", ["admin", "staff"]).order("role"),
  ]);
  const get = <K extends keyof SiteSettings>(k: K) =>
    ({ ...defaultSettings[k], ...((rows?.find((r) => r.key === k)?.value as object) ?? {}) }) as SiteSettings[K];
  const notif = {
    admin_email: defaultSettings.store.email,
    low_stock_email: true,
    new_order_email: true,
    ...((rows?.find((r) => r.key === "notifications")?.value as object) ?? {}),
  };
  const liveKeys = env.razorpayKeyId.startsWith("rzp_live_");

  return (
    <>
      <PageHeader
        title="Settings"
        description="Store details, shipping rules, integrations and team access. Only admins can see this page."
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <StoreForm value={get("store")} />
        <div className="space-y-6">
          <ShippingForm value={get("shipping")} />
          <Card title="Tax">
            <p className="text-muted text-sm">
              All prices are entered and shown <strong className="text-foreground">inclusive of GST</strong>. Set the GST % per product
              (default 18%). Invoices show CGST + SGST for Tamil Nadu deliveries and IGST for other states, using the GSTIN in Store
              information.
            </p>
          </Card>
        </div>
        <Card title="Integrations status">
          <ul className="divide-y">
            <Status ok={!!env.supabaseUrl} label="Supabase" hint={env.supabaseUrl || "NEXT_PUBLIC_SUPABASE_URL missing"} />
            <Status
              ok={isRazorpayConfigured()}
              label={`Razorpay ${isRazorpayConfigured() ? (liveKeys ? "(LIVE keys)" : "(test keys)") : ""}`}
              hint={
                isRazorpayConfigured()
                  ? `Key ${env.razorpayKeyId.slice(0, 12)}…`
                  : "Add NEXT_PUBLIC_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET"
              }
            />
            <Status
              ok={!!serverEnv.razorpayWebhookSecret}
              label="Razorpay webhook secret"
              hint={`Webhook URL: ${env.siteUrl}/api/razorpay/webhook`}
            />
            <Status
              ok={isEmailConfigured()}
              label="Resend (email)"
              hint={isEmailConfigured() ? `Sending from ${serverEnv.emailFrom}` : "Add RESEND_API_KEY — emails are only logged until then"}
            />
            <Status ok={!!serverEnv.cronSecret} label="Cron secret" hint="Protects /api/cron/* (abandoned-cart emails, low-stock alerts)" />
            <Status ok={!!env.turnstileSiteKey} label="Cloudflare Turnstile (optional)" hint="Extra spam protection on the contact form" />
            <Status
              ok={!!env.ga4Id || !!env.metaPixelId || env.vercelAnalytics}
              label="GA4 / Meta Pixel / Vercel Analytics (optional)"
              hint="First-party analytics always run; these are extras"
            />
          </ul>
        </Card>
        <Card title="Email templates">
          <p className="text-muted mb-3 text-sm">
            Send yourself a test of each transactional email (they use the brand style in /emails). Password-reset and sign-up emails are
            sent by Supabase Auth — see docs/SETUP.md to brand them.
          </p>
          <TestEmailButtons />
        </Card>
        <SocialForm value={get("social")} />
        <NotificationsForm value={notif} />
        <Card title="Team & roles" className="xl:col-span-2">
          <p className="text-muted mb-4 text-sm">
            <strong className="text-foreground">Staff</strong> can manage products, orders, content and customers.{" "}
            <strong className="text-foreground">Admins</strong> can also change settings and roles. Ask the person to create an account
            first.
          </p>
          <RoleForm />
          <div className="mt-5">
            <Table head={["Name", "Email", "Role"]}>
              {(staff ?? []).map((s) => (
                <tr key={s.id}>
                  <Td>{s.full_name ?? "—"}</Td>
                  <Td>{s.email}</Td>
                  <Td className="capitalize">{s.role}</Td>
                </tr>
              ))}
            </Table>
          </div>
        </Card>
      </div>
    </>
  );
}
