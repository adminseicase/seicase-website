import Image from "next/image";
import Link from "next/link";
import { Check, Download, ExternalLink, Package, Truck, Home, ClipboardCheck, CircleX } from "lucide-react";
import type { ViewableOrder } from "@/lib/data/orders";
import { StatusBadge } from "@/components/ui/badge";
import { BLUR_DATA_URL, ORDER_STATUS_LABEL, cn, formatDate, formatDateTime, formatINR, olderThanDays } from "@/lib/utils";
import { OrderActions } from "./order-actions";

const STEPS = [
  { status: "placed", label: "Order placed", Icon: ClipboardCheck },
  { status: "confirmed", label: "Confirmed", Icon: Check },
  { status: "shipped", label: "Shipped", Icon: Package },
  { status: "out_for_delivery", label: "Out for delivery", Icon: Truck },
  { status: "delivered", label: "Delivered", Icon: Home },
] as const;

/** Tracking timeline + items + totals. Used on the confirmation, guest tracking and account pages. */
export function OrderDetail({ order, token, returnWindowDays }: { order: ViewableOrder; token?: string; returnWindowDays: number }) {
  const a = order.shipping_address;
  const idx = STEPS.findIndex((s) => s.status === order.status);
  const cancelled = order.status === "cancelled" || order.status === "returned";
  const historyFor = (s: string) => order.order_status_history?.find((h) => h.status === s);
  const invoiceHref = `/api/invoice/${order.order_number}${token ? `?t=${token}` : ""}`;
  const canReturn =
    order.status === "delivered" &&
    !!order.delivered_at &&
    !olderThanDays(order.delivered_at, returnWindowDays) &&
    !order.returns?.some((r) => r.status !== "rejected");
  const canCancel = ["placed", "confirmed"].includes(order.status);
  const mainItems = order.order_items.filter((i) => !i.parent_item_id);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-muted text-sm">Order #{order.order_number}</p>
          <p className="text-muted text-sm">Placed on {formatDate(order.placed_at ?? order.created_at)}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={order.status} label={ORDER_STATUS_LABEL[order.status]} />
          {order.payment_status !== "paid" && order.payment_method === "razorpay" && (
            <StatusBadge status={order.payment_status} label={`Payment ${order.payment_status}`} />
          )}
        </div>
      </div>

      {/* Tracking timeline */}
      <section aria-labelledby="track-h" className="bg-surface rounded-2xl border p-5 md:p-7">
        <h2 id="track-h" className="mb-6 text-2xl">
          Track Order
        </h2>
        {cancelled ? (
          <p className="text-danger flex items-center gap-2">
            <CircleX className="size-5" aria-hidden="true" /> This order was {order.status}
            {historyFor(order.status) && ` on ${formatDate(historyFor(order.status)!.created_at)}`}.
          </p>
        ) : order.status === "pending" ? (
          <p className="text-muted text-sm">
            We&apos;re waiting for your payment to complete. If you were charged, it will update automatically within a few minutes.
          </p>
        ) : (
          <ol className="grid gap-6 md:grid-cols-5 md:gap-2">
            {STEPS.map((s, i) => {
              const done = i <= idx;
              const h = historyFor(s.status);
              return (
                <li key={s.status} className="relative flex gap-4 md:flex-col md:items-center md:text-center">
                  {i < STEPS.length - 1 && (
                    <span
                      className={cn(
                        "absolute top-10 left-5 h-[calc(100%+0.5rem)] w-px md:top-5 md:left-1/2 md:h-px md:w-full",
                        i < idx ? "bg-foreground" : "bg-border",
                      )}
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={cn(
                      "relative z-10 inline-flex size-10 shrink-0 items-center justify-center rounded-full border",
                      done ? "border-foreground bg-foreground text-background" : "bg-surface text-muted",
                    )}
                  >
                    <s.Icon className="size-4 stroke-[1.5]" aria-hidden="true" />
                  </span>
                  <div>
                    <p className={cn("text-sm", done ? "font-medium" : "text-muted")}>{s.label}</p>
                    {h && <p className="text-muted text-xs">{formatDateTime(h.created_at)}</p>}
                    <span className="sr-only">{done ? "completed" : "pending"}</span>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        {order.tracking_number && (
          <div className="bg-surface-muted mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl p-4 text-sm">
            <p>
              {order.courier ?? "Courier"} · Tracking <span className="font-medium">{order.tracking_number}</span>
            </p>
            {order.tracking_url && (
              <a
                href={order.tracking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 underline underline-offset-4"
              >
                Track with courier <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            )}
          </div>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <section aria-labelledby="items-h">
          <h2 id="items-h" className="mb-4 text-2xl">
            Items
          </h2>
          <ul className="divide-y border-y">
            {mainItems.map((it) => {
              const charms = order.order_items.filter((c) => c.parent_item_id === it.id);
              return (
                <li key={it.id} className="flex gap-4 py-4">
                  <Image
                    src={it.image_url || "/images/placeholder.webp"}
                    alt=""
                    width={80}
                    height={100}
                    className="bg-surface-muted h-[100px] w-20 rounded-lg object-cover"
                    placeholder="blur"
                    blurDataURL={BLUR_DATA_URL}
                  />
                  <div className="flex-1 text-sm">
                    <p className="font-serif text-lg leading-tight">{it.product_name}</p>
                    <p className="text-muted">
                      {it.variant_name} · Qty {it.quantity}
                    </p>
                    {charms.map((c) => (
                      <p key={c.id} className="text-muted">
                        + {c.product_name} ({formatINR(c.unit_price)})
                      </p>
                    ))}
                  </div>
                  <p className="text-sm">{formatINR(Number(it.line_total) + charms.reduce((s, c) => s + Number(c.line_total), 0))}</p>
                </li>
              );
            })}
          </ul>
          <OrderActions
            orderId={order.id}
            orderNumber={order.order_number}
            token={token}
            canCancel={canCancel}
            canReturn={!!canReturn}
            items={mainItems.map((i) => ({ id: i.id, name: `${i.product_name} (${i.variant_name})` }))}
            pending={order.status === "pending" && order.payment_method === "razorpay"}
          />
        </section>
        <aside className="space-y-6">
          <div className="bg-surface rounded-2xl border p-5 text-sm">
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd>{formatINR(order.subtotal)}</dd>
              </div>
              {Number(order.discount_total) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted">Discount {order.coupon_code && `(${order.coupon_code})`}</dt>
                  <dd className="text-success">− {formatINR(order.discount_total)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted">Shipping</dt>
                <dd>{Number(order.shipping_total) === 0 ? "FREE" : formatINR(order.shipping_total)}</dd>
              </div>
              {Number(order.cod_fee) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted">COD fee</dt>
                  <dd>{formatINR(order.cod_fee)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t pt-2 text-base">
                <dt className="font-medium">Total</dt>
                <dd className="font-medium">{formatINR(order.total)}</dd>
              </div>
              <p className="text-muted text-right text-xs">Incl. GST {formatINR(order.tax_total, { exact: true })}</p>
            </dl>
            <p className="text-muted mt-3">Payment: {order.payment_method === "cod" ? "Cash on Delivery" : "Online (Razorpay)"}</p>
            {order.status !== "pending" && (
              <a href={invoiceHref} className="hover:border-foreground mt-4 inline-flex h-10 items-center gap-2 rounded-md border px-4">
                <Download className="size-4 stroke-[1.5]" aria-hidden="true" /> Download invoice
              </a>
            )}
          </div>
          <div className="bg-surface rounded-2xl border p-5 text-sm">
            <p className="mb-2 font-medium">Delivering to</p>
            <address className="text-muted leading-relaxed not-italic">
              {a.full_name}
              <br />
              {a.line1}
              {a.line2 ? `, ${a.line2}` : ""}
              <br />
              {a.city}, {a.state} {a.pincode}
              <br />
              {a.phone}
            </address>
          </div>
          {order.returns?.length > 0 && (
            <div className="bg-surface rounded-2xl border p-5 text-sm">
              <p className="mb-2 font-medium">Returns & exchanges</p>
              {order.returns.map((r) => (
                <p key={r.id} className="flex items-center justify-between">
                  <span className="capitalize">
                    {r.type} {r.return_number}
                  </span>
                  <StatusBadge status={r.status} />
                </p>
              ))}
            </div>
          )}
          <p className="text-muted text-sm">
            Need help?{" "}
            <Link href="/contact" className="underline">
              Contact us
            </Link>{" "}
            with your order number.
          </p>
        </aside>
      </div>
    </div>
  );
}
