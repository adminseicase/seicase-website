import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/store/section";
import { WishlistGrid } from "@/components/store/account/wishlist-grid";

export const metadata: Metadata = { title: "Wishlist", robots: { index: false } };

/** Guest wishlist (saved in this browser). Signed-in shoppers also see /account/wishlist. */
export default function WishlistPage() {
  return (
    <Container className="pb-10 pt-8 md:pt-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-4xl md:text-5xl">Wishlist</h1>
        <p className="text-sm text-muted">
          <Link href="/login?next=/account/wishlist" className="underline underline-offset-4">
            Sign in
          </Link>{" "}
          to keep your wishlist on every device.
        </p>
      </div>
      <WishlistGrid />
    </Container>
  );
}
