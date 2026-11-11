"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, ExternalLink, Plus, Trash } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Label, NativeSelect, Textarea } from "@/components/ui/input";
import { duplicateProduct, saveProduct } from "@/lib/actions/admin/products";
import { slugify, cn } from "@/lib/utils";
import { RichText } from "./rich-text";
import { ImageManager, type ManagedImage } from "./image-manager";

interface Option {
  id: string;
  name: string;
}
export interface ProductFormValue {
  id: string | null;
  name: string;
  slug: string;
  short_description: string;
  description: string;
  category_id: string;
  collection_id: string;
  style_ids: string[];
  material: string;
  dimensions: string;
  width_cm: string;
  height_cm: string;
  depth_cm: string;
  strap_drop_cm: string;
  weight_g: string;
  care_instructions: string;
  price: string;
  compare_at_price: string;
  cost_price: string;
  gst_rate: string;
  status: "draft" | "published" | "archived";
  publish_at: string;
  is_featured: boolean;
  is_trending: boolean;
  is_new: boolean;
  low_stock_threshold: string;
  seo_title: string;
  seo_description: string;
  variants: {
    id: string;
    colour_name: string;
    colour_hex: string;
    sku: string;
    stock: string;
    price_override: string;
    is_default: boolean;
  }[];
  images: ManagedImage[];
}

const PRESET_COLOURS = [
  ["Tan", "#A0623A"],
  ["Cognac", "#9C5A33"],
  ["Brown", "#6E3B22"],
  ["Dark Brown", "#3F2618"],
  ["Olive", "#5F5D3B"],
  ["Burgundy", "#6D2430"],
  ["Ivory", "#E6D8C3"],
  ["Black", "#24201D"],
];

function Section({ title, children, description }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface rounded-xl border p-5">
      <h2 className="font-sans text-sm font-medium">{title}</h2>
      {description && <p className="text-muted mt-0.5 text-xs">{description}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export function ProductForm({
  initial,
  categories,
  collections,
  styles,
}: {
  initial: ProductFormValue;
  categories: Option[];
  collections: Option[];
  styles: Option[];
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(!!initial.id);
  const [pending, start] = useTransition();
  const set = <K extends keyof ProductFormValue>(k: K, val: ProductFormValue[K]) => setV((s) => ({ ...s, [k]: val }));
  const field = (k: keyof ProductFormValue, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, hint?: string) => (
    <div>
      <Label htmlFor={`pf-${k}`}>{label}</Label>
      <Input id={`pf-${k}`} value={v[k] as string} onChange={(e) => set(k, e.target.value as never)} {...props} />
      {hint && <p className="text-muted mt-1 text-xs">{hint}</p>}
    </div>
  );
  const margin =
    Number(v.price) && Number(v.cost_price) ? Math.round(((Number(v.price) - Number(v.cost_price)) / Number(v.price)) * 100) : null;

  const save = () =>
    start(async () => {
      const r = await saveProduct({
        ...v,
        variants: v.variants.map((x, i) => ({ ...x, sort_order: i })),
        publish_at: v.publish_at || null,
      });
      if (!r.ok) return void toast.error(r.message);
      toast.success(r.message);
      if (!v.id && r.data) router.replace(`/admin/products/${r.data.id}`);
      else router.refresh();
    });

  const addVariant = (name = "", hex = "#9C5A33") => {
    const base = v.slug || slugify(v.name) || "item";
    const code = base
      .replace(/^the-/, "")
      .split("-")
      .map((w) => w.slice(0, 3))
      .join("")
      .toUpperCase();
    set("variants", [
      ...v.variants,
      {
        id: crypto.randomUUID(),
        colour_name: name,
        colour_hex: hex,
        sku: name ? `SC-${code}-${slugify(name).replace(/-/g, "").slice(0, 4).toUpperCase()}` : "",
        stock: "0",
        price_override: "",
        is_default: v.variants.length === 0,
      },
    ]);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="grid gap-6 xl:grid-cols-[1fr_340px]"
    >
      <div className="space-y-6">
        <Section title="Basics">
          {field("name", "Product name", {
            required: true,
            onChange: (e) => {
              const name = e.target.value;
              setV((s) => ({ ...s, name, slug: slugTouched ? s.slug : slugify(name) }));
            },
          })}
          <div>
            <Label htmlFor="pf-slug">URL slug</Label>
            <div className="border-border-strong bg-surface focus-within:border-cognac flex items-center rounded-md border">
              <span className="text-muted pl-3 text-sm">/product/</span>
              <input
                id="pf-slug"
                value={v.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", slugify(e.target.value));
                }}
                className="h-11 min-w-0 flex-1 bg-transparent pr-3 text-sm focus:outline-none"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="pf-short">Short description</Label>
            <Textarea
              id="pf-short"
              rows={2}
              className="min-h-16"
              maxLength={300}
              value={v.short_description}
              onChange={(e) => set("short_description", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="pf-desc">Full description</Label>
            <RichText id="pf-desc" label="Full description" value={v.description} onChange={(h) => set("description", h)} />
          </div>
        </Section>

        <Section
          title="Photos"
          description="The first photo (or the one marked primary) is used on product cards. Tag photos to a colour so they swap when shoppers pick a swatch."
        >
          <ImageManager
            images={v.images}
            onChange={(imgs) => set("images", imgs)}
            variants={v.variants}
            folder={`products/${v.slug || "new"}`}
            productName={v.name}
          />
        </Section>

        <Section title="Colours & stock" description="Each colour has its own SKU, stock and optional price.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-muted text-left text-xs">
                <tr>
                  <th className="pb-2 font-medium">Colour</th>
                  <th className="pb-2 font-medium">Swatch</th>
                  <th className="pb-2 font-medium">SKU</th>
                  <th className="pb-2 font-medium">Stock</th>
                  <th className="pb-2 font-medium">Price override (₹)</th>
                  <th className="pb-2 font-medium">Default</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {v.variants.map((x, i) => {
                  const upd = (patch: Partial<typeof x>) =>
                    set(
                      "variants",
                      v.variants.map((y, j) => (j === i ? { ...y, ...patch } : patch.is_default ? { ...y, is_default: false } : y)),
                    );
                  return (
                    <tr key={x.id} className="border-t">
                      <td className="py-2 pr-2">
                        <Input
                          aria-label="Colour name"
                          value={x.colour_name}
                          onChange={(e) => upd({ colour_name: e.target.value })}
                          className="h-9"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <div className="flex items-center gap-1">
                          <input
                            type="color"
                            aria-label="Swatch colour"
                            value={x.colour_hex}
                            onChange={(e) => upd({ colour_hex: e.target.value })}
                            className="h-9 w-10 cursor-pointer rounded border bg-transparent"
                          />
                          <Input
                            aria-label="Hex"
                            value={x.colour_hex}
                            onChange={(e) => upd({ colour_hex: e.target.value })}
                            className="h-9 w-24 font-mono text-xs"
                          />
                        </div>
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          aria-label="SKU"
                          value={x.sku}
                          onChange={(e) => upd({ sku: e.target.value.toUpperCase() })}
                          className="h-9 font-mono text-xs"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          aria-label="Stock"
                          type="number"
                          min={0}
                          value={x.stock}
                          onChange={(e) => upd({ stock: e.target.value })}
                          className={cn("h-9 w-24", Number(x.stock) <= Number(v.low_stock_threshold) && "border-warning")}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          aria-label="Price override"
                          type="number"
                          min={0}
                          placeholder="—"
                          value={x.price_override}
                          onChange={(e) => upd({ price_override: e.target.value })}
                          className="h-9 w-28"
                        />
                      </td>
                      <td className="py-2 pr-2 text-center">
                        <input
                          type="radio"
                          name="default-variant"
                          aria-label="Default colour"
                          checked={x.is_default}
                          onChange={() => upd({ is_default: true })}
                          className="accent-foreground"
                        />
                      </td>
                      <td className="py-2">
                        <button
                          type="button"
                          onClick={() =>
                            set(
                              "variants",
                              v.variants.filter((_, j) => j !== i),
                            )
                          }
                          className="text-danger hover:bg-danger-bg inline-flex size-9 items-center justify-center rounded"
                          aria-label="Remove colour"
                        >
                          <Trash className="size-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => addVariant()}>
              <Plus /> Add colour
            </Button>
            <span className="text-muted text-xs">Quick add:</span>
            {PRESET_COLOURS.filter(([n]) => !v.variants.some((x) => x.colour_name === n)).map(([n, h]) => (
              <button
                key={n}
                type="button"
                onClick={() => addVariant(n, h)}
                className="hover:border-foreground inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs"
              >
                <span className="size-3 rounded-full" style={{ background: h }} /> {n}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Details & dimensions">
          {field("material", "Material")}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {field("width_cm", "Width (cm)", { type: "number", step: "0.1" })}
            {field("height_cm", "Height (cm)", { type: "number", step: "0.1" })}
            {field("depth_cm", "Depth (cm)", { type: "number", step: "0.1" })}
            {field("strap_drop_cm", "Strap drop (cm)", { type: "number", step: "0.1" })}
            {field("weight_g", "Weight (g)", { type: "number" })}
          </div>
          {field("dimensions", "Dimensions label (optional)", { placeholder: "Auto: 34 × 28 × 14 cm" })}
          <div>
            <Label htmlFor="pf-care">Care instructions</Label>
            <Textarea id="pf-care" rows={3} value={v.care_instructions} onChange={(e) => set("care_instructions", e.target.value)} />
          </div>
        </Section>

        <Section title="Search engine listing">
          {field("seo_title", "SEO title", { maxLength: 70, placeholder: v.name }, `${v.seo_title.length}/70`)}
          <div>
            <Label htmlFor="pf-seo-desc">SEO description</Label>
            <Textarea
              id="pf-seo-desc"
              rows={2}
              className="min-h-16"
              maxLength={170}
              value={v.seo_description}
              onChange={(e) => set("seo_description", e.target.value)}
              placeholder={v.short_description}
            />
            <p className="text-muted mt-1 text-xs">{v.seo_description.length}/170</p>
          </div>
        </Section>
      </div>

      <div className="space-y-6">
        <div className="sticky top-20 space-y-6">
          <Section title="Status">
            <NativeSelect
              aria-label="Status"
              value={v.status}
              onChange={(e) => set("status", e.target.value as ProductFormValue["status"])}
            >
              <option value="draft">Draft — hidden</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </NativeSelect>
            <div>
              <Label htmlFor="pf-publish">Schedule publish (optional)</Label>
              <Input id="pf-publish" type="datetime-local" value={v.publish_at} onChange={(e) => set("publish_at", e.target.value)} />
              <p className="text-muted mt-1 text-xs">When set, a published product appears from this time.</p>
            </div>
            <div className="space-y-2">
              {(["is_featured", "is_trending", "is_new"] as const).map((k) => (
                <label key={k} className="flex items-center gap-3 text-sm">
                  <Checkbox checked={v[k]} onChange={(e) => set(k, e.target.checked)} />{" "}
                  {k === "is_featured" ? "Featured" : k === "is_trending" ? "Trending (homepage)" : "New In"}
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={pending}>
                {pending ? "Saving…" : "Save"}
              </Button>
              {v.id && (
                <Button
                  type="button"
                  variant="outline"
                  aria-label="Duplicate"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const r = await duplicateProduct(v.id!);
                      if (r.ok && r.data) {
                        toast.success(r.message);
                        router.push(`/admin/products/${r.data.id}`);
                      } else toast.error(r.message);
                    })
                  }
                >
                  <Copy />
                </Button>
              )}
            </div>
            {v.id && v.status === "published" && (
              <Link
                href={`/product/${v.slug}`}
                target="_blank"
                className="text-muted hover:text-foreground inline-flex items-center gap-1 text-xs"
              >
                View on store <ExternalLink className="size-3" />
              </Link>
            )}
          </Section>

          <Section title="Pricing (₹, GST inclusive)">
            {field("price", "Price", { type: "number", min: 0, required: true })}
            {field("compare_at_price", "Compare-at price", { type: "number", min: 0 }, "Shown crossed out when higher than price")}
            {field(
              "cost_price",
              "Cost price",
              { type: "number", min: 0 },
              margin != null ? `Margin ${margin}% — used for profit reports` : "Private — used for profit reports",
            )}
            <div>
              <Label htmlFor="pf-gst">GST %</Label>
              <NativeSelect id="pf-gst" value={v.gst_rate} onChange={(e) => set("gst_rate", e.target.value)}>
                {["0", "5", "12", "18", "28"].map((g) => (
                  <option key={g} value={g}>
                    {g}%
                  </option>
                ))}
              </NativeSelect>
            </div>
            {field("low_stock_threshold", "Low-stock alert at", { type: "number", min: 0 })}
          </Section>

          <Section title="Organisation">
            <div>
              <Label htmlFor="pf-cat">Category</Label>
              <NativeSelect id="pf-cat" value={v.category_id} onChange={(e) => set("category_id", e.target.value)}>
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div>
              <Label htmlFor="pf-col">Collection</Label>
              <NativeSelect id="pf-col" value={v.collection_id} onChange={(e) => set("collection_id", e.target.value)}>
                <option value="">—</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Styles</legend>
              <div className="flex flex-wrap gap-2">
                {styles.map((s) => {
                  const on = v.style_ids.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => set("style_ids", on ? v.style_ids.filter((x) => x !== s.id) : [...v.style_ids, s.id])}
                      className={cn(
                        "h-8 rounded-full border px-3 text-xs",
                        on ? "border-foreground bg-foreground text-background" : "hover:border-foreground",
                      )}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </Section>
        </div>
      </div>
    </form>
  );
}
