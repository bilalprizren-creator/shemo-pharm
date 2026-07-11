import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Kyçu",
  description:
    "Kyçuni në llogarinë tuaj të SHEMO PHARM për të parë çmimet me shumicë.",
  robots: { index: false },
};

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/llogaria");

  return (
    <AuthShell
      title="Mirë se u kthyet"
      subtitle="Kyçuni për të parë çmimet me shumicë"
    >
      <LoginForm />
    </AuthShell>
  );
}
