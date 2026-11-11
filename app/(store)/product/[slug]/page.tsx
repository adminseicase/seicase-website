import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { getAllProducts, getCharms, getProductBySlug, getProductReviews, getProductSlugs, toCard } from "@/lib/data/catalog";
import { getSiteSettings } from "@/lib/data/content";
import { Breadcrumbs, Container } from "@/components/store/section";
import { ProductView } from "@/components/store/product/product-view";
import { ProductTabs } from "@/components/store/product/product-tabs";
import { Reviews } from "@/components/store/product/reviews";
import { RecentlyViewed } from "@/components/store/product/recently-viewed";
import { ProductCard } from "@/components/store/product-card";
import { ScrollCarousel } from "@/components/store/scroll-carousel";
import { JsonLd } from "@/components/store/json-ld";
import { Skeleton } from "@/components/ui/skeleton";
import { absoluteUrl, formatINR, stripHtml, truncate } from "@/lib/utils";

export async function generateStaticParams() {
  const params = (await getProductSlugs()).map((slug) => ({ slug }));
  // Cache Components needs at least one entry; the placeholder renders notFound().
  return params.length ? params : [{ slug: "__placeholder__" }];
}

export async function generateMetadata({ params }: PageProps<"/product/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return { title: "Product not found" };
  const image = p.images.find((i) => i.is_primary) ?? p.images.find((i) => i.kind === "gallery");
  const description = p.seo_description || truncate(p.short_description || stripHtml(p.description), 155);
  return {
    title: p.seo_title || `${p.name} — ${formatINR(p.price)}`,
    description,
    alternates: { canonical: `/product/${p.slug}` },
    openGraph: {
      type: "website",
      title: p.name,
      description,
      url: `/product/${p.slug}`,
      images: image ? [{ url: image.url, width: 1000, height: 1250, alt: image.alt ?? p.name }] : undefined,
    },
    twitter: { card: "summary_large_image", title: p.name, description, images: image ? [image.url] : undefined },
  };
}

function Accordion({ title, children, open = false }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details className="group border-b" open={open}>
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between text-sm font-medium [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown className="size-4 stroke-[1.5] transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="text-foreground/85 pb-5 text-sm leading-relaxed">{children}</div>
    </details>
  );
}

async function RelatedProducts({ categoryId, productId }: { categoryId: string | null; productId: string }) {
  const all = await getAllProducts();
  const related = [
    ...all.filter((p) => p.id !== productId && p.category_id === categoryId),
    ...all.filter((p) => p.id !== productId && p.category_id !== categoryId && p.is_trending),
  ].slice(0, 8);
  if (!related.length) return null;
  return (
    <section aria-labelledby="also-like" className="mt-16">
      <h2 id="also-like" className="mb-6 text-center text-3xl md:text-4xl">
        You May Also Like
      </h2>
      <ScrollCarousel label="You may also like">
        {related.map((p) => (
          <ProductCard key={p.id} product={toCard(p)} />
        ))}
      </ScrollCarousel>
    </section>
  );
}

function ProductSkeleton() {
  return (
    <Container className="pt-6 pb-8 md:pt-8" aria-busy="true">
      <Skeleton className="h-4 w-60" />
      <div className="mt-5 grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
        <Skeleton className="aspect-[4/5] rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </Container>
  );
}

/** Params are read inside Suspense: known slugs are fully prerendered, new ones stream in. */
export default function ProductPage(props: PageProps<"/product/[slug]">) {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductContent params={props.params} />
    </Suspense>
  );
}

async function ProductContent({ params }: Pick<PageProps<"/product/[slug]">, "params">) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const [charms, reviews, settings] = await Promise.all([getCharms(), getProductReviews(product.id), getSiteSettings()]);
  const isBag = ["handbags", "purses"].includes(product.category?.slug ?? "");
  const spinFrames = product.images
    .filter((i) => i.kind === "spin")
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((i) => i.url);
  const angles = product.images
    .filter((i) => i.kind === "gallery" && i.url.includes("-angle"))
    .map((i) => i.url)
    .slice(0, 3);
  const { shipping } = settings;

  const dimensions = (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
      {product.width_cm != null && (
        <>
          <dt className="text-muted">Width</dt>
          <dd>{product.width_cm} cm</dd>
        </>
      )}
      {product.height_cm != null && (
        <>
          <dt className="text-muted">Height</dt>
          <dd>{product.height_cm} cm</dd>
        </>
      )}
      {product.depth_cm != null && (
        <>
          <dt className="text-muted">Depth</dt>
          <dd>{product.depth_cm} cm</dd>
        </>
      )}
      {product.strap_drop_cm != null && (
        <>
          <dt className="text-muted">Strap / handle drop</dt>
          <dd>{product.strap_drop_cm} cm</dd>
        </>
      )}
      {product.weight_g != null && (
        <>
          <dt className="text-muted">Weight</dt>
          <dd>{product.weight_g} g</dd>
        </>
      )}
      {product.material && (
        <>
          <dt className="text-muted">Material</dt>
          <dd>{product.material}</dd>
        </>
      )}
    </dl>
  );
  const details = product.description ? (
    <div className="prose-seicase" dangerouslySetInnerHTML={{ __html: product.description }} />
  ) : (
    <p>{product.short_description}</p>
  );

  return (
    <Container className="pt-6 pb-8 md:pt-8">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Shop", href: "/shop" },
          ...(product.category ? [{ label: product.category.name, href: `/shop/${product.category.slug}` }] : []),
          { label: product.name },
        ]}
      />
      <div className="mt-5">
        <ProductView product={product} charms={isBag ? charms : []}>
          <div className="mt-6 border-t">
            <Accordion title="Product Details" open>
              {details}
            </Accordion>
            <Accordion title="Dimensions">{dimensions}</Accordion>
            <Accordion title="Care Guide">
              <p>{product.care_instructions}</p>
            </Accordion>
            <Accordion title="Shipping & Returns">
              <p>
                Free shipping on orders above {formatINR(shipping.free_threshold)} (otherwise {formatINR(shipping.flat_rate)}). Dispatched
                within 1–2 business days; delivery in {shipping.metro_days} days to metros and {shipping.standard_days} days elsewhere. Easy{" "}
                {shipping.return_window_days}-day returns.
              </p>
            </Accordion>
          </div>
        </ProductView>
      </div>

      <ProductTabs name={product.name} spinFrames={spinFrames} posters={angles} details={details} dimensions={dimensions} />

      <Reviews
        productId={product.id}
        productName={product.name}
        reviews={reviews}
        ratingAvg={Number(product.rating_avg)}
        ratingCount={product.rating_count}
      />

      <Suspense fallback={<Skeleton className="mt-16 h-80" />}>
        <RelatedProducts categoryId={product.category_id} productId={product.id} />
      </Suspense>
      <RecentlyViewed excludeId={product.id} />

      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            description: stripHtml(product.description) || product.short_description,
            image: product.images
              .filter((i) => i.kind === "gallery")
              .slice(0, 6)
              .map((i) => absoluteUrl(i.url)),
            sku: product.variants[0]?.sku,
            brand: { "@type": "Brand", name: "seicase" },
            material: product.material ?? undefined,
            ...(product.rating_count > 0
              ? {
                  aggregateRating: {
                    "@type": "AggregateRating",
                    ratingValue: Number(product.rating_avg).toFixed(1),
                    reviewCount: product.rating_count,
                  },
                }
              : {}),
            review: reviews.slice(0, 3).map((r) => ({
              "@type": "Review",
              author: { "@type": "Person", name: r.author_name },
              reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
              reviewBody: r.body,
              datePublished: r.created_at.slice(0, 10),
            })),
            offers: product.variants.map((v) => ({
              "@type": "Offer",
              url: absoluteUrl(`/product/${product.slug}?colour=${v.colour_name.toLowerCase().replace(/\s+/g, "-")}`),
              priceCurrency: "INR",
              price: Number(v.price_override ?? product.price),
              sku: v.sku,
              itemCondition: "https://schema.org/NewCondition",
              availability: v.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
              seller: { "@type": "Organization", name: "seicase" },
              shippingDetails: {
                "@type": "OfferShippingDetails",
                shippingDestination: { "@type": "DefinedRegion", addressCountry: "IN" },
                shippingRate: {
                  "@type": "MonetaryAmount",
                  value: Number(product.price) >= shipping.free_threshold ? 0 : shipping.flat_rate,
                  currency: "INR",
                },
              },
              hasMerchantReturnPolicy: {
                "@type": "MerchantReturnPolicy",
                applicableCountry: "IN",
                returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
                merchantReturnDays: shipping.return_window_days,
              },
            })),
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
              { "@type": "ListItem", position: 2, name: "Shop", item: absoluteUrl("/shop") },
              ...(product.category
                ? [{ "@type": "ListItem", position: 3, name: product.category.name, item: absoluteUrl(`/shop/${product.category.slug}`) }]
                : []),
              {
                "@type": "ListItem",
                position: product.category ? 4 : 3,
                name: product.name,
                item: absoluteUrl(`/product/${product.slug}`),
              },
            ],
          },
        ]}
      />
    </Container>
  );
}
