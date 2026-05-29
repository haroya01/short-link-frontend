"use client";

import { useEffect, useState } from "react";
import { listSeries, type SeriesView } from "@/modules/blog/api/series";

type Props = {
  value: number | null;
  onChange: (seriesId: number | null) => void;
  noneLabel: string;
  emptyHint: string;
};

/** Assigns the post to one of the author's existing series (or none). Creation lives in the workspace. */
export function SeriesSelect({ value, onChange, noneLabel, emptyHint }: Props) {
  const [series, setSeries] = useState<SeriesView[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    listSeries()
      .then(setSeries)
      .catch(() => setSeries([]))
      .finally(() => setLoaded(true));
  }, []);

  if (loaded && series.length === 0) {
    return <p className="text-[13px] text-slate-400">{emptyHint}</p>;
  }

  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base outline-none focus:border-accent-400 sm:text-sm"
    >
      <option value="">{noneLabel}</option>
      {series.map((s) => (
        <option key={s.id} value={s.id}>
          {s.title}
        </option>
      ))}
    </select>
  );
}
