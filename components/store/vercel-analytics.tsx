"use client";

import { useEffect } from "react";

/** Loads Vercel Web Analytics' script (no npm dependency) when enabled. */
export function VercelAnalytics() {
  useEffect(() => {
    const w = window as unknown as { va?: (...a: unknown[]) => void; vaq?: unknown[] };
    w.va = w.va || ((...a: unknown[]) => (w.vaq = w.vaq || []).push(a));
    const s = document.createElement("script");
    s.src = "/_vercel/insights/script.js";
    s.defer = true;
    document.head.appendChild(s);
  }, []);
  return null;
}
