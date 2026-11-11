"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Mail, Smartphone, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Label } from "@/components/ui/input";
import {
  requestPasswordReset,
  sendMagicLink,
  sendPhoneOtp,
  signInAdmin,
  signInWithGoogle,
  signInWithPassword,
  signUp,
  updatePassword,
  verifyPhoneOtp,
} from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

function GoogleButton({ next }: { next: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="lg"
      className="w-full"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await signInWithGoogle(next);
          if (r.ok && r.redirect) window.location.href = r.redirect;
          else toast.error(r.message);
        })
      }
    >
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
        <path
          fill="#EA4335"
          d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.3 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z"
        />
      </svg>
      Continue with Google
    </Button>
  );
}

function Divider({ label = "or" }: { label?: string }) {
  return (
    <div className="text-muted my-6 flex items-center gap-3 text-xs tracking-[0.16em] uppercase">
      <span className="bg-border h-px flex-1" /> {label} <span className="bg-border h-px flex-1" />
    </div>
  );
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/account";
  const error = params.get("error");
  const [mode, setMode] = useState<"password" | "magic" | "phone">("password");
  const [pending, start] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [notice, setNotice] = useState<string | null>(error);

  const tab = (m: typeof mode, label: string, Icon: typeof Mail) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === m}
      onClick={() => setMode(m)}
      className={cn(
        "flex h-10 flex-1 items-center justify-center gap-1.5 rounded-md text-xs transition-colors",
        mode === m ? "bg-surface shadow-soft" : "text-muted hover:text-foreground",
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" /> {label}
    </button>
  );

  return (
    <div>
      <h1 className="text-4xl md:text-5xl">Welcome back</h1>
      <p className="text-muted mt-2">Sign in to track orders, save addresses and your wishlist.</p>
      {notice && (
        <p className="bg-surface-muted mt-4 rounded-lg p-3 text-sm" role="status">
          {notice}
        </p>
      )}
      <div className="mt-8">
        <GoogleButton next={next} />
      </div>
      <Divider />
      <div role="tablist" aria-label="Sign-in method" className="bg-surface-muted mb-5 flex gap-1 rounded-lg p-1">
        {tab("password", "Password", KeyRound)}
        {tab("magic", "Email link", Mail)}
        {tab("phone", "Phone OTP", Smartphone)}
      </div>

      {mode === "password" && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await signInWithPassword({ email, password, next });
              if (r.ok && r.redirect) {
                router.push(r.redirect);
                router.refresh();
              } else toast.error(r.message);
            });
          }}
        >
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="/forgot-password" className="text-muted text-xs underline-offset-4 hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      )}

      {mode === "magic" && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await sendMagicLink({ email, next });
              if (r.ok) setNotice(r.message);
              else toast.error(r.message);
            });
          }}
        >
          <div>
            <Label htmlFor="magic-email">Email</Label>
            <Input id="magic-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Sending…" : "Email me a sign-in link"}
          </Button>
        </form>
      )}

      {mode === "phone" && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              if (!otpSent) {
                const r = await sendPhoneOtp({ phone });
                if (r.ok) {
                  setOtpSent(true);
                  setNotice(r.message);
                } else toast.error(r.message);
              } else {
                const r = await verifyPhoneOtp({ phone, token: otp, next });
                if (r.ok && r.redirect) {
                  router.push(r.redirect);
                  router.refresh();
                } else toast.error(r.message);
              }
            });
          }}
        >
          <div>
            <Label htmlFor="phone">Mobile number</Label>
            <div className="flex">
              <span className="border-border-strong bg-surface-muted text-muted inline-flex h-11 items-center rounded-l-md border border-r-0 px-3 text-sm">
                +91
              </span>
              <Input
                id="phone"
                inputMode="numeric"
                maxLength={10}
                autoComplete="tel-national"
                className="rounded-l-none"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                disabled={otpSent}
              />
            </div>
          </div>
          {otpSent && (
            <div>
              <Label htmlFor="otp">6-digit code</Label>
              <Input
                id="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              />
            </div>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Please wait…" : otpSent ? "Verify & sign in" : "Send code"}
          </Button>
        </form>
      )}

      <p className="text-muted mt-8 text-center text-sm">
        New to seicase?{" "}
        <Link
          href={`/signup${next !== "/account" ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="text-foreground underline underline-offset-4"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}

/** Admin panel sign-in: email + password only (no Google, email link or phone). */
export function AdminLoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next") ?? "/admin";
  const [pending, start] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <div>
      <h1 className="text-4xl md:text-5xl">Admin sign in</h1>
      <p className="text-muted mt-2">For seicase staff only.</p>
      <form
        className="mt-8 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await signInAdmin({ email, password, next });
            if (r.ok && r.redirect) {
              router.push(r.redirect);
              router.refresh();
            } else toast.error(r.message);
          });
        }}
      >
        <div>
          <Label htmlFor="admin-email">Email</Label>
          <Input id="admin-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <Label htmlFor="admin-password">Password</Label>
            <Link href="/forgot-password" className="text-muted text-xs underline-offset-4 hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}

export function SignupForm() {
  const router = useRouter();
  const next = useSearchParams().get("next") ?? "/account";
  const [pending, start] = useTransition();
  const [form, setForm] = useState({ full_name: "", email: "", password: "", marketing: true });
  const [done, setDone] = useState<string | null>(null);
  if (done) {
    return (
      <div>
        <h1 className="text-4xl">Check your inbox</h1>
        <p className="text-muted mt-3">{done}</p>
      </div>
    );
  }
  return (
    <div>
      <h1 className="text-4xl md:text-5xl">Create your account</h1>
      <p className="text-muted mt-2">Join seicase for faster checkout, order tracking and 10% off your first order.</p>
      <div className="mt-8">
        <GoogleButton next={next} />
      </div>
      <Divider />
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await signUp(form);
            if (!r.ok) return void toast.error(r.message);
            if (r.redirect) {
              router.push(r.redirect);
              router.refresh();
            } else setDone(r.message);
          });
        }}
      >
        <div>
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            autoComplete="name"
            required
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="su-email">Email</Label>
          <Input
            id="su-email"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="su-password">Password</Label>
          <Input
            id="su-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            aria-describedby="pw-hint"
          />
          <p id="pw-hint" className="text-muted mt-1 text-xs">
            At least 8 characters.
          </p>
        </div>
        <label className="flex items-center gap-3 text-sm">
          <Checkbox checked={form.marketing} onChange={(e) => setForm({ ...form, marketing: e.target.checked })} /> Send me new arrivals and
          offers
        </label>
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </form>
      <p className="text-muted mt-8 text-center text-sm">
        Already have an account?{" "}
        <Link href="/login" className="text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div>
      <h1 className="text-4xl md:text-5xl">Reset password</h1>
      <p className="text-muted mt-2">Enter your email and we&apos;ll send you a link to choose a new password.</p>
      {msg ? (
        <p className="bg-surface-muted mt-6 rounded-lg p-4 text-sm" role="status">
          {msg}
        </p>
      ) : (
        <form
          className="mt-8 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await requestPasswordReset({ email });
              if (r.ok) setMsg(r.message);
              else toast.error(r.message);
            });
          }}
        >
          <div>
            <Label htmlFor="fp-email">Email</Label>
            <Input id="fp-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            Send reset link
          </Button>
        </form>
      )}
      <p className="mt-8 text-center text-sm">
        <Link href="/login" className="underline underline-offset-4">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [pending, start] = useTransition();
  return (
    <div>
      <h1 className="text-4xl md:text-5xl">Choose a new password</h1>
      <form
        className="mt-8 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await updatePassword({ password });
            if (r.ok) {
              toast.success(r.message);
              router.push(r.redirect ?? "/account");
            } else toast.error(r.message);
          });
        }}
      >
        <div>
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          Update password
        </Button>
      </form>
    </div>
  );
}
