"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleQuestionMark, Heart, LogOut, MapPin, Package, User } from "lucide-react";
import { signOut } from "@/lib/actions/account";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/account", label: "My Orders", Icon: Package },
  { href: "/account/wishlist", label: "Wishlist", Icon: Heart },
  { href: "/account/addresses", label: "Address Book", Icon: MapPin },
  { href: "/account/details", label: "Account Details", Icon: User },
  { href: "/account/support", label: "Help & Support", Icon: CircleQuestionMark },
];

export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Account" className="mt-6">
      <ul className="scrollbar-none -mx-1 flex gap-1 overflow-x-auto lg:flex-col">
        {LINKS.map(({ href, label, Icon }) => {
          const active = href === "/account" ? pathname === href || pathname.startsWith("/account/orders") : pathname.startsWith(href);
          return (
            <li key={href} className="shrink-0">
              <Link href={href} aria-current={active ? "page" : undefined} className={cn("flex h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors", active ? "bg-surface-muted font-medium" : "text-foreground/80 hover:bg-surface-muted/60")}>
                <Icon className="size-4 stroke-[1.5]" aria-hidden="true" /> {label}
              </Link>
            </li>
          );
        })}
        <li className="shrink-0">
          <form action={signOut}>
            <button type="submit" className="flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm text-foreground/80 hover:bg-surface-muted/60">
              <LogOut className="size-4 stroke-[1.5]" aria-hidden="true" /> Logout
            </button>
          </form>
        </li>
      </ul>
    </nav>
  );
}
