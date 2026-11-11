import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listParams } from "@/lib/admin/queries";
import { FilterLinks, PageHeader, Pagination, Table, Td } from "@/components/admin/ui";
import { ReturnEditor } from "@/components/admin/widgets";
import { StatusBadge } from "@/components/ui/badge";
import { formatDateTime, formatINR } from "@/lib/utils";

export const metadata = { title: "Returns" };

export default async function ReturnsPage({ searchParams }: PageProps<"/admin/returns">) {
  const sp = await searchParams;
  const { page, from, to, pageSize, get } = listParams(sp);
  const status = get("status") || "open";
  const supabase = await createClient();
  let q = supabase
    .from("returns")
    .select("*, orders(id, order_number, customer_name, email, total, order_items(id, product_name, variant_name, quantity))", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (status === "open") q = q.in("status", ["requested", "approved", "received"]);
  else if (status !== "all") q = q.eq("status", status as "requested");
  const { data, count } = await q;
  return (
    <>
      <PageHeader
        title="Returns & exchanges"
        description="Requests from customers within the return window. Approve, receive, refund or exchange."
      />
      <FilterLinks
        basePath="/admin/returns"
        param="status"
        value={status}
        params={sp}
        options={[
          { value: "open", label: "Open" },
          ...["requested", "approved", "received", "refunded", "exchanged", "rejected"].map((s) => ({
            value: s,
            label: s[0].toUpperCase() + s.slice(1),
          })),
          { value: "all", label: "All" },
        ]}
      />
      <Table head={["Request", "Order", "Items", "Reason", "Status", ""]} empty="No return requests here.">
        {(data ?? []).map((r) => {
          const o = r.orders as unknown as {
            id: string;
            order_number: string;
            customer_name: string;
            email: string;
            total: number;
            order_items: { id: string; product_name: string; variant_name: string; quantity: number }[];
          };
          const items = o.order_items.filter((i) => r.order_item_ids.includes(i.id));
          return (
            <tr key={r.id}>
              <Td>
                <span className="font-medium">{r.return_number}</span>
                <span className="text-muted block text-xs capitalize">
                  {r.type} · {formatDateTime(r.created_at)}
                </span>
              </Td>
              <Td>
                <Link href={`/admin/orders/${o.id}`} className="hover:text-cognac">
                  #{o.order_number}
                </Link>
                <span className="text-muted block text-xs">
                  {o.customer_name} · {formatINR(o.total)}
                </span>
              </Td>
              <Td className="text-xs">
                {items.map((i) => (
                  <span key={i.id} className="block">
                    {i.product_name} ({i.variant_name}) × {i.quantity}
                  </span>
                ))}
              </Td>
              <Td className="max-w-xs text-xs">
                <span className="font-medium">{r.reason}</span>
                {r.details && <span className="text-muted block">{r.details}</span>}
              </Td>
              <Td>
                <StatusBadge status={r.status} />
                {r.restocked && <span className="text-muted block text-xs">Restocked</span>}
              </Td>
              <Td>
                <ReturnEditor
                  r={{
                    id: r.id,
                    status: r.status,
                    admin_notes: r.admin_notes,
                    refund_amount: r.refund_amount != null ? Number(r.refund_amount) : null,
                    restocked: r.restocked,
                    type: r.type,
                  }}
                  orderTotal={Number(o.total)}
                />
              </Td>
            </tr>
          );
        })}
      </Table>
      <Pagination page={page} total={count ?? 0} pageSize={pageSize} basePath="/admin/returns" params={sp} />
    </>
  );
}
