"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Label } from "@/components/ui/input";
import { changePassword, updateProfile } from "@/lib/actions/account";

export function DetailsForm({ initial }: { initial: { full_name: string; phone: string; email: string; marketing_opt_in: boolean } }) {
  const [form, setForm] = useState(initial);
  const [password, setPassword] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="space-y-10">
      <form
        className="bg-surface grid max-w-xl gap-4 rounded-2xl border p-6"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await updateProfile({ full_name: form.full_name, phone: form.phone, marketing_opt_in: form.marketing_opt_in });
            if (r.ok) toast.success(r.message);
            else toast.error(r.message);
          });
        }}
      >
        <h2 className="text-2xl">Personal details</h2>
        <div>
          <Label htmlFor="d-name">Full name</Label>
          <Input
            id="d-name"
            required
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            autoComplete="name"
          />
        </div>
        <div>
          <Label htmlFor="d-email">Email</Label>
          <Input id="d-email" value={form.email} disabled readOnly />
        </div>
        <div>
          <Label htmlFor="d-phone">Mobile number</Label>
          <Input
            id="d-phone"
            inputMode="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            autoComplete="tel"
          />
        </div>
        <label className="flex items-center gap-3 text-sm">
          <Checkbox checked={form.marketing_opt_in} onChange={(e) => setForm({ ...form, marketing_opt_in: e.target.checked })} /> Email me
          about new arrivals and offers
        </label>
        <Button type="submit" className="w-fit" disabled={pending}>
          Save changes
        </Button>
      </form>
      <form
        className="bg-surface grid max-w-xl gap-4 rounded-2xl border p-6"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await changePassword({ password });
            if (r.ok) {
              toast.success(r.message);
              setPassword("");
            } else toast.error(r.message);
          });
        }}
      >
        <h2 className="text-2xl">Change password</h2>
        <div>
          <Label htmlFor="d-pw">New password</Label>
          <Input
            id="d-pw"
            type="password"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <Button type="submit" variant="secondary" className="w-fit" disabled={pending}>
          Update password
        </Button>
      </form>
    </div>
  );
}
