import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { CircleCheck } from "lucide-react";
import { Container } from "@/components/store/section";
import { OrderDetail } from "@/components/store/order/order-detail";
import { Skeleton } from "@/components/ui/skeleton";
import { getOrderForViewer } from "@/lib/data/orders";
import { getSiteSettings } from "@/lib/data/content";
import { ClearCart } from "./clear-cart";

export const metadata: Metadata = { title: "Thank you", robots: { index: false, follow: false } };

async function Confirmation({ searchParams }: { searchParams: PageProps<"/checkout/success">["searchParams"] }) {
  const sp = await searchParams;
  const orderNumber = typeof sp.order === "string" ? sp.order : "";
  const token = typeof sp.t === "string" ? sp.t : "";
  const [res, settings] = await Promise.all([getOrderForViewer(orderNumber, token), getSiteSettings()]);
  if (!res) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-4xl">We couldn&apos;t find that order</h1>
        <p className="mt-3 text-muted">Please check the link in your confirmation email, or contact us.</p>
      </div>
    );
  }
  const { order } = res;
  return (
    <>
      <ClearCart />
      <div className="mx-auto mb-12 max-w-xl text-center">
        <CircleCheck className="mx-auto size-14 stroke-1 text-success" aria-hidden="true" />
        <h1 className="mt-4 text-4xl md:text-5xl">Thank you, {(order.customer_name ?? "").split(" ")[0] || "friend"}.</h1>
        <p className="mt-3 text-muted">
          Your order <strong className="font-medium text-foreground">#{order.order_number}</strong> {order.status === "pending" ? "is awaiting payment confirmation" : "is confirmed"}. We&apos;ve sent the details to{" "}
          {order.email}.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/shop" className="inline-flex h-11 items-center rounded-md bg-foreground px-5 text-sm text-background hover:bg-brown">
            Continue Shopping
          </Link>
          <Link href="/account" className="inline-flex h-11 items-center rounded-md border border-foreground px-5 text-sm hover:bg-foreground hover:text-background">
            My Orders
          </Link>
        </div>
      </div>
      <OrderDetail order={order} token={token} returnWindowDays={settings.shipping.return_window_days} />
    </>
  );
}

export default function SuccessPage({ searchParams }: PageProps<"/checkout/success">) {
  return (
    <Container className="pb-10 pt-10 md:pt-16">
      <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-3xl" />}>
        <Confirmation searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}
