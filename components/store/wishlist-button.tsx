"use client";

import { Heart } from "lucide-react";
import { toast } from "sonner";
import { useWishlist } from "@/lib/store/wishlist";
import { useHydrated } from "@/lib/store/ui";
import { track } from "@/lib/analytics/client";
import { toggleWishlistServer } from "@/lib/actions/wishlist";
import { cn } from "@/lib/utils";

export function WishlistButton({
  product,
  className,
  variant = "floating",
}: {
  product: { id: string; slug: string; name: string; price: number; image: string | null; variantId?: string | null };
  className?: string;
  variant?: "floating" | "outline";
}) {
  const hydrated = useHydrated();
  const saved = useWishlist((s) => s.items.some((i) => i.productId === product.id));
  const toggle = useWishlist((s) => s.toggle);
  const isSaved = hydrated && saved;

  return (
    <button
      type="button"
      aria-pressed={isSaved}
      aria-label={isSaved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const nowSaved = toggle({
          productId: product.id,
          slug: product.slug,
          name: product.name,
          price: product.price,
          image: product.image,
          variantId: product.variantId ?? null,
        });
        if (nowSaved) {
          track("add_to_wishlist", { product_id: product.id, value: product.price });
          toast.success("Saved to your wishlist");
        }
        // Mirror to the account wishlist when signed in (no-op for guests)
        if (document.cookie.includes("-auth-token")) toggleWishlistServer(product.id, nowSaved).catch(() => {});
      }}
      className={cn(
        "inline-flex items-center justify-center transition-colors",
        variant === "floating"
          ? "size-10 rounded-full bg-surface/85 text-foreground backdrop-blur hover:bg-surface"
          : "size-12 rounded-md border border-border-strong bg-surface hover:border-foreground",
        className,
      )}
    >
      <Heart className={cn("size-[18px] stroke-[1.5] transition-colors", isSaved && "fill-burgundy stroke-burgundy")} />
    </button>
  );
}
