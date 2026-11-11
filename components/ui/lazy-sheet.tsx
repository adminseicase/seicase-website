"use client";

import dynamic from "next/dynamic";

/**
 * Storefront pages load the dialog primitives only when a modal/drawer is
 * actually opened (they are rendered conditionally by the caller).
 */
export const LazyModal = dynamic(() => import("./sheet").then((m) => m.Modal), { ssr: false });
export const LazySheet = dynamic(() => import("./sheet").then((m) => m.Sheet), { ssr: false });
