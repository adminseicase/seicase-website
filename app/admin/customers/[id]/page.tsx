import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, PageHeader, StatCard, Table, Td } from "@/components/admin/ui";
import { CustomerControls } from "@/components/admin/widgets";
import { StatusBadge } from "@/components/ui/badge";
import { ORDER_STATUS_LABEL, formatDate, formatDateTime, formatINR } from "@/lib/utils";

export const metadata = { title: "Customer" };

export default async function CustomerPage({ params }: PageProps<"/admin/customers/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: c } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!c) notFound();
  const [{ data: orders }, { data: addresses }, { data: wish }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, order_number, total, status, created_at")
      .or(`user_id.eq.${id}${c.email ? `,email.eq.${c.email}` : ""}`)
      .order("created_at", { ascending: false }),
    supabase.from("addresses").select("*").eq("user_id", id),
    supabase.from("wishlists").select("products(name)").eq("user_id", id),
  ]);
  const paid = (orders ?? []).filter((o) => !["pending", "cancelled"].includes(o.status));
  const ltv = paid.reduce((s, o) => s + Number(o.total), 0);
  return (
    <>
      <Link href="/admin/customers" className="text-muted hover:text-foreground mb-3 inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="size-4" /> Customers
      </Link>
      <PageHeader
        title={c.full_name || c.email || "Customer"}
        description={`${c.email ?? ""} · ${c.phone ?? "no phone"} · joined ${formatDate(c.created_at)}`}
      />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Orders" value={String(paid.length)} />
        <StatCard label="Lifetime value" value={formatINR(ltv)} />
        <StatCard label="Average order" value={formatINR(paid.length ? ltv / paid.length : 0)} />
        <StatCard label="Marketing emails" value={c.marketing_opt_in ? "Subscribed" : "No"} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Table head={["Order", "Date", "Total", "Status"]} empty="No orders yet.">
          {(orders ?? []).map((o) => (
            <tr key={o.id}>
              <Td>
                <Link href={`/admin/orders/${o.id}`} className="hover:text-cognac font-medium">
                  #{o.order_number}
                </Link>
              </Td>
              <Td className="text-muted">{formatDateTime(o.created_at)}</Td>
              <Td>{formatINR(o.total)}</Td>
              <Td>
                <StatusBadge status={o.status} label={ORDER_STATUS_LABEL[o.status]} />
              </Td>
            </tr>
          ))}
        </Table>
        <div className="space-y-6">
          <Card title="Notes & access">
            <CustomerControls id={c.id} blocked={c.is_blocked} notes={c.notes ?? ""} />
          </Card>
          <Card title="Addresses">
            {(addresses ?? []).map((a) => (
              <p key={a.id} className="text-muted mb-2 text-sm">
                <span className="text-foreground font-medium">{a.label}</span> — {a.line1}, {a.city}, {a.state} {a.pincode}
              </p>
            ))}
            {!addresses?.length && <p className="text-muted text-sm">None saved.</p>}
          </Card>
          <Card title="Wishlist">
            <p className="text-muted text-sm">
              {(wish ?? [])
                .map((w) => (w.products as unknown as { name: string })?.name)
                .filter(Boolean)
                .join(", ") || "Empty"}
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
