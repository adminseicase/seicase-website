import type { Metadata } from "next";
import { ShopPage } from "@/components/store/shop/shop-page";

export const metadata: Metadata = {
  title: "Shop All Leather Bags & Accessories",
  description: "Shop handcrafted leather handbags, purses, wallets, coin purses and men's essentials. Free shipping above ₹2000.",
  alternates: { canonical: "/shop" },
};

export default function Page({ searchParams }: PageProps<"/shop">) {
  return (
    <ShopPage
      title="Shop All"
      description="Every piece is cut, stitched and finished by hand in our Chennai studio."
      crumbs={[{ label: "Home", href: "/" }, { label: "Shop" }]}
      basePath="/shop"
      searchParams={searchParams}
      fixed={{}}
    />
  );
}
