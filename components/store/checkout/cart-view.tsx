"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Heart, Lock, ShoppingBag, Trash } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cartSubtotal, lineTotal, useCart } from "@/lib/store/cart";
import { useWishlist } from "@/lib/store/wishlist";
import { useHydrated } from "@/lib/store/ui";
import { track } from "@/lib/analytics/client";
import { BLUR_DATA_URL, formatINR } from "@/lib/utils";
import { QuantityStepper } from "../quantity-stepper";
import { FreeShippingBar } from "../free-shipping-bar";
import { CouponField, Totals } from "./order-summary";
import { useQuote } from "./use-quote";

export function CartView() {
  const hydrated = useHydrated();
  const { lines, setQuantity, remove, couponCode, setCoupon, replaceLines } = useCart();
  const toggleWish = useWishlist((s) => s.toggle);
  const hasWish = useWishlist((s) => s.has);
  const { quote, loading } = useQuote(lines, { couponCode, enabled: hydrated });

  // Keep displayed prices in sync with the server
  useEffect(() => {
    if (!quote) return;
    const changed = lines.some((l) => quote.prices[l.variantId] !== undefined && quote.prices[l.variantId] !== l.price);
    if (changed) {
      replaceLines(lines.map((l) => (quote.prices[l.variantId] !== undefined ? { ...l, price: quote.prices[l.variantId] } : l)));
      toast.message("Some prices in your bag were updated.");
    }
  }, [quote, lines, replaceLines]);

  if (!hydrated) {
    return (
      <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (!lines.length) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <ShoppingBag className="size-12 stroke-1 text-muted" aria-hidden="true" />
        <h2 className="text-3xl">Your bag is empty</h2>
        <p className="text-muted">Discover pieces made to be carried every day.</p>
        <Button asChild size="lg">
          <Link href="/shop">
            Explore Collection <ArrowRight />
          </Link>
        </Button>
      </div>
    );
  }

  const subtotal = cartSubtotal(lines);
  const blocked = (quote?.unavailable.length ?? 0) > 0;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px] lg:gap-14">
      <section aria-label="Items in your bag">
        <ul className="divide-y border-y">
          {lines.map((l) => {
            const unavailable = quote?.unavailable.includes(l.variantId);
            return (
              <li key={l.key} className="flex gap-4 py-5 md:gap-6">
                <Link href={`/product/${l.slug}`} className="shrink-0">
                  <Image src={l.image || "/images/placeholder.webp"} alt={l.name} width={120} height={150} className="h-[125px] w-[100px] rounded-lg bg-surface-muted object-cover md:h-[150px] md:w-[120px]" placeholder="blur" blurDataURL={BLUR_DATA_URL} />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link href={`/product/${l.slug}`} className="font-serif text-xl leading-tight hover:text-cognac md:text-2xl">
                        {l.name}
                      </Link>
                      <p className="mt-0.5 text-sm text-muted">{l.colour}</p>
                      {l.charm && <p className="text-sm text-muted">+ {l.charm.name} ({formatINR(l.charm.price)})</p>}
                      <p className="mt-1 text-sm">{formatINR(l.price)}</p>
                      {unavailable && <p className="mt-1 text-sm text-danger">Not enough stock — please reduce the quantity or remove.</p>}
                    </div>
                    <p className="hidden font-medium sm:block">{formatINR(lineTotal(l))}</p>
                  </div>
                  <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-3">
                    <QuantityStepper size="sm" value={l.quantity} onChange={(q) => setQuantity(l.key, q)} label={`Quantity for ${l.name}`} />
                    <button
                      type="button"
                      className="inline-flex h-9 items-center gap-1.5 text-sm text-muted hover:text-foreground"
                      onClick={() => {
                        if (!hasWish(l.productId)) toggleWish({ productId: l.productId, slug: l.slug, name: l.name, price: l.price, image: l.image, variantId: l.variantId });
                        remove(l.key);
                        track("add_to_wishlist", { product_id: l.productId, value: l.price });
                        toast.success("Moved to your wishlist");
                      }}
                    >
                      <Heart className="size-4 stroke-[1.5]" /> Move to wishlist
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-9 items-center gap-1.5 text-sm text-muted hover:text-danger"
                      onClick={() => {
                        remove(l.key);
                        track("remove_from_cart", { product_id: l.productId, value: lineTotal(l) });
                      }}
                    >
                      <Trash className="size-4 stroke-[1.5]" /> Remove
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <Link href="/shop" className="mt-6 inline-flex items-center gap-2 text-sm underline underline-offset-4">
          Continue Shopping
        </Link>
      </section>

      <aside className="h-fit space-y-5 rounded-2xl border bg-surface p-6 lg:sticky lg:top-24" aria-label="Order summary">
        <h2 className="text-2xl">Order Summary</h2>
        <FreeShippingBar subtotal={quote ? quote.subtotal - quote.discount : subtotal} />
        <CouponField code={couponCode} onApply={setCoupon} quote={quote} />
        <Totals quote={quote} loading={loading} fallbackSubtotal={subtotal} />
        <Button asChild size="lg" className="w-full" aria-disabled={blocked}>
          <Link href={blocked ? "#" : "/checkout"} onClick={(e) => blocked && e.preventDefault()}>
            Proceed to Checkout <ArrowRight />
          </Link>
        </Button>
        <p className="flex items-center justify-center gap-2 text-xs text-muted">
          <Lock className="size-3.5" aria-hidden="true" /> Secure checkout · UPI, cards, netbanking & COD
        </p>
      </aside>
    </div>
  );
}
