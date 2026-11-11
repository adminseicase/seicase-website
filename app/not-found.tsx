import Link from "next/link";
import { BotanicalBranch } from "@/components/store/botanical";
import { BrandLogo } from "@/components/brand-logo";

export default function NotFound() {
  return (
    <main id="main" className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 text-center">
      <BotanicalBranch className="text-cognac/25 pointer-events-none absolute top-1/2 -left-10 h-80 -translate-y-1/2" />
      <BotanicalBranch className="text-cognac/25 pointer-events-none absolute top-1/2 -right-10 h-80 -translate-y-1/2 -scale-x-100" />
      <Link href="/" className="inline-flex" aria-label="seicase home">
        <BrandLogo className="h-12" priority />
      </Link>
      <p className="text-cognac/70 mt-16 font-serif text-8xl">404</p>
      <h1 className="mt-2 text-4xl md:text-5xl">This page has wandered off</h1>
      <p className="text-muted mt-3 max-w-md">The page you&apos;re looking for may have moved, or the piece may no longer be available.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/shop" className="bg-foreground text-background hover:bg-brown inline-flex h-12 items-center rounded-md px-6 text-sm">
          Explore Collection →
        </Link>
        <Link
          href="/help"
          className="border-foreground hover:bg-foreground hover:text-background inline-flex h-12 items-center rounded-md border px-6 text-sm"
        >
          Visit Help Centre
        </Link>
      </div>
    </main>
  );
}
