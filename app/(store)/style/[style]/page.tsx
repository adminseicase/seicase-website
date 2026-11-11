import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStyles } from "@/lib/data/catalog";
import { Suspense } from "react";
import { ShopPage } from "@/components/store/shop/shop-page";
import { ShopResultsSkeleton } from "@/components/store/shop/shop-results";

export async function generateStaticParams() {
  return (await getStyles()).map((s) => ({ style: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/style/[style]">): Promise<Metadata> {
  const { style } = await params;
  const s = (await getStyles()).find((x) => x.slug === style);
  if (!s) return {};
  return {
    title: s.seo_title || `${s.name} Leather Bags`,
    description: s.seo_description || s.description || undefined,
    alternates: { canonical: `/style/${s.slug}` },
  };
}

export default function Page(props: PageProps<"/style/[style]">) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1440px] px-4 pt-10 md:px-8">
          <ShopResultsSkeleton />
        </div>
      }
    >
      <Content params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Content({ params, searchParams }: PageProps<"/style/[style]">) {
  const { style } = await params;
  const s = (await getStyles()).find((x) => x.slug === style && x.is_visible);
  if (!s) notFound();
  return (
    <ShopPage
      title={s.name}
      description={s.description}
      crumbs={[{ label: "Home", href: "/" }, { label: "Shop", href: "/shop" }, { label: s.name }]}
      basePath={`/style/${s.slug}`}
      searchParams={searchParams}
      fixed={{ styleSlug: s.slug }}
    />
  );
}
