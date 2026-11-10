"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Heart, Menu, Search, ShoppingBag, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { cartCount, useCart } from "@/lib/store/cart";
import { useWishlist } from "@/lib/store/wishlist";
import { useHydrated, useUi } from "@/lib/store/ui";
import type { NavData } from "./nav-menu";

// Heavy, interaction-only UI is loaded on first use.
const SearchDialog = dynamic(() => import("./search-dialog").then((m) => m.SearchDialog), { ssr: false });
const MiniCart = dynamic(() => import("./mini-cart").then((m) => m.MiniCart), { ssr: false });
const MobileMenu = dynamic(() => import("./mobile-menu").then((m) => m.MobileMenu), { ssr: false });

/** Sticky header that becomes compact after scrolling. */
export function StickyHeader({ children }: { children: React.ReactNode }) {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setCompact(window.scrollY > 40));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header
      data-compact={compact}
      className={cn(
        "sticky top-0 z-40 border-b border-transparent bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 transition-[height,border-color,box-shadow] duration-300",
        compact ? "h-16 border-border shadow-[0_1px_0_rgba(0,0,0,0.02)]" : "h-[72px] md:h-20",
      )}
    >
      {children}
    </header>
  );
}

const iconBtn =
  "relative inline-flex size-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-surface-muted [&_svg]:size-[21px] [&_svg]:stroke-[1.5]";

function CountBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="absolute right-1 top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-medium leading-[18px] text-background">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function HeaderActions() {
  const hydrated = useHydrated();
  const lines = useCart((s) => s.lines);
  const wishCount = useWishlist((s) => s.items.length);
  const { miniCartOpen, searchOpen, setSearch, setMiniCart } = useUi();
  const [searchLoaded, setSearchLoaded] = useState(false);
  const [cartLoaded, setCartLoaded] = useState(false);
  const count = hydrated ? cartCount(lines) : 0;

  useEffect(() => {
    if (searchOpen) setSearchLoaded(true);
  }, [searchOpen]);
  useEffect(() => {
    if (miniCartOpen) setCartLoaded(true);
  }, [miniCartOpen]);

  // "/" focuses search, like many premium stores
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) && !t.isContentEditable) {
        e.preventDefault();
        setSearch(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setSearch]);

  return (
    <div className="flex items-center justify-self-end gap-0.5 md:gap-1">
      <button type="button" className={iconBtn} aria-label="Search" onClick={() => setSearch(true)}>
        <Search />
      </button>
      <Link href="/account" className={cn(iconBtn, "hidden sm:inline-flex")} aria-label="My account">
        <User />
      </Link>
      <Link href="/wishlist" className={cn(iconBtn, "hidden sm:inline-flex")} aria-label={`Wishlist${hydrated && wishCount ? `, ${wishCount} items` : ""}`}>
        <Heart />
        <CountBadge count={hydrated ? wishCount : 0} />
      </Link>
      <button type="button" className={iconBtn} aria-label={`Shopping bag${count ? `, ${count} items` : ""}`} onClick={() => setMiniCart(true)}>
        <ShoppingBag />
        <CountBadge count={count} />
      </button>
      {searchLoaded && <SearchDialog />}
      {cartLoaded && <MiniCart />}
    </div>
  );
}

export function MobileMenuButton({ nav, phone }: { nav: NavData; phone: string }) {
  const { menuOpen, setMenu } = useUi();
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (menuOpen) setLoaded(true);
  }, [menuOpen]);
  return (
    <>
      <button type="button" className={iconBtn} aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenu(true)}>
        <Menu />
      </button>
      {loaded && <MobileMenu nav={nav} phone={phone} />}
    </>
  );
}
