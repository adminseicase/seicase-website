"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Hand } from "lucide-react";

/**
 * Drag-to-rotate 360° viewer built from an image sequence.
 * All frames load eagerly once the viewer mounts (the viewer itself is lazy-loaded).
 * Keyboard: ← → rotate.
 */
export default function SpinViewer({ frames, name }: { frames: string[]; name: string }) {
  const [frame, setFrame] = useState(0);
  const [loaded, setLoaded] = useState(0);
  const drag = useRef<{ x: number; frame: number } | null>(null);
  const n = frames.length;

  const step = (d: number) => setFrame((f) => (f + d + n) % n);

  return (
    <div className="relative">
      <div
        role="slider"
        tabIndex={0}
        aria-label={`${name} 360 degree view. Use arrow keys to rotate.`}
        aria-valuemin={1}
        aria-valuemax={n}
        aria-valuenow={frame + 1}
        aria-valuetext={`Angle ${Math.round((frame / n) * 360)} degrees`}
        className="bg-surface-muted relative mx-auto aspect-square max-w-[560px] cursor-grab touch-pan-y overflow-hidden rounded-2xl select-none active:cursor-grabbing"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") step(1);
          if (e.key === "ArrowLeft") step(-1);
        }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { x: e.clientX, frame };
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const dx = e.clientX - drag.current.x;
          const w = e.currentTarget.clientWidth;
          const next = drag.current.frame - Math.round((dx / w) * n * 1.2);
          setFrame(((next % n) + n) % n);
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        {frames.map((src, i) => (
          <Image
            key={src}
            src={src}
            alt={i === frame ? `${name} rotated view` : ""}
            fill
            sizes="(max-width: 768px) 92vw, 560px"
            draggable={false}
            className={i === frame ? "object-cover" : "hidden"}
            loading="eager"
            onLoad={() => setLoaded((l) => l + 1)}
          />
        ))}
        {loaded < n && (
          <div className="bg-border absolute inset-x-0 bottom-0 h-1">
            <div className="bg-cognac h-full transition-[width]" style={{ width: `${(loaded / n) * 100}%` }} />
          </div>
        )}
      </div>
      <div className="text-muted mt-4 flex items-center justify-center gap-4 text-sm">
        <button
          type="button"
          onClick={() => step(-1)}
          className="bg-surface hover:border-foreground inline-flex size-11 items-center justify-center rounded-full border"
          aria-label="Rotate left"
        >
          <ArrowLeft className="size-4 stroke-[1.5]" />
        </button>
        <span className="inline-flex items-center gap-2">
          <Hand className="size-4 stroke-[1.5]" aria-hidden="true" /> Drag to rotate
        </span>
        <button
          type="button"
          onClick={() => step(1)}
          className="bg-surface hover:border-foreground inline-flex size-11 items-center justify-center rounded-full border"
          aria-label="Rotate right"
        >
          <ArrowRight className="size-4 stroke-[1.5]" />
        </button>
      </div>
    </div>
  );
}
