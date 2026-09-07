"use client";

import useSWR from "swr";
import { ResultsTable, type ResultRow } from "@/components/ResultsTable";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function PublicResultsLive({ raceId }: { raceId: string }) {
  const { data, isLoading } = useSWR(`/api/public/races/${raceId}/results`, fetcher, {
    refreshInterval: 5000,
  });

  if (isLoading) {
    return <p className="text-muted">Chargement des résultats…</p>;
  }

  const rows: ResultRow[] = (data?.results ?? []).map((r: ResultRow) => r);

  return (
    <>
      <ResultsTable rows={rows} />
      <p className="mt-4 text-xs text-muted">Mise à jour automatique toutes les 5 secondes.</p>
    </>
  );
}
