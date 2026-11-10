"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

/** OpenStreetMap embed that loads only when scrolled into view (or tapped). */
export function LazyMap({ lat, lng, label }: { lat: number; lng: number; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setShow(true), { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const d = 0.008;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d}%2C${lat - d}%2C${lng + d}%2C${lat + d}&layer=mapnik&marker=${lat}%2C${lng}`;
  return (
    <div ref={ref} className="relative aspect-[16/7] min-h-64 overflow-hidden rounded-2xl border bg-surface-muted">
      {show ? (
        <iframe title={`Map: ${label}`} src={src} loading="lazy" className="absolute inset-0 h-full w-full" referrerPolicy="no-referrer-when-downgrade" />
      ) : (
        <button type="button" onClick={() => setShow(true)} className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-muted">
          <MapPin className="size-5 text-burgundy" aria-hidden="true" /> Show map
        </button>
      )}
      <a href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`} target="_blank" rel="noopener noreferrer" className="absolute bottom-3 right-3 rounded-md bg-surface/95 px-3 py-2 text-xs shadow-soft hover:bg-surface">
        Open in Google Maps
      </a>
    </div>
  );
}
