import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Regjistrohu",
  description:
    "Krijoni një llogari biznesi te SHEMO PHARM për qasje në çmimet me shumicë.",
  robots: { index: false },
};

export default async function RegisterPage() {
  const session = await getSession();
  if (session) redirect("/llogaria");

  return (
    <AuthShell
      title="Krijo llogari"
      subtitle="Për barnatore dhe partnerë biznesi"
    >
      <RegisterForm />
    </AuthShell>
  );
}
