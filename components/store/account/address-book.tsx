"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Pencil, Plus, Trash } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Label, NativeSelect } from "@/components/ui/input";
import { Modal } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { deleteAddress, saveAddress } from "@/lib/actions/account";
import { INDIAN_STATES } from "@/lib/utils";
import type { SavedAddress } from "@/lib/types";

const empty = {
  full_name: "",
  phone: "",
  line1: "",
  line2: "",
  landmark: "",
  city: "",
  state: "",
  pincode: "",
  label: "Home",
  is_default: false,
};

export function AddressBook({ addresses }: { addresses: SavedAddress[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<typeof empty & { id?: string }>(empty);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof empty, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const edit = (a?: SavedAddress) => {
    setForm(
      a
        ? {
            id: a.id,
            full_name: a.full_name,
            phone: a.phone.replace(/^\+91/, ""),
            line1: a.line1,
            line2: a.line2 ?? "",
            landmark: a.landmark ?? "",
            city: a.city,
            state: a.state,
            pincode: a.pincode,
            label: a.label ?? "Home",
            is_default: a.is_default,
          }
        : { ...empty, is_default: addresses.length === 0 },
    );
    setOpen(true);
  };
  const input = (k: keyof typeof empty, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <Label htmlFor={`ab-${k}`}>{label}</Label>
      <Input id={`ab-${k}`} value={form[k] as string} onChange={(e) => set(k, e.target.value)} {...props} />
    </div>
  );

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {addresses.map((a) => (
          <div key={a.id} className="bg-surface rounded-2xl border p-5 text-sm">
            <div className="mb-2 flex items-center gap-2">
              <MapPin className="size-4 stroke-[1.5]" aria-hidden="true" />
              <p className="font-medium">{a.label}</p>
              {a.is_default && <Badge tone="cognac">Default</Badge>}
            </div>
            <address className="text-muted leading-relaxed not-italic">
              {a.full_name}
              <br />
              {a.line1}
              {a.line2 ? `, ${a.line2}` : ""}
              <br />
              {a.city}, {a.state} {a.pincode}
              <br />
              {a.phone}
            </address>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => edit(a)}>
                <Pencil /> Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (!confirm("Remove this address?")) return;
                  start(async () => {
                    const r = await deleteAddress(a.id);
                    toast.success(r.message);
                    router.refresh();
                  });
                }}
              >
                <Trash /> Remove
              </Button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => edit()}
          className="text-muted hover:border-foreground hover:text-foreground flex min-h-44 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed text-sm"
        >
          <Plus className="size-5 stroke-[1.5]" aria-hidden="true" /> Add a new address
        </button>
      </div>
      <Modal open={open} onOpenChange={setOpen} title={form.id ? "Edit address" : "New address"}>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await saveAddress(form);
              if (r.ok) {
                toast.success(r.message);
                setOpen(false);
                router.refresh();
              } else toast.error(r.message);
            });
          }}
        >
          <div className="sm:col-span-2">{input("full_name", "Full name", { required: true, autoComplete: "name" })}</div>
          <div className="sm:col-span-2">{input("line1", "Flat / house no., building, street", { required: true })}</div>
          {input("line2", "Area / locality")}
          {input("landmark", "Landmark")}
          {input("pincode", "Pincode", { required: true, inputMode: "numeric", maxLength: 6, pattern: "[1-9][0-9]{5}" })}
          {input("city", "City", { required: true })}
          <div>
            <Label htmlFor="ab-state">State</Label>
            <NativeSelect id="ab-state" required value={form.state} onChange={(e) => set("state", e.target.value)}>
              <option value="">Select state</option>
              {INDIAN_STATES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </NativeSelect>
          </div>
          {input("phone", "Phone", { required: true, inputMode: "tel" })}
          {input("label", "Label (Home, Work…)")}
          <label className="flex items-center gap-3 self-end pb-3 text-sm">
            <Checkbox checked={form.is_default} onChange={(e) => set("is_default", e.target.checked)} /> Make this my default
          </label>
          <Button type="submit" className="sm:col-span-2" disabled={pending}>
            {pending ? "Saving…" : "Save address"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
