import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AddressBook } from "@/components/store/account/address-book";
import { Skeleton } from "@/components/ui/skeleton";
import type { SavedAddress } from "@/lib/types";

export const metadata = { title: "Address Book" };

async function Addresses() {
  const user = await requireUser("/account/addresses");
  const supabase = await createClient();
  const { data } = await supabase.from("addresses").select("*").eq("user_id", user.id).order("is_default", { ascending: false }).order("created_at");
  return <AddressBook addresses={(data ?? []) as SavedAddress[]} />;
}

export default function AddressesPage() {
  return (
    <>
      <h1 className="mb-6 text-4xl">Address Book</h1>
      <Suspense fallback={<Skeleton className="h-44 rounded-2xl" />}>
        <Addresses />
      </Suspense>
    </>
  );
}
