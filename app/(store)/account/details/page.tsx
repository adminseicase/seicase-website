import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DetailsForm } from "@/components/store/account/details-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = { title: "Account Details" };

async function Details() {
  const user = await requireUser("/account/details");
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("marketing_opt_in").eq("id", user.id).maybeSingle();
  return <DetailsForm initial={{ full_name: user.fullName ?? "", phone: user.phone?.replace(/^\+91/, "") ?? "", email: user.email ?? "", marketing_opt_in: data?.marketing_opt_in ?? false }} />;
}

export default function DetailsPage() {
  return (
    <>
      <h1 className="mb-6 text-4xl">Account Details</h1>
      <Suspense fallback={<Skeleton className="h-96 max-w-xl rounded-2xl" />}>
        <Details />
      </Suspense>
    </>
  );
}
