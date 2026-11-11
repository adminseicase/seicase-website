import Link from "next/link";
import { getCategories, getStyles } from "@/lib/data/catalog";
import { getSiteSettings } from "@/lib/data/content";
import { NavMenu } from "./nav-menu";
import { HeaderActions, MobileMenuButton, StickyHeader } from "./header-client";
import { BrandLogo } from "@/components/brand-logo";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="seicase home"
      className={`inline-flex items-center ${className}`}
    >
      <BrandLogo className="h-8 md:h-10" priority />
    </Link>
  );
}

/**
 * Site header. Server-rendered from cached data (categories, styles), with
 * small client "islands" for the cart count, search, wishlist and mobile menu.
 */
export async function Header() {
  const [categories, styles, settings] = await Promise.all([getCategories(), getStyles(), getSiteSettings()]);
  const shopLinks = categories.filter((c) => c.is_visible).map((c) => ({ label: c.name, href: `/shop/${c.slug}` }));
  const styleLinks = styles.filter((s) => s.is_visible).map((s) => ({ label: s.name, href: `/style/${s.slug}` }));
  const nav = {
    shop: [{ label: "Shop All", href: "/shop" }, { label: "New In", href: "/shop/new-in" }, ...shopLinks],
    styles: styleLinks,
    support: [
      { label: "Help Centre", href: "/help" },
      { label: "Shipping", href: "/shipping-policy" },
      { label: "Returns & Exchanges", href: "/returns-and-exchanges" },
      { label: "Care Guide", href: "/care-guide" },
      { label: "Contact Us", href: "/contact" },
    ],
  };
  return (
    <StickyHeader>
      <div className="mx-auto grid h-full max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center px-4 md:px-8 lg:grid-cols-[auto_1fr_auto]">
        <div className="flex items-center gap-1 lg:hidden">
          <MobileMenuButton nav={nav} phone={settings.store.phone} />
        </div>
        <Logo className="justify-self-center lg:justify-self-start" />
        <NavMenu nav={nav} />
        <HeaderActions />
      </div>
    </StickyHeader>
  );
}
