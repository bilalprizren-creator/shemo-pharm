import type { Metadata } from "next";
import {
  CatalogView,
  type CatalogSearchParams,
} from "@/components/catalog/CatalogView";

export const metadata: Metadata = {
  title: "Produktet",
  description:
    "Shfletoni katalogun e plotë të SHEMO PHARM: pajisje mjekësore, produkte ortopedike, suplemente, kozmetikë dhe produkte të kujdesit personal.",
  alternates: { canonical: "/produktet" },
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<CatalogSearchParams>;
}) {
  const params = await searchParams;
  return (
    <CatalogView
      title="Produktet"
      subtitle="Katalogu i plotë i produkteve dhe pajisjeve mjekësore"
      basePath="/produktet"
      crumbs={[{ label: "Produktet" }]}
      searchParams={params}
    />
  );
}
