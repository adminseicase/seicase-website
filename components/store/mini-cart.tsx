"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, LazyMotion, domAnimation, m } from "framer-motion";
import { ArrowRight, ShoppingBag, Trash } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cartSubtotal, lineTotal, useCart } from "@/lib/store/cart";
import { useUi } from "@/lib/store/ui";
import { track } from "@/lib/analytics/client";
import { BLUR_DATA_URL, formatINR } from "@/lib/utils";
import { FreeShippingBar } from "./free-shipping-bar";
import { QuantityStepper } from "./quantity-stepper";

/** Slide-in bag drawer. Loaded on demand (and Framer Motion with it). */
export function MiniCart() {
  const { miniCartOpen, setMiniCart, lastAdded } = useUi();
  const lines = useCart((s) => s.lines);
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  const subtotal = cartSubtotal(lines);

  return (
    <Sheet
      open={miniCartOpen}
      onOpenChange={setMiniCart}
      title={lastAdded ? "Added to your bag" : `Your Bag (${lines.reduce((s, l) => s + l.quantity, 0)})`}
      description="Items in your shopping bag"
    >
      <LazyMotion features={domAnimation}>
        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <ShoppingBag className="size-10 stroke-1 text-muted" aria-hidden="true" />
            <p className="font-serif text-2xl">Your bag is empty</p>
            <p className="text-sm text-muted">Find something you&apos;ll love to carry.</p>
            <Button asChild onClick={() => setMiniCart(false)}>
              <Link href="/shop">
                Explore Collection <ArrowRight />
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="px-5 pt-4">
              <FreeShippingBar subtotal={subtotal} />
            </div>
            <ul className="flex-1 space-y-1 overflow-y-auto px-5 py-3" aria-label="Bag items">
              <AnimatePresence initial={false}>
                {lines.map((l) => (
                  <m.li
                    key={l.key}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 24 }}
                    transition={{ duration: 0.25 }}
                    className={`flex gap-4 border-b py-4 last:border-0 ${lastAdded?.key === l.key ? "rounded-lg" : ""}`}
                  >
                    <Link href={`/product/${l.slug}`} onClick={() => setMiniCart(false)} className="shrink-0">
                      <Image
                        src={l.image || "/images/placeholder.webp"}
                        alt={l.name}
                        width={88}
                        height={110}
                        className="h-[110px] w-[88px] rounded-md bg-surface-muted object-cover"
                        placeholder="blur"
                        blurDataURL={BLUR_DATA_URL}
                      />
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link href={`/product/${l.slug}`} onClick={() => setMiniCart(false)} className="font-serif text-lg leading-tight hover:text-cognac">
                            {l.name}
                          </Link>
                          <p className="text-xs text-muted">{l.colour}</p>
                          {l.charm && <p className="text-xs text-muted">+ {l.charm.name} ({formatINR(l.charm.price)})</p>}
                        </div>
                        <button
                          type="button"
                          className="-mr-2 -mt-1 inline-flex size-9 items-center justify-center rounded-full text-muted hover:bg-surface-muted hover:text-foreground"
                          aria-label={`Remove ${l.name}`}
                          onClick={() => {
                            remove(l.key);
                            track("remove_from_cart", { product_id: l.productId, value: lineTotal(l) });
                          }}
                        >
                          <Trash className="size-4 stroke-[1.5]" />
                        </button>
                      </div>
                      <div className="mt-auto flex items-end justify-between pt-2">
                        <QuantityStepper size="sm" value={l.quantity} onChange={(q) => setQuantity(l.key, q)} label={`Quantity for ${l.name}`} />
                        <p className="text-sm font-medium">{formatINR(lineTotal(l))}</p>
                      </div>
                    </div>
                  </m.li>
                ))}
              </AnimatePresence>
            </ul>
            <div className="space-y-3 border-t bg-surface px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Subtotal</span>
                <span className="text-lg font-medium">{formatINR(subtotal)}</span>
              </div>
              <p className="text-xs text-muted">Taxes included. Shipping and discounts calculated at checkout.</p>
              <Button asChild size="lg" className="w-full">
                <Link href="/cart" onClick={() => setMiniCart(false)}>
                  View Cart <ArrowRight />
                </Link>
              </Button>
              <Button variant="secondary" size="lg" className="w-full" onClick={() => setMiniCart(false)}>
                Continue Shopping
              </Button>
            </div>
          </>
        )}
      </LazyMotion>
    </Sheet>
  );
}
