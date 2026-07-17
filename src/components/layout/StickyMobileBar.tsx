import Link from "next/link";
import { MessageCircle, Phone, ShoppingBag } from "lucide-react";
import { SITE } from "@/lib/site";
import { langHref } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";

/**
 * Compact contact bar fixed to the bottom edge on phones only.
 * The <main> element gets bottom padding on small screens (see layout)
 * so content is never hidden behind it.
 */
export function StickyMobileBar({ dict }: { dict: Dictionary }) {
  return (
    <nav
      aria-label={dict.sticky.label}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-900/8 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="grid grid-cols-3">
        <a
          href={SITE.phones[0].href}
          className="flex min-h-13 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-medium text-ink-700 hover:text-brand-700"
        >
          <Phone className="size-5 text-brand-600" aria-hidden />
          {dict.sticky.call}
        </a>
        <a
          href={SITE.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-13 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-medium text-ink-700 hover:text-brand-700"
        >
          <MessageCircle className="size-5 text-brand-600" aria-hidden />
          {dict.sticky.whatsapp}
        </a>
        <Link
          href={langHref(dict.lang, "/produktet")}
          className="flex min-h-13 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-medium text-ink-700 hover:text-brand-700"
        >
          <ShoppingBag className="size-5 text-brand-600" aria-hidden />
          {dict.sticky.products}
        </Link>
      </div>
    </nav>
  );
}
