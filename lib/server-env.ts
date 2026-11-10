import "server-only";

/** Server-only secrets. Importing this file from a Client Component fails the build. */
export const serverEnv = {
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || "",
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || "",
  resendApiKey: process.env.RESEND_API_KEY || "",
  emailFrom: process.env.EMAIL_FROM || "seicase <hello@seicase.com>",
  adminNotificationEmail: process.env.ADMIN_NOTIFICATION_EMAIL || "",
  turnstileSecret: process.env.TURNSTILE_SECRET_KEY || "",
  revalidateSecret: process.env.REVALIDATE_SECRET || "",
  cronSecret: process.env.CRON_SECRET || "",
  ipHashSalt: process.env.IP_HASH_SALT || "seicase",
};

export const isRazorpayConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID && serverEnv.razorpayKeySecret);
export const isEmailConfigured = () => Boolean(serverEnv.resendApiKey);
export const isServiceRoleConfigured = () => Boolean(serverEnv.supabaseServiceRoleKey);
