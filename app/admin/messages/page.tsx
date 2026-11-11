import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listParams } from "@/lib/admin/queries";
import { FilterLinks, PageHeader, Pagination, EmptyNote } from "@/components/admin/ui";
import { MessageActions } from "@/components/admin/widgets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Messages" };

export default async function MessagesPage({ searchParams }: PageProps<"/admin/messages">) {
  const sp = await searchParams;
  const { page, from, to, pageSize, get } = listParams(sp, 20);
  const filter = get("filter") || "unread";
  const supabase = await createClient();
  let q = supabase.from("contact_messages").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(from, to);
  if (filter === "unread") q = q.eq("is_read", false);
  const { data, count } = await q;
  return (
    <>
      <PageHeader
        title="Messages"
        description="Contact-form inbox. Replies are emailed from your support address."
        actions={
          <Button asChild variant="outline" size="sm">
            <a href="/api/admin/export?type=messages">
              <Download /> Export CSV
            </a>
          </Button>
        }
      />
      <FilterLinks
        basePath="/admin/messages"
        param="filter"
        value={filter}
        params={sp}
        options={[
          { value: "unread", label: "Unread" },
          { value: "all", label: "All" },
        ]}
      />
      {!data?.length && <EmptyNote>Inbox zero — nicely done.</EmptyNote>}
      <ul className="space-y-3">
        {(data ?? []).map((m) => (
          <li key={m.id} className={`bg-surface rounded-xl border p-5 ${!m.is_read ? "border-l-cognac border-l-4" : ""}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">
                  {m.name} <span className="text-muted font-normal">&lt;{m.email}&gt;</span>{" "}
                  {m.phone && <span className="text-muted text-sm">· {m.phone}</span>}
                </p>
                {m.subject && <p className="text-sm">{m.subject}</p>}
              </div>
              <div className="text-muted flex items-center gap-2 text-xs">
                {m.replied_at && <Badge tone="success">Replied</Badge>}
                {formatDateTime(m.created_at)}
              </div>
            </div>
            <p className="mt-3 text-sm whitespace-pre-wrap">{m.message}</p>
            {m.reply_body && (
              <p className="bg-surface-muted mt-3 rounded-lg p-3 text-sm whitespace-pre-wrap">
                <span className="text-muted block text-xs">Your reply · {formatDateTime(m.replied_at)}</span>
                {m.reply_body}
              </p>
            )}
            <div className="mt-4">
              <MessageActions id={m.id} isRead={m.is_read} email={m.email} />
            </div>
          </li>
        ))}
      </ul>
      <Pagination page={page} total={count ?? 0} pageSize={pageSize} basePath="/admin/messages" params={sp} />
    </>
  );
}
