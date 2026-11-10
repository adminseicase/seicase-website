import type { Metadata } from "next";
import { getAllProducts, getCategories, getStyles, toCard } from "@/lib/data/catalog";
import { getHeroSlides, getSiteSettings } from "@/lib/data/content";
import { Hero } from "@/components/store/home/hero";
import {
  CategoryCarousel,
  CraftedBanner,
  LifestyleBanner,
  NewsletterBand,
  ShopByStyle,
  TrendingPicks,
  TrustStrip,
} from "@/components/store/home/sections";
import { JsonLd } from "@/components/store/json-ld";
import { absoluteUrl } from "@/lib/utils";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/**
 * Home page — fully static (prerendered at build) and refreshed on demand
 * whenever products or content change in the admin panel.
 */
export default async function HomePage() {
  const [slides, settings, categories, styles, products] = await Promise.all([
    getHeroSlides(),
    getSiteSettings(),
    getCategories(),
    getStyles(),
    getAllProducts(),
  ]);

  const trending = products
    .filter((p) => p.is_trending)
    .concat(products.filter((p) => !p.is_trending).sort((a, b) => b.total_sold - a.total_sold))
    .slice(0, 10)
    .map(toCard);

  const newIn = products.find((p) => p.is_new);
  const categoryTiles = [
    ...categories.filter((c) => c.is_visible),
    ...(newIn
      ? [{ id: "new-in", name: "New In", slug: "new-in", description: null, image_url: newIn.image, sort_order: 99, is_visible: true }]
      : []),
  ];

  const sections: Record<string, React.ReactNode> = {
    hero: <Hero key="hero" slides={slides} />,
    trust: <TrustStrip key="trust" items={settings.trust_strip.items} />,
    categories: <CategoryCarousel key="categories" categories={categoryTiles} />,
    crafted: <CraftedBanner key="crafted" crafted={settings.banners.crafted} />,
    trending: <TrendingPicks key="trending" products={trending} />,
    styles: <ShopByStyle key="styles" styles={styles.filter((s) => s.is_visible)} />,
    lifestyle: <LifestyleBanner key="lifestyle" lifestyle={settings.banners.lifestyle} />,
    newsletter: <NewsletterBand key="newsletter" newsletter={settings.banners.newsletter} />,
  };

  const s = settings.store;
  return (
    <>
      {settings.homepage.sections.filter((sec) => sec.visible).map((sec) => sections[sec.id])}
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "seicase",
            url: absoluteUrl("/"),
            logo: absoluteUrl("/icon.svg"),
            slogan: "Carry What You Love. Timeless leather. Thoughtful design.",
            email: s.email,
            telephone: s.phone,
            address: {
              "@type": "PostalAddress",
              streetAddress: s.address_line,
              addressLocality: s.city,
              addressRegion: s.state,
              postalCode: s.pincode,
              addressCountry: "IN",
            },
            sameAs: Object.values(settings.social).filter(Boolean),
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "seicase",
            url: absoluteUrl("/"),
            potentialAction: {
              "@type": "SearchAction",
              target: `${absoluteUrl("/search")}?q={search_term_string}`,
              "query-input": "required name=search_term_string",
            },
          },
        ]}
      />
    </>
  );
}
