import { createClient } from "@/lib/supabase/server";
import { listParams, pgLike } from "@/lib/admin/queries";
import { PageHeader, Pagination, Table, Td } from "@/components/admin/ui";
import { SearchInput } from "@/components/admin/controls";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Audit log" };

export default async function AuditLogPage({ searchParams }: PageProps<"/admin/audit-log">) {
  const sp = await searchParams;
  const { page, from, to, pageSize, q } = listParams(sp, 50);
  const supabase = await createClient();
  let query = supabase.from("audit_logs").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(from, to);
  if (q) query = query.or(`summary.ilike.${pgLike(q)},actor_email.ilike.${pgLike(q)},action.ilike.${pgLike(q)}`);
  const { data, count } = await query;
  return (
    <>
      <PageHeader title="Audit log" description="Who changed what, and when. Every admin action is recorded." />
      <div className="mb-4">
        <SearchInput placeholder="Search actions, people…" />
      </div>
      <Table head={["When", "Who", "Action", "Summary"]} empty="No activity yet.">
        {(data ?? []).map((a) => (
          <tr key={a.id}>
            <Td className="text-muted whitespace-nowrap">{formatDateTime(a.created_at)}</Td>
            <Td>{a.actor_email}</Td>
            <Td className="font-mono text-xs">{a.action}</Td>
            <Td>
              {a.summary}
              {a.changes != null && (
                <details className="text-muted mt-1 text-xs">
                  <summary className="cursor-pointer">Details</summary>
                  <pre className="bg-surface-muted mt-1 max-w-xl overflow-x-auto rounded p-2 whitespace-pre-wrap">
                    {JSON.stringify(a.changes, null, 2)}
                  </pre>
                </details>
              )}
            </Td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} total={count ?? 0} pageSize={pageSize} basePath="/admin/audit-log" params={sp} />
    </>
  );
}
