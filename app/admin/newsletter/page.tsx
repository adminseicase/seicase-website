import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listParams, pgLike } from "@/lib/admin/queries";
import { PageHeader, Pagination, Table, Td } from "@/components/admin/ui";
import { SearchInput } from "@/components/admin/controls";
import { SubscriberToggle } from "@/components/admin/widgets";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Newsletter" };

export default async function NewsletterPage({ searchParams }: PageProps<"/admin/newsletter">) {
  const sp = await searchParams;
  const { page, from, to, pageSize, q } = listParams(sp, 50);
  const supabase = await createClient();
  let query = supabase
    .from("newsletter_subscribers")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (q) query = query.ilike("email", pgLike(q));
  const [{ data, count }, { count: active }] = await Promise.all([
    query,
    supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("is_active", true),
  ]);
  return (
    <>
      <PageHeader
        title="Newsletter subscribers"
        description={`${active ?? 0} active subscribers. Export to CSV to import into your email tool.`}
        actions={
          <Button asChild size="sm" variant="outline">
            <a href="/api/admin/export?type=subscribers">
              <Download /> Export CSV
            </a>
          </Button>
        }
      />
      <div className="mb-4">
        <SearchInput placeholder="Search email…" />
      </div>
      <Table head={["Email", "Source", "Joined", "Status", ""]} empty="No subscribers yet.">
        {(data ?? []).map((s) => (
          <tr key={s.id}>
            <Td>{s.email}</Td>
            <Td className="text-muted capitalize">{s.source}</Td>
            <Td className="text-muted">{formatDateTime(s.created_at)}</Td>
            <Td>
              <StatusBadge status={s.is_active ? "active" : "archived"} label={s.is_active ? "Subscribed" : "Unsubscribed"} />
            </Td>
            <Td>
              <SubscriberToggle id={s.id} active={s.is_active} />
            </Td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} total={count ?? 0} pageSize={pageSize} basePath="/admin/newsletter" params={sp} />
    </>
  );
}
