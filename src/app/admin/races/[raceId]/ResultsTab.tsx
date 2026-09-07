"use client";

import useSWR from "swr";
import { ResultsTable, type ResultRow } from "@/components/ResultsTable";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function ResultsTab({ raceId }: { raceId: string }) {
  const { data, isLoading } = useSWR(`/api/admin/races/${raceId}/results`, fetcher, {
    refreshInterval: 5000,
  });

  if (isLoading) return <p className="text-muted">Chargement…</p>;

  const rows: ResultRow[] = (data?.results ?? []).map((r: any) => ({
    position: r.position,
    displayName: r.displayName,
    bibNumber: r.bibNumber,
    category: r.category,
    status: r.status,
    durationMs: r.durationMs,
    startTimestamp: r.startTimestamp ? new Date(r.startTimestamp).toLocaleTimeString("fr-FR") : null,
    finishTimestamp: r.finishTimestamp ? new Date(r.finishTimestamp).toLocaleTimeString("fr-FR") : null,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <a
          href={`/api/admin/races/${raceId}/export`}
          className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-ink"
        >
          Exporter en CSV
        </a>
      </div>
      <ResultsTable rows={rows} showTimestamps />
    </div>
  );
}
