import Link from "next/link";
import { BotanicalBranch } from "@/components/store/botanical";

export default function NotFound() {
  return (
    <main id="main" className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 text-center">
      <BotanicalBranch className="pointer-events-none absolute -left-10 top-1/2 h-80 -translate-y-1/2 text-cognac/25" />
      <BotanicalBranch className="pointer-events-none absolute -right-10 top-1/2 h-80 -translate-y-1/2 -scale-x-100 text-cognac/25" />
      <Link href="/" className="font-serif text-4xl">
        seicase
      </Link>
      <p className="mt-16 font-serif text-8xl text-cognac/70">404</p>
      <h1 className="mt-2 text-4xl md:text-5xl">This page has wandered off</h1>
      <p className="mt-3 max-w-md text-muted">The page you&apos;re looking for may have moved, or the piece may no longer be available.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/shop" className="inline-flex h-12 items-center rounded-md bg-foreground px-6 text-sm text-background hover:bg-brown">
          Explore Collection →
        </Link>
        <Link href="/help" className="inline-flex h-12 items-center rounded-md border border-foreground px-6 text-sm hover:bg-foreground hover:text-background">
          Visit Help Centre
        </Link>
      </div>
    </main>
  );
}
