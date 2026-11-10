"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type NavLink = { label: string; href: string };
export interface NavData {
  shop: NavLink[];
  styles: NavLink[];
  support: NavLink[];
}

/** Desktop navigation with an accessible Shop mega-menu and Support dropdown. */
export function NavMenu({ nav }: { nav: NavData }) {
  const [open, setOpen] = useState<"shop" | "support" | null>(null);
  const ref = useRef<HTMLElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  const hover = (menu: "shop" | "support" | null) => ({
    onMouseEnter: () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      setOpen(menu);
    },
    onMouseLeave: () => {
      closeTimer.current = setTimeout(() => setOpen(null), 120);
    },
  });

  const trigger = (menu: "shop" | "support", label: string) => (
    <button
      type="button"
      className="inline-flex h-11 items-center gap-1 px-1 text-[0.82rem] uppercase tracking-[0.14em] text-foreground hover:text-cognac"
      aria-expanded={open === menu}
      aria-controls={`menu-${menu}`}
      onClick={() => setOpen((o) => (o === menu ? null : menu))}
    >
      {label}
      <ChevronDown className={cn("size-3.5 stroke-[1.5] transition-transform", open === menu && "rotate-180")} aria-hidden="true" />
    </button>
  );

  return (
    <nav ref={ref} aria-label="Main" className="hidden justify-self-center lg:block">
      <ul className="flex items-center gap-8">
        <li {...hover("shop")}>
          {trigger("shop", "Shop")}
          <div
            id="menu-shop"
            hidden={open !== "shop"}
            className="absolute inset-x-0 top-full border-y bg-surface shadow-soft"
            onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(null)}
          >
            <div className="mx-auto grid max-w-[1200px] grid-cols-[1fr_1fr_1.3fr] gap-10 px-8 py-10">
              <div>
                <p className="mb-4 text-xs uppercase tracking-[0.16em] text-muted">Shop by Category</p>
                <ul className="space-y-2.5">
                  {nav.shop.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="font-serif text-xl hover:text-cognac">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-4 text-xs uppercase tracking-[0.16em] text-muted">Shop by Style</p>
                <ul className="space-y-2.5">
                  {nav.styles.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="font-serif text-xl hover:text-cognac">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <Link href="/shop/new-in" className="group relative block overflow-hidden rounded-xl bg-surface-muted">
                <Image
                  src="/images/products/the-bloom-bucket-bag/tan-front.webp"
                  alt="The Bloom Bucket Bag, new this season"
                  width={480}
                  height={300}
                  className="h-56 w-full object-cover object-[50%_70%] transition-transform duration-700 group-hover:scale-105"
                  sizes="420px"
                />
                <span className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-md bg-surface/90 px-4 py-2 text-sm">
                  New this season <ArrowRight className="size-4 stroke-[1.5]" />
                </span>
              </Link>
            </div>
          </div>
        </li>
        <li>
          <Link href="/our-story" className="inline-flex h-11 items-center text-[0.82rem] uppercase tracking-[0.14em] hover:text-cognac">
            Our Story
          </Link>
        </li>
        <li>
          <Link href="/journal" className="inline-flex h-11 items-center text-[0.82rem] uppercase tracking-[0.14em] hover:text-cognac">
            Journal
          </Link>
        </li>
        <li className="relative" {...hover("support")}>
          {trigger("support", "Support")}
          <div
            id="menu-support"
            hidden={open !== "support"}
            className="absolute left-1/2 top-full w-60 -translate-x-1/2 rounded-lg border bg-surface p-2 shadow-soft"
            onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(null)}
          >
            <ul>
              {nav.support.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="block rounded-md px-3 py-2.5 text-sm hover:bg-surface-muted">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </li>
      </ul>
    </nav>
  );
}
