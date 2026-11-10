import type { Metadata } from "next";
import { Container } from "@/components/store/section";
import { CheckoutForm } from "@/components/store/checkout/checkout-form";

export const metadata: Metadata = { title: "Checkout", robots: { index: false, follow: false } };

export default function CheckoutPage() {
  return (
    <Container className="pb-10 pt-8 md:pt-12">
      <h1 className="mb-8 text-4xl md:text-5xl">Checkout</h1>
      <CheckoutForm />
    </Container>
  );
}
