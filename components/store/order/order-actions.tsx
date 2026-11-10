"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/sheet";
import { Label, NativeSelect, Textarea } from "@/components/ui/input";
import { cancelOrder, requestReturn } from "@/lib/actions/account";
import { retryPayment } from "@/lib/actions/checkout";
import { openRazorpay } from "../checkout/razorpay";

const REASONS = ["Changed my mind", "Colour looks different", "Size isn't right", "Item damaged or defective", "Wrong item received", "Other"];

export function OrderActions({
  orderId,
  orderNumber,
  token,
  canCancel,
  canReturn,
  items,
  pending,
}: {
  orderId: string;
  orderNumber: string;
  token?: string;
  canCancel: boolean;
  canReturn: boolean;
  items: { id: string; name: string }[];
  pending: boolean;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [returnOpen, setReturnOpen] = useState(false);
  const [type, setType] = useState<"return" | "exchange">("return");
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");
  const [selected, setSelected] = useState<string[]>(items.map((i) => i.id));

  if (!canCancel && !canReturn && !pending) return null;
  return (
    <div className="mt-5 flex flex-wrap gap-3">
      {pending && token && (
        <Button
          disabled={busy}
          onClick={() =>
            start(async () => {
              const res = await retryPayment({ orderNumber, accessToken: token });
              if (!res.ok || res.kind !== "razorpay") return void toast.error(res.ok ? "Unable to retry" : res.message);
              await openRazorpay({ ...res, onSuccess: (r) => router.push(r), onError: (m) => toast.error(m), onDismiss: () => {} });
            })
          }
        >
          Complete payment
        </Button>
      )}
      {canCancel && (
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => {
            if (!confirm("Cancel this order? Any online payment will be refunded.")) return;
            start(async () => {
              const r = await cancelOrder({ orderId, token });
              if (r.ok) {
                toast.success(r.message);
                router.refresh();
              } else toast.error(r.message);
            });
          }}
        >
          Cancel order
        </Button>
      )}
      {canReturn && (
        <Button variant="secondary" onClick={() => setReturnOpen(true)}>
          Request return / exchange
        </Button>
      )}
      <Modal open={returnOpen} onOpenChange={setReturnOpen} title="Return or exchange" description={`Order #${orderNumber}`}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await requestReturn({ orderId, itemIds: selected, type, reason, details, token });
              if (r.ok) {
                toast.success(r.message);
                setReturnOpen(false);
                router.refresh();
              } else toast.error(r.message);
            });
          }}
        >
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Items</legend>
            {items.map((i) => (
              <label key={i.id} className="flex min-h-10 items-center gap-3 text-sm">
                <input type="checkbox" className="size-4 accent-foreground" checked={selected.includes(i.id)} onChange={(e) => setSelected((s) => (e.target.checked ? [...s, i.id] : s.filter((x) => x !== i.id)))} />
                {i.name}
              </label>
            ))}
          </fieldset>
          <fieldset className="flex gap-3">
            <legend className="mb-2 text-sm font-medium">I&apos;d like</legend>
            {(["return", "exchange"] as const).map((t) => (
              <label key={t} className="flex items-center gap-2 text-sm capitalize">
                <input type="radio" name="rtype" className="accent-foreground" checked={type === t} onChange={() => setType(t)} /> {t === "return" ? "A refund" : "An exchange"}
              </label>
            ))}
          </fieldset>
          <div>
            <Label htmlFor="r-reason">Reason</Label>
            <NativeSelect id="r-reason" value={reason} onChange={(e) => setReason(e.target.value)}>
              {REASONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </NativeSelect>
          </div>
          <div>
            <Label htmlFor="r-details">Tell us more (optional)</Label>
            <Textarea id="r-details" value={details} onChange={(e) => setDetails(e.target.value)} maxLength={2000} />
          </div>
          <Button type="submit" className="w-full" disabled={busy || !selected.length}>
            Submit request
          </Button>
        </form>
      </Modal>
    </div>
  );
}
