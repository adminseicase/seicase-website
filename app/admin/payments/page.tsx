import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listParams } from "@/lib/admin/queries";
import { Card, FilterLinks, PageHeader, Pagination, StatCard, Table, Td } from "@/components/admin/ui";
import { StatusBadge } from "@/components/ui/badge";
import { daysAgoIso, formatDateTime, formatINR } from "@/lib/utils";

export const metadata = { title: "Payments" };

export default async function PaymentsPage({ searchParams }: PageProps<"/admin/payments">) {
  const sp = await searchParams;
  const { page, from, to, pageSize, get } = listParams(sp, 30);
  const status = get("status");
  const supabase = await createClient();
  const since = daysAgoIso(30);
  let q = supabase
    .from("payments")
    .select("*, orders(id, order_number, customer_name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (status) q = q.eq("status", status);
  const [{ data, count }, { data: recent }, { data: hooks }] = await Promise.all([
    q,
    supabase.from("payments").select("status, amount").gte("created_at", since),
    supabase
      .from("payment_webhook_logs")
      .select("id, event, signature_valid, processed, error, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  const sum = (s: string) => (recent ?? []).filter((p) => p.status === s).reduce((a, p) => a + Number(p.amount), 0);
  const cnt = (s: string) => (recent ?? []).filter((p) => p.status === s).length;
  return (
    <>
      <PageHeader title="Payments" description="Razorpay and Cash on Delivery payments, plus a log of every Razorpay webhook received." />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Captured (30 days)" value={formatINR(sum("captured"))} hint={`${cnt("captured")} payments`} />
        <StatCard label="Pending / created" value={String(cnt("created"))} hint="Awaiting payment or COD delivery" />
        <StatCard label="Failed (30 days)" value={String(cnt("failed"))} />
        <StatCard label="Refunded (30 days)" value={String(cnt("refunded"))} />
      </div>
      <FilterLinks
        basePath="/admin/payments"
        param="status"
        value={status}
        params={sp}
        options={[
          { value: "", label: "All" },
          { value: "captured", label: "Successful" },
          { value: "created", label: "Pending" },
          { value: "failed", label: "Failed" },
          { value: "refunded", label: "Refunded" },
        ]}
      />
      <Table head={["When", "Order", "Provider / ID", "Method", "Amount", "Status"]} empty="No payments yet.">
        {(data ?? []).map((p) => {
          const o = p.orders as unknown as { id: string; order_number: string; customer_name: string } | null;
          return (
            <tr key={p.id}>
              <Td className="text-muted whitespace-nowrap">{formatDateTime(p.created_at)}</Td>
              <Td>
                {o ? (
                  <Link href={`/admin/orders/${o.id}`} className="hover:text-cognac">
                    #{o.order_number}
                  </Link>
                ) : (
                  "—"
                )}
                <span className="text-muted block text-xs">{o?.customer_name}</span>
              </Td>
              <Td className="font-mono text-xs">
                {p.provider}
                <span className="text-muted block">{p.razorpay_payment_id ?? p.razorpay_order_id}</span>
              </Td>
              <Td className="capitalize">{p.method ?? "—"}</Td>
              <Td>{formatINR(p.amount)}</Td>
              <Td>
                <StatusBadge status={p.status} />
                {p.error_description && <span className="text-danger block max-w-56 text-xs">{p.error_description}</span>}
              </Td>
            </tr>
          );
        })}
      </Table>
      <Pagination page={page} total={count ?? 0} pageSize={pageSize} basePath="/admin/payments" params={sp} />

      <Card className="mt-8" title="Razorpay webhook log (latest 20)">
        <ul className="divide-y text-sm">
          {(hooks ?? []).map((h) => (
            <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="font-mono text-xs">{h.event}</span>
              <span className="flex items-center gap-2 text-xs">
                {!h.signature_valid && <span className="text-danger">Invalid signature</span>}
                {h.error ? (
                  <span className="text-danger">{h.error}</span>
                ) : h.processed ? (
                  <span className="text-success">Processed</span>
                ) : (
                  <span className="text-muted">Logged</span>
                )}
                <span className="text-muted">{formatDateTime(h.created_at)}</span>
              </span>
            </li>
          ))}
          {!hooks?.length && <li className="text-muted py-4">No webhooks received yet. See docs/DEPLOYMENT.md → Razorpay webhook.</li>}
        </ul>
      </Card>
    </>
  );
}
