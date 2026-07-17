import { notFound } from "next/navigation";

/** Catch-all: any unmatched path inside a locale renders the localized 404. */
export default function CatchAll() {
  notFound();
}
