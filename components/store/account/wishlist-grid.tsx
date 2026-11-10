"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, Trash } from "lucide-react";
import { useWishlist } from "@/lib/store/wishlist";
import { useHydrated } from "@/lib/store/ui";
import { syncWishlist, toggleWishlistServer } from "@/lib/actions/wishlist";
import { Skeleton } from "@/components/ui/skeleton";
import { BLUR_DATA_URL, formatINR } from "@/lib/utils";

/** Wishlist (browser copy, merged with the account copy when signed in). */
export function WishlistGrid({ sync = false }: { sync?: boolean }) {
  const hydrated = useHydrated();
  const items = useWishlist((s) => s.items);
  const merge = useWishlist((s) => s.merge);
  const remove = useWishlist((s) => s.remove);

  useEffect(() => {
    if (!sync) return;
    syncWishlist(useWishlist.getState().items.map((i) => i.productId))
      .then((server) => server && merge(server))
      .catch(() => {});
  }, [sync, merge]);

  if (!hydrated) return <div className="grid grid-cols-2 gap-4 md:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="aspect-[4/5] rounded-xl" />)}</div>;
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed p-12 text-center">
        <Heart className="mx-auto size-10 stroke-1 text-muted" aria-hidden="true" />
        <p className="mt-4 font-serif text-2xl">Your wishlist is empty</p>
        <p className="mt-1 text-sm text-muted">Tap the heart on any piece to save it for later.</p>
        <Link href="/shop" className="mt-6 inline-flex h-11 items-center rounded-md bg-foreground px-5 text-sm text-background hover:bg-brown">
          Explore Collection
        </Link>
      </div>
    );
  }
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3">
      {items.map((i) => (
        <li key={i.productId} className="group relative">
          <Link href={`/product/${i.slug}`} className="block">
            <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-surface-muted">
              <Image src={i.image || "/images/placeholder.webp"} alt={i.name} fill sizes="(max-width: 768px) 46vw, 30vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" placeholder="blur" blurDataURL={BLUR_DATA_URL} />
            </div>
            <p className="mt-3 font-serif text-lg leading-tight">{i.name}</p>
            <p className="text-sm text-muted">{formatINR(i.price)}</p>
          </Link>
          <button
            type="button"
            onClick={() => {
              remove(i.productId);
              if (sync) toggleWishlistServer(i.productId, false).catch(() => {});
            }}
            className="absolute right-3 top-3 inline-flex size-10 items-center justify-center rounded-full bg-surface/90 hover:bg-surface"
            aria-label={`Remove ${i.name} from wishlist`}
          >
            <Trash className="size-4 stroke-[1.5]" />
          </button>
          <Link href={`/product/${i.slug}`} className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-md border border-foreground text-sm hover:bg-foreground hover:text-background">
            Choose colour &amp; add to bag
          </Link>
        </li>
      ))}
    </ul>
  );
}
