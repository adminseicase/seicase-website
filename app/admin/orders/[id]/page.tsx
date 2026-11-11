import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Package } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, PageHeader } from "@/components/admin/ui";
import { OrderControls } from "@/components/admin/order-controls";
import { StatusBadge } from "@/components/ui/badge";
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, formatDateTime, formatINR } from "@/lib/utils";
import type { Address } from "@/lib/types";

export const metadata = { title: "Order" };

export default async function AdminOrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: o } = await supabase
    .from("orders")
    .select("*, order_items(*), order_status_history(*), payments(*), returns(id, return_number, status, type, reason, created_at)")
    .eq("id", id)
    .maybeSingle();
  if (!o) notFound();
  const a = o.shipping_address as unknown as Address;
  const history = [...o.order_status_history].sort((x, y) => x.created_at.localeCompare(y.created_at));
  const profit = Number(o.total) - Number(o.shipping_total) - Number(o.cod_fee) - Number(o.cost_total);

  return (
    <>
      <Link href="/admin/orders" className="text-muted hover:text-foreground mb-3 inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="size-4" /> Orders
      </Link>
      <PageHeader
        title={`Order #${o.order_number}`}
        description={`Placed ${formatDateTime(o.placed_at ?? o.created_at)}`}
        actions={
          <>
            <StatusBadge status={o.status} label={ORDER_STATUS_LABEL[o.status]} />
            <StatusBadge status={o.payment_status} label={PAYMENT_STATUS_LABEL[o.payment_status]} />
            {o.status !== "pending" && (
              <>
                <a
                  href={`/api/invoice/${o.order_number}`}
                  className="bg-surface hover:border-foreground inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs"
                >
                  <FileText className="size-3.5" /> Invoice
                </a>
                <a
                  href={`/api/invoice/${o.order_number}?type=packing`}
                  target="_blank"
                  className="bg-surface hover:border-foreground inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs"
                >
                  <Package className="size-3.5" /> Packing slip
                </a>
              </>
            )}
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card title={`Items (${o.order_items.length})`}>
            <ul className="divide-y">
              {o.order_items.map((it) => (
                <li key={it.id} className={`flex items-center gap-4 py-3 text-sm ${it.parent_item_id ? "pl-10" : ""}`}>
                  <Image
                    src={it.image_url || "/images/placeholder.webp"}
                    alt=""
                    width={48}
                    height={60}
                    className="h-[60px] w-12 rounded object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{it.product_name}</p>
                    <p className="text-muted text-xs">
                      {it.variant_name} {it.sku && `· ${it.sku}`}
                    </p>
                  </div>
                  <p className="text-muted tabular-nums">
                    {formatINR(it.unit_price)} × {it.quantity}
                  </p>
                  <p className="w-24 text-right tabular-nums">{formatINR(it.line_total)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1 border-t pt-4 text-sm">
              {[
                ["Subtotal", formatINR(o.subtotal)],
                [`Discount${o.coupon_code ? ` (${o.coupon_code})` : ""}`, `− ${formatINR(o.discount_total)}`],
                ["Shipping", formatINR(o.shipping_total)],
                ["COD fee", formatINR(o.cod_fee)],
                ["GST included", formatINR(o.tax_total, { exact: true })],
              ].map(([k, v]) => (
                <div key={k} className="text-muted flex justify-between">
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
              <div className="flex justify-between pt-1 text-base font-medium">
                <dt>Total</dt>
                <dd>{formatINR(o.total)}</dd>
              </div>
              {Number(o.refunded_total) > 0 && (
                <div className="text-danger flex justify-between">
                  <dt>Refunded</dt>
                  <dd>− {formatINR(o.refunded_total)}</dd>
                </div>
              )}
              <div className="text-muted flex justify-between text-xs">
                <dt>Estimated gross profit</dt>
                <dd>{formatINR(profit)}</dd>
              </div>
            </dl>
          </Card>

          <Card title="Timeline">
            <ol className="space-y-3 text-sm">
              {history.map((h) => (
                <li key={h.id} className="flex gap-3">
                  <span className="bg-cognac mt-1.5 size-2 shrink-0 rounded-full" />
                  <div>
                    <p>
                      <span className="font-medium">{ORDER_STATUS_LABEL[h.status]}</span>{" "}
                      <span className="text-muted text-xs">{formatDateTime(h.created_at)}</span>
                    </p>
                    {h.note && <p className="text-muted">{h.note}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          <Card title="Payments">
            <ul className="divide-y text-sm">
              {o.payments.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    {p.provider === "cod" ? "Cash on Delivery" : `Razorpay ${p.razorpay_payment_id ?? p.razorpay_order_id ?? ""}`}
                    {p.method && <span className="text-muted"> · {p.method}</span>}
                    {p.error_description && <span className="text-danger block text-xs">{p.error_description}</span>}
                  </span>
                  <span className="flex items-center gap-2">
                    {formatINR(p.amount)} <StatusBadge status={p.status} />
                  </span>
                </li>
              ))}
              {!o.payments.length && <li className="text-muted py-3">No payment records.</li>}
            </ul>
          </Card>
        </div>

        <div className="space-y-6">
          <OrderControls
            order={{
              id: o.id,
              status: o.status,
              payment_method: o.payment_method,
              payment_status: o.payment_status,
              total: Number(o.total),
              refunded: Number(o.refunded_total),
              tracking_number: o.tracking_number ?? "",
              courier: o.courier ?? "",
              tracking_url: o.tracking_url ?? "",
              internal_notes: o.internal_notes ?? "",
            }}
          />
          <Card title="Customer">
            <p className="text-sm font-medium">{o.customer_name}</p>
            <p className="text-muted text-sm">{o.email}</p>
            <p className="text-muted text-sm">{o.phone}</p>
            {o.user_id && (
              <Link href={`/admin/customers/${o.user_id}`} className="text-cognac mt-2 inline-block text-xs hover:underline">
                View customer →
              </Link>
            )}
            <p className="text-muted mt-4 text-xs font-medium tracking-wider uppercase">Ship to</p>
            <address className="mt-1 text-sm leading-relaxed not-italic">
              {a.full_name}
              <br />
              {a.line1}
              {a.line2 ? `, ${a.line2}` : ""}
              {a.landmark ? ` (near ${a.landmark})` : ""}
              <br />
              {a.city}, {a.state} {a.pincode}
              <br />
              {a.phone}
            </address>
            {o.customer_notes && (
              <p className="bg-surface-muted mt-3 rounded-lg p-3 text-sm">
                <span className="text-muted block text-xs">Customer note</span>
                {o.customer_notes}
              </p>
            )}
          </Card>
          {o.returns.length > 0 && (
            <Card title="Returns">
              {o.returns.map((r) => (
                <Link key={r.id} href="/admin/returns" className="hover:text-cognac flex items-center justify-between text-sm">
                  {r.return_number} · {r.type} <StatusBadge status={r.status} />
                </Link>
              ))}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
