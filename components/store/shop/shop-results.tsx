import Link from "next/link";
import { filterProducts, getAllProducts, getCategories, getStyles, toCard } from "@/lib/data/catalog";
import { PAGE_SIZE, parseShopParams } from "@/lib/shop-params";
import { ProductCard } from "../product-card";
import { ShopFilters } from "./shop-filters";
import { Skeleton } from "@/components/ui/skeleton";

type SP = Record<string, string | string[] | undefined>;

/**
 * Product grid for /shop, /shop/[category], /style/[style] and /search.
 * Reads search params (request-time) and filters the cached catalogue.
 */
export async function ShopResults({
  searchParams,
  basePath,
  fixed,
}: {
  searchParams: Promise<SP>;
  basePath: string;
  fixed: { categorySlug?: string; styleSlug?: string; newIn?: boolean; q?: string };
}) {
  const sp = await searchParams;
  const f = parseShopParams(sp);
  const [all, categories, styles] = await Promise.all([getAllProducts(), getCategories(), getStyles()]);
  const categorySlug = fixed.categorySlug ?? f.categoryParam;
  const styleSlug = fixed.styleSlug ?? f.styleParam;
  const categoryId = categories.find((c) => c.slug === categorySlug)?.id;
  const styleId = styles.find((s) => s.slug === styleSlug)?.id;
  const q = fixed.q ?? f.q;

  const results = filterProducts(all, { ...f, q, newIn: fixed.newIn }, { categoryId, styleId });
  const visible = results.slice(0, f.page * PAGE_SIZE);

  // Facet options come from the whole (unfiltered) scope so choices don't vanish
  const scope = filterProducts(
    all,
    { newIn: fixed.newIn, q },
    { categoryId: fixed.categorySlug ? categoryId : undefined, styleId: fixed.styleSlug ? styleId : undefined },
  );
  const colourMap = new Map<string, string>();
  scope.forEach((p) => p.colours.forEach((c) => colourMap.set(c.name, c.hex)));
  const materials = ["Full-grain", "Vegetable-tanned", "Nappa", "Pebbled", "Woven", "Crazy-horse"].filter((m) =>
    scope.some((p) => (p.material ?? "").toLowerCase().includes(m.toLowerCase())),
  );
  const prices = scope.map((p) => p.price);

  const nextParams = new URLSearchParams();
  Object.entries(sp).forEach(([k, v]) => typeof v === "string" && nextParams.set(k, v));
  nextParams.set("page", String(f.page + 1));

  return (
    <ShopFilters
      total={results.length}
      colours={[...colourMap].map(([name, hex]) => ({ name, hex }))}
      materials={materials}
      priceBounds={[prices.length ? Math.min(...prices) : 0, prices.length ? Math.max(...prices) : 0]}
      categories={fixed.categorySlug ? [] : categories.map((c) => ({ label: c.name, value: c.slug }))}
      styles={fixed.styleSlug ? [] : styles.map((s) => ({ label: s.name, value: s.slug }))}
    >
      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <p className="font-serif text-2xl">Nothing matches those filters</p>
          <p className="text-muted mt-2 text-sm">Try removing a filter or two.</p>
          <Link
            href={basePath}
            className="border-foreground hover:bg-foreground hover:text-background mt-5 inline-flex h-11 items-center rounded-md border px-5 text-sm"
          >
            Clear all filters
          </Link>
        </div>
      ) : (
        <>
          <h2 className="sr-only">Products</h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-5 xl:grid-cols-4">
            {visible.map((p, i) => (
              <li key={p.id}>
                <ProductCard
                  product={toCard(p)}
                  priority={i < 2}
                  showRating
                  sizes="(max-width: 768px) 46vw, (max-width: 1280px) 30vw, 22vw"
                />
              </li>
            ))}
          </ul>
        </>
      )}
      {visible.length < results.length && (
        <div className="mt-12 flex flex-col items-center gap-3">
          <p className="text-muted text-sm">
            Showing {visible.length} of {results.length}
          </p>
          <Link
            href={`${basePath}?${nextParams.toString()}`}
            scroll={false}
            className="border-foreground hover:bg-foreground hover:text-background inline-flex h-12 items-center rounded-md border px-8 text-sm"
          >
            Load more
          </Link>
        </div>
      )}
    </ShopFilters>
  );
}

export function ShopResultsSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[240px_1fr]" aria-busy="true" aria-label="Loading products">
      <div className="hidden space-y-4 lg:block">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <li key={i}>
            <Skeleton className="aspect-[4/5] rounded-xl" />
            <Skeleton className="mt-3 h-5 w-3/4" />
            <Skeleton className="mt-2 h-4 w-1/3" />
          </li>
        ))}
      </ul>
    </div>
  );
}
