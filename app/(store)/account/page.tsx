import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { Download, Package } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BLUR_DATA_URL, ORDER_STATUS_LABEL, formatDate, formatINR } from "@/lib/utils";

export const metadata = { title: "My Orders" };

async function Orders() {
  const user = await requireUser("/account");
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, total, created_at, placed_at, payment_method, payment_status, order_items(id, image_url, product_name, parent_item_id)",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!orders?.length) {
    return (
      <div className="rounded-2xl border border-dashed p-12 text-center">
        <Package className="text-muted mx-auto size-10 stroke-1" aria-hidden="true" />
        <p className="mt-4 font-serif text-2xl">No orders yet</p>
        <p className="text-muted mt-1 text-sm">When you place an order, you&apos;ll be able to track it here.</p>
        <Link
          href="/shop"
          className="bg-foreground text-background hover:bg-brown mt-6 inline-flex h-11 items-center rounded-md px-5 text-sm"
        >
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {orders.map((o) => {
        const items = o.order_items.filter((i) => !i.parent_item_id);
        return (
          <li key={o.id} className="bg-surface rounded-2xl border p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">Order #{o.order_number}</p>
                <p className="text-muted text-sm">
                  Placed on {formatDate(o.placed_at ?? o.created_at)} · {formatINR(o.total)}
                </p>
              </div>
              <StatusBadge status={o.status} label={ORDER_STATUS_LABEL[o.status]} />
            </div>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
              <ul className="flex gap-2" aria-label="Items">
                {items.slice(0, 5).map((i) => (
                  <li key={i.id}>
                    <Image
                      src={i.image_url || "/images/placeholder.webp"}
                      alt={i.product_name}
                      width={72}
                      height={90}
                      className="bg-surface-muted h-[90px] w-[72px] rounded-lg object-cover"
                      placeholder="blur"
                      blurDataURL={BLUR_DATA_URL}
                    />
                  </li>
                ))}
                {items.length > 5 && (
                  <li className="bg-surface-muted flex h-[90px] w-[72px] items-center justify-center rounded-lg text-sm">
                    +{items.length - 5}
                  </li>
                )}
              </ul>
              <div className="flex gap-2">
                {o.status !== "pending" && (
                  <a
                    href={`/api/invoice/${o.order_number}`}
                    className="text-muted hover:text-foreground inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm"
                    aria-label={`Download invoice for ${o.order_number}`}
                  >
                    <Download className="size-4 stroke-[1.5]" /> Invoice
                  </a>
                )}
                <Link
                  href={`/orders/${o.order_number}`}
                  className="border-foreground hover:bg-foreground hover:text-background inline-flex h-10 items-center rounded-md border px-4 text-sm"
                >
                  {o.status === "delivered" ? "View / Return" : "Track Order"}
                </Link>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function AccountOrdersPage() {
  return (
    <>
      <h1 className="mb-6 text-4xl">My Orders</h1>
      <Suspense
        fallback={
          <div className="space-y-4">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-44 rounded-2xl" />
            ))}
          </div>
        }
      >
        <Orders />
      </Suspense>
    </>
  );
}
