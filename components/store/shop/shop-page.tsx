import { Suspense } from "react";
import { Breadcrumbs, Container } from "../section";
import { ShopResults, ShopResultsSkeleton } from "./shop-results";
import { JsonLd } from "../json-ld";
import { absoluteUrl } from "@/lib/utils";

type SP = Record<string, string | string[] | undefined>;

/** Shared layout for every product listing page. */
export function ShopPage({
  title,
  description,
  crumbs,
  basePath,
  searchParams,
  fixed,
}: {
  title: string;
  description?: string | null;
  crumbs: { label: string; href?: string }[];
  basePath: string;
  searchParams: Promise<SP>;
  fixed: { categorySlug?: string; styleSlug?: string; newIn?: boolean; q?: string };
}) {
  return (
    <Container className="pt-6 pb-8 md:pt-10">
      <Breadcrumbs items={crumbs} />
      <header className="mt-4 mb-8 max-w-2xl md:mb-10">
        <h1 className="text-4xl md:text-6xl">{title}</h1>
        {description && <p className="text-muted mt-3">{description}</p>}
      </header>
      <Suspense fallback={<ShopResultsSkeleton />}>
        <ShopResults searchParams={searchParams} basePath={basePath} fixed={fixed} />
      </Suspense>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: crumbs.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.label,
            item: absoluteUrl(c.href ?? basePath),
          })),
        }}
      />
    </Container>
  );
}
