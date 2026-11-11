import Link from "next/link";
import { Download, SquareKanban, List } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listParams, pgLike } from "@/lib/admin/queries";
import { FilterLinks, PageHeader, Pagination, Table, Td } from "@/components/admin/ui";
import { SearchInput } from "@/components/admin/controls";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, cn, formatDateTime, formatINR, olderThanDays } from "@/lib/utils";
import type { OrderStatus } from "@/lib/types";

export const metadata = { title: "Orders" };

const PIPELINE: OrderStatus[] = ["placed", "confirmed", "shipped", "out_for_delivery", "delivered"];

export default async function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  const sp = await searchParams;
  const { page, from, to, pageSize, q, get } = listParams(sp, 30);
  const status = get("status");
  const payment = get("payment");
  const view = get("view") === "board" ? "board" : "list";
  const dFrom = get("from");
  const dTo = get("to");
  const supabase = await createClient();

  const viewHref = (v: string) => {
    const p = new URLSearchParams();
    Object.entries(sp).forEach(([k, val]) => typeof val === "string" && k !== "view" && p.set(k, val));
    if (v === "board") p.set("view", "board");
    return `/admin/orders${p.size ? `?${p}` : ""}`;
  };

  const header = (
    <PageHeader
      title="Orders"
      description="Pipeline from placed to delivered. Orders still awaiting online payment are listed under “Awaiting payment”."
      actions={
        <>
          <div className="bg-surface flex rounded-lg border p-0.5">
            <Link
              href={viewHref("list")}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs",
                view === "list" && "bg-foreground text-background",
              )}
            >
              <List className="size-3.5" /> List
            </Link>
            <Link
              href={viewHref("board")}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs",
                view === "board" && "bg-foreground text-background",
              )}
            >
              <SquareKanban className="size-3.5" /> Board
            </Link>
          </div>
          <Button asChild variant="outline" size="sm">
            <a href="/api/admin/export?type=orders">
              <Download /> Export CSV
            </a>
          </Button>
        </>
      }
    />
  );

  if (view === "board") {
    const { data } = await supabase
      .from("orders")
      .select("id, order_number, customer_name, total, status, placed_at, created_at, payment_method, shipping_address")
      .in("status", PIPELINE)
      .order("created_at", { ascending: false })
      .limit(300);
    const delayed = (o: { status: string; placed_at: string | null }) =>
      ["placed", "confirmed"].includes(o.status) && olderThanDays(o.placed_at, 3);
    return (
      <>
        {header}
        <div className="-mx-4 flex scrollbar-none gap-4 overflow-x-auto px-4 pb-4">
          {PIPELINE.map((s) => {
            const col = (data ?? []).filter((o) => o.status === s).slice(0, s === "delivered" ? 20 : 100);
            return (
              <section key={s} className="bg-surface-muted/40 w-72 shrink-0 rounded-xl border p-3" aria-label={ORDER_STATUS_LABEL[s]}>
                <h2 className="mb-3 flex items-center justify-between font-sans text-sm font-medium">
                  {ORDER_STATUS_LABEL[s]} <span className="bg-surface rounded-full px-2 text-xs">{col.length}</span>
                </h2>
                <ul className="space-y-2">
                  {col.map((o) => (
                    <li key={o.id}>
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className={cn(
                          "bg-surface hover:border-foreground block rounded-lg border p-3 text-sm",
                          delayed(o) && "border-danger/60",
                        )}
                      >
                        <p className="flex justify-between font-medium">
                          #{o.order_number} <span>{formatINR(o.total)}</span>
                        </p>
                        <p className="text-muted text-xs">
                          {o.customer_name} · {(o.shipping_address as { city?: string })?.city}
                        </p>
                        <p className="text-muted mt-1 flex justify-between text-xs">
                          {formatDateTime(o.placed_at ?? o.created_at)} <span className="uppercase">{o.payment_method}</span>
                        </p>
                        {delayed(o) && <p className="text-danger mt-1 text-xs">Delayed — placed over 3 days ago</p>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </>
    );
  }

  let query = supabase
    .from("orders")
    .select("id, order_number, customer_name, email, total, status, payment_status, payment_method, created_at, shipping_address", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (status) query = query.eq("status", status as OrderStatus);
  else query = query.neq("status", "pending");
  if (payment) query = query.eq("payment_status", payment as "paid");
  if (dFrom) query = query.gte("created_at", `${dFrom}T00:00:00+05:30`);
  if (dTo) query = query.lte("created_at", `${dTo}T23:59:59+05:30`);
  if (q)
    query = query.or(`order_number.ilike.${pgLike(q)},email.ilike.${pgLike(q)},customer_name.ilike.${pgLike(q)},phone.ilike.${pgLike(q)}`);
  const { data, count } = await query;

  return (
    <>
      {header}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <FilterLinks
          basePath="/admin/orders"
          param="status"
          value={status}
          params={sp}
          options={[
            { value: "", label: "All" },
            ...["placed", "confirmed", "shipped", "out_for_delivery", "delivered", "cancelled", "returned", "pending"].map((s) => ({
              value: s,
              label: ORDER_STATUS_LABEL[s],
            })),
          ]}
        />
        <SearchInput placeholder="Order #, name, email, phone…" />
      </div>
      <FilterLinks
        basePath="/admin/orders"
        param="payment"
        value={payment}
        params={sp}
        options={[
          { value: "", label: "Any payment" },
          ...["paid", "pending", "failed", "refunded"].map((s) => ({ value: s, label: PAYMENT_STATUS_LABEL[s] })),
        ]}
      />
      <form className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        {status && <input type="hidden" name="status" value={status} />}
        <label htmlFor="of" className="text-muted">
          Date
        </label>
        <input id="of" type="date" name="from" defaultValue={dFrom} className="bg-surface h-9 rounded-lg border px-2" />
        <input aria-label="To date" type="date" name="to" defaultValue={dTo} className="bg-surface h-9 rounded-lg border px-2" />
        <button className="bg-surface h-9 rounded-lg border px-3">Filter</button>
      </form>
      <Table head={["Order", "Date", "Customer", "City", "Total", "Payment", "Status"]} empty="No orders match.">
        {(data ?? []).map((o) => (
          <tr key={o.id} className="hover:bg-surface-muted/40">
            <Td>
              <Link href={`/admin/orders/${o.id}`} className="hover:text-cognac font-medium">
                #{o.order_number}
              </Link>
            </Td>
            <Td className="text-muted whitespace-nowrap">{formatDateTime(o.created_at)}</Td>
            <Td>
              {o.customer_name}
              <span className="text-muted block text-xs">{o.email}</span>
            </Td>
            <Td className="text-muted">{(o.shipping_address as { city?: string })?.city}</Td>
            <Td className="tabular-nums">{formatINR(o.total)}</Td>
            <Td>
              <StatusBadge
                status={o.payment_status}
                label={`${o.payment_method === "cod" ? "COD · " : ""}${PAYMENT_STATUS_LABEL[o.payment_status]}`}
              />
            </Td>
            <Td>
              <StatusBadge status={o.status} label={ORDER_STATUS_LABEL[o.status]} />
            </Td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} total={count ?? 0} pageSize={pageSize} basePath="/admin/orders" params={sp} />
    </>
  );
}
