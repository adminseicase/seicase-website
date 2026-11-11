import type { Metadata } from "next";
import { Container } from "@/components/store/section";
import { CartView } from "@/components/store/checkout/cart-view";

export const metadata: Metadata = { title: "Your Bag", robots: { index: false } };

export default function CartPage() {
  return (
    <Container className="pt-8 pb-10 md:pt-12">
      <h1 className="mb-8 text-4xl md:text-5xl">Your Bag</h1>
      <CartView />
    </Container>
  );
}
