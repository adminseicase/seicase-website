"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Native scroll-snap carousel: swipeable on touch, keyboard-scrollable,
 * with previous/next buttons on larger screens. Zero layout shift.
 */
export function ScrollCarousel({
  children,
  label,
  className,
  itemClassName = "w-[46%] sm:w-[31%] lg:w-[23%]",
  arrows = "sides",
}: {
  children: React.ReactNode[];
  label: string;
  className?: string;
  itemClassName?: string;
  arrows?: "sides" | "none";
}) {
  const ref = useRef<HTMLUListElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  const arrowCls =
    "absolute top-[38%] z-10 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border bg-surface/95 text-foreground shadow-soft transition-opacity hover:bg-surface disabled:pointer-events-none disabled:opacity-0 md:inline-flex";

  return (
    <div className={cn("relative", className)} role="region" aria-roledescription="carousel" aria-label={label}>
      <ul
        ref={ref}
        className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 md:-mx-0 md:gap-5 md:scroll-px-0 md:px-0"
        tabIndex={0}
      >
        {children.map((child, i) => (
          <li key={i} className={cn("shrink-0 snap-start", itemClassName)} aria-roledescription="slide" aria-label={`${i + 1} of ${children.length}`}>
            {child}
          </li>
        ))}
      </ul>
      {arrows === "sides" && (
        <>
          <button type="button" className={cn(arrowCls, "-left-5")} onClick={() => scroll(-1)} disabled={!canPrev} aria-label="Previous">
            <ArrowLeft className="size-4 stroke-[1.5]" />
          </button>
          <button type="button" className={cn(arrowCls, "-right-5")} onClick={() => scroll(1)} disabled={!canNext} aria-label="Next">
            <ArrowRight className="size-4 stroke-[1.5]" />
          </button>
        </>
      )}
    </div>
  );
}
