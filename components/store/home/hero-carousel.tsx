"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

/** Lightweight accessible carousel: swipe, arrows, numbered 01/02/03, autoplay that pauses. */
export function HeroCarousel({ children, count }: { children: React.ReactNode[]; count: number }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const touchX = useRef<number | null>(null);

  const go = useCallback((i: number) => setIndex((i + count) % count), [count]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) setPlaying(false);
  }, []);

  useEffect(() => {
    if (!playing || hovered || count < 2) return;
    const t = setTimeout(() => go(index + 1), 6500);
    return () => clearTimeout(t);
  }, [index, playing, hovered, count, go]);

  return (
    <section
      className="relative overflow-hidden bg-surface-muted"
      aria-roledescription="carousel"
      aria-label="Featured collections"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
        touchX.current = null;
      }}
    >
      <div className="relative h-[min(82svh,720px)] min-h-[520px] md:h-[min(78vh,760px)]">
        {children.map((child, i) => (
          <div
            key={i}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            aria-hidden={i !== index}
            inert={i !== index}
            className={cn("absolute inset-0 transition-opacity duration-700 ease-out", i === index ? "opacity-100" : "pointer-events-none opacity-0")}
          >
            {child}
          </div>
        ))}
      </div>

      {count > 1 && (
        <div className="absolute inset-x-0 bottom-6 md:bottom-10">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 md:px-14">
            <ol className="flex items-center gap-1" aria-label="Choose slide">
              {Array.from({ length: count }, (_, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => go(i)}
                    aria-label={`Show slide ${i + 1}`}
                    aria-current={i === index}
                    className={cn(
                      "inline-flex h-11 min-w-11 items-center justify-center text-sm tabular-nums transition-colors",
                      i === index ? "font-medium text-foreground" : "text-foreground/55 hover:text-foreground",
                    )}
                  >
                    <span className={cn("border-b pb-0.5", i === index ? "border-foreground" : "border-transparent")}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                className="inline-flex size-11 items-center justify-center rounded-full text-foreground/70 hover:text-foreground"
                aria-label={playing ? "Pause slideshow" : "Play slideshow"}
              >
                {playing ? <Pause className="size-4 stroke-[1.5]" /> : <Play className="size-4 stroke-[1.5]" />}
              </button>
              <button
                type="button"
                onClick={() => go(index - 1)}
                className="inline-flex size-11 items-center justify-center rounded-full border border-foreground/20 bg-surface/80 backdrop-blur hover:bg-surface"
                aria-label="Previous slide"
              >
                <ArrowLeft className="size-4 stroke-[1.5]" />
              </button>
              <button
                type="button"
                onClick={() => go(index + 1)}
                className="inline-flex size-11 items-center justify-center rounded-full border border-foreground/20 bg-surface/80 backdrop-blur hover:bg-surface"
                aria-label="Next slide"
              >
                <ArrowRight className="size-4 stroke-[1.5]" />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
