"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, ImagePlus, LoaderCircle, Rotate3d, Star, Trash } from "lucide-react";
import { toast } from "sonner";
import { uploadImage } from "@/lib/upload";
import { cn } from "@/lib/utils";

export interface ManagedImage {
  id: string;
  url: string;
  alt: string | null;
  variant_id: string | null;
  kind: "gallery" | "spin";
  sort_order: number;
  is_primary: boolean;
}

/**
 * Drag-and-drop image manager. Images are resized + compressed to WebP in the
 * browser, uploaded to Supabase Storage, then reordered, tagged to a colour,
 * given alt text and a primary image. Also handles 360° image sequences.
 */
export function ImageManager({
  images,
  onChange,
  variants,
  folder,
  productName,
}: {
  images: ManagedImage[];
  onChange: (imgs: ManagedImage[]) => void;
  variants: { id: string; colour_name: string }[];
  folder: string;
  productName: string;
}) {
  const [uploading, setUploading] = useState(0);
  const [drag, setDrag] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const spinInput = useRef<HTMLInputElement>(null);
  const gallery = images.filter((i) => i.kind === "gallery").sort((a, b) => a.sort_order - b.sort_order);
  const spin = images.filter((i) => i.kind === "spin").sort((a, b) => a.sort_order - b.sort_order);

  const commit = (g: ManagedImage[], s: ManagedImage[] = spin) => onChange([...g.map((im, i) => ({ ...im, sort_order: i })), ...s.map((im, i) => ({ ...im, sort_order: i }))]);

  const upload = async (files: FileList | File[], kind: "gallery" | "spin") => {
    const list = [...files].filter((f) => f.type.startsWith("image/")).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    if (!list.length) return;
    setUploading((n) => n + list.length);
    const added: ManagedImage[] = [];
    await Promise.all(
      list.map(async (f, i) => {
        try {
          const url = await uploadImage(f, "product-images", `${folder}/${kind}`, { maxSize: kind === "spin" ? 1200 : 2000 });
          added[i] = { id: crypto.randomUUID(), url, alt: productName, variant_id: null, kind, sort_order: i, is_primary: false };
        } catch (e) {
          toast.error(`${f.name}: ${e instanceof Error ? e.message : "upload failed"}`);
        } finally {
          setUploading((n) => n - 1);
        }
      }),
    );
    const ok = added.filter(Boolean);
    if (kind === "gallery") {
      const next = [...gallery, ...ok];
      if (!next.some((i) => i.is_primary) && next[0]) next[0] = { ...next[0], is_primary: true };
      commit(next);
    } else commit(gallery, [...spin, ...ok]);
    if (ok.length) toast.success(`${ok.length} image${ok.length > 1 ? "s" : ""} uploaded`);
  };

  const update = (id: string, patch: Partial<ManagedImage>) => commit(gallery.map((i) => (i.id === id ? { ...i, ...patch } : patch.is_primary ? { ...i, is_primary: false } : i)));
  const move = (from: number, to: number) => {
    if (to < 0 || to >= gallery.length) return;
    const next = [...gallery];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    commit(next);
  };

  return (
    <div className="space-y-6">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (e.dataTransfer.files.length) upload(e.dataTransfer.files, "gallery");
        }}
        className={cn("flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center text-sm transition-colors", drag ? "border-cognac bg-surface-muted" : "border-border-strong hover:border-foreground")}
      >
        {uploading ? <LoaderCircle className="size-6 animate-spin text-cognac" /> : <ImagePlus className="size-6 stroke-[1.5] text-muted" />}
        <span>{uploading ? `Uploading ${uploading}…` : "Drag & drop photos here, or click to choose"}</span>
        <span className="text-xs text-muted">JPG, PNG or WebP. Automatically resized and compressed.</span>
        <input type="file" multiple accept="image/*" className="sr-only" onChange={(e) => e.target.files && upload(e.target.files, "gallery").then(() => (e.target.value = ""))} />
      </label>

      {gallery.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {gallery.map((img, i) => (
            <li
              key={img.id}
              draggable
              onDragStart={() => setDragId(img.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                const from = gallery.findIndex((g) => g.id === dragId);
                if (from >= 0) move(from, i);
                setDragId(null);
              }}
              className={cn("rounded-xl border bg-surface p-2", img.is_primary && "ring-2 ring-cognac")}
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-surface-muted">
                <Image src={img.url} alt={img.alt ?? ""} fill sizes="200px" className="object-cover" />
                {img.is_primary && <span className="absolute left-2 top-2 rounded-full bg-cognac px-2 py-0.5 text-[10px] text-white">Primary</span>}
              </div>
              <input value={img.alt ?? ""} onChange={(e) => update(img.id, { alt: e.target.value })} placeholder="Alt text (describe the photo)" aria-label="Alt text" className="mt-2 h-8 w-full rounded-md border bg-background px-2 text-xs" />
              <select value={img.variant_id ?? ""} onChange={(e) => update(img.id, { variant_id: e.target.value || null })} aria-label="Colour for this image" className="mt-1 h-8 w-full rounded-md border bg-background px-1 text-xs">
                <option value="">All colours</option>
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.colour_name || "Untitled colour"}
                  </option>
                ))}
              </select>
              <div className="mt-1 flex items-center justify-between">
                <div className="flex">
                  <button type="button" onClick={() => move(i, i - 1)} className="inline-flex size-8 items-center justify-center rounded hover:bg-surface-muted" aria-label="Move left">
                    <ArrowLeft className="size-3.5" />
                  </button>
                  <button type="button" onClick={() => move(i, i + 1)} className="inline-flex size-8 items-center justify-center rounded hover:bg-surface-muted" aria-label="Move right">
                    <ArrowRight className="size-3.5" />
                  </button>
                </div>
                <div className="flex">
                  <button type="button" onClick={() => update(img.id, { is_primary: true })} className="inline-flex size-8 items-center justify-center rounded hover:bg-surface-muted" aria-label="Set as primary image" title="Set as primary">
                    <Star className={cn("size-3.5", img.is_primary && "fill-cognac stroke-cognac")} />
                  </button>
                  <button type="button" onClick={() => commit(gallery.filter((g) => g.id !== img.id))} className="inline-flex size-8 items-center justify-center rounded text-danger hover:bg-danger-bg" aria-label="Remove image">
                    <Trash className="size-3.5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-xl border bg-surface-muted/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium">
              <Rotate3d className="size-4" /> 360° image sequence (optional)
            </p>
            <p className="text-xs text-muted">Upload 24–36 photos taken while turning the product. They&apos;re ordered by file name (01, 02, 03…).</p>
          </div>
          <div className="flex gap-2">
            {spin.length > 0 && (
              <button type="button" onClick={() => commit(gallery, [])} className="h-9 rounded-md border px-3 text-xs text-danger">
                Remove all ({spin.length})
              </button>
            )}
            <button type="button" onClick={() => spinInput.current?.click()} className="h-9 rounded-md bg-foreground px-3 text-xs text-background">
              Upload sequence
            </button>
            <input ref={spinInput} type="file" multiple accept="image/*" className="sr-only" onChange={(e) => e.target.files && upload(e.target.files, "spin").then(() => (e.target.value = ""))} />
          </div>
        </div>
        {spin.length > 0 && (
          <ul className="scrollbar-none mt-3 flex gap-1 overflow-x-auto">
            {spin.map((s) => (
              <li key={s.id} className="shrink-0">
                <Image src={s.url} alt="" width={56} height={56} className="size-14 rounded object-cover" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
