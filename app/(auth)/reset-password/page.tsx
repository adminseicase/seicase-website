import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/store/auth/auth-forms";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
