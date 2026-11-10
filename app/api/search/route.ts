import { NextResponse, type NextRequest } from "next/server";
import { getAllProducts, searchProducts } from "@/lib/data/catalog";

const POPULAR = ["tote", "crossbody", "wallet", "olive", "coin purse", "burgundy"];

/** Predictive search: GET /api/search?q=tote  (catalogue is cached in memory) */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 80);
  const all = await getAllProducts();
  const matches = q.trim()
    ? searchProducts(all, q, 50)
    : [...all].filter((p) => p.is_trending).sort((a, b) => b.total_sold - a.total_sold);
  const results = matches.slice(0, 8).map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    image: p.image,
    colours: p.colours.map((c) => c.name),
  }));
  return NextResponse.json(
    { results, popular: POPULAR, total: q.trim() ? matches.length : results.length },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600" } },
  );
}
