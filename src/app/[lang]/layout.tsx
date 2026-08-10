import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Inter, Space_Grotesk } from "next/font/google";
import { SITE } from "@/lib/site";
import { LANGS, isLang, langHref, type Lang } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { StickyMobileBar } from "@/components/layout/StickyMobileBar";
import { WishlistProvider } from "@/components/wishlist/WishlistProvider";
import { CartProvider } from "@/components/cart/CartProvider";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { CartToast } from "@/components/cart/CartToast";
import { OrganizationJsonLd, WebSiteJsonLd } from "@/components/seo/JsonLd";
import "../globals.css";

/**
 * `latin` only, deliberately.
 *
 * Each declared subset is a separate woff2 that Next preloads, so asking for
 * latin-ext on both families put four font files in the critical path. Nothing
 * on this site needs it: Albanian's ë and ç are Latin-1, as is the ä in
 * Kräuterhof, and the only other non-ASCII characters anywhere in the catalog
 * are – — and ’ (U+2013/2014/2019), which the latin subset covers through its
 * U+2000–206F range. Adding a language that needs ğ, ş or ı means adding
 * latin-ext back here.
 */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const dict = getDictionary(isLang(lang) ? lang : "sq");
  return {
    metadataBase: new URL(SITE.domain),
    title: {
      default: dict.site.titleDefault,
      template: "%s | SHEMO PHARM",
    },
    description: dict.site.description,
    alternates: {
      languages: { sq: "/", en: "/en" },
    },
    openGraph: {
      type: "website",
      locale: dict.lang === "en" ? "en" : "sq",
      siteName: SITE.name,
      title: dict.site.titleDefault,
      description: dict.site.description,
      // Declaring openGraph here suppresses the app/opengraph-image.tsx file
      // convention for this branch, so the generated card is named explicitly.
      // It stays at the bare /opengraph-image path (the proxy matcher skips it),
      // which keeps the URL free of the /sq -> / redirect.
      images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
    },
  };
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const dict = getDictionary(lang as Lang);
  // Next stamps its own scripts with the nonce automatically; the two this
  // project writes by hand have to ask for it. Set in src/proxy.ts.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang={lang}
      className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Full page loads (reload included) must start at the top. Setting
            scrollRestoration="manual" during the new load proved unreliable,
            so instead the scroll position is zeroed right before unload —
            the browser then stores 0 and every restore lands on the header. */}
        <script
          nonce={nonce}
          // The browser blanks the nonce attribute after parsing; see JsonLd.tsx.
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html:
              'try{window.addEventListener("beforeunload",function(){window.scrollTo(0,0);});}catch(e){}',
          }}
        />
        <OrganizationJsonLd />
        <WebSiteJsonLd />
        <WishlistProvider>
          <CartProvider>
            <a
              href={`${langHref(dict.lang, "/")}#permbajtja`}
              className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-100 focus:bg-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-card"
            >
              {dict.common.skipToContent}
            </a>
            <Header dict={dict} />
            <main id="permbajtja" className="flex-1 pb-16 md:pb-0">
              {children}
            </main>
            <Footer dict={dict} />
            <StickyMobileBar dict={dict} />
            <CartDrawer dict={dict} />
            <CartToast dict={dict} />
          </CartProvider>
        </WishlistProvider>
      </body>
    </html>
  );
}
