"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImagePlus, LoaderCircle, Pencil, Plus, Trash } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Label, NativeSelect, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/sheet";
import { deleteRecord, saveRecord, type CrudTable } from "@/lib/actions/admin/crud";
import { uploadImage } from "@/lib/upload";
import { RichText } from "./rich-text";

export type FieldDef =
  | { name: string; label: string; type: "text" | "number" | "url" | "datetime" | "date"; required?: boolean; hint?: string; placeholder?: string }
  | { name: string; label: string; type: "textarea"; rows?: number; hint?: string }
  | { name: string; label: string; type: "richtext" }
  | { name: string; label: string; type: "boolean"; hint?: string }
  | { name: string; label: string; type: "select"; options: { value: string; label: string }[] }
  | { name: string; label: string; type: "image"; bucket?: "cms-images" | "product-images"; folder: string };

export interface Column {
  key: string;
  label: string;
  render?: "image" | "bool" | "badge" | "money" | "date";
}

function ImageField({ value, onChange, bucket, folder, label }: { value: string; onChange: (v: string) => void; bucket: "cms-images" | "product-images"; folder: string; label: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-center gap-3">
      {value ? <Image src={value} alt="" width={96} height={72} className="h-[72px] w-24 rounded-md object-cover" /> : <span className="flex h-[72px] w-24 items-center justify-center rounded-md bg-surface-muted text-muted"><ImagePlus className="size-5" /></span>}
      <div className="min-w-0 flex-1 space-y-1">
        <Input aria-label={`${label} URL`} value={value} onChange={(e) => onChange(e.target.value)} placeholder="/images/… or upload" className="h-9 text-xs" />
        <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 text-xs hover:border-foreground">
          {busy ? <LoaderCircle className="size-3.5 animate-spin" /> : <ImagePlus className="size-3.5" />} Upload
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setBusy(true);
              try {
                onChange(await uploadImage(f, bucket, folder, { maxSize: 2400 }));
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Upload failed");
              } finally {
                setBusy(false);
              }
            }}
          />
        </label>
      </div>
    </div>
  );
}

/** List + modal editor for simple tables (categories, charms, coupons, FAQs, slides, posts, pages). */
export function CrudManager({
  table,
  rows,
  fields,
  columns,
  defaults,
  title,
  addLabel = "Add",
}: {
  table: CrudTable;
  rows: Record<string, unknown>[];
  fields: FieldDef[];
  columns: Column[];
  defaults: Record<string, unknown>;
  title: string;
  addLabel?: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<{ id: string | null; values: Record<string, unknown> } | null>(null);
  const [pending, start] = useTransition();

  const fmt = (row: Record<string, unknown>, c: Column) => {
    const v = row[c.key];
    if (c.render === "image") return v ? <Image src={String(v)} alt="" width={56} height={42} className="h-[42px] w-14 rounded object-cover" /> : <span className="block h-[42px] w-14 rounded bg-surface-muted" />;
    if (c.render === "bool") return v ? "Yes" : "—";
    if (c.render === "money") return v == null ? "—" : `₹${Number(v).toLocaleString("en-IN")}`;
    if (c.render === "date") return v ? new Date(String(v)).toLocaleDateString("en-IN") : "—";
    if (c.render === "badge") return <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs capitalize">{String(v ?? "")}</span>;
    return <span className="line-clamp-2">{Array.isArray(v) ? v.join(", ") : String(v ?? "—")}</span>;
  };

  const toInput = (row: Record<string, unknown>) => {
    const out: Record<string, unknown> = { ...defaults };
    for (const f of fields) {
      const v = row[f.name];
      if (v === undefined) continue;
      if (f.type === "datetime") out[f.name] = v ? new Date(new Date(String(v)).getTime() + 5.5 * 3600_000).toISOString().slice(0, 16) : "";
      else if (Array.isArray(v)) out[f.name] = v.join(", ");
      else out[f.name] = v ?? "";
    }
    return out;
  };

  const setVal = (k: string, v: unknown) => setEditing((e) => (e ? { ...e, values: { ...e.values, [k]: v } } : e));

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl">{title}</h2>
        <Button size="sm" onClick={() => setEditing({ id: null, values: { ...defaults } })}>
          <Plus /> {addLabel}
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-surface">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="border-b bg-surface-muted/50 text-xs text-muted">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="px-4 py-3 font-medium">
                  {c.label}
                </th>
              ))}
              <th className="w-24 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-10 text-center text-muted">
                  Nothing here yet.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={String(r.id)}>
                {columns.map((c) => (
                  <td key={c.key} className="px-4 py-3 align-middle">
                    {fmt(r, c)}
                  </td>
                ))}
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button type="button" onClick={() => setEditing({ id: String(r.id), values: toInput(r) })} className="inline-flex size-9 items-center justify-center rounded hover:bg-surface-muted" aria-label="Edit">
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!confirm("Delete this item? This can't be undone.")) return;
                        start(async () => {
                          const res = await deleteRecord(table, String(r.id));
                          if (res.ok) toast.success(res.message);
                          else toast.error(res.message);
                          router.refresh();
                        });
                      }}
                      className="inline-flex size-9 items-center justify-center rounded text-danger hover:bg-danger-bg"
                      aria-label="Delete"
                    >
                      <Trash className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!editing} onOpenChange={(o) => !o && setEditing(null)} title={editing?.id ? "Edit" : addLabel} className="w-[min(96vw,760px)]">
        {editing && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => {
                const res = await saveRecord(table, editing.id, editing.values);
                if (res.ok) {
                  toast.success(res.message);
                  setEditing(null);
                  router.refresh();
                } else toast.error(res.message);
              });
            }}
          >
            {fields.map((f) => {
              const id = `crud-${f.name}`;
              const val = editing.values[f.name];
              switch (f.type) {
                case "boolean":
                  return (
                    <label key={f.name} className="flex items-center gap-3 text-sm">
                      <Checkbox checked={!!val} onChange={(e) => setVal(f.name, e.target.checked)} /> {f.label}
                      {f.hint && <span className="text-xs text-muted">{f.hint}</span>}
                    </label>
                  );
                case "textarea":
                  return (
                    <div key={f.name}>
                      <Label htmlFor={id}>{f.label}</Label>
                      <Textarea id={id} rows={f.rows ?? 3} value={String(val ?? "")} onChange={(e) => setVal(f.name, e.target.value)} />
                      {f.hint && <p className="mt-1 text-xs text-muted">{f.hint}</p>}
                    </div>
                  );
                case "richtext":
                  return (
                    <div key={f.name}>
                      <Label htmlFor={id}>{f.label}</Label>
                      <RichText id={id} label={f.label} value={String(val ?? "")} onChange={(h) => setVal(f.name, h)} minHeight={280} />
                    </div>
                  );
                case "select":
                  return (
                    <div key={f.name}>
                      <Label htmlFor={id}>{f.label}</Label>
                      <NativeSelect id={id} value={String(val ?? "")} onChange={(e) => setVal(f.name, e.target.value)}>
                        {f.options.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </NativeSelect>
                    </div>
                  );
                case "image":
                  return (
                    <div key={f.name}>
                      <Label>{f.label}</Label>
                      <ImageField value={String(val ?? "")} onChange={(v) => setVal(f.name, v)} bucket={f.bucket ?? "cms-images"} folder={f.folder} label={f.label} />
                    </div>
                  );
                default:
                  return (
                    <div key={f.name}>
                      <Label htmlFor={id}>{f.label}</Label>
                      <Input
                        id={id}
                        type={f.type === "datetime" ? "datetime-local" : f.type}
                        required={f.required}
                        placeholder={f.placeholder}
                        value={String(val ?? "")}
                        onChange={(e) => setVal(f.name, e.target.value)}
                      />
                      {f.hint && <p className="mt-1 text-xs text-muted">{f.hint}</p>}
                    </div>
                  );
              }
            })}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
