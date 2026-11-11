import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Container, Breadcrumbs } from "@/components/store/section";
import { OrderDetail } from "@/components/store/order/order-detail";
import { Skeleton } from "@/components/ui/skeleton";
import { getOrderForViewer } from "@/lib/data/orders";
import { getSiteSettings } from "@/lib/data/content";

export const metadata: Metadata = { title: "Order details", robots: { index: false, follow: false } };

async function Content({ params, searchParams }: PageProps<"/orders/[orderNumber]">) {
  const [{ orderNumber }, sp] = await Promise.all([params, searchParams]);
  const token = typeof sp.t === "string" ? sp.t : undefined;
  const [res, settings] = await Promise.all([getOrderForViewer(orderNumber, token), getSiteSettings()]);
  if (!res) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-4xl">Order not found</h1>
        <p className="text-muted mt-3">Sign in to the account you ordered with, or open the link from your order email.</p>
        <Link
          href={`/login?next=/orders/${orderNumber}`}
          className="bg-foreground text-background mt-6 inline-flex h-11 items-center rounded-md px-5 text-sm"
        >
          Sign in
        </Link>
      </div>
    );
  }
  return (
    <>
      <Breadcrumbs
        items={[{ label: "Home", href: "/" }, { label: "My Orders", href: "/account" }, { label: `#${res.order.order_number}` }]}
      />
      <h1 className="mt-4 mb-8 text-4xl md:text-5xl">Order #{res.order.order_number}</h1>
      <OrderDetail order={res.order} token={res.viaToken ? token : undefined} returnWindowDays={settings.shipping.return_window_days} />
    </>
  );
}

export default function OrderPage(props: PageProps<"/orders/[orderNumber]">) {
  return (
    <Container className="pt-6 pb-10 md:pt-10">
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Content {...props} />
      </Suspense>
    </Container>
  );
}
