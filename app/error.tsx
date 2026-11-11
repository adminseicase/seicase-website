"use client";

import { useEffect } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="main" className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <BrandLogo className="h-12" />
      <h1 className="mt-10 text-4xl md:text-5xl">Something went a little wrong</h1>
      <p className="text-muted mt-3 max-w-md">We&apos;re sorry — please try again. If it keeps happening, our team is happy to help.</p>
      {error.digest && <p className="text-muted mt-2 text-xs">Reference: {error.digest}</p>}
      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="bg-foreground text-background hover:bg-brown inline-flex h-12 items-center rounded-md px-6 text-sm"
        >
          Try again
        </button>
        <Link href="/" className="border-foreground inline-flex h-12 items-center rounded-md border px-6 text-sm">
          Go home
        </Link>
      </div>
    </main>
  );
}
