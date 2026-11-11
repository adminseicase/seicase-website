"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Rotate3d } from "lucide-react";
import { cn } from "@/lib/utils";

const SpinViewer = dynamic(() => import("./spin-viewer"), {
  ssr: false,
  loading: () => <div className="skeleton mx-auto aspect-square max-w-[560px] rounded-2xl" />,
});

/** 360° View / Details / Dimensions tabs (WAI-ARIA tabs pattern). */
export function ProductTabs({
  name,
  spinFrames,
  posters,
  details,
  dimensions,
}: {
  name: string;
  spinFrames: string[];
  posters: string[];
  details: React.ReactNode;
  dimensions: React.ReactNode;
}) {
  const tabs = [
    ...(spinFrames.length ? [{ id: "spin", label: "360° View" }] : posters.length ? [{ id: "spin", label: "Multi-angle" }] : []),
    { id: "details", label: "Details" },
    { id: "dimensions", label: "Dimensions" },
  ];
  const [active, setActive] = useState(tabs[0].id);
  const [spinOn, setSpinOn] = useState(false);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  return (
    <section className="bg-surface-muted/60 mt-16 rounded-2xl p-4 md:p-8" aria-label="More about this product">
      <div role="tablist" aria-label="Product information" className="mx-auto flex max-w-md justify-center gap-6 border-b">
        {tabs.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={active === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={active === t.id ? 0 : -1}
            onClick={() => setActive(t.id)}
            onKeyDown={(e) => {
              const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
              if (!dir) return;
              const next = (i + dir + tabs.length) % tabs.length;
              setActive(tabs[next].id);
              refs.current[next]?.focus();
            }}
            className={cn(
              "-mb-px h-12 border-b-2 px-1 text-sm transition-colors",
              active === t.id ? "border-foreground" : "text-muted hover:text-foreground border-transparent",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.some((t) => t.id === "spin") && (
        <div role="tabpanel" id="panel-spin" aria-labelledby="tab-spin" hidden={active !== "spin"} className="pt-8">
          {spinFrames.length ? (
            spinOn ? (
              <SpinViewer frames={spinFrames} name={name} />
            ) : (
              <button
                type="button"
                onClick={() => setSpinOn(true)}
                className="group relative mx-auto block aspect-square w-full max-w-[560px] overflow-hidden rounded-2xl"
              >
                <Image src={spinFrames[0]} alt="" fill sizes="(max-width: 768px) 92vw, 560px" className="object-cover" />
                <span className="bg-surface/90 shadow-soft absolute inset-x-0 bottom-6 mx-auto flex w-fit items-center gap-2 rounded-full px-4 py-2 text-sm">
                  <Rotate3d className="size-4 stroke-[1.5]" /> Tap to view in 360°
                </span>
              </button>
            )
          ) : (
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {posters.map((p) => (
                <li key={p} className="relative aspect-[4/5] overflow-hidden rounded-xl">
                  <Image src={p} alt={`${name} angle`} fill sizes="(max-width: 768px) 45vw, 30vw" className="object-cover" />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div
        role="tabpanel"
        id="panel-details"
        aria-labelledby="tab-details"
        hidden={active !== "details"}
        className="mx-auto max-w-2xl pt-8"
      >
        {details}
      </div>
      <div
        role="tabpanel"
        id="panel-dimensions"
        aria-labelledby="tab-dimensions"
        hidden={active !== "dimensions"}
        className="mx-auto max-w-2xl pt-8"
      >
        {dimensions}
      </div>
    </section>
  );
}
