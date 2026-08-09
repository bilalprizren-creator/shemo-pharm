import { getSession } from "@/lib/auth";
import {
  categoryDisplayName,
  getCategoryImage,
  getTopCategories,
} from "@/lib/catalog";
import { offersAvailable } from "@/lib/offers";
import type { Dictionary } from "@/lib/dictionaries";
import { HeaderClient, type NavCategory } from "./HeaderClient";

export async function Header({ dict }: { dict: Dictionary }) {
  const session = await getSession();
  const top = await getTopCategories();
  const categories: NavCategory[] = await Promise.all(
    top.map(async (c) => ({
      slug: c.slug,
      name: categoryDisplayName(c),
      count: c.count,
      image: await getCategoryImage(c.slug),
    }))
  );

  return (
    <HeaderClient
      categories={categories}
      user={session ? { name: session.name } : null}
      // Decided on the server and passed down, because the nav lives in a
      // client component that has no way to ask the catalog itself.
      hasOffers={await offersAvailable()}
      dict={dict}
    />
  );
}
