import Image from "next/image";

/** The seicase wordmark (public/images/logo/seicaselogo.png, 155×48). Size it with a height class, e.g. "h-10". */
export function BrandLogo({ className = "h-10", priority = false }: { className?: string; priority?: boolean }) {
  return (
    <Image
      src="/images/logo/seicaselogo.png"
      alt="seicase"
      width={155}
      height={48}
      priority={priority}
      className={`w-auto ${className}`}
    />
  );
}

/** The seicase star mark (public/images/logo/favicon.png), for tight spaces like a collapsed sidebar. */
export function BrandMark({ className = "h-8" }: { className?: string }) {
  return <Image src="/images/logo/favicon.png" alt="seicase" width={68} height={65} className={`w-auto ${className}`} />;
}
