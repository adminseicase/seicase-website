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
    <header className="mb-8 mt-4">
      <p className="text-xs uppercase tracking-[0.16em] text-muted">Search results</p>
      <h1 className="mt-2 text-4xl md:text-5xl">{q ? `“${q}”` : "All products"}</h1>
      <SearchTracker q={q} />
    </header>
  );
}

export default function Page({ searchParams }: PageProps<"/search">) {
  return (
    <Container className="pb-8 pt-6 md:pt-10">
      <Suspense fallback={<div className="mb-8 mt-4 h-24" />}>
        <Heading searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<ShopResultsSkeleton />}>
        <ShopResults searchParams={searchParams} basePath="/search" fixed={{}} />
      </Suspense>
    </Container>
  );
}
