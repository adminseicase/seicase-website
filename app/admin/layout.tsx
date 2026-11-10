import type { Metadata } from "next";
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { AdminShell } from "@/components/admin/shell";
import { AdminSkeleton } from "@/components/admin/ui";
import { getTrackerCounts } from "@/lib/admin/queries";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · seicase admin" }, robots: { index: false, follow: false } };

// The admin is always rendered per request (it's behind login).
export const instant = false;

async function Guarded({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  const counts = await getTrackerCounts();
  return (
    <AdminShell user={{ name: user.fullName ?? user.email ?? "Staff", email: user.email ?? "", role: user.role }} counts={counts}>
      {children}
    </AdminShell>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured) {
    return (
      <main className="mx-auto max-w-lg px-6 py-24 text-center">
        <p className="font-serif text-4xl">seicase admin</p>
        <p className="mt-4 text-muted">Connect Supabase to use the admin panel. Follow docs/SETUP.md, then restart the server.</p>
      </main>
    );
  }
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <Guarded>{children}</Guarded>
    </Suspense>
  );
}
