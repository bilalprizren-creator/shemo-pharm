import type { Metadata } from "next";
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
import { OrganizationJsonLd } from "@/components/seo/JsonLd";
import "../globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin", "latin-ext"],
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

  return (
    <html
      lang={lang}
      className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <OrganizationJsonLd />
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
          </CartProvider>
        </WishlistProvider>
      </body>
    </html>
  );
}
