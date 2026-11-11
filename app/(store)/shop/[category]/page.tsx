import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategories } from "@/lib/data/catalog";
import { Suspense } from "react";
import { ShopPage } from "@/components/store/shop/shop-page";
import { ShopResultsSkeleton } from "@/components/store/shop/shop-results";

const NEW_IN = {
  name: "New In",
  slug: "new-in",
  description: "The newest pieces from our studio.",
  seo_title: null,
  seo_description: null,
};

export async function generateStaticParams() {
  const cats = await getCategories();
  return [...cats.map((c) => ({ category: c.slug })), { category: "new-in" }];
}

async function resolve(slug: string) {
  if (slug === "new-in") return NEW_IN;
  return (await getCategories()).find((c) => c.slug === slug && c.is_visible) ?? null;
}

export async function generateMetadata({ params }: PageProps<"/shop/[category]">): Promise<Metadata> {
  const { category } = await params;
  const c = await resolve(category);
  if (!c) return {};
  return {
    title: c.seo_title || `${c.name} — Leather ${c.name}`,
    description: c.seo_description || c.description || `Shop ${c.name.toLowerCase()} by seicase.`,
    alternates: { canonical: `/shop/${c.slug}` },
  };
}

export default function Page(props: PageProps<"/shop/[category]">) {
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

async function Content({ params, searchParams }: PageProps<"/shop/[category]">) {
  const { category } = await params;
  const c = await resolve(category);
  if (!c) notFound();
  return (
    <ShopPage
      title={c.name}
      description={c.description}
      crumbs={[{ label: "Home", href: "/" }, { label: "Shop", href: "/shop" }, { label: c.name }]}
      basePath={`/shop/${c.slug}`}
      searchParams={searchParams}
      fixed={c.slug === "new-in" ? { newIn: true } : { categorySlug: c.slug }}
    />
  );
}
