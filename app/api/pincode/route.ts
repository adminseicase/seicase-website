import { NextResponse, type NextRequest } from "next/server";
import { getSiteSettings } from "@/lib/data/content";

// First digits of metro pincodes (Chennai, Mumbai, Delhi, Bengaluru, Kolkata, Hyderabad, Pune, Ahmedabad)
const METRO_PREFIXES = ["600", "400", "110", "560", "700", "500", "411", "380"];
const SOUTH_ZONE = /^[56]/; // ships fastest from Chennai

function addBusinessDays(from: Date, days: number) {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0) added++;
  }
  return d;
}

/**
 * GET /api/pincode?pin=600001 → delivery estimate.
 * Looks the pincode up on India Post (with a short timeout) to confirm it
 * exists and name the city; falls back to zone rules if the API is slow.
 */
export async function GET(request: NextRequest) {
  const pin = request.nextUrl.searchParams.get("pin") ?? "";
  if (!/^[1-9]\d{5}$/.test(pin)) return NextResponse.json({ ok: false, message: "Please enter a valid 6-digit pincode." }, { status: 400 });

  let city: string | undefined;
  try {
    const r = await fetch(`https://api.postalpincode.in/pincode/${pin}`, { signal: AbortSignal.timeout(2500), next: { revalidate: 86400 } });
    const j = (await r.json()) as { Status: string; PostOffice?: { District: string; State: string }[] }[];
    if (j?.[0]?.Status === "Error") return NextResponse.json({ ok: false, message: "We couldn't find that pincode. Please check and try again." });
    const po = j?.[0]?.PostOffice?.[0];
    if (po) city = `${po.District}, ${po.State}`;
  } catch {
    /* fall back to zone rules */
  }

  const { shipping } = await getSiteSettings();
  const metro = METRO_PREFIXES.some((p) => pin.startsWith(p));
  const [minD, maxD] = metro ? [2, 4] : SOUTH_ZONE.test(pin) ? [3, 5] : [4, 7];
  const now = new Date();
  const fmt = (d: Date) => d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
  const message = `Delivery by ${fmt(addBusinessDays(now, minD))} – ${fmt(addBusinessDays(now, maxD))}${city ? ` to ${city}` : ""}`;
  return NextResponse.json(
    { ok: true, message, city, cod: shipping.cod_enabled },
    { headers: { "Cache-Control": "public, s-maxage=3600" } },
  );
}
