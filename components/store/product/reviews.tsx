import Image from "next/image";
import { BadgeCheck, Star } from "lucide-react";
import type { Review } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { WriteReview } from "./write-review";

function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("flex", className)} aria-label={`${value} out of 5 stars`} role="img">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={cn("size-4", i < Math.round(value) ? "fill-foreground stroke-foreground" : "stroke-border-strong")} aria-hidden="true" />
      ))}
    </span>
  );
}

/** Ratings summary + approved reviews. Writing a review is limited to verified buyers. */
export function Reviews({
  productId,
  productName,
  reviews,
  ratingAvg,
  ratingCount,
}: {
  productId: string;
  productName: string;
  reviews: Review[];
  ratingAvg: number;
  ratingCount: number;
}) {
  const dist = [5, 4, 3, 2, 1].map((s) => ({ s, n: reviews.filter((r) => r.rating === s).length }));
  const total = reviews.length || 1;
  return (
    <section id="reviews" aria-labelledby="reviews-title" className="mt-16 scroll-mt-24">
      <div className="grid gap-10 lg:grid-cols-[300px_1fr]">
        <div>
          <h2 id="reviews-title" className="text-3xl md:text-4xl">
            Customer Reviews
          </h2>
          <div className="mt-4 flex items-center gap-3">
            <span className="font-serif text-5xl">{ratingAvg.toFixed(1)}</span>
            <div>
              <Stars value={ratingAvg} />
              <p className="mt-1 text-sm text-muted">Based on {ratingCount} reviews</p>
            </div>
          </div>
          <ul className="mt-5 space-y-1.5" aria-label="Rating distribution">
            {dist.map(({ s, n }) => (
              <li key={s} className="flex items-center gap-3 text-xs">
                <span className="w-3">{s}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                  <span className="block h-full bg-foreground" style={{ width: `${(n / total) * 100}%` }} />
                </span>
                <span className="w-6 text-right text-muted">{n}</span>
              </li>
            ))}
          </ul>
          <WriteReview productId={productId} productName={productName} />
        </div>
        <ul className="divide-y">
          {reviews.length === 0 && <li className="py-6 text-muted">No written reviews yet — be the first to share yours.</li>}
          {reviews.map((r) => (
            <li key={r.id} className="py-6 first:pt-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Stars value={r.rating} />
                {r.title && <p className="font-medium">{r.title}</p>}
              </div>
              {r.body && <p className="mt-2 leading-relaxed text-foreground/85">{r.body}</p>}
              {r.images.length > 0 && (
                <ul className="mt-3 flex gap-2">
                  {r.images.map((src) => (
                    <li key={src}>
                      <a href={src} target="_blank" rel="noopener noreferrer">
                        <Image src={src} alt={`Photo from ${r.author_name}`} width={88} height={88} className="size-[88px] rounded-md object-cover" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 flex items-center gap-2 text-xs text-muted">
                {r.author_name}
                {r.is_verified && (
                  <span className="inline-flex items-center gap-1 text-success">
                    <BadgeCheck className="size-3.5" aria-hidden="true" /> Verified buyer
                  </span>
                )}
                <span aria-hidden="true">·</span> {formatDate(r.created_at)}
              </p>
              {r.admin_reply && (
                <div className="mt-3 rounded-lg bg-surface-muted p-3 text-sm">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted">Reply from seicase</p>
                  <p className="mt-1">{r.admin_reply}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
