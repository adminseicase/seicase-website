import { type NextRequest } from "next/server";
import { getOrderForViewer } from "@/lib/data/orders";
import { getSiteSettings } from "@/lib/data/content";
import { buildInvoicePdf } from "@/lib/orders/invoice";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";

/**
 * GET /api/invoice/SC12345?t=<token>[&type=packing]
 * Owner, staff, or token holder only. A copy is archived in the private
 * `invoices` storage bucket the first time it's generated.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/invoice/[orderNumber]">) {
  const { orderNumber } = await ctx.params;
  const token = request.nextUrl.searchParams.get("t");
  const type = request.nextUrl.searchParams.get("type") === "packing" ? "packing" : "invoice";
  const res = await getOrderForViewer(orderNumber, token);
  if (!res || res.order.status === "pending") return new Response("Not found", { status: 404 });
  if (type === "packing") {
    const user = await getCurrentUser();
    if (!user || (user.role !== "admin" && user.role !== "staff")) return new Response("Forbidden", { status: 403 });
  }
  const { store } = await getSiteSettings();
  const bytes = await buildInvoicePdf(res.order, store, type);

  if (type === "invoice") {
    createAdminClient()
      .storage.from("invoices")
      .upload(`${res.order.order_number}.pdf`, bytes, { contentType: "application/pdf", upsert: true })
      .catch(() => {});
  }
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${type === "packing" ? "inline" : "attachment"}; filename="seicase-${type}-${res.order.order_number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
