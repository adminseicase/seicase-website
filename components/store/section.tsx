import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Container({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-[1440px] px-4 md:px-8", className)}>{children}</div>;
}

export function SectionHeading({
  title,
  href,
  linkLabel = "View all",
  align = "left",
  id,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  align?: "left" | "center";
  id?: string;
}) {
  const link = href && (
    <Link href={href} className="group hover:text-cognac inline-flex shrink-0 items-center gap-2 pb-1 text-sm">
      {linkLabel}
      <ArrowRight className="size-4 stroke-[1.5] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </Link>
  );
  if (align === "center") {
    return (
      <div className="mb-6 grid grid-cols-[1fr_auto_1fr] items-end gap-4 md:mb-8">
        <span />
        <h2 id={id} className="text-center text-3xl md:text-[2.6rem]">
          {title}
        </h2>
        <span className="justify-self-end">{link}</span>
      </div>
    );
  }
  return (
    <div className="mb-6 flex items-end justify-between gap-4 md:mb-8">
      <h2 id={id} className="text-3xl md:text-[2.6rem]">
        {title}
      </h2>
      {link}
    </div>
  );
}

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-muted text-xs">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((it, i) => (
          <li key={it.label} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden="true">/</span>}
            {it.href ? (
              <Link href={it.href} className="hover:text-foreground">
                {it.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-foreground">
                {it.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
