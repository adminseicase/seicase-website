"use client";

import { ArrowUp } from "lucide-react";

export function BackToTop() {
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}
      className="ml-2 inline-flex size-10 items-center justify-center rounded-full bg-foreground text-background hover:bg-brown"
      aria-label="Back to top"
    >
      <ArrowUp className="size-4 stroke-[1.5]" />
    </button>
  );
}
