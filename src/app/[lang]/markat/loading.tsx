import { CardGridSkeleton } from "@/components/catalog/CardGridSkeleton";

export default function Loading() {
  return (
    <CardGridSkeleton
      cards={16}
      columns="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
      cardHeight="h-36"
    />
  );
}
