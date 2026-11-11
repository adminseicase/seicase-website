import { createClient } from "@/lib/supabase/server";
import { listParams } from "@/lib/admin/queries";
import { FilterLinks, PageHeader, Pagination, Table, Td } from "@/components/admin/ui";
import { RemindButton } from "@/components/admin/widgets";
import { StatusBadge } from "@/components/ui/badge";
import { formatDateTime, formatINR } from "@/lib/utils";

export const metadata = { title: "Abandoned carts" };

export default async function AbandonedCartsPage({ searchParams }: PageProps<"/admin/abandoned-carts">) {
  const sp = await searchParams;
  const { page, from, to, pageSize, get } = listParams(sp, 30);
  const status = get("status") || "abandoned";
  const supabase = await createClient();
  let q = supabase
    .from("carts")
    .select(
      "id, email, status, subtotal, item_count, last_activity_at, reminder_sent_at, recovered_order_id, cart_items(quantity, products(name))",
      { count: "exact" },
    )
    .order("last_activity_at", { ascending: false })
    .range(from, to);
  if (status !== "all") q = q.eq("status", status as "abandoned");
  const { data, count } = await q;
  return (
    <>
      <PageHeader
        title="Abandoned carts"
        description="Shoppers who signed in or gave their email, added items and left. Carts are marked abandoned after 1 hour; reminders are also sent automatically once a day."
      />
      <FilterLinks
        basePath="/admin/abandoned-carts"
        param="status"
        value={status}
        params={sp}
        options={[
          { value: "abandoned", label: "Abandoned" },
          { value: "recovered", label: "Recovered" },
          { value: "active", label: "Active" },
          { value: "all", label: "All" },
        ]}
      />
      <Table head={["Customer", "Items", "Value", "Last activity", "Status", ""]} empty="No carts here.">
        {(data ?? []).map((c) => (
          <tr key={c.id}>
            <Td>{c.email ?? "—"}</Td>
            <Td className="text-xs">
              {c.cart_items.map((i) => `${(i.products as unknown as { name: string })?.name} × ${i.quantity}`).join(", ") ||
                `${c.item_count} items`}
            </Td>
            <Td>{formatINR(c.subtotal)}</Td>
            <Td className="text-muted">{formatDateTime(c.last_activity_at)}</Td>
            <Td>
              <StatusBadge status={c.status} />
              {c.reminder_sent_at && <span className="text-muted block text-xs">Reminded {formatDateTime(c.reminder_sent_at)}</span>}
            </Td>
            <Td>{c.status === "abandoned" && c.email && <RemindButton cartId={c.id} sent={!!c.reminder_sent_at} />}</Td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} total={count ?? 0} pageSize={pageSize} basePath="/admin/abandoned-carts" params={sp} />
    </>
  );
}
