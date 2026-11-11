"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import type { ProductImage } from "@/lib/types";
import { BLUR_DATA_URL, cn } from "@/lib/utils";
import { LazyModal as Modal } from "@/components/ui/lazy-sheet";

/**
 * Gallery with vertical thumbnails (desktop), swipe (mobile), hover-zoom
 * that follows the cursor, and tap/click to open a full-screen zoom.
 */
export function ProductGallery({ images, name }: { images: ProductImage[]; name: string }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [lightbox, setLightbox] = useState(false);
  const track = useRef<HTMLDivElement>(null);
  const count = images.length;

  const goTo = (i: number) => {
    const idx = (i + count) % count;
    setActive(idx);
    const el = track.current;
    if (el) el.scrollTo({ left: idx * el.clientWidth, behavior: "smooth" });
  };

  if (!count) {
    return <div className="bg-surface-muted aspect-[4/5] rounded-2xl" />;
  }

  return (
    <div
      className="grid gap-3 self-start md:grid-cols-[84px_1fr] md:gap-4 lg:sticky lg:top-24"
      aria-roledescription="carousel"
      aria-label={`${name} images`}
    >
      <ul className="hidden max-h-[680px] flex-col gap-3 overflow-y-auto md:flex" aria-label="Thumbnails">
        {images.map((img, i) => (
          <li key={img.id}>
            <button
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Show image ${i + 1}`}
              aria-current={i === active}
              className={cn(
                "block overflow-hidden rounded-lg border-2 transition-colors",
                i === active ? "border-foreground" : "hover:border-border-strong border-transparent",
              )}
            >
              <Image
                src={img.url}
                alt=""
                width={84}
                height={105}
                className="bg-surface-muted aspect-[4/5] w-full object-cover"
                placeholder="blur"
                blurDataURL={BLUR_DATA_URL}
              />
            </button>
          </li>
        ))}
      </ul>

      <div className="relative">
        <div
          ref={track}
          className="bg-surface-muted flex snap-x snap-mandatory scrollbar-none overflow-x-auto rounded-2xl md:overflow-hidden"
          onScroll={(e) => {
            const el = e.currentTarget;
            const i = Math.round(el.scrollLeft / el.clientWidth);
            if (i !== active) setActive(i);
          }}
        >
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              className="relative aspect-[4/5] w-full shrink-0 cursor-zoom-in snap-center overflow-hidden"
              onClick={() => setLightbox(true)}
              onMouseMove={(e) => {
                if (i !== active) return;
                const r = e.currentTarget.getBoundingClientRect();
                setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
              }}
              onMouseLeave={() => setZoom(null)}
              aria-label={`Zoom image ${i + 1} of ${count}`}
            >
              <Image
                src={img.url}
                alt={img.alt ?? name}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 640px"
                preload={i === 0}
                loading={i === 0 ? undefined : "lazy"}
                quality={85}
                placeholder="blur"
                blurDataURL={BLUR_DATA_URL}
                className="object-cover transition-transform duration-200 ease-out"
                style={zoom && i === active ? { transform: "scale(1.9)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
              />
            </button>
          ))}
        </div>
        <span
          className="bg-surface/85 pointer-events-none absolute top-3 right-3 inline-flex size-10 items-center justify-center rounded-full"
          aria-hidden="true"
        >
          <ZoomIn className="size-4 stroke-[1.5]" />
        </span>
        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo(active - 1)}
              className="bg-surface/90 shadow-soft hover:bg-surface absolute top-1/2 left-3 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full md:inline-flex"
              aria-label="Previous image"
            >
              <ChevronLeft className="size-5 stroke-[1.5]" />
            </button>
            <button
              type="button"
              onClick={() => goTo(active + 1)}
              className="bg-surface/90 shadow-soft hover:bg-surface absolute top-1/2 right-3 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full md:inline-flex"
              aria-label="Next image"
            >
              <ChevronRight className="size-5 stroke-[1.5]" />
            </button>
            <div className="mt-3 flex justify-center gap-1.5 md:hidden" aria-hidden="true">
              {images.map((img, i) => (
                <span
                  key={img.id}
                  className={cn("h-1.5 rounded-full transition-all", i === active ? "bg-foreground w-5" : "bg-border-strong w-1.5")}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {lightbox && (
        <Modal open={lightbox} onOpenChange={setLightbox} title={name} className="w-[min(96vw,900px)] p-3 md:p-5">
          <div className="bg-surface-muted relative aspect-[4/5] max-h-[78dvh] w-full overflow-auto rounded-lg">
            <Image src={images[active]?.url} alt={images[active]?.alt ?? name} fill sizes="900px" quality={85} className="object-contain" />
          </div>
          <div className="mt-3 flex justify-center gap-2">
            {images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setActive(i)}
                className={cn("size-12 overflow-hidden rounded-md border-2", i === active ? "border-foreground" : "border-transparent")}
                aria-label={`Show image ${i + 1}`}
              >
                <Image src={img.url} alt="" width={48} height={48} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
