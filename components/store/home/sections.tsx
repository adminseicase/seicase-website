import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Gem, Lock, RotateCcw, Sparkles, Truck } from "lucide-react";
import type { BannerSettings, ProductCardData, Taxonomy, TrustItem } from "@/lib/types";
import { BLUR_DATA_URL } from "@/lib/utils";
import { Container, SectionHeading } from "../section";
import { ScrollCarousel } from "../scroll-carousel";
import { ProductCard } from "../product-card";
import { NewsletterForm } from "../newsletter-form";
import { LeatherIcon } from "../icons";
import { VideoCard } from "./video-card";
import { BotanicalSprig, BotanicalBranch } from "../botanical";

const TRUST_ICONS = {
  leather: LeatherIcon,
  design: Sparkles,
  shipping: Truck,
  returns: RotateCcw,
  secure: Lock,
} as const;

export function TrustStrip({ items }: { items: TrustItem[] }) {
  return (
    <section aria-label="Why seicase" className="border-b bg-background">
      <Container>
        <ul className="scrollbar-none -mx-4 flex snap-x overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-5 md:px-0">
          {items.map((it, i) => {
            const Icon = TRUST_ICONS[it.icon] ?? Gem;
            return (
              <li
                key={it.title + i}
                className="flex w-[42%] shrink-0 snap-start flex-col items-center gap-2 px-3 py-6 text-center md:w-auto md:border-l md:first:border-l-0"
              >
                <Icon className="size-6 stroke-[1.25] text-brown" aria-hidden="true" />
                <p className="text-[0.82rem] leading-snug">
                  {it.title}
                  <br />
                  <span className="text-muted">{it.subtitle}</span>
                </p>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}

export function CategoryCarousel({ categories }: { categories: (Taxonomy & { href?: string })[] }) {
  return (
    <section aria-labelledby="shop-by-category" className="py-14 md:py-20">
      <Container>
        <SectionHeading id="shop-by-category" title="Shop by Category" href="/shop" />
        <ScrollCarousel label="Shop by category" itemClassName="w-[40%] sm:w-[28%] lg:w-[15.5%]">
          {categories.map((c) => (
            <Link key={c.id} href={c.href ?? `/shop/${c.slug}`} className="group block text-center">
              <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-surface-muted">
                <Image
                  src={c.image_url || "/images/placeholder.webp"}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 40vw, (max-width: 1024px) 28vw, 15vw"
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URL}
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <p className="mt-3 text-sm tracking-wide group-hover:text-cognac">{c.name}</p>
            </Link>
          ))}
        </ScrollCarousel>
      </Container>
    </section>
  );
}

export function CraftedBanner({ crafted }: { crafted: BannerSettings["crafted"] }) {
  return (
    <section aria-label="Crafted with care" className="pb-14 md:pb-20">
      <Container className="grid gap-4 md:grid-cols-[1.15fr_1fr] md:gap-5">
        <div className="relative min-h-[320px] overflow-hidden rounded-2xl md:min-h-[400px]">
          <Image src={crafted.image} alt="Close-up of hand-woven cognac leather" fill sizes="(max-width: 768px) 100vw, 55vw" className="object-cover" placeholder="blur" blurDataURL={BLUR_DATA_URL} />
          <div className="absolute inset-0 bg-gradient-to-r from-[#2a1810]/85 via-[#2a1810]/55 to-[#2a1810]/10" />
          <div className="relative flex h-full max-w-sm flex-col justify-center p-8 text-[#F6EEE7] md:p-12">
            <h2 className="text-4xl md:text-5xl">{crafted.title}</h2>
            <p className="mt-4 text-[0.95rem] leading-relaxed text-[#F6EEE7]/85">{crafted.body}</p>
            <Link href={crafted.link_href} className="group mt-6 inline-flex items-center gap-2 text-sm underline underline-offset-4">
              {crafted.link_label} <ArrowRight className="size-4 stroke-[1.5] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
        <VideoCard poster={crafted.video_poster} videoUrl={crafted.video_url} label={crafted.video_label} fallbackHref={`${crafted.link_href}#process`} />
      </Container>
    </section>
  );
}

export function TrendingPicks({ products }: { products: ProductCardData[] }) {
  if (!products.length) return null;
  return (
    <section aria-labelledby="trending" className="pb-14 md:pb-20">
      <Container>
        <SectionHeading id="trending" title="Trending Picks" href="/shop?sort=best-selling" align="center" />
        <ScrollCarousel label="Trending products">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </ScrollCarousel>
      </Container>
    </section>
  );
}

export function ShopByStyle({ styles }: { styles: Taxonomy[] }) {
  return (
    <section aria-labelledby="shop-by-style" className="pb-14 md:pb-20">
      <Container>
        <SectionHeading id="shop-by-style" title="Shop by Style" href="/shop" />
        <ScrollCarousel label="Shop by style" itemClassName="w-[70%] sm:w-[45%] lg:w-[23.5%]">
          {styles.map((s) => (
            <Link key={s.id} href={`/style/${s.slug}`} className="group block">
              <div className="relative aspect-[5/4] overflow-hidden rounded-xl bg-surface-muted">
                <Image
                  src={s.image_url || "/images/placeholder.webp"}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 70vw, (max-width: 1024px) 45vw, 24vw"
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URL}
                  className="object-cover object-[50%_65%] transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <p className="font-serif text-xl">{s.name}</p>
                <ArrowRight className="size-4 stroke-[1.5] opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
              </div>
              {s.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{s.description}</p>}
            </Link>
          ))}
        </ScrollCarousel>
      </Container>
    </section>
  );
}

export function LifestyleBanner({ lifestyle }: { lifestyle: BannerSettings["lifestyle"] }) {
  return (
    <section aria-label={lifestyle.title} className="pb-14 md:pb-20">
      <Container>
        <div className="relative grid overflow-hidden rounded-2xl bg-surface-muted md:min-h-[460px] md:grid-cols-[0.9fr_1.1fr]">
          <div className="relative z-10 flex flex-col justify-center p-8 md:p-14">
            <BotanicalSprig className="mb-6 h-14 w-14 text-cognac/60" />
            <h2 className="text-4xl md:text-6xl">{lifestyle.title}</h2>
            <p className="mt-4 max-w-sm text-muted">{lifestyle.body}</p>
            <Link
              href={lifestyle.cta_href}
              className="group mt-7 inline-flex w-fit items-center gap-2 border-b border-foreground pb-1 text-sm hover:text-cognac"
            >
              {lifestyle.cta_label} <ArrowRight className="size-4 stroke-[1.5] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </div>
          <div className="relative min-h-[300px]">
            <Image src={lifestyle.image} alt="The Crescent Bag in burgundy against a soft cream wall" fill sizes="(max-width: 768px) 100vw, 55vw" className="object-cover" placeholder="blur" blurDataURL={BLUR_DATA_URL} />
          </div>
        </div>
      </Container>
    </section>
  );
}

export function NewsletterBand({ newsletter }: { newsletter: BannerSettings["newsletter"] }) {
  return (
    <section aria-labelledby="newsletter" className="pb-6">
      <Container>
        <div className="relative overflow-hidden rounded-2xl bg-surface-muted px-6 py-12 text-center md:px-16 md:py-14">
          <BotanicalBranch className="pointer-events-none absolute -left-6 top-1/2 hidden h-48 -translate-y-1/2 text-cognac/35 md:block" />
          <BotanicalBranch className="pointer-events-none absolute -right-6 top-1/2 hidden h-48 -translate-y-1/2 -scale-x-100 text-cognac/35 md:block" />
          <h2 id="newsletter" className="text-4xl md:text-5xl">
            {newsletter.title}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted">{newsletter.body}</p>
          <NewsletterForm source="homepage" className="mx-auto mt-6 max-w-md" />
        </div>
      </Container>
    </section>
  );
}
