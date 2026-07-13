import { CardSlider } from "@/components/ui/CardSlider";

/**
 * Product-card flavored slider — fixed product-card widths, everything
 * else (arrows, snap, reveal) comes from the shared CardSlider.
 */
export function ProductCarousel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return <CardSlider label={label}>{children}</CardSlider>;
}
