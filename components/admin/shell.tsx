"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChartColumn,
  Boxes,
  ExternalLink,
  FileText,
  Gem,
  Inbox,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Package,
  PanelLeft,
  Receipt,
  ScrollText,
  Search,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Star,
  Tags,
  Ticket,
  Undo2,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/actions/account";
import type { TrackerCounts } from "@/lib/admin/queries";
import { BrandLogo, BrandMark } from "@/components/brand-logo";

type Item = { href: string; label: string; Icon: typeof Package; badge?: keyof TrackerCounts; adminOnly?: boolean };
const NAV: { group: string; items: Item[] }[] = [
  {
    group: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", Icon: LayoutDashboard },
      { href: "/admin/analytics", label: "Analytics", Icon: ChartColumn },
    ],
  },
  {
    group: "Sales",
    items: [
      { href: "/admin/orders", label: "Orders", Icon: ShoppingBag, badge: "orders_to_ship" },
      { href: "/admin/returns", label: "Returns", Icon: Undo2, badge: "returns_open" },
      { href: "/admin/payments", label: "Payments", Icon: Wallet, badge: "payments_failed_24h" },
      { href: "/admin/abandoned-carts", label: "Abandoned carts", Icon: ShoppingCart, badge: "abandoned_carts" },
      { href: "/admin/customers", label: "Customers", Icon: Users },
      { href: "/admin/coupons", label: "Coupons", Icon: Ticket },
    ],
  },
  {
    group: "Catalogue",
    items: [
      { href: "/admin/products", label: "Products", Icon: Package },
      { href: "/admin/inventory", label: "Inventory", Icon: Boxes, badge: "low_stock" },
      { href: "/admin/taxonomies/categories", label: "Categories & styles", Icon: Tags },
      { href: "/admin/charms", label: "Charms", Icon: Gem },
      { href: "/admin/reviews", label: "Reviews", Icon: Star, badge: "reviews_pending" },
    ],
  },
  {
    group: "Content",
    items: [
      { href: "/admin/content", label: "Homepage & banners", Icon: FileText },
      { href: "/admin/content/journal", label: "Journal", Icon: ScrollText },
      { href: "/admin/content/pages", label: "Pages & FAQs", Icon: Receipt },
      { href: "/admin/messages", label: "Messages", Icon: Inbox, badge: "messages_unread" },
      { href: "/admin/newsletter", label: "Newsletter", Icon: Mail },
    ],
  },
  {
    group: "System",
    items: [
      { href: "/admin/settings", label: "Settings", Icon: Settings, adminOnly: true },
      { href: "/admin/audit-log", label: "Audit log", Icon: ScrollText },
    ],
  },
];

export function AdminShell({
  user,
  counts,
  children,
}: {
  user: { name: string; email: string; role: string };
  counts: TrackerCounts;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("sc_admin_collapsed") === "1");
    } catch {}
  }, []);
  useEffect(() => setMobileOpen(false), [pathname]);

  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`));

  const nav = (compact: boolean) => (
    <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 py-4">
      {NAV.map((g) => (
        <div key={g.group} className="mb-5">
          {!compact && <p className="text-muted mb-1.5 px-3 text-[11px] font-medium tracking-[0.14em] uppercase">{g.group}</p>}
          <ul className="space-y-0.5">
            {g.items
              .filter((i) => !i.adminOnly || user.role === "admin")
              .map(({ href, label, Icon, badge }) => {
                const n = badge ? counts[badge] : 0;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      title={compact ? label : undefined}
                      aria-current={isActive(href) ? "page" : undefined}
                      className={cn(
                        "flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors",
                        isActive(href) ? "bg-foreground text-background" : "text-foreground/80 hover:bg-surface-muted",
                        compact && "justify-center px-0",
                      )}
                    >
                      <Icon className="size-[18px] shrink-0 stroke-[1.5]" aria-hidden="true" />
                      {!compact && <span className="flex-1 truncate">{label}</span>}
                      {n > 0 && (
                        <span
                          className={cn(
                            "rounded-full px-1.5 text-[11px] leading-5",
                            isActive(href) ? "bg-background/20" : "bg-cognac text-white",
                            compact && "absolute -mt-5 ml-6",
                          )}
                        >
                          {n}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div>
      <div className="bg-background text-foreground flex min-h-dvh">
        <aside
          className={cn(
            "bg-surface sticky top-0 hidden h-dvh shrink-0 flex-col border-r transition-[width] lg:flex",
            collapsed ? "w-[72px]" : "w-64",
          )}
        >
          <div className={cn("flex h-16 items-center border-b px-5", collapsed && "justify-center px-0")}>
            <Link href="/admin" className="inline-flex items-center" aria-label="seicase admin home">
              {collapsed ? <BrandMark className="h-7" /> : <BrandLogo className="h-8" priority />}
            </Link>
            {!collapsed && (
              <span className="bg-surface-muted text-muted ml-2 rounded px-1.5 py-0.5 text-[10px] tracking-wider uppercase">admin</span>
            )}
          </div>
          {nav(collapsed)}
          <button
            type="button"
            onClick={() =>
              setCollapsed((c) => {
                try {
                  localStorage.setItem("sc_admin_collapsed", c ? "0" : "1");
                } catch {}
                return !c;
              })
            }
            className="text-muted hover:text-foreground flex h-12 items-center justify-center gap-2 border-t text-xs"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <PanelLeft className="size-4" /> {!collapsed && "Collapse"}
          </button>
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
            <button type="button" className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} aria-label="Close menu" />
            <aside className="bg-surface shadow-lift animate-slide-in-left relative flex h-full w-72 flex-col">
              <div className="flex h-16 items-center justify-between border-b px-5">
                <BrandLogo className="h-8" />
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="hover:bg-surface-muted inline-flex size-10 items-center justify-center rounded-full"
                  aria-label="Close menu"
                >
                  <X className="size-5" />
                </button>
              </div>
              {nav(false)}
            </aside>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="bg-surface/95 sticky top-0 z-30 flex h-16 items-center gap-3 border-b px-4 backdrop-blur md:px-6">
            <button
              type="button"
              className="hover:bg-surface-muted inline-flex size-10 items-center justify-center rounded-lg lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </button>
            <form
              role="search"
              className="bg-background flex h-10 max-w-md flex-1 items-center gap-2 rounded-lg border px-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (q.trim()) router.push(`/admin/search?q=${encodeURIComponent(q.trim())}`);
              }}
            >
              <Search className="text-muted size-4" aria-hidden="true" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search orders, products, customers…"
                aria-label="Search admin"
                className="min-w-0 flex-1 bg-transparent text-sm focus:outline-none"
              />
            </form>
            <div className="ml-auto flex items-center gap-1">
              <Link
                href="/"
                target="_blank"
                className="text-muted hover:bg-surface-muted hover:text-foreground hidden h-10 items-center gap-1.5 rounded-lg px-3 text-sm sm:inline-flex"
              >
                View store <ExternalLink className="size-3.5" />
              </Link>
              <div className="ml-2 hidden text-right text-xs leading-tight md:block">
                <p className="font-medium">{user.name}</p>
                <p className="text-muted capitalize">{user.role}</p>
              </div>
              <form action={signOut}>
                <button
                  type="submit"
                  className="hover:bg-surface-muted inline-flex size-10 items-center justify-center rounded-lg"
                  aria-label="Sign out"
                >
                  <LogOut className="size-[18px]" />
                </button>
              </form>
            </div>
          </header>
          <main id="main" className="min-w-0 flex-1 p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
