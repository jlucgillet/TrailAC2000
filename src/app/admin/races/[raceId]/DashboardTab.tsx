"use client";

import useSWR from "swr";
import { formatDurationMs } from "@/lib/time";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function DashboardTab({ raceId }: { raceId: string }) {
  const { data, isLoading } = useSWR(`/api/admin/races/${raceId}/results`, fetcher, {
    refreshInterval: 5000,
  });

  if (isLoading) return <p className="text-muted">Chargement…</p>;

  const stats = data?.stats;

  const cards = [
    { label: "Inscrits", value: stats?.registered ?? 0 },
    { label: "Départs", value: stats?.started ?? 0 },
    { label: "Arrivées", value: stats?.finished ?? 0 },
    { label: "En course", value: stats?.running ?? 0 },
    {
      label: "Meilleur temps",
      value: stats?.bestDurationMs != null ? formatDurationMs(stats.bestDurationMs) : "—",
    },
    { label: "Dernier arrivé", value: stats?.lastFinishedName ?? "—" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl border border-border bg-surface p-5">
          <p className="text-sm text-muted">{c.label}</p>
          <p className="mt-1 font-display text-3xl font-semibold tabular-nums">{c.value}</p>
        </div>
      ))}
    </div>
  );
}
