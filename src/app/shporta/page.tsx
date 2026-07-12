import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import { CartPageClient } from "@/components/cart/CartPageClient";

export const metadata: Metadata = {
  title: "Shporta",
  description:
    "Shporta juaj e porosisë — dërgojeni kërkesën përmes WhatsApp ose email te SHEMO PHARM.",
  robots: { index: false },
};

export default function CartPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6 lg:py-10">
      <Breadcrumbs items={[{ label: "Shporta" }]} />
      <h1 className="mt-4 text-3xl font-extrabold text-ink-900 sm:text-4xl">
        Shporta
      </h1>
      <p className="mt-2 max-w-2xl text-ink-500">
        Mblidhni produktet që ju interesojnë dhe dërgoni porosinë — ne ju
        përgjigjemi me konfirmimin e disponueshmërisë dhe çmimeve.
      </p>
      <div className="mt-8">
        <CartPageClient />
      </div>
    </div>
  );
}
