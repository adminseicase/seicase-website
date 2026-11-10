"use client";

import { useEffect, useState } from "react";
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
  const [items, setItems] = useState<Viewed[]>([]);
  useEffect(() => {
    try {
      setItems((JSON.parse(localStorage.getItem(KEY) || "[]") as Viewed[]).filter((p) => p.id !== excludeId).slice(0, 6));
    } catch {}
  }, [excludeId]);
  if (!items.length) return null;
  return (
    <section aria-labelledby="recently-viewed" className="mt-16">
      <h2 id="recently-viewed" className="mb-6 text-3xl">
        Recently Viewed
      </h2>
      <ul className="scrollbar-none -mx-4 flex gap-4 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-6 md:px-0">
        {items.map((p) => (
          <li key={p.id} className="w-[38%] shrink-0 md:w-auto">
            <Link href={`/product/${p.slug}`} className="group block">
              <Image src={p.image || "/images/placeholder.webp"} alt="" width={220} height={275} className="aspect-[4/5] w-full rounded-lg bg-surface-muted object-cover" placeholder="blur" blurDataURL={BLUR_DATA_URL} />
              <p className="mt-2 font-serif text-base leading-tight group-hover:text-cognac">{p.name}</p>
              <p className="text-xs text-muted">{formatINR(p.price)}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
