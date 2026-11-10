import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import type { ProductCardData } from "@/lib/types";
import { BLUR_DATA_URL, cn, formatINR } from "@/lib/utils";
import { WishlistButton } from "./wishlist-button";

/** Product tile used in grids and carousels. Server-rendered; only the heart is interactive. */
export function ProductCard({
  product,
  priority = false,
  sizes = "(max-width: 640px) 46vw, (max-width: 1024px) 31vw, 23vw",
  className,
  showRating = false,
}: {
  product: ProductCardData;
  priority?: boolean;
  sizes?: string;
  className?: string;
  showRating?: boolean;
}) {
  const onSale = product.compare_at_price != null && product.compare_at_price > product.price;
  return (
    <article className={cn("group relative", className)}>
      <Link href={`/product/${product.slug}`} className="block" prefetch={false}>
        <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-surface-muted">
          <Image
            src={product.image || "/images/placeholder.webp"}
            alt={product.image_alt}
            fill
            sizes={sizes}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
          {product.hover_image && (
            <Image
              src={product.hover_image}
              alt=""
              fill
              sizes={sizes}
              loading="lazy"
              className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100 max-md:hidden"
            />
          )}
          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            {product.is_new && <span className="rounded-full bg-surface/90 px-2.5 py-1 text-[11px] uppercase tracking-wider">New</span>}
            {onSale && <span className="rounded-full bg-burgundy px-2.5 py-1 text-[11px] uppercase tracking-wider text-white">Sale</span>}
            {!product.in_stock && <span className="rounded-full bg-foreground/80 px-2.5 py-1 text-[11px] uppercase tracking-wider text-background">Sold out</span>}
          </div>
        </div>
        <div className="mt-3 space-y-1 px-0.5">
          <h3 className="font-serif text-lg leading-tight md:text-xl">{product.name}</h3>
          <p className="flex items-baseline gap-2 text-sm">
            <span>{formatINR(product.price)}</span>
            {onSale && <span className="text-muted line-through">{formatINR(product.compare_at_price)}</span>}
          </p>
          {showRating && product.rating_count > 0 && (
            <p className="flex items-center gap-1 text-xs text-muted">
              <Star className="size-3 fill-foreground stroke-foreground" aria-hidden="true" />
              {product.rating_avg.toFixed(1)} <span>({product.rating_count})</span>
            </p>
          )}
          {product.colours.length > 1 && (
            <ul className="flex items-center gap-1.5 pt-1" aria-label={`Available in ${product.colours.map((c) => c.name).join(", ")}`}>
              {product.colours.slice(0, 5).map((c) => (
                <li key={c.name} className="size-3.5 rounded-full border border-black/10" style={{ background: c.hex }} title={c.name} />
              ))}
              {product.colours.length > 5 && <li className="text-xs text-muted">+{product.colours.length - 5}</li>}
            </ul>
          )}
        </div>
      </Link>
      <WishlistButton
        className="absolute right-3 top-3"
        product={{ id: product.id, slug: product.slug, name: product.name, price: product.price, image: product.image, variantId: product.default_variant_id }}
      />
    </article>
  );
}
