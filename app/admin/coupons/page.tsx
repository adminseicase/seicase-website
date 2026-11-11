import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/ui";
import { CrudManager } from "@/components/admin/crud-manager";

export const metadata = { title: "Coupons" };

export default async function CouponsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
  const rows = (data ?? []).map((c) => ({
    ...c,
    summary:
      c.type === "percentage"
        ? `${Number(c.value)}% off${c.max_discount ? ` (max ₹${Number(c.max_discount)})` : ""}`
        : `₹${Number(c.value)} off`,
    usage: `${c.usage_count}${c.usage_limit ? ` / ${c.usage_limit}` : ""}`,
    state: !c.is_active
      ? "inactive"
      : c.expires_at && new Date(c.expires_at) < new Date()
        ? "expired"
        : c.auto_apply
          ? "auto-apply"
          : "active",
  }));
  return (
    <>
      <PageHeader
        title="Coupons & discounts"
        description="Percentage or flat discounts with minimum order, usage limits, per-customer limits, schedule and auto-apply."
      />
      <CrudManager
        table="coupons"
        title="Coupons"
        addLabel="Create coupon"
        rows={rows}
        defaults={{ type: "percentage", is_active: true, auto_apply: false, min_order: 0 }}
        fields={[
          { name: "code", label: "Code", type: "text", required: true, hint: "Customers type this at checkout (e.g. DIWALI15)" },
          { name: "description", label: "Internal description", type: "text" },
          {
            name: "type",
            label: "Discount type",
            type: "select",
            options: [
              { value: "percentage", label: "Percentage (%)" },
              { value: "flat", label: "Flat amount (₹)" },
            ],
          },
          { name: "value", label: "Value", type: "number", required: true },
          { name: "max_discount", label: "Maximum discount (₹) — for percentage codes", type: "number" },
          { name: "min_order", label: "Minimum order (₹)", type: "number" },
          { name: "usage_limit", label: "Total usage limit", type: "number", hint: "Blank = unlimited" },
          { name: "per_customer_limit", label: "Uses per customer", type: "number", hint: "Blank = unlimited" },
          { name: "starts_at", label: "Starts", type: "datetime" },
          { name: "expires_at", label: "Expires", type: "datetime" },
          { name: "is_active", label: "Active", type: "boolean" },
          {
            name: "auto_apply",
            label: "Apply automatically (no code needed)",
            type: "boolean",
            hint: "The best eligible auto-apply coupon is used",
          },
        ]}
        columns={[
          { key: "code", label: "Code" },
          { key: "summary", label: "Discount" },
          { key: "min_order", label: "Min order", render: "money" },
          { key: "usage", label: "Used" },
          { key: "expires_at", label: "Expires", render: "date" },
          { key: "state", label: "Status", render: "badge" },
        ]}
      />
    </>
  );
}
