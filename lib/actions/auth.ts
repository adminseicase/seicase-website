"use server";

import { after } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, env } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { emailSchema, passwordSchema } from "@/lib/validations";
import { sendEmail } from "@/lib/email/send";

type Result = { ok: boolean; message: string; redirect?: string };
const notConfigured: Result = { ok: false, message: "Accounts are available once Supabase is connected (see docs/SETUP.md)." };

const safeNext = (n?: string | null) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/account");

async function origin() {
  const h = await headers();
  return h.get("origin") || env.siteUrl;
}

export async function signInWithPassword(input: unknown): Promise<Result> {
  if (!isSupabaseConfigured) return notConfigured;
  const d = z.object({ email: emailSchema, password: z.string().min(1).max(72), next: z.string().optional() }).safeParse(input);
  if (!d.success) return { ok: false, message: "Please enter your email and password." };
  if (!(await rateLimit("login", 10, 600))) return { ok: false, message: "Too many attempts. Please wait a few minutes." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: d.data.email, password: d.data.password });
  if (error)
    return {
      ok: false,
      message:
        error.message === "Email not confirmed" ? "Please confirm your email first — check your inbox." : "Incorrect email or password.",
    };
  return { ok: true, message: "Welcome back", redirect: safeNext(d.data.next) };
}

export async function signUp(input: unknown): Promise<Result> {
  if (!isSupabaseConfigured) return notConfigured;
  const d = z
    .object({
      full_name: z.string().trim().min(2, "Please enter your name").max(80),
      email: emailSchema,
      password: passwordSchema,
      marketing: z.boolean().optional(),
    })
    .safeParse(input);
  if (!d.success) return { ok: false, message: d.error.issues[0]?.message ?? "Please check your details." };
  if (!(await rateLimit("signup", 5, 3600))) return { ok: false, message: "Too many sign-ups from this network. Please try later." };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: d.data.email,
    password: d.data.password,
    options: { data: { full_name: d.data.full_name }, emailRedirectTo: `${await origin()}/auth/callback?next=/account` },
  });
  if (error) return { ok: false, message: error.message };
  after(() => sendEmail({ to: d.data.email, subject: "Welcome to seicase", template: { kind: "welcome", name: d.data.full_name } }));
  if (data.session) return { ok: true, message: "Account created", redirect: "/account" };
  return { ok: true, message: "Almost there! Check your email to confirm your account." };
}

export async function sendMagicLink(input: unknown): Promise<Result> {
  if (!isSupabaseConfigured) return notConfigured;
  const d = z.object({ email: emailSchema, next: z.string().optional() }).safeParse(input);
  if (!d.success) return { ok: false, message: "Please enter a valid email." };
  if (!(await rateLimit("magic", 5, 900))) return { ok: false, message: "Please wait a few minutes before requesting another link." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: d.data.email,
    options: { emailRedirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(safeNext(d.data.next))}` },
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "Check your inbox — we've sent you a sign-in link." };
}

export async function sendPhoneOtp(input: unknown): Promise<Result> {
  if (!isSupabaseConfigured) return notConfigured;
  const d = z.object({ phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a 10-digit mobile number") }).safeParse(input);
  if (!d.success) return { ok: false, message: d.error.issues[0].message };
  if (!(await rateLimit("otp", 5, 900))) return { ok: false, message: "Please wait before requesting another code." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ phone: `+91${d.data.phone}` });
  if (error)
    return { ok: false, message: error.message.includes("provider") ? "Phone login isn't enabled yet. Please use email." : error.message };
  return { ok: true, message: "We've sent a 6-digit code to your phone." };
}

export async function verifyPhoneOtp(input: unknown): Promise<Result> {
  if (!isSupabaseConfigured) return notConfigured;
  const d = z
    .object({ phone: z.string().regex(/^[6-9]\d{9}$/), token: z.string().regex(/^\d{6}$/), next: z.string().optional() })
    .safeParse(input);
  if (!d.success) return { ok: false, message: "Enter the 6-digit code." };
  if (!(await rateLimit("otp-verify", 10, 900))) return { ok: false, message: "Too many attempts." };
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ phone: `+91${d.data.phone}`, token: d.data.token, type: "sms" });
  if (error) return { ok: false, message: "That code didn't work. Please try again." };
  return { ok: true, message: "Signed in", redirect: safeNext(d.data.next) };
}

export async function signInWithGoogle(next?: string): Promise<Result> {
  if (!isSupabaseConfigured) return notConfigured;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(safeNext(next))}` },
  });
  if (error || !data.url) return { ok: false, message: error?.message ?? "Google sign-in is not available." };
  return { ok: true, message: "Redirecting…", redirect: data.url };
}

export async function requestPasswordReset(input: unknown): Promise<Result> {
  if (!isSupabaseConfigured) return notConfigured;
  const d = z.object({ email: emailSchema }).safeParse(input);
  if (!d.success) return { ok: false, message: "Please enter a valid email." };
  if (!(await rateLimit("reset", 5, 3600))) return { ok: false, message: "Please try again later." };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(d.data.email, { redirectTo: `${await origin()}/auth/callback?next=/reset-password` });
  // Same answer whether or not the account exists (prevents email enumeration)
  return { ok: true, message: "If an account exists for that email, you'll receive a reset link shortly." };
}

export async function updatePassword(input: unknown): Promise<Result> {
  if (!isSupabaseConfigured) return notConfigured;
  const d = z.object({ password: passwordSchema }).safeParse(input);
  if (!d.success) return { ok: false, message: d.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: d.data.password });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "Password updated", redirect: "/account" };
}
