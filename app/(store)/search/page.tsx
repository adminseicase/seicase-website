import type { Metadata } from "next";
import { Suspense } from "react";
import { ShopResults, ShopResultsSkeleton } from "@/components/store/shop/shop-results";
import { Container } from "@/components/store/section";
import { SearchTracker } from "./search-tracker";

export const metadata: Metadata = {
  title: "Search",
  robots: { index: false, follow: true },
};

async function Heading({ searchParams }: { searchParams: PageProps<"/search">["searchParams"] }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  return (
    <header className="mt-4 mb-8">
      <p className="text-muted text-xs tracking-[0.16em] uppercase">Search results</p>
      <h1 className="mt-2 text-4xl md:text-5xl">{q ? `“${q}”` : "All products"}</h1>
      <SearchTracker q={q} />
    </header>
  );
}

export default function Page({ searchParams }: PageProps<"/search">) {
  return (
    <Container className="pt-6 pb-8 md:pt-10">
      <Suspense fallback={<div className="mt-4 mb-8 h-24" />}>
        <Heading searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<ShopResultsSkeleton />}>
        <ShopResults searchParams={searchParams} basePath="/search" fixed={{}} />
      </Suspense>
    </Container>
  );
}
