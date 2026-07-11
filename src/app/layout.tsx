import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import { SITE } from "@/lib/site";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { StickyMobileBar } from "@/components/layout/StickyMobileBar";
import { WishlistProvider } from "@/components/wishlist/WishlistProvider";
import { OrganizationJsonLd } from "@/components/seo/JsonLd";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.domain),
  title: {
    default: "SHEMO PHARM | Produkte dhe pajisje mjekësore në Kosovë",
    template: "%s | SHEMO PHARM",
  },
  description: SITE.description,
  openGraph: {
    type: "website",
    locale: "sq",
    siteName: SITE.name,
    title: "SHEMO PHARM | Produkte dhe pajisje mjekësore në Kosovë",
    description: SITE.description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="sq"
      className={`${inter.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <OrganizationJsonLd />
        <WishlistProvider>
          <a
            href="#permbajtja"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-100 focus:bg-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-card"
          >
            Kalo te përmbajtja
          </a>
          <Header />
          <main id="permbajtja" className="flex-1 pb-16 md:pb-0">
            {children}
          </main>
          <Footer />
          <StickyMobileBar />
        </WishlistProvider>
      </body>
    </html>
  );
}
