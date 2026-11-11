"use server";

import { z } from "zod";
import { assertAdmin, assertStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TAGS } from "@/lib/data/catalog";
import { audit, fail, refresh, type ActionResult } from "@/lib/admin/helpers";
import { sendEmail } from "@/lib/email/send";
import { sendAbandonedCartEmail } from "@/lib/orders/abandoned";
import { env } from "@/lib/env";
import type { TablesUpdate } from "@/lib/supabase/database.types";

const uuid = z.string().uuid();

/* -------------------------------- reviews -------------------------------- */
export async function moderateReview(id: string, status: "approved" | "hidden" | "pending", reply?: string): Promise<ActionResult> {
  try {
    const user = await assertStaff();
    const supabase = await createClient();
    const patch: TablesUpdate<"reviews"> = { status: z.enum(["approved", "hidden", "pending"]).parse(status) };
    if (reply !== undefined) {
      patch.admin_reply = z.string().max(2000).parse(reply) || null;
      patch.replied_at = reply ? new Date().toISOString() : null;
    }
    const { data, error } = await supabase
      .from("reviews")
      .update(patch)
      .eq("id", uuid.parse(id))
      .select("product_id, products(slug)")
      .single();
    if (error) throw error;
    await audit(user, "review.moderate", "review", id, `Review ${status}${reply ? " with reply" : ""}`);
    refresh(TAGS.reviews(data.product_id), TAGS.product((data.products as unknown as { slug: string })?.slug ?? ""), TAGS.products);
    return { ok: true, message: `Review ${status === "approved" ? "published" : status}` };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteReview(id: string): Promise<ActionResult> {
  try {
    const user = await assertStaff();
    const supabase = await createClient();
    const { data } = await supabase.from("reviews").delete().eq("id", uuid.parse(id)).select("product_id").single();
    await audit(user, "review.delete", "review", id, "Deleted review");
    if (data) refresh(TAGS.reviews(data.product_id), TAGS.products);
    return { ok: true, message: "Review deleted" };
  } catch (e) {
    return fail(e);
  }
}

/* -------------------------------- messages ------------------------------- */
export async function markMessage(id: string, read: boolean): Promise<ActionResult> {
  try {
    await assertStaff();
    const supabase = await createClient();
    await supabase.from("contact_messages").update({ is_read: read }).eq("id", uuid.parse(id));
    return { ok: true, message: read ? "Marked as read" : "Marked as unread" };
  } catch (e) {
    return fail(e);
  }
}

export async function replyToMessage(id: string, body: string): Promise<ActionResult> {
  try {
    const user = await assertStaff();
    const text = z.string().trim().min(2).max(5000).parse(body);
    const supabase = await createClient();
    const { data: m } = await supabase.from("contact_messages").select("name, email, subject, message").eq("id", uuid.parse(id)).single();
    if (!m) return { ok: false, message: "Message not found" };
    const r = await sendEmail({
      to: m.email,
      replyTo: user.email ?? undefined,
      subject: `Re: ${m.subject || "Your message to seicase"}`,
      template: {
        kind: "admin-contact",
        name: "seicase",
        email: user.email ?? "",
        phone: null,
        message: `Hi ${m.name.split(" ")[0]},\n\n${text}\n\n— The seicase team\n\n> ${m.message.slice(0, 500)}`,
      },
    });
    if (!r.ok) return { ok: false, message: r.error ?? "Email failed" };
    await supabase.from("contact_messages").update({ is_read: true, replied_at: new Date().toISOString(), reply_body: text }).eq("id", id);
    await audit(user, "message.reply", "contact_message", id, `Replied to ${m.email}`);
    return { ok: true, message: `Reply sent to ${m.email}` };
  } catch (e) {
    return fail(e);
  }
}

/* -------------------------------- customers ------------------------------ */
export async function updateCustomer(id: string, patch: { is_blocked?: boolean; notes?: string }): Promise<ActionResult> {
  try {
    const user = await assertStaff();
    const d = z.object({ is_blocked: z.boolean().optional(), notes: z.string().max(5000).optional() }).parse(patch);
    if (d.is_blocked !== undefined && user.id === id) return { ok: false, message: "You can't block yourself." };
    const { error } = await createAdminClient().from("profiles").update(d).eq("id", uuid.parse(id));
    if (error) throw error;
    await audit(
      user,
      "customer.update",
      "profile",
      id,
      d.is_blocked !== undefined ? (d.is_blocked ? "Blocked customer" : "Unblocked customer") : "Updated notes",
    );
    return { ok: true, message: "Customer updated" };
  } catch (e) {
    return fail(e);
  }
}

/** Admin only: change a user's role (customer / staff / admin). */
export async function setRole(email: string, role: "customer" | "staff" | "admin"): Promise<ActionResult> {
  try {
    const user = await assertAdmin();
    const e = z.string().email().parse(email.trim().toLowerCase());
    const r = z.enum(["customer", "staff", "admin"]).parse(role);
    const admin = createAdminClient();
    const { data: p } = await admin.from("profiles").select("id, role").ilike("email", e).maybeSingle();
    if (!p) return { ok: false, message: "No account with that email — ask them to sign up first." };
    if (p.id === user.id && r !== "admin") return { ok: false, message: "You can't remove your own admin access." };
    const { error } = await admin.from("profiles").update({ role: r }).eq("id", p.id);
    if (error) throw error;
    await audit(user, "staff.role", "profile", p.id, `${e}: ${p.role} → ${r}`);
    return { ok: true, message: `${e} is now ${r}` };
  } catch (err) {
    return fail(err);
  }
}

/* ----------------------------- abandoned carts --------------------------- */
export async function remindAbandonedCart(cartId: string): Promise<ActionResult> {
  try {
    const user = await assertStaff();
    const r = await sendAbandonedCartEmail(uuid.parse(cartId));
    if (r.ok) await audit(user, "cart.remind", "cart", cartId, "Sent abandoned-cart reminder");
    return r;
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------- newsletter ------------------------------ */
export async function toggleSubscriber(id: string, active: boolean): Promise<ActionResult> {
  try {
    await assertStaff();
    const supabase = await createClient();
    await supabase.from("newsletter_subscribers").update({ is_active: active }).eq("id", uuid.parse(id));
    return { ok: true, message: active ? "Resubscribed" : "Unsubscribed" };
  } catch (e) {
    return fail(e);
  }
}

/* -------------------------------- emails -------------------------------- */
export async function sendTestEmail(
  kind: "order-confirmation" | "order-status" | "welcome" | "abandoned-cart" | "return-update",
): Promise<ActionResult> {
  try {
    const user = await assertStaff();
    if (!user.email) return { ok: false, message: "Your account has no email" };
    const order = {
      orderNumber: "SC10001",
      customerName: user.fullName ?? "Ananya Iyer",
      items: [
        { name: "The Tulip Tote", variant: "Tan", quantity: 1, price: 8990, image: "/images/products/the-tulip-tote/tan-front.webp" },
      ],
      subtotal: 8990,
      discount: 0,
      shipping: 0,
      codFee: 0,
      total: 8990,
      paymentMethod: "razorpay" as const,
      address: {
        full_name: "Ananya Iyer",
        line1: "Flat 4B, Lotus Residency",
        city: "Chennai",
        state: "Tamil Nadu",
        pincode: "600001",
        phone: "+91 98765 43210",
      },
      orderUrl: `${env.siteUrl}/account`,
    };
    const template =
      kind === "order-confirmation"
        ? { kind, order }
        : kind === "order-status"
          ? {
              kind,
              orderNumber: "SC10001",
              customerName: order.customerName,
              status: "shipped",
              orderUrl: order.orderUrl,
              tracking: { number: "DL123456789IN", courier: "Delhivery", url: "https://www.delhivery.com" },
            }
          : kind === "welcome"
            ? { kind, name: order.customerName }
            : kind === "abandoned-cart"
              ? { kind, name: order.customerName, items: order.items, recoverUrl: `${env.siteUrl}/cart` }
              : { kind, customerName: order.customerName, orderNumber: "SC10001", status: "approved" };
    const r = await sendEmail({
      to: user.email,
      subject: `[Test] seicase ${kind} email`,
      template: template as Parameters<typeof sendEmail>[0]["template"],
    });
    return r.ok ? { ok: true, message: `Test email sent to ${user.email}` } : { ok: false, message: r.error ?? "Failed" };
  } catch (e) {
    return fail(e);
  }
}
