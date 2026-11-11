import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { requireStaff } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { AdminShell } from "@/components/admin/shell";
import { AdminSkeleton } from "@/components/admin/ui";
import { getTrackerCounts } from "@/lib/admin/queries";
import { BrandLogo } from "@/components/brand-logo";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · seicase admin" }, robots: { index: false, follow: false } };

// The admin is always rendered per request (it's behind login).
export const instant = false;

async function Guarded({ children }: { children: React.ReactNode }) {
  // Explicitly per-request, even before Supabase is configured.
  await connection();
  if (!isSupabaseConfigured) {
    return (
      <main className="mx-auto max-w-lg px-6 py-24 text-center">
        <div className="flex flex-col items-center gap-2">
          <BrandLogo className="h-12" />
          <p className="text-muted text-sm tracking-widest uppercase">admin</p>
        </div>
        <p className="text-muted mt-4">Connect Supabase to use the admin panel. Follow docs/SETUP.md, then restart the server.</p>
      </main>
    );
  }
  const user = await requireStaff();
  const counts = await getTrackerCounts();
  return (
    <AdminShell user={{ name: user.fullName ?? user.email ?? "Staff", email: user.email ?? "", role: user.role }} counts={counts}>
      {children}
    </AdminShell>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <Guarded>{children}</Guarded>
    </Suspense>
  );
}
