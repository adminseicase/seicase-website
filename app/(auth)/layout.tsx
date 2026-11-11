import Image from "next/image";
import Link from "next/link";

/** Calm split-screen layout for sign-in pages. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-5 py-6 md:px-12">
        <Link href="/" className="font-serif text-4xl" aria-label="seicase home">
          seicase
        </Link>
        <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          {children}
        </main>
        <p className="text-muted text-center text-xs">
          <Link href="/privacy-policy" className="hover:underline">
            Privacy Policy
          </Link>{" "}
          ·{" "}
          <Link href="/terms-of-service" className="hover:underline">
            Terms
          </Link>{" "}
          ·{" "}
          <Link href="/help" className="hover:underline">
            Help
          </Link>
        </p>
      </div>
      <div className="relative hidden lg:block">
        <Image src="/images/hero/hero-1.webp" alt="" fill sizes="50vw" className="object-cover object-[70%_50%]" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#1f1a17]/45 to-transparent p-12">
          <p className="max-w-sm font-serif text-4xl leading-tight text-[#F6EEE7]">Carry What You Love.</p>
          <p className="mt-2 text-[#F6EEE7]/85">Timeless leather. Thoughtful design.</p>
        </div>
      </div>
    </div>
  );
}
