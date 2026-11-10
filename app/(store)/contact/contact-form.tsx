"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowRight, CircleCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Textarea } from "@/components/ui/input";
import { submitContact } from "@/lib/actions/public";
import { track } from "@/lib/analytics/client";
import { useStoreConfig } from "@/components/store/store-config";

declare global {
  interface Window {
    turnstile?: { render: (el: HTMLElement, opts: { sitekey: string; callback: (t: string) => void }) => string; reset: (id?: string) => void };
  }
}

/** Contact form: honeypot + server rate limit + optional Cloudflare Turnstile. */
export function ContactForm() {
  const { turnstileSiteKey } = useStoreConfig();
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "", website: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<string | null>(null);
  const [token, setToken] = useState<string>("");
  const [pending, start] = useTransition();
  const widget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!turnstileSiteKey || !widget.current) return;
    const render = () => window.turnstile?.render(widget.current!, { sitekey: turnstileSiteKey, callback: setToken });
    if (window.turnstile) return void render();
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    s.async = true;
    s.onload = render;
    document.head.appendChild(s);
  }, [turnstileSiteKey]);

  if (done) {
    return (
      <div className="flex h-full flex-col items-center justify-center py-12 text-center" role="status">
        <CircleCheck className="size-12 stroke-1 text-success" aria-hidden="true" />
        <p className="mt-4 font-serif text-3xl">Message sent</p>
        <p className="mt-2 text-muted">{done}</p>
      </div>
    );
  }

  const f = (k: keyof typeof form, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <Label htmlFor={`c-${k}`}>{label}</Label>
      <Input id={`c-${k}`} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} aria-invalid={!!errors[k]} {...props} />
      <FieldError message={errors[k]} />
    </div>
  );

  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await submitContact({ ...form, turnstileToken: token });
          if (r.ok) {
            track("contact_submit");
            setDone(r.message);
          } else {
            setErrors(r.fieldErrors ?? {});
            toast.error(r.message);
          }
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {f("name", "Name *", { autoComplete: "name", required: true })}
        {f("email", "Email *", { type: "email", autoComplete: "email", required: true })}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {f("phone", "Phone", { inputMode: "tel", autoComplete: "tel" })}
        {f("subject", "Subject")}
      </div>
      <div>
        <Label htmlFor="c-message">Your message *</Label>
        <Textarea id="c-message" rows={6} required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} aria-invalid={!!errors.message} />
        <FieldError message={errors.message} />
      </div>
      {/* Honeypot */}
      <input type="text" name="website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {turnstileSiteKey && <div ref={widget} />}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Sending…" : "Send Message"} <ArrowRight />
      </Button>
    </form>
  );
}
