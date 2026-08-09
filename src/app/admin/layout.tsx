import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SITE } from "@/lib/site";
import "../globals.css";

// `latin` only — same reasoning as the public layout: nothing in this panel
// needs a character outside it, and each subset is another preloaded file.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  // /admin is its own root layout, so it inherits nothing from the public one
  // — without this, the build warns and falls back to localhost.
  metadataBase: new URL(SITE.domain),
  title: {
    default: "Paneli i administrimit | SHEMO PHARM",
    template: "%s | Admin SHEMO PHARM",
  },
  robots: { index: false, follow: false },
};

/**
 * Root layout for the /admin tree (lives outside the [lang] locale segment —
 * the proxy matcher skips /admin entirely). Internal tool, Albanian-only.
 * Auth is enforced in the (panel) group layout and in every server action,
 * NOT here, so /admin/login stays reachable.
 */
export default function AdminRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sq" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-tint">{children}</body>
    </html>
  );
}
