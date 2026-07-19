import Image from "next/image";
import Link from "next/link";
import {
  ExternalLink,
  Inbox,
  LayoutDashboard,
  Package,
  UserCheck,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { adminLogoutAction } from "@/lib/admin-actions";

const NAV = [
  { href: "/admin", label: "Paneli", icon: LayoutDashboard },
  { href: "/admin/kerkesat", label: "Kërkesat B2B", icon: UserCheck },
  { href: "/admin/produktet", label: "Produktet", icon: Package },
  { href: "/admin/mesazhet", label: "Mesazhet", icon: Inbox },
] as const;

/**
 * Shell for every authenticated admin page. The guard here is the first
 * line of defence; every server action re-checks requireAdmin() itself.
 */
export default async function AdminPanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await requireAdmin();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-ink-900/8 bg-white p-4 sm:flex">
        <Link href="/admin" className="flex items-center gap-2.5 px-2 py-1">
          <Image
            src="/logo-symbol.svg"
            alt=""
            width={47}
            height={51}
            className="h-9 w-auto"
          />
          <span className="font-display text-sm font-extrabold leading-tight tracking-tight text-ink-900">
            SHEMO PHARM
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-brand-700">
              Admin
            </span>
          </span>
        </Link>

        <nav className="mt-6 flex flex-1 flex-col gap-1" aria-label="Menyja e adminit">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:bg-tint hover:text-ink-900"
            >
              <item.icon className="size-4.5 text-brand-600" aria-hidden />
              {item.label}
            </Link>
          ))}
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-500 transition-colors hover:bg-tint hover:text-ink-900"
          >
            <ExternalLink className="size-4.5" aria-hidden />
            Shiko faqen
          </a>
        </nav>

        <div className="border-t border-ink-900/8 pt-3">
          <p className="truncate px-3 text-xs text-ink-500" title={session.email}>
            {session.email}
          </p>
          <form action={adminLogoutAction}>
            <button
              type="submit"
              className="mt-1.5 w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-700 transition-colors hover:bg-red-50"
            >
              Dilni
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Mobile top bar */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-ink-900/8 bg-white px-3 py-2 sm:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium text-ink-700 hover:bg-tint"
            >
              <item.icon className="size-4 text-brand-600" aria-hidden />
              {item.label}
            </Link>
          ))}
        </div>
        <main className="p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
