"use client";

import { useMemo } from "react";
import { useBrowserValue } from "@/lib/hooks";
import Image from "next/image";
import Link from "next/link";
import { BLUR_DATA_URL, formatINR } from "@/lib/utils";

interface Viewed {
  id: string;
  slug: string;
  name: string;
  price: number;
  image: string | null;
}
const KEY = "sc_recently_viewed";

export function rememberViewed(p: Viewed) {
  try {
    const list: Viewed[] = JSON.parse(localStorage.getItem(KEY) || "[]");
    localStorage.setItem(KEY, JSON.stringify([p, ...list.filter((x) => x.id !== p.id)].slice(0, 12)));
  } catch {}
}

/** Products this shopper viewed recently (stored only in their browser). */
export function RecentlyViewed({ excludeId }: { excludeId?: string }) {
  const raw = useBrowserValue(() => localStorage.getItem(KEY) ?? "[]", "[]");
  const items = useMemo(() => {
    try {
      return (JSON.parse(raw) as Viewed[]).filter((p) => p.id !== excludeId).slice(0, 6);
    } catch {
      return [];
    }
  }, [raw, excludeId]);
  if (!items.length) return null;
  return (
    <section aria-labelledby="recently-viewed" className="mt-16">
      <h2 id="recently-viewed" className="mb-6 text-3xl">
        Recently Viewed
      </h2>
      <ul className="-mx-4 flex scrollbar-none gap-4 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-6 md:px-0">
        {items.map((p) => (
          <li key={p.id} className="w-[38%] shrink-0 md:w-auto">
            <Link href={`/product/${p.slug}`} className="group block">
              <Image
                src={p.image || "/images/placeholder.webp"}
                alt=""
                width={220}
                height={275}
                className="bg-surface-muted aspect-[4/5] w-full rounded-lg object-cover"
                placeholder="blur"
                blurDataURL={BLUR_DATA_URL}
              />
              <p className="group-hover:text-cognac mt-2 font-serif text-base leading-tight">{p.name}</p>
              <p className="text-muted text-xs">{formatINR(p.price)}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
