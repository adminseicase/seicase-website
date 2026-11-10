"use client";

import Link from "next/link";
import { ChevronDown, Heart, Phone, User } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { useUi } from "@/lib/store/ui";
import type { NavData } from "./nav-menu";

export function MobileMenu({ nav, phone }: { nav: NavData; phone: string }) {
  const { menuOpen, setMenu } = useUi();
  const close = () => setMenu(false);
  const section = (title: string, links: { label: string; href: string }[], open = false) => (
    <details className="group border-b" open={open}>
      <summary className="flex h-14 cursor-pointer list-none items-center justify-between font-serif text-2xl [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown className="size-5 stroke-[1.5] transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <ul className="pb-3">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} onClick={close} className="flex h-11 items-center text-[0.95rem] text-foreground/85 hover:text-cognac">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
  return (
    <Sheet open={menuOpen} onOpenChange={setMenu} side="left" title="seicase" description="Site navigation">
      <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-5">
        {section("Shop", nav.shop, true)}
        {section("Shop by Style", nav.styles)}
        <Link href="/our-story" onClick={close} className="flex h-14 items-center border-b font-serif text-2xl">
          Our Story
        </Link>
        <Link href="/journal" onClick={close} className="flex h-14 items-center border-b font-serif text-2xl">
          Journal
        </Link>
        {section("Support", nav.support)}
      </nav>
      <div className="grid grid-cols-2 gap-2 border-t p-5">
        <Link href="/account" onClick={close} className="flex h-11 items-center justify-center gap-2 rounded-md border text-sm">
          <User className="size-4 stroke-[1.5]" /> Account
        </Link>
        <Link href="/wishlist" onClick={close} className="flex h-11 items-center justify-center gap-2 rounded-md border text-sm">
          <Heart className="size-4 stroke-[1.5]" /> Wishlist
        </Link>
        <a href={`tel:${phone.replace(/\s/g, "")}`} className="col-span-2 flex h-11 items-center justify-center gap-2 text-sm text-muted">
          <Phone className="size-4 stroke-[1.5]" /> {phone}
        </a>
      </div>
    </Sheet>
  );
}
