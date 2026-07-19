"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteProductAction } from "@/lib/admin-actions";

export function DeleteProductButton({ id }: { id: number }) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <form action={deleteProductAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={id} />
        <span className="text-sm font-medium text-ink-700">A jeni i sigurt?</span>
        <button
          type="submit"
          className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
        >
          Po, fshije
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-full border border-ink-900/10 px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-tint"
        >
          Anulo
        </button>
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="inline-flex items-center gap-1.5 rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50"
    >
      <Trash2 className="size-4" aria-hidden />
      Fshij produktin
    </button>
  );
}
