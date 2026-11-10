import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/store/section";
import { AccountNav } from "@/components/store/account/account-nav";
import { getCurrentUser } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: { default: "My Account", template: "%s | My Account | seicase" }, robots: { index: false } };

async function UserCard() {
  const user = await getCurrentUser();
  const name = user?.fullName || user?.email?.split("@")[0] || "Guest";
  return (
    <div className="flex items-center gap-4">
      <span className="inline-flex size-14 items-center justify-center rounded-full bg-surface-muted font-serif text-2xl uppercase">{name[0]}</span>
      <div className="min-w-0">
        <p className="truncate font-serif text-xl">{name}</p>
        <p className="truncate text-xs text-muted">{user?.email ?? user?.phone}</p>
      </div>
    </div>
  );
}

/** Account shell: sidebar like the reference (My Orders, Wishlist, Address Book…). */
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <Container className="pb-10 pt-8 md:pt-12">
      <div className="grid gap-8 lg:grid-cols-[280px_1fr] lg:gap-12">
        <aside className="h-fit rounded-2xl border bg-surface p-5 lg:sticky lg:top-24">
          <Suspense fallback={<Skeleton className="h-14" />}>
            <UserCard />
          </Suspense>
          <AccountNav />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </Container>
  );
}
