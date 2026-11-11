import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { pgLike } from "@/lib/admin/queries";
import { Card, PageHeader } from "@/components/admin/ui";
import { StatusBadge } from "@/components/ui/badge";
import { ORDER_STATUS_LABEL, formatINR } from "@/lib/utils";

export const metadata = { title: "Search" };

export default async function AdminSearchPage({ searchParams }: PageProps<"/admin/search">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  if (!q) return <PageHeader title="Search" description="Type in the search bar above." />;
  const supabase = await createClient();
  const like = pgLike(q);
  const [orders, products, customers] = await Promise.all([
    supabase
      .from("orders")
      .select("id, order_number, customer_name, total, status")
      .or(`order_number.ilike.${like},email.ilike.${like},customer_name.ilike.${like},phone.ilike.${like}`)
      .limit(10),
    supabase.from("products").select("id, name, status, price").or(`name.ilike.${like},slug.ilike.${like}`).limit(10),
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .or(`full_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
      .limit(10),
  ]);
  const { data: skus } = await supabase
    .from("product_variants")
    .select("sku, colour_name, products(id, name)")
    .ilike("sku", like)
    .limit(10);
  return (
    <>
      <PageHeader title={`Results for “${q}”`} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title={`Orders (${orders.data?.length ?? 0})`}>
          <ul className="divide-y text-sm">
            {orders.data?.map((o) => (
              <li key={o.id} className="flex justify-between py-2">
                <Link href={`/admin/orders/${o.id}`} className="hover:text-cognac">
                  #{o.order_number} <span className="text-muted">{o.customer_name}</span>
                </Link>
                <span className="flex items-center gap-2">
                  {formatINR(o.total)} <StatusBadge status={o.status} label={ORDER_STATUS_LABEL[o.status]} />
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title={`Products (${(products.data?.length ?? 0) + (skus?.length ?? 0)})`}>
          <ul className="divide-y text-sm">
            {products.data?.map((p) => (
              <li key={p.id} className="flex justify-between py-2">
                <Link href={`/admin/products/${p.id}`} className="hover:text-cognac">
                  {p.name}
                </Link>
                <StatusBadge status={p.status} />
              </li>
            ))}
            {skus?.map((s) => {
              const p = s.products as unknown as { id: string; name: string };
              return (
                <li key={s.sku} className="py-2">
                  <Link href={`/admin/products/${p.id}`} className="hover:text-cognac">
                    {s.sku}{" "}
                    <span className="text-muted">
                      — {p.name} ({s.colour_name})
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
        <Card title={`Customers (${customers.data?.length ?? 0})`}>
          <ul className="divide-y text-sm">
            {customers.data?.map((c) => (
              <li key={c.id} className="py-2">
                <Link href={`/admin/customers/${c.id}`} className="hover:text-cognac">
                  {c.full_name ?? "—"} <span className="text-muted">{c.email}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
