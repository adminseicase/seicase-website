import type { ShopFilters, SortKey } from "@/lib/data/catalog";

export const PAGE_SIZE = 24;
const SORTS: SortKey[] = ["featured", "newest", "price-asc", "price-desc", "best-selling"];

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const list = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v.join(",") : (v ?? ""))
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);

/** Turns URL search params into typed shop filters (shareable, indexable URLs). */
export function parseShopParams(sp: SP): ShopFilters & { page: number; categoryParam?: string; styleParam?: string } {
  const num = (v: string | undefined) => (v && /^\d+$/.test(v) ? Number(v) : undefined);
  const sort = one(sp.sort) as SortKey | undefined;
  return {
    colours: list(sp.colour),
    materials: list(sp.material),
    min: num(one(sp.min)),
    max: num(one(sp.max)),
    availability: one(sp.availability) === "in-stock" ? "in-stock" : "all",
    sort: sort && SORTS.includes(sort) ? sort : "featured",
    q: one(sp.q)?.slice(0, 80),
    page: Math.max(1, Math.min(50, num(one(sp.page)) ?? 1)),
    categoryParam: one(sp.category),
    styleParam: one(sp.style),
  };
}
