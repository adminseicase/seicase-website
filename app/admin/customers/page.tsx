import Link from "next/link";
import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listParams, pgLike } from "@/lib/admin/queries";
import { PageHeader, Pagination, Table, Td } from "@/components/admin/ui";
import { SearchInput } from "@/components/admin/controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatINR } from "@/lib/utils";

export const metadata = { title: "Customers" };

export default async function CustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  const sp = await searchParams;
  const { page, from, to, pageSize, q } = listParams(sp, 30);
  const supabase = await createClient();
  let query = supabase
    .from("profiles")
    .select("id, full_name, email, phone, role, is_blocked, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (q) query = query.or(`full_name.ilike.${pgLike(q)},email.ilike.${pgLike(q)},phone.ilike.${pgLike(q)}`);
  const { data, count } = await query;
  const ids = (data ?? []).map((p) => p.id);
  const { data: orders } = ids.length
    ? await supabase.from("orders").select("user_id, total, created_at").in("user_id", ids).not("status", "in", "(pending,cancelled)")
    : { data: [] };
  const stats = new Map<string, { n: number; ltv: number; last: string }>();
  for (const o of orders ?? []) {
    const s = stats.get(o.user_id!) ?? { n: 0, ltv: 0, last: "" };
    s.n++;
    s.ltv += Number(o.total);
    if (o.created_at > s.last) s.last = o.created_at;
    stats.set(o.user_id!, s);
  }
  return (
    <>
      <PageHeader
        title="Customers"
        description="Registered customers. Guest orders link to an account automatically when the customer signs up with the same email."
        actions={
          <Button asChild variant="outline" size="sm">
            <a href="/api/admin/export?type=customers">
              <Download /> Export CSV
            </a>
          </Button>
        }
      />
      <div className="mb-4">
        <SearchInput placeholder="Name, email or phone…" />
      </div>
      <Table head={["Customer", "Phone", "Joined", "Orders", "Lifetime value", "Last order", ""]} empty="No customers found.">
        {(data ?? []).map((c) => {
          const s = stats.get(c.id);
          return (
            <tr key={c.id}>
              <Td>
                <Link href={`/admin/customers/${c.id}`} className="hover:text-cognac font-medium">
                  {c.full_name || "—"}
                </Link>
                <span className="text-muted block text-xs">{c.email}</span>
              </Td>
              <Td className="text-muted">{c.phone ?? "—"}</Td>
              <Td className="text-muted">{formatDate(c.created_at)}</Td>
              <Td>{s?.n ?? 0}</Td>
              <Td className="tabular-nums">{formatINR(s?.ltv ?? 0)}</Td>
              <Td className="text-muted">{s?.last ? formatDate(s.last) : "—"}</Td>
              <Td>
                {c.is_blocked && <Badge tone="danger">Blocked</Badge>}
                {c.role !== "customer" && (
                  <Badge tone="dark" className="capitalize">
                    {c.role}
                  </Badge>
                )}
              </Td>
            </tr>
          );
        })}
      </Table>
      <Pagination page={page} total={count ?? 0} pageSize={pageSize} basePath="/admin/customers" params={sp} />
    </>
  );
}
