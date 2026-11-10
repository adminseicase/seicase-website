"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/analytics/client";

/** Sends a page_view on every client-side navigation. Rendered inside <Suspense>. */
export function PageTracker() {
  const pathname = usePathname();
  useEffect(() => {
    // Defer until the browser is idle so tracking never competes with rendering.
    const run = () => track("page_view");
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(run, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const t = setTimeout(run, 1200);
    return () => clearTimeout(t);
  }, [pathname]);
  return null;
}
