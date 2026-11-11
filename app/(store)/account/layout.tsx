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
      <span className="bg-surface-muted inline-flex size-14 items-center justify-center rounded-full font-serif text-2xl uppercase">
        {name[0]}
      </span>
      <div className="min-w-0">
        <p className="truncate font-serif text-xl">{name}</p>
        <p className="text-muted truncate text-xs">{user?.email ?? user?.phone}</p>
      </div>
    </div>
  );
}

/** Account shell: sidebar like the reference (My Orders, Wishlist, Address Book…). */
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <Container className="pt-8 pb-10 md:pt-12">
      <div className="grid gap-8 lg:grid-cols-[280px_1fr] lg:gap-12">
        <aside className="bg-surface h-fit rounded-2xl border p-5 lg:sticky lg:top-24">
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
