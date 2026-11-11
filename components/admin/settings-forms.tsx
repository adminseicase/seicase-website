"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Plus, Trash } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Label, NativeSelect, Textarea } from "@/components/ui/input";
import { saveSetting } from "@/lib/actions/admin/settings";
import type { SiteSettings } from "@/lib/types";

type SettingKey = Parameters<typeof saveSetting>[0];

function useSave(key: SettingKey) {
  const [pending, start] = useTransition();
  return {
    pending,
    save: (value: unknown) =>
      start(async () => {
        const r = await saveSetting(key, value);
        if (r.ok) toast.success(r.message);
        else toast.error(r.message);
      }),
  };
}

function Box({
  title,
  description,
  children,
  onSave,
  pending,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  onSave: () => void;
  pending: boolean;
}) {
  return (
    <form
      className="bg-surface rounded-xl border p-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
    >
      <h2 className="font-sans text-sm font-medium">{title}</h2>
      {description && <p className="text-muted mt-0.5 text-xs">{description}</p>}
      <div className="mt-4 space-y-4">{children}</div>
      <Button type="submit" size="sm" className="mt-5" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}

function F({
  label,
  value,
  onChange,
  type = "text",
  hint,
}: {
  label: string;
  value: string | number | null;
  onChange: (v: string) => void;
  type?: string;
  hint?: string;
}) {
  const id = `s-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
      {hint && <p className="text-muted mt-1 text-xs">{hint}</p>}
    </div>
  );
}

export function AnnouncementForm({ value }: { value: SiteSettings["announcement"] }) {
  const [v, setV] = useState(value);
  const { save, pending } = useSave("announcement");
  return (
    <Box
      title="Announcement bar"
      description="The thin strip above the header. Up to 4 messages, separated by a divider."
      onSave={() => save({ ...v, messages: v.messages.filter(Boolean) })}
      pending={pending}
    >
      <label className="flex items-center gap-3 text-sm">
        <Checkbox checked={v.enabled} onChange={(e) => setV({ ...v, enabled: e.target.checked })} /> Show announcement bar
      </label>
      {v.messages.map((m, i) => (
        <div key={i} className="flex gap-2">
          <Input
            aria-label={`Message ${i + 1}`}
            value={m}
            onChange={(e) => setV({ ...v, messages: v.messages.map((x, j) => (j === i ? e.target.value : x)) })}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Remove message"
            onClick={() => setV({ ...v, messages: v.messages.filter((_, j) => j !== i) })}
          >
            <Trash />
          </Button>
        </div>
      ))}
      {v.messages.length < 4 && (
        <Button type="button" variant="outline" size="sm" onClick={() => setV({ ...v, messages: [...v.messages, ""] })}>
          <Plus /> Add message
        </Button>
      )}
      <F label="Link (optional)" value={v.link} onChange={(link) => setV({ ...v, link })} hint="e.g. /shipping-policy" />
    </Box>
  );
}

const SECTION_LABELS: Record<string, string> = {
  hero: "Hero carousel",
  trust: "Trust strip",
  categories: "Shop by Category",
  crafted: "Crafted with Care + video",
  trending: "Trending Picks",
  styles: "Shop by Style",
  lifestyle: "More Than a Bag banner",
  newsletter: "Join Our Journey (newsletter)",
};

export function HomepageForm({ value }: { value: SiteSettings["homepage"] }) {
  const [sections, setSections] = useState(value.sections);
  const { save, pending } = useSave("homepage");
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= sections.length) return;
    const next = [...sections];
    [next[i], next[j]] = [next[j], next[i]];
    setSections(next);
  };
  return (
    <Box
      title="Homepage sections"
      description="Reorder or hide sections of the home page."
      onSave={() => save({ sections })}
      pending={pending}
    >
      <ul className="divide-y rounded-lg border">
        {sections.map((s, i) => (
          <li key={s.id} className="flex items-center gap-3 px-3 py-2 text-sm">
            <Checkbox
              aria-label={`Show ${SECTION_LABELS[s.id]}`}
              checked={s.visible}
              onChange={(e) => setSections(sections.map((x) => (x.id === s.id ? { ...x, visible: e.target.checked } : x)))}
            />
            <span className={s.visible ? "" : "text-muted line-through"}>{SECTION_LABELS[s.id]}</span>
            <span className="ml-auto flex">
              <button
                type="button"
                onClick={() => move(i, -1)}
                className="hover:bg-surface-muted inline-flex size-8 items-center justify-center rounded"
                aria-label="Move up"
              >
                <ArrowUp className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                className="hover:bg-surface-muted inline-flex size-8 items-center justify-center rounded"
                aria-label="Move down"
              >
                <ArrowDown className="size-3.5" />
              </button>
            </span>
          </li>
        ))}
      </ul>
    </Box>
  );
}

export function TrustStripForm({ value }: { value: SiteSettings["trust_strip"] }) {
  const [items, setItems] = useState(value.items);
  const { save, pending } = useSave("trust_strip");
  return (
    <Box title="Trust strip" description="The row of promises under the hero." onSave={() => save({ items })} pending={pending}>
      {items.map((it, i) => (
        <div key={i} className="grid grid-cols-[120px_1fr_1fr_auto] gap-2">
          <NativeSelect
            aria-label="Icon"
            value={it.icon}
            onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, icon: e.target.value as typeof it.icon } : x)))}
          >
            {["leather", "design", "shipping", "returns", "secure"].map((o) => (
              <option key={o}>{o}</option>
            ))}
          </NativeSelect>
          <Input
            aria-label="Title"
            value={it.title}
            onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
          />
          <Input
            aria-label="Subtitle"
            value={it.subtitle}
            onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, subtitle: e.target.value } : x)))}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Remove"
            onClick={() => setItems(items.filter((_, j) => j !== i))}
          >
            <Trash />
          </Button>
        </div>
      ))}
      {items.length < 6 && (
        <Button type="button" variant="outline" size="sm" onClick={() => setItems([...items, { icon: "design", title: "", subtitle: "" }])}>
          <Plus /> Add item
        </Button>
      )}
    </Box>
  );
}

export function BannersForm({ value }: { value: SiteSettings["banners"] }) {
  const [v, setV] = useState(value);
  const { save, pending } = useSave("banners");
  const c = v.crafted;
  const l = v.lifestyle;
  return (
    <Box
      title="Homepage banners"
      description="Text, links and images for the story banners and newsletter strip."
      onSave={() => save(v)}
      pending={pending}
    >
      <p className="text-muted text-xs font-medium tracking-wider uppercase">Crafted with Care</p>
      <div className="grid gap-3 md:grid-cols-2">
        <F label="Title" value={c.title} onChange={(x) => setV({ ...v, crafted: { ...c, title: x } })} />
        <F label="Background image URL" value={c.image} onChange={(x) => setV({ ...v, crafted: { ...c, image: x } })} />
        <div className="md:col-span-2">
          <Label htmlFor="b-cbody">Text</Label>
          <Textarea id="b-cbody" rows={2} value={c.body} onChange={(e) => setV({ ...v, crafted: { ...c, body: e.target.value } })} />
        </div>
        <F label="Link label" value={c.link_label} onChange={(x) => setV({ ...v, crafted: { ...c, link_label: x } })} />
        <F label="Link URL" value={c.link_href} onChange={(x) => setV({ ...v, crafted: { ...c, link_href: x } })} />
        <F
          label="Process video (YouTube or .mp4 URL)"
          value={c.video_url}
          onChange={(x) => setV({ ...v, crafted: { ...c, video_url: x } })}
          hint="Loads only when a shopper presses play."
        />
        <F label="Video poster image URL" value={c.video_poster} onChange={(x) => setV({ ...v, crafted: { ...c, video_poster: x } })} />
        <F label="Video label" value={c.video_label} onChange={(x) => setV({ ...v, crafted: { ...c, video_label: x } })} />
      </div>
      <p className="text-muted pt-2 text-xs font-medium tracking-wider uppercase">More Than a Bag</p>
      <div className="grid gap-3 md:grid-cols-2">
        <F label="Title" value={l.title} onChange={(x) => setV({ ...v, lifestyle: { ...l, title: x } })} />
        <F label="Image URL" value={l.image} onChange={(x) => setV({ ...v, lifestyle: { ...l, image: x } })} />
        <F label="Text" value={l.body} onChange={(x) => setV({ ...v, lifestyle: { ...l, body: x } })} />
        <F label="Button label" value={l.cta_label} onChange={(x) => setV({ ...v, lifestyle: { ...l, cta_label: x } })} />
        <F label="Button URL" value={l.cta_href} onChange={(x) => setV({ ...v, lifestyle: { ...l, cta_href: x } })} />
      </div>
      <p className="text-muted pt-2 text-xs font-medium tracking-wider uppercase">Newsletter strip</p>
      <div className="grid gap-3 md:grid-cols-2">
        <F label="Title" value={v.newsletter.title} onChange={(x) => setV({ ...v, newsletter: { ...v.newsletter, title: x } })} />
        <F label="Text" value={v.newsletter.body} onChange={(x) => setV({ ...v, newsletter: { ...v.newsletter, body: x } })} />
      </div>
    </Box>
  );
}

export function StoreForm({ value }: { value: SiteSettings["store"] }) {
  const [v, setV] = useState(value);
  const { save, pending } = useSave("store");
  const f = (k: keyof typeof v, label: string, hint?: string) => (
    <F label={label} value={v[k] as string} onChange={(x) => setV({ ...v, [k]: x })} hint={hint} />
  );
  return (
    <Box
      title="Store information"
      description="Shown in the footer, contact page, emails and invoices."
      onSave={() => save(v)}
      pending={pending}
    >
      <div className="grid gap-3 md:grid-cols-2">
        {f("name", "Store name")}
        {f("legal_name", "Legal / business name", "Printed on invoices")}
        {f("email", "Support email")}
        {f("phone", "Phone")}
        {f("whatsapp", "WhatsApp number")}
        {f("hours", "Opening hours")}
        {f("address_line", "Address")}
        {f("city", "City")}
        {f("state", "State")}
        {f("pincode", "Pincode")}
        {f("gstin", "GSTIN", "Printed on invoices")}
        <div className="grid grid-cols-2 gap-2">
          {f("map_lat", "Map latitude")}
          {f("map_lng", "Map longitude")}
        </div>
      </div>
    </Box>
  );
}

export function ShippingForm({ value }: { value: SiteSettings["shipping"] }) {
  const [v, setV] = useState(value);
  const { save, pending } = useSave("shipping");
  const f = (k: keyof typeof v, label: string, type = "number") => (
    <F type={type} label={label} value={v[k] as number} onChange={(x) => setV({ ...v, [k]: type === "number" ? Number(x) : x })} />
  );
  return (
    <Box
      title="Shipping, COD & returns"
      description="Used in the cart, checkout, product pages and enforced on the server when an order is placed."
      onSave={() => save(v)}
      pending={pending}
    >
      <div className="grid gap-3 md:grid-cols-3">
        {f("free_threshold", "Free shipping above (₹)")}
        {f("flat_rate", "Flat shipping rate (₹)")}
        {f("return_window_days", "Return window (days)")}
        {f("metro_days", "Metro delivery (days)", "text")}
        {f("standard_days", "Other cities (days)", "text")}
      </div>
      <label className="flex items-center gap-3 text-sm">
        <Checkbox checked={v.cod_enabled} onChange={(e) => setV({ ...v, cod_enabled: e.target.checked })} /> Offer Cash on Delivery
      </label>
      <div className="grid gap-3 md:grid-cols-3">
        {f("cod_fee", "COD handling fee (₹)")}
        {f("cod_max_order", "COD maximum order (₹)")}
      </div>
    </Box>
  );
}

export function SocialForm({ value }: { value: SiteSettings["social"] }) {
  const [v, setV] = useState(value);
  const { save, pending } = useSave("social");
  return (
    <Box title="Social links" onSave={() => save(v)} pending={pending}>
      <div className="grid gap-3 md:grid-cols-2">
        {(["instagram", "pinterest", "youtube", "facebook"] as const).map((k) => (
          <F key={k} label={k[0].toUpperCase() + k.slice(1)} value={v[k]} onChange={(x) => setV({ ...v, [k]: x || null })} />
        ))}
      </div>
    </Box>
  );
}

export function NotificationsForm({ value }: { value: { admin_email: string; low_stock_email: boolean; new_order_email: boolean } }) {
  const [v, setV] = useState(value);
  const { save, pending } = useSave("notifications");
  return (
    <Box
      title="Notifications"
      description="Where new-order, contact-form and low-stock emails are sent."
      onSave={() => save(v)}
      pending={pending}
    >
      <F label="Admin email" value={v.admin_email} onChange={(x) => setV({ ...v, admin_email: x })} />
      <label className="flex items-center gap-3 text-sm">
        <Checkbox checked={v.new_order_email} onChange={(e) => setV({ ...v, new_order_email: e.target.checked })} /> Email me for every new
        order
      </label>
      <label className="flex items-center gap-3 text-sm">
        <Checkbox checked={v.low_stock_email} onChange={(e) => setV({ ...v, low_stock_email: e.target.checked })} /> Daily low-stock alert
      </label>
    </Box>
  );
}
