"use server";

import { after } from "next/server";
import { z } from "zod";
import { assertStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit, fail, type ActionResult } from "@/lib/admin/helpers";
import { sendEmail } from "@/lib/email/send";
import { orderUrl } from "@/lib/orders/notify";
import { refundOrder } from "@/lib/orders/refund";
import type { TablesUpdate } from "@/lib/supabase/database.types";

const STATUSES = ["placed", "confirmed", "shipped", "out_for_delivery", "delivered", "cancelled", "returned"] as const;

/** Changes an order's status, records history and emails the customer. */
export async function updateOrderStatus(input: unknown): Promise<ActionResult> {
  try {
    const user = await assertStaff();
    const d = z
      .object({
        orderId: z.string().uuid(),
        status: z.enum(STATUSES),
        note: z.string().trim().max(500).optional(),
        notify: z.boolean().default(true),
        tracking_number: z.string().trim().max(60).optional(),
        courier: z.string().trim().max(60).optional(),
        tracking_url: z.string().trim().url().max(300).optional().or(z.literal("")),
      })
      .parse(input);
    const admin = createAdminClient();
    const { data: o } = await admin
      .from("orders")
      .select("id, status, order_number, access_token, email, customer_name, payment_method, payment_status")
      .eq("id", d.orderId)
      .single();
    if (!o) return { ok: false, message: "Order not found" };
    if (o.status === d.status && !d.tracking_number) return { ok: false, message: "Order already has that status" };

    if (d.status === "cancelled") {
      await admin.rpc("release_order", { p_order_id: o.id, p_reason: d.note || "Cancelled by store", p_actor: user.id });
      if (o.payment_method === "razorpay" && o.payment_status === "paid") await refundOrder(o.id, undefined, "Cancelled by store");
    } else {
      const now = new Date().toISOString();
      const patch: TablesUpdate<"orders"> = { status: d.status };
      if (d.tracking_number !== undefined) patch.tracking_number = d.tracking_number || null;
      if (d.courier !== undefined) patch.courier = d.courier || null;
      if (d.tracking_url !== undefined) patch.tracking_url = d.tracking_url || null;
      if (d.status === "shipped") patch.shipped_at = now;
      if (d.status === "delivered") {
        patch.delivered_at = now;
        if (o.payment_method === "cod") patch.payment_status = "paid";
      }
      const { error } = await admin.from("orders").update(patch).eq("id", o.id);
      if (error) throw error;
      if (o.status !== d.status)
        await admin.from("order_status_history").insert({ order_id: o.id, status: d.status, note: d.note || null, created_by: user.id });
      if (d.status === "delivered" && o.payment_method === "cod")
        await admin.from("payments").update({ status: "captured" }).eq("order_id", o.id).eq("provider", "cod");
    }

    await audit(user, "order.status", "order", o.id, `#${o.order_number}: ${o.status} → ${d.status}`, d);
    if (d.notify && ["confirmed", "shipped", "out_for_delivery", "delivered", "cancelled", "returned"].includes(d.status)) {
      const { data: fresh } = await admin.from("orders").select("tracking_number, courier, tracking_url").eq("id", o.id).single();
      after(() =>
        sendEmail({
          to: o.email,
          subject:
            {
              confirmed: "Your order is confirmed",
              shipped: "Your seicase order has shipped",
              out_for_delivery: "Out for delivery today",
              delivered: "Delivered — we hope you love it",
              cancelled: "Your order was cancelled",
              returned: "Your return is complete",
            }[d.status as "confirmed"] + ` · #${o.order_number}`,
          template: {
            kind: "order-status",
            orderNumber: o.order_number,
            customerName: o.customer_name ?? "there",
            status: d.status,
            orderUrl: orderUrl(o.order_number, o.access_token),
            tracking: fresh ? { number: fresh.tracking_number, courier: fresh.courier, url: fresh.tracking_url } : null,
            note: d.note,
          },
        }),
      );
    }
    return { ok: true, message: `Order marked ${d.status.replace(/_/g, " ")}${d.notify ? " — customer notified" : ""}` };
  } catch (e) {
    return fail(e);
  }
}

export async function saveOrderNotes(orderId: string, notes: string): Promise<ActionResult> {
  try {
    const user = await assertStaff();
    const supabase = await createClient();
    const { error } = await supabase
      .from("orders")
      .update({ internal_notes: z.string().max(5000).parse(notes) })
      .eq("id", z.string().uuid().parse(orderId));
    if (error) throw error;
    await audit(user, "order.notes", "order", orderId, "Updated internal notes");
    return { ok: true, message: "Notes saved" };
  } catch (e) {
    return fail(e);
  }
}

export async function refundOrderAction(orderId: string, amount: number | null): Promise<ActionResult> {
  try {
    const user = await assertStaff();
    const r = await refundOrder(z.string().uuid().parse(orderId), amount ?? undefined, `Refund by ${user.email}`);
    if (r.ok) await audit(user, "order.refund", "order", orderId, r.message, { amount, refundId: r.refundId });
    return r.ok ? { ok: true, message: r.message } : { ok: false, message: r.message };
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------- returns ------------------------------- */
export async function updateReturn(input: unknown): Promise<ActionResult> {
  try {
    const user = await assertStaff();
    const d = z
      .object({
        returnId: z.string().uuid(),
        status: z.enum(["requested", "approved", "rejected", "received", "refunded", "exchanged"]),
        admin_notes: z.string().max(2000).optional(),
        refund_amount: z.coerce.number().min(0).optional().nullable(),
        restock: z.boolean().optional(),
        notify: z.boolean().default(true),
      })
      .parse(input);
    const admin = createAdminClient();
    const { data: r } = await admin
      .from("returns")
      .select("*, orders(id, order_number, email, customer_name, total)")
      .eq("id", d.returnId)
      .single();
    if (!r) return { ok: false, message: "Return not found" };
    const order = r.orders as unknown as { id: string; order_number: string; email: string; customer_name: string | null; total: number };

    let refundRef: string | null = null;
    if (d.status === "refunded" && r.status !== "refunded") {
      const res = await refundOrder(order.id, d.refund_amount ?? undefined, `Return ${r.return_number}`);
      if (!res.ok) return { ok: false, message: res.message };
      refundRef = res.refundId ?? null;
    }
    // Restock returned items once
    if (d.restock && !r.restocked && ["received", "refunded", "exchanged"].includes(d.status)) {
      const { data: items } = await admin
        .from("order_items")
        .select("variant_id, quantity")
        .in("id", r.order_item_ids)
        .not("variant_id", "is", null);
      for (const it of items ?? [])
        await admin.rpc("adjust_stock", {
          p_variant_id: it.variant_id!,
          p_change: it.quantity,
          p_type: "return",
          p_reason: `Return ${r.return_number}`,
        });
    }
    await admin
      .from("returns")
      .update({
        status: d.status,
        admin_notes: d.admin_notes ?? r.admin_notes,
        refund_amount: d.refund_amount ?? r.refund_amount,
        refund_reference: refundRef ?? r.refund_reference,
        restocked: r.restocked || (!!d.restock && ["received", "refunded", "exchanged"].includes(d.status)),
      })
      .eq("id", r.id);
    if (d.status === "refunded" && r.type === "return") {
      await admin.from("orders").update({ status: "returned" }).eq("id", order.id);
      await admin
        .from("order_status_history")
        .insert({ order_id: order.id, status: "returned", note: `Return ${r.return_number} refunded`, created_by: user.id });
    }
    await audit(user, "return.update", "return", r.id, `${r.return_number}: ${r.status} → ${d.status}`);
    if (d.notify && d.status !== r.status) {
      after(() =>
        sendEmail({
          to: order.email,
          subject: `Update on your ${r.type} for #${order.order_number}`,
          template: {
            kind: "return-update",
            customerName: order.customer_name ?? "there",
            orderNumber: order.order_number,
            status: d.status,
            refundAmount: d.refund_amount ?? null,
            note: d.admin_notes,
          },
        }),
      );
    }
    return { ok: true, message: `Return ${d.status}` };
  } catch (e) {
    return fail(e);
  }
}
