"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Label, NativeSelect, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/sheet";
import { updateReturn } from "@/lib/actions/admin/orders";
import { adjustStock } from "@/lib/actions/admin/products";
import {
  deleteReview,
  markMessage,
  moderateReview,
  remindAbandonedCart,
  replyToMessage,
  sendTestEmail,
  setRole,
  toggleSubscriber,
  updateCustomer,
} from "@/lib/actions/admin/misc";

function useRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; message: string }>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(r.message);
        after?.();
      } else toast.error(r.message);
      router.refresh();
    });
  return { pending, run };
}

export function ReturnEditor({
  r,
  orderTotal,
}: {
  r: { id: string; status: string; admin_notes: string | null; refund_amount: number | null; restocked: boolean; type: string };
  orderTotal: number;
}) {
  const { pending, run } = useRun();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(r.status);
  const [notes, setNotes] = useState(r.admin_notes ?? "");
  const [amount, setAmount] = useState(String(r.refund_amount ?? orderTotal));
  const [restock, setRestock] = useState(!r.restocked);
  const [notify, setNotify] = useState(true);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Manage
      </Button>
      <Modal open={open} onOpenChange={setOpen} title="Update return">
        <form
          className="space-y-4"
          onSubmit={(e) => (
            e.preventDefault(),
            run(
              () =>
                updateReturn({
                  returnId: r.id,
                  status,
                  admin_notes: notes,
                  refund_amount: status === "refunded" ? Number(amount) : undefined,
                  restock,
                  notify,
                }),
              () => setOpen(false),
            )
          )}
        >
          <div>
            <Label htmlFor="rt-status">Status</Label>
            <NativeSelect id="rt-status" value={status} onChange={(e) => setStatus(e.target.value)}>
              {["requested", "approved", "rejected", "received", "refunded", "exchanged"].map((s) => (
                <option key={s} value={s}>
                  {s[0].toUpperCase() + s.slice(1)}
                </option>
              ))}
            </NativeSelect>
            <p className="text-muted mt-1 text-xs">
              Approve → arrange pickup · Received → item is back · Refunded → money sent (Razorpay refunds automatically).
            </p>
          </div>
          {status === "refunded" && (
            <div>
              <Label htmlFor="rt-amt">Refund amount (₹)</Label>
              <Input id="rt-amt" type="number" min={0} max={orderTotal} value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          )}
          {!r.restocked && ["received", "refunded", "exchanged"].includes(status) && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={restock} onChange={(e) => setRestock(e.target.checked)} /> Put the items back into stock
            </label>
          )}
          <div>
            <Label htmlFor="rt-notes">Note (included in the customer email)</Label>
            <Textarea id="rt-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={notify} onChange={(e) => setNotify(e.target.checked)} /> Email the customer
          </label>
          <Button type="submit" className="w-full" disabled={pending}>
            Save
          </Button>
        </form>
      </Modal>
    </>
  );
}

export function StockAdjuster({ variantId, label }: { variantId: string; label: string }) {
  const { pending, run } = useRun();
  const [open, setOpen] = useState(false);
  const [change, setChange] = useState("");
  const [type, setType] = useState<"restock" | "return" | "adjustment">("restock");
  const [reason, setReason] = useState("New stock from workshop");
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Adjust
      </Button>
      <Modal open={open} onOpenChange={setOpen} title="Adjust stock" description={label}>
        <form
          className="space-y-4"
          onSubmit={(e) => (
            e.preventDefault(),
            run(
              () => adjustStock({ variantId, change: Number(change), type, reason }),
              () => setOpen(false),
            )
          )}
        >
          <div>
            <Label htmlFor="sa-change">Change (use a minus sign to remove, e.g. -2)</Label>
            <Input id="sa-change" type="number" required value={change} onChange={(e) => setChange(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="sa-type">Type</Label>
            <NativeSelect id="sa-type" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
              <option value="restock">Restock</option>
              <option value="return">Customer return</option>
              <option value="adjustment">Manual adjustment (damage, count correction…)</option>
            </NativeSelect>
          </div>
          <div>
            <Label htmlFor="sa-reason">Reason</Label>
            <Input id="sa-reason" required value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={pending || !change}>
            Save adjustment
          </Button>
        </form>
      </Modal>
    </>
  );
}

export function ReviewActions({ id, status, reply }: { id: string; status: string; reply: string | null }) {
  const { pending, run } = useRun();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(reply ?? "");
  return (
    <div className="flex flex-wrap gap-1.5">
      {status !== "approved" && (
        <Button size="sm" disabled={pending} onClick={() => run(() => moderateReview(id, "approved"))}>
          Approve
        </Button>
      )}
      {status !== "hidden" && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => moderateReview(id, "hidden"))}>
          Hide
        </Button>
      )}
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        {reply ? "Edit reply" : "Reply"}
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => confirm("Delete this review?") && run(() => deleteReview(id))}>
        Delete
      </Button>
      <Modal open={open} onOpenChange={setOpen} title="Public reply">
        <Textarea
          aria-label="Reply"
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Thank you for your lovely review…"
        />
        <Button
          className="mt-3 w-full"
          disabled={pending}
          onClick={() =>
            run(
              () => moderateReview(id, status === "pending" ? "approved" : (status as "approved"), text),
              () => setOpen(false),
            )
          }
        >
          Save reply {status === "pending" && "& approve"}
        </Button>
      </Modal>
    </div>
  );
}

export function MessageActions({ id, isRead, email }: { id: string; isRead: boolean; email: string }) {
  const { pending, run } = useRun();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  return (
    <div className="flex flex-wrap gap-1.5">
      <Button size="sm" onClick={() => setOpen(true)}>
        Reply
      </Button>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => markMessage(id, !isRead))}>
        Mark {isRead ? "unread" : "read"}
      </Button>
      <Modal open={open} onOpenChange={setOpen} title={`Reply to ${email}`}>
        <Textarea aria-label="Reply" rows={7} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Hi …" />
        <Button
          className="mt-3 w-full"
          disabled={pending || body.trim().length < 2}
          onClick={() =>
            run(
              () => replyToMessage(id, body),
              () => setOpen(false),
            )
          }
        >
          Send email
        </Button>
      </Modal>
    </div>
  );
}

export function CustomerControls({ id, blocked, notes }: { id: string; blocked: boolean; notes: string }) {
  const { pending, run } = useRun();
  const [n, setN] = useState(notes);
  return (
    <div className="space-y-3">
      <Textarea
        aria-label="Internal notes"
        rows={4}
        value={n}
        onChange={(e) => setN(e.target.value)}
        placeholder="Notes visible to staff only"
      />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => updateCustomer(id, { notes: n }))}>
          Save notes
        </Button>
        <Button
          size="sm"
          variant={blocked ? "primary" : "danger"}
          disabled={pending}
          onClick={() =>
            confirm(blocked ? "Unblock this customer?" : "Block this customer? They won't be able to place orders.") &&
            run(() => updateCustomer(id, { is_blocked: !blocked }))
          }
        >
          {blocked ? "Unblock" : "Block customer"}
        </Button>
      </div>
    </div>
  );
}

export function RoleForm() {
  const { pending, run } = useRun();
  const [email, setEmail] = useState("");
  const [role, setRoleV] = useState<"staff" | "admin" | "customer">("staff");
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => (
        e.preventDefault(),
        run(
          () => setRole(email, role),
          () => setEmail(""),
        )
      )}
    >
      <div className="min-w-56 flex-1">
        <Label htmlFor="rf-email">Email of an existing account</Label>
        <Input id="rf-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <NativeSelect aria-label="Role" value={role} onChange={(e) => setRoleV(e.target.value as typeof role)} className="w-36">
        <option value="staff">Staff</option>
        <option value="admin">Admin</option>
        <option value="customer">Customer (remove access)</option>
      </NativeSelect>
      <Button type="submit" disabled={pending}>
        Save role
      </Button>
    </form>
  );
}

export function RemindButton({ cartId, sent }: { cartId: string; sent: boolean }) {
  const { pending, run } = useRun();
  return (
    <Button size="sm" variant={sent ? "outline" : "primary"} disabled={pending} onClick={() => run(() => remindAbandonedCart(cartId))}>
      {sent ? "Send again" : "Send reminder"}
    </Button>
  );
}

export function SubscriberToggle({ id, active }: { id: string; active: boolean }) {
  const { pending, run } = useRun();
  return (
    <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => toggleSubscriber(id, !active))}>
      {active ? "Unsubscribe" : "Resubscribe"}
    </Button>
  );
}

export function TestEmailButtons() {
  const { pending, run } = useRun();
  const kinds = [
    ["order-confirmation", "Order confirmation"],
    ["order-status", "Shipped (with tracking)"],
    ["welcome", "Welcome"],
    ["abandoned-cart", "Abandoned cart"],
    ["return-update", "Return update"],
  ] as const;
  return (
    <div className="flex flex-wrap gap-2">
      {kinds.map(([k, label]) => (
        <Button key={k} size="sm" variant="outline" disabled={pending} onClick={() => run(() => sendTestEmail(k))}>
          Send “{label}”
        </Button>
      ))}
    </div>
  );
}
