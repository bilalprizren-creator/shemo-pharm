import { getSession } from "@/lib/auth";
import { categoryDisplayName, getTopCategories } from "@/lib/catalog";
import { HeaderClient, type NavCategory } from "./HeaderClient";

export async function Header() {
  const session = await getSession();
  const categories: NavCategory[] = getTopCategories().map((c) => ({
    slug: c.slug,
    name: categoryDisplayName(c),
    count: c.count,
  }));

  return (
    <HeaderClient
      categories={categories}
      user={session ? { name: session.name } : null}
    />
  );
}
