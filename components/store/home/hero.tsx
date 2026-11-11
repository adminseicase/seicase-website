import Link from "next/link";
import { getImageProps } from "next/image";
import { preload } from "react-dom";
import { ArrowRight } from "lucide-react";
import type { HeroSlide } from "@/lib/types";
import { HeroCarousel } from "./hero-carousel";

/**
 * Hero slides. Each slide is art-directed (portrait image on phones,
 * landscape on larger screens). Slide 1 is preloaded as the LCP element;
 * the others load lazily.
 */
export function Hero({ slides }: { slides: HeroSlide[] }) {
  if (!slides.length) return null;
  const rendered = slides.map((slide, i) => {
    const first = i === 0;
    const common = { alt: slide.alt ?? slide.title, quality: 75, sizes: "100vw" } as const;
    const {
      props: { srcSet: desktop, ...rest },
    } = getImageProps({
      ...common,
      src: slide.image_url,
      width: 1920,
      height: 1080,
      fetchPriority: first ? "high" : "low",
      loading: first ? "eager" : "lazy",
    });
    const {
      props: { srcSet: mobile },
    } = getImageProps({ ...common, src: slide.mobile_image_url || slide.image_url, width: 900, height: 1200, quality: 70 });

    if (first) {
      preload(rest.src, { as: "image", imageSrcSet: desktop, imageSizes: "100vw", fetchPriority: "high", media: "(min-width: 768px)" });
      preload(rest.src, { as: "image", imageSrcSet: mobile, imageSizes: "100vw", fetchPriority: "high", media: "(max-width: 767px)" });
    }

    return (
      <div key={slide.id} className="relative h-full w-full">
        <picture>
          <source media="(min-width: 768px)" srcSet={desktop} sizes="100vw" />
          <source media="(max-width: 767px)" srcSet={mobile} sizes="100vw" />
          <img {...rest} alt={rest.alt} className="absolute inset-0 h-full w-full object-cover object-[70%_50%] md:object-center" />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-b from-[#f6eee7]/70 via-transparent to-transparent md:bg-gradient-to-r md:from-[#f6eee7]/80 md:via-[#f6eee7]/20 md:to-transparent" />
        <div className="absolute inset-0 flex items-start pt-10 md:items-center md:pt-0">
          <div className="mx-auto w-full max-w-[1440px] px-6 md:px-14">
            <div className="max-w-xl">
              {slide.eyebrow && <p className="text-brown mb-3 text-xs tracking-[0.22em] uppercase md:mb-4">{slide.eyebrow}</p>}
              {first ? (
                <h1 className="text-[2.75rem] leading-[1.02] md:text-7xl lg:text-[5.4rem]">{slide.title}</h1>
              ) : (
                <h2 className="text-[2.75rem] leading-[1.02] md:text-7xl lg:text-[5.4rem]">{slide.title}</h2>
              )}
              {slide.subtitle && <p className="text-foreground/85 mt-4 max-w-md text-base md:mt-6 md:text-lg">{slide.subtitle}</p>}
              {slide.cta_label && slide.cta_href && (
                <Link
                  href={slide.cta_href}
                  className="bg-foreground text-background hover:bg-brown mt-6 inline-flex h-12 items-center gap-2 rounded-md px-6 text-sm font-medium tracking-wide transition-colors md:mt-8"
                  tabIndex={first ? 0 : -1}
                >
                  {slide.cta_label} <ArrowRight className="size-4 stroke-[1.5]" aria-hidden="true" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  });
  return <HeroCarousel count={slides.length}>{rendered}</HeroCarousel>;
}
