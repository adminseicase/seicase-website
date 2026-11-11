"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { subscribeNewsletter } from "@/lib/actions/public";
import { track } from "@/lib/analytics/client";
import { cn } from "@/lib/utils";

export function NewsletterForm({ source = "footer", className, compact }: { source?: string; className?: string; compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const id = `newsletter-${source}`;

  return (
    <form
      className={cn("w-full", className)}
      onSubmit={(e) => {
        e.preventDefault();
        const company = (e.currentTarget.elements.namedItem("company") as HTMLInputElement | null)?.value;
        start(async () => {
          const res = await subscribeNewsletter({ email, source, company });
          if (res.ok) {
            setDone(true);
            setEmail("");
            track("newsletter_signup", { metadata: { source } });
            toast.success(res.message);
          } else toast.error(res.message);
        });
      }}
    >
      <label htmlFor={id} className="sr-only">
        Email address
      </label>
      {/* Honeypot: hidden from people, irresistible to bots */}
      <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <div
        className={cn(
          "border-border-strong bg-surface focus-within:border-cognac flex overflow-hidden rounded-md border",
          compact ? "h-11" : "h-12",
        )}
      >
        <input
          id={id}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={done ? "You're on the list ✓" : "Your email address"}
          autoComplete="email"
          className="placeholder:text-muted min-w-0 flex-1 bg-transparent px-4 text-sm focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="bg-foreground text-background hover:bg-brown inline-flex shrink-0 items-center gap-2 px-5 text-sm font-medium transition-colors disabled:opacity-60"
        >
          {pending ? "Joining…" : "Subscribe"}
          {!compact && <ArrowRight className="hidden size-4 stroke-[1.5] sm:block" aria-hidden="true" />}
        </button>
      </div>
    </form>
  );
}
