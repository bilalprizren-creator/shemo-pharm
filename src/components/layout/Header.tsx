import { getSession } from "@/lib/auth";
import {
  categoryDisplayName,
  getShowcaseProducts,
  getTopCategories,
} from "@/lib/catalog";
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
      image: (await getShowcaseProducts(c.slug, 1))[0]?.images[0] ?? null,
    }))
  );

  return (
    <HeaderClient
      categories={categories}
      user={session ? { name: session.name } : null}
      dict={dict}
    />
  );
}
