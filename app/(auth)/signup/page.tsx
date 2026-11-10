import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupForm } from "@/components/store/auth/auth-forms";

export const metadata: Metadata = { title: "Create account", robots: { index: false } };

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
