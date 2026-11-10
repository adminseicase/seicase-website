"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ShoppingBag, Star, Truck, Sparkles, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import type { Charm, ProductDetail } from "@/lib/types";
import { useCart } from "@/lib/store/cart";
import { useUi } from "@/lib/store/ui";
import { track } from "@/lib/analytics/client";
import { BLUR_DATA_URL, cn, formatINR } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LeatherIcon } from "../icons";
import { WishlistButton } from "../wishlist-button";
import { QuantityStepper } from "../quantity-stepper";
import { ProductGallery } from "./product-gallery";
import { PincodeChecker } from "./pincode-checker";
import { rememberViewed } from "./recently-viewed";

/**
 * Interactive part of the product page: gallery, colour selection, charm
 * add-on, quantity and Add to Bag. Variant changes swap the gallery and SKU
 * and are reflected in the URL (?colour=tan) without a navigation.
 */
export function ProductView({ product, charms, children }: { product: ProductDetail; charms: Charm[]; children?: React.ReactNode }) {
  const variants = product.variants;
  const initial = variants.find((v) => v.is_default) ?? variants[0];
  const [variantId, setVariantId] = useState(initial?.id);
  const [qty, setQty] = useState(1);
  const [charmId, setCharmId] = useState<string | null>(null);
  const variant = variants.find((v) => v.id === variantId) ?? variants[0];
  const charm = charms.find((c) => c.id === charmId) ?? null;
  const add = useCart((s) => s.add);
  const openMiniCart = useUi((s) => s.openMiniCart);
  const buyRef = useRef<HTMLDivElement>(null);
  const [showSticky, setShowSticky] = useState(false);

  const price = Number(variant?.price_override ?? product.price);
  const onSale = product.compare_at_price != null && product.compare_at_price > price;
  const soldOut = !variant || variant.stock <= 0;
  const lowStock = !soldOut && variant.stock <= product.low_stock_threshold;
  const images = useMemo(() => {
    const g = product.images.filter((i) => i.kind === "gallery");
    const forVariant = g.filter((i) => i.variant_id === variant?.id || i.variant_id === null);
    return (forVariant.length ? forVariant : g).sort((a, b) => a.sort_order - b.sort_order);
  }, [product.images, variant?.id]);

  // Honour ?colour=olive links after hydration (keeps server and client HTML identical)
  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get("colour");
    const v = variants.find((x) => x.colour_name.toLowerCase().replace(/\s+/g, "-") === c);
    if (v) setVariantId(v.id);
  }, [variants]);

  useEffect(() => {
    track("product_view", { product_id: product.id, value: product.price });
    rememberViewed({ id: product.id, slug: product.slug, name: product.name, price: product.price, image: product.images.find((i) => i.is_primary)?.url ?? product.images[0]?.url ?? null });
  }, [product]);

  // Sticky mobile "Add to Bag" appears once the main button scrolls away
  useEffect(() => {
    const el = buyRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShowSticky(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const selectVariant = (id: string) => {
    setVariantId(id);
    const v = variants.find((x) => x.id === id);
    if (v) {
      const url = new URL(window.location.href);
      url.searchParams.set("colour", v.colour_name.toLowerCase().replace(/\s+/g, "-"));
      window.history.replaceState(window.history.state, "", url);
    }
  };

  const addToBag = () => {
    if (!variant || soldOut) return;
    const line = {
      productId: product.id,
      variantId: variant.id,
      slug: product.slug,
      name: product.name,
      colour: variant.colour_name,
      image: images[0]?.url ?? null,
      price,
      charm: charm ? { id: charm.id, name: charm.name, price: Number(charm.price), image: charm.image_url } : null,
    };
    add(line, qty);
    track("add_to_cart", { product_id: product.id, value: (price + (charm?.price ?? 0)) * qty, metadata: { variant: variant.sku, charm: charm?.slug } });
    openMiniCart({ ...line, key: `${variant.id}${charm ? `+${charm.id}` : ""}`, quantity: qty });
    if (qty > variant.stock) toast.message(`Only ${variant.stock} available — we'll confirm at checkout.`);
  };

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
        <ProductGallery images={images} name={product.name} key={variant?.id} />

        <div className="lg:pt-2">
          <h1 className="text-4xl leading-tight md:text-5xl">{product.name}</h1>
          <div className="mt-3 flex items-baseline gap-3">
            <p className="text-2xl">{formatINR(price)}</p>
            {onSale && (
              <>
                <p className="text-muted line-through">{formatINR(product.compare_at_price)}</p>
                <span className="rounded-full bg-burgundy px-2 py-0.5 text-xs text-white">
                  Save {Math.round(((product.compare_at_price! - price) / product.compare_at_price!) * 100)}%
                </span>
              </>
            )}
          </div>
          <p className="mt-1 text-xs text-muted">Inclusive of all taxes</p>
          {product.rating_count > 0 && (
            <a href="#reviews" className="mt-3 inline-flex items-center gap-2 text-sm hover:text-cognac">
              <span className="flex" aria-hidden="true">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} className={cn("size-3.5", i < Math.round(product.rating_avg) ? "fill-foreground stroke-foreground" : "stroke-muted")} />
                ))}
              </span>
              <span>
                {product.rating_avg.toFixed(1)} <span className="text-muted">({product.rating_count} reviews)</span>
              </span>
            </a>
          )}
          {product.short_description && <p className="mt-5 max-w-md leading-relaxed text-foreground/85">{product.short_description}</p>}

          <fieldset className="mt-7">
            <legend className="mb-3 text-sm">
              Colour: <span className="text-muted">{variant?.colour_name}</span>
            </legend>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Colour">
              {variants.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  role="radio"
                  aria-checked={v.id === variant?.id}
                  aria-label={`${v.colour_name}${v.stock <= 0 ? " (sold out)" : ""}`}
                  title={v.colour_name}
                  onClick={() => selectVariant(v.id)}
                  className={cn(
                    "relative inline-flex size-11 items-center justify-center rounded-full border-2 transition-colors",
                    v.id === variant?.id ? "border-foreground" : "border-transparent hover:border-border-strong",
                  )}
                >
                  <span className="size-8 rounded-full border border-black/10" style={{ background: v.colour_hex }} />
                  {v.stock <= 0 && <span className="absolute h-px w-9 rotate-45 bg-foreground/60" aria-hidden="true" />}
                </button>
              ))}
            </div>
          </fieldset>

          {charms.length > 0 && (
            <fieldset className="mt-7 rounded-xl border bg-surface/70 p-4">
              <legend className="sr-only">Make it yours with a charm</legend>
              <div className="mb-3 flex items-baseline justify-between">
                <p className="font-serif text-xl">Make It Yours</p>
                <p className="text-xs text-muted">Add a charm for a personal touch</p>
              </div>
              <div className="scrollbar-none flex gap-2 overflow-x-auto" role="radiogroup" aria-label="Charm">
                {charms.filter((c) => c.is_active).map((c) => {
                  const on = c.id === charmId;
                  const out = c.stock <= 0;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      disabled={out}
                      onClick={() => setCharmId(on ? null : c.id)}
                      className={cn(
                        "relative w-[84px] shrink-0 rounded-lg border p-1.5 text-left transition-colors disabled:opacity-40",
                        on ? "border-foreground bg-surface" : "border-transparent hover:border-border-strong",
                      )}
                    >
                      <Image src={c.image_url || "/images/placeholder.webp"} alt="" width={80} height={80} className="aspect-square w-full rounded-md object-cover" placeholder="blur" blurDataURL={BLUR_DATA_URL} />
                      <span className="mt-1 block truncate text-[11px]">{c.name.replace(" Charm", "")}</span>
                      <span className="block text-[11px] text-muted">+{formatINR(c.price)}</span>
                      <span className={cn("absolute right-1 top-1 inline-flex size-5 items-center justify-center rounded-full bg-foreground text-background", !on && "hidden")}>
                        <Check className="size-3" />
                      </span>
                    </button>
                  );
                })}
              </div>
              {charm && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                  <Plus className="size-3" /> {charm.name} will be attached to your bag
                </p>
              )}
            </fieldset>
          )}

          <div className="mt-6" aria-live="polite">
            {soldOut ? (
              <p className="text-sm text-danger">This colour is sold out. Choose another colour or save it to your wishlist.</p>
            ) : lowStock ? (
              <p className="text-sm text-burgundy">Only {variant.stock} left — order soon.</p>
            ) : (
              <p className="flex items-center gap-2 text-sm text-success">
                <span className="size-2 rounded-full bg-success" aria-hidden="true" /> In stock, ready to ship
              </p>
            )}
          </div>

          <div ref={buyRef} className="mt-4 flex items-center gap-3">
            <QuantityStepper value={qty} onChange={setQty} max={Math.max(1, Math.min(10, variant?.stock ?? 1))} />
            <Button size="lg" className="h-12 flex-1" onClick={addToBag} disabled={soldOut}>
              <ShoppingBag /> {soldOut ? "Sold Out" : `Add to Bag${charm ? " + Charm" : ""}`}
            </Button>
            <WishlistButton
              variant="outline"
              product={{ id: product.id, slug: product.slug, name: product.name, price, image: images[0]?.url ?? null, variantId: variant?.id }}
            />
          </div>
          {variant && <p className="mt-3 text-xs text-muted">SKU: {variant.sku}</p>}

          <ul className="mt-7 grid grid-cols-3 gap-2 border-y py-5 text-center text-xs">
            <li className="flex flex-col items-center gap-2">
              <LeatherIcon className="size-6 text-brown" />
              Premium
              <br />
              Leather
            </li>
            <li className="flex flex-col items-center gap-2">
              <Sparkles className="size-6 stroke-[1.25] text-brown" aria-hidden="true" />
              Thoughtful
              <br />
              Design
            </li>
            <li className="flex flex-col items-center gap-2">
              <Truck className="size-6 stroke-[1.25] text-brown" aria-hidden="true" />
              Free Shipping
              <br />
              Across India
            </li>
          </ul>

          <PincodeChecker />
          {children}
        </div>
      </div>

      {/* Sticky Add to Bag for phones */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 border-t bg-surface/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur transition-transform duration-300 lg:hidden",
          showSticky ? "translate-y-0" : "translate-y-full",
        )}
        aria-hidden={!showSticky}
        inert={!showSticky}
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-serif text-lg leading-tight">{product.name}</p>
            <p className="text-sm text-muted">
              {variant?.colour_name} · {formatINR(price + (charm?.price ?? 0))}
            </p>
          </div>
          <Button size="lg" onClick={addToBag} disabled={soldOut}>
            <ShoppingBag /> {soldOut ? "Sold Out" : "Add to Bag"}
          </Button>
        </div>
      </div>
    </>
  );
}
