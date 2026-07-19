import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getSession, isAdmin } from "@/lib/auth";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const metadata: Metadata = { title: "Kyçja" };

export default async function AdminLoginPage() {
  const session = await getSession();
  if (isAdmin(session)) redirect("/admin");

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center">
          <Image
            src="/logo-symbol.svg"
            alt=""
            width={47}
            height={51}
            className="h-14 w-auto"
          />
          <h1 className="mt-4 text-center font-display text-2xl font-extrabold tracking-tight text-ink-900">
            Paneli i administrimit
          </h1>
          <p className="mt-1 text-center text-sm text-ink-500">
            Vetëm për ekipin e SHEMO PHARM
          </p>
        </div>
        <div className="mt-6 rounded-2xl border border-ink-900/8 bg-white p-6 shadow-card">
          <AdminLoginForm />
        </div>
      </div>
    </div>
  );
}
