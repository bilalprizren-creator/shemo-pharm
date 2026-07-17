import { sq, type Dictionary } from "@/dictionaries/sq";
import { en } from "@/dictionaries/en";
import type { Lang } from "@/lib/i18n";

const dictionaries: Record<Lang, Dictionary> = { sq, en };

export function getDictionary(lang: Lang): Dictionary {
  return dictionaries[lang] ?? sq;
}

export type { Dictionary };
