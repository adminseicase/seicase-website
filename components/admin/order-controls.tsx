"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Label, NativeSelect, Textarea } from "@/components/ui/input";
import { Card } from "./ui";
import { refundOrderAction, saveOrderNotes, updateOrderStatus } from "@/lib/actions/admin/orders";
import { ORDER_STATUS_LABEL, formatINR } from "@/lib/utils";

const NEXT: Record<string, string[]> = {
  pending: ["cancelled"],
  placed: ["confirmed", "shipped", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["out_for_delivery", "delivered"],
  out_for_delivery: ["delivered"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};
const COURIERS = ["Delhivery", "Blue Dart", "DTDC", "Ecom Express", "Xpressbees", "India Post", "Shiprocket"];

export function OrderControls({
  order,
}: {
  order: {
    id: string;
    status: string;
    payment_method: string;
    payment_status: string;
    total: number;
    refunded: number;
    tracking_number: string;
    courier: string;
    tracking_url: string;
    internal_notes: string;
  };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const options = NEXT[order.status] ?? [];
  const [status, setStatus] = useState(options[0] ?? "");
  const [note, setNote] = useState("");
  const [notify, setNotify] = useState(true);
  const [tracking, setTracking] = useState({
    tracking_number: order.tracking_number,
    courier: order.courier,
    tracking_url: order.tracking_url,
  });
  const [notes, setNotes] = useState(order.internal_notes);
  const [refund, setRefund] = useState("");
  const refundable = order.total - order.refunded;
  const run = (fn: () => Promise<{ ok: boolean; message: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) toast.success(r.message);
      else toast.error(r.message);
      router.refresh();
    });

  return (
    <>
      <Card title="Update status">
        {options.length ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (status === "cancelled" && !confirm("Cancel this order? Stock will be restored and any online payment refunded.")) return;
              run(() => updateOrderStatus({ orderId: order.id, status, note, notify, ...(status === "shipped" ? tracking : {}) }));
            }}
          >
            <NativeSelect aria-label="New status" value={status} onChange={(e) => setStatus(e.target.value)}>
              {options.map((s) => (
                <option key={s} value={s}>
                  {ORDER_STATUS_LABEL[s]}
                </option>
              ))}
            </NativeSelect>
            {status === "shipped" && (
              <div className="bg-surface-muted/50 space-y-2 rounded-lg p-3">
                <div>
                  <Label htmlFor="oc-courier">Courier</Label>
                  <Input
                    id="oc-courier"
                    list="couriers"
                    value={tracking.courier}
                    onChange={(e) => setTracking({ ...tracking, courier: e.target.value })}
                  />
                  <datalist id="couriers">
                    {COURIERS.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <Label htmlFor="oc-tn">Tracking number</Label>
                  <Input
                    id="oc-tn"
                    value={tracking.tracking_number}
                    onChange={(e) => setTracking({ ...tracking, tracking_number: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="oc-tu">Tracking link</Label>
                  <Input
                    id="oc-tu"
                    type="url"
                    value={tracking.tracking_url}
                    onChange={(e) => setTracking({ ...tracking, tracking_url: e.target.value })}
                    placeholder="https://…"
                  />
                </div>
              </div>
            )}
            <Textarea
              aria-label="Note for the customer (optional)"
              placeholder="Note for the customer (optional)"
              rows={2}
              className="min-h-16"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={notify} onChange={(e) => setNotify(e.target.checked)} /> Email the customer
            </label>
            <Button type="submit" className="w-full" disabled={pending}>
              Update to {ORDER_STATUS_LABEL[status]}
            </Button>
          </form>
        ) : (
          <p className="text-muted text-sm">This order is {ORDER_STATUS_LABEL[order.status].toLowerCase()} — no further status changes.</p>
        )}
      </Card>

      {["shipped", "out_for_delivery", "delivered"].includes(order.status) && (
        <Card title="Tracking">
          <form
            className="space-y-2"
            onSubmit={(e) => (
              e.preventDefault(),
              run(() => updateOrderStatus({ orderId: order.id, status: order.status, notify: false, ...tracking }))
            )}
          >
            <Input
              aria-label="Courier"
              placeholder="Courier"
              value={tracking.courier}
              onChange={(e) => setTracking({ ...tracking, courier: e.target.value })}
            />
            <Input
              aria-label="Tracking number"
              placeholder="Tracking number"
              value={tracking.tracking_number}
              onChange={(e) => setTracking({ ...tracking, tracking_number: e.target.value })}
            />
            <Input
              aria-label="Tracking URL"
              placeholder="Tracking URL"
              value={tracking.tracking_url}
              onChange={(e) => setTracking({ ...tracking, tracking_url: e.target.value })}
            />
            <Button type="submit" size="sm" variant="outline" disabled={pending}>
              Save tracking
            </Button>
          </form>
        </Card>
      )}

      {refundable > 0 && (order.payment_status === "paid" || order.payment_status === "partially_refunded") && (
        <Card title="Refund">
          <p className="text-muted mb-2 text-sm">
            Refundable: {formatINR(refundable)}{" "}
            {order.payment_method === "cod" ? "(COD — pay the customer by UPI/bank, this records it)" : "via Razorpay"}
          </p>
          <div className="flex gap-2">
            <Input
              aria-label="Refund amount"
              type="number"
              min={1}
              max={refundable}
              placeholder={`Full (${refundable})`}
              value={refund}
              onChange={(e) => setRefund(e.target.value)}
            />
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => {
                const amt = refund ? Number(refund) : refundable;
                if (!confirm(`Refund ${formatINR(amt)}?`)) return;
                run(() => refundOrderAction(order.id, refund ? Number(refund) : null));
              }}
            >
              Refund
            </Button>
          </div>
        </Card>
      )}

      <Card title="Internal notes">
        <Textarea
          aria-label="Internal notes"
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Only visible to staff"
        />
        <Button size="sm" variant="outline" className="mt-2" disabled={pending} onClick={() => run(() => saveOrderNotes(order.id, notes))}>
          Save notes
        </Button>
      </Card>
    </>
  );
}
