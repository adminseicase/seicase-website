import { WishlistGrid } from "@/components/store/account/wishlist-grid";

export const metadata = { title: "Wishlist" };

export default function AccountWishlistPage() {
  return (
    <>
      <h1 className="mb-6 text-4xl">Wishlist</h1>
      <WishlistGrid sync />
    </>
  );
}
