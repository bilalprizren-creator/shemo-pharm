"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown } from "lucide-react";

export interface SortLabels {
  label: string;
  az: string;
  za: string;
  newest: string;
}

export function SortSelect({ labels }: { labels: SortLabels }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("renditja") ?? "emri-asc";

  const options = [
    { value: "emri-asc", label: labels.az },
    { value: "emri-desc", label: labels.za },
    { value: "te-rejat", label: labels.newest },
  ];

  const onChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "emri-asc") params.delete("renditja");
    else params.set("renditja", value);
    params.delete("faqja");
    const qs = params.toString();
    router.push(qs ? `?${qs}` : "?", { scroll: false });
  };

  return (
    <label className="flex items-center gap-2 text-sm text-ink-500">
      <ArrowUpDown className="size-4 text-ink-400" aria-hidden />
      <span className="sr-only sm:not-sr-only">{labels.label}</span>
      <select
        value={current}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-lg border border-ink-900/10 bg-white px-2.5 text-sm font-medium text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
