import { CardGridSkeleton } from "@/components/catalog/CardGridSkeleton";

/**
 * Every catalogue page is rendered on demand — getSiteMode() reads a header and
 * the price gate reads the session cookie — so without a boundary here a cold
 * navigation leaves the previous page on screen until the whole grid resolves.
 * The shop's listings have had one since they were written; the catalogue's
 * five routes had none.
 *
 * The columns match the real grid (SectionView, AllProducts, SearchResults all
 * use the same one), so nothing jumps when the products land.
 */
export default function Loading() {
  return (
    <CardGridSkeleton
      cards={24}
      columns="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      cardHeight="h-64"
    />
  );
}
