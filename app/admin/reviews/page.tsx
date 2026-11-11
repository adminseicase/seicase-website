import Image from "next/image";
import { Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listParams } from "@/lib/admin/queries";
import { FilterLinks, PageHeader, Pagination, EmptyNote } from "@/components/admin/ui";
import { ReviewActions } from "@/components/admin/widgets";
import { StatusBadge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Reviews" };

export default async function ReviewsPage({ searchParams }: PageProps<"/admin/reviews">) {
  const sp = await searchParams;
  const { page, from, to, pageSize, get } = listParams(sp, 20);
  const status = get("status") || "pending";
  const supabase = await createClient();
  let q = supabase
    .from("reviews")
    .select("*, products(name, slug)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (status !== "all") q = q.eq("status", status as "pending");
  const { data, count } = await q;
  return (
    <>
      <PageHeader title="Reviews" description="Only verified buyers can review. Approve to publish, hide to remove, or reply publicly." />
      <FilterLinks
        basePath="/admin/reviews"
        param="status"
        value={status}
        params={sp}
        options={[
          { value: "pending", label: "Pending" },
          { value: "approved", label: "Approved" },
          { value: "hidden", label: "Hidden" },
          { value: "all", label: "All" },
        ]}
      />
      {!data?.length && <EmptyNote>No reviews here.</EmptyNote>}
      <ul className="space-y-3">
        {(data ?? []).map((r) => (
          <li key={r.id} className="bg-surface rounded-xl border p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2">
                  <span className="flex" aria-label={`${r.rating} stars`}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} className={`size-3.5 ${i < r.rating ? "fill-foreground stroke-foreground" : "stroke-border-strong"}`} />
                    ))}
                  </span>
                  <span className="font-medium">{r.title}</span>
                </p>
                <p className="text-muted mt-0.5 text-xs">
                  {r.author_name} on {(r.products as unknown as { name: string })?.name} · {formatDate(r.created_at)}{" "}
                  {r.is_verified && "· Verified buyer"}
                </p>
              </div>
              <StatusBadge status={r.status} />
            </div>
            <p className="mt-3 text-sm">{r.body}</p>
            {r.images.length > 0 && (
              <div className="mt-3 flex gap-2">
                {r.images.map((src: string) => (
                  <a key={src} href={src} target="_blank" rel="noopener noreferrer">
                    <Image src={src} alt="" width={72} height={72} className="size-[72px] rounded object-cover" />
                  </a>
                ))}
              </div>
            )}
            {r.admin_reply && (
              <p className="bg-surface-muted mt-3 rounded-lg p-3 text-sm">
                <span className="text-muted block text-xs">Your reply</span>
                {r.admin_reply}
              </p>
            )}
            <div className="mt-4">
              <ReviewActions id={r.id} status={r.status} reply={r.admin_reply} />
            </div>
          </li>
        ))}
      </ul>
      <Pagination page={page} total={count ?? 0} pageSize={pageSize} basePath="/admin/reviews" params={sp} />
    </>
  );
}
