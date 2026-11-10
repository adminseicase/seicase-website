"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics/client";

/** Logs full-page searches (the count is read from the rendered grid). */
export function SearchTracker({ q }: { q: string }) {
  useEffect(() => {
    if (!q) return;
    const t = setTimeout(() => {
      const count = document.querySelectorAll("main article").length;
      track("search", { search_query: q, results_count: count, metadata: { source: "results_page" } });
    }, 800);
    return () => clearTimeout(t);
  }, [q]);
  return null;
}
