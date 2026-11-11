import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/ui";
import { CrudManager } from "@/components/admin/crud-manager";

export const metadata = { title: "Charms" };

export default async function CharmsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("charms").select("*").order("sort_order");
  return (
    <>
      <PageHeader title="Charms — Make It Yours" description="Add-ons shoppers can attach to handbags and purses on the product page." />
      <CrudManager
        table="charms"
        title="Charms"
        addLabel="Add charm"
        rows={data ?? []}
        defaults={{ is_active: true, stock: 0, price: 0, sort_order: (data?.length ?? 0) + 1 }}
        fields={[
          { name: "name", label: "Name", type: "text", required: true },
          { name: "description", label: "Description", type: "textarea", rows: 2 },
          { name: "price", label: "Price (₹)", type: "number", required: true },
          { name: "cost_price", label: "Cost price (₹)", type: "number" },
          { name: "stock", label: "Stock", type: "number" },
          { name: "image_url", label: "Image", type: "image", bucket: "product-images", folder: "charms" },
          { name: "sort_order", label: "Sort order", type: "number" },
          { name: "is_active", label: "Active", type: "boolean" },
        ]}
        columns={[
          { key: "image_url", label: "", render: "image" },
          { key: "name", label: "Name" },
          { key: "price", label: "Price", render: "money" },
          { key: "stock", label: "Stock" },
          { key: "is_active", label: "Active", render: "bool" },
        ]}
      />
    </>
  );
}
