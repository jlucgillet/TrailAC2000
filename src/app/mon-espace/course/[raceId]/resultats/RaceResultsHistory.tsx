"use client";

import Link from "next/link";
import useSWR from "swr";
import { formatDurationMs } from "@/lib/time";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STATUS_LABEL: Record<string, string> = {
  registered: "Inscrit",
  running: "En course",
  finished: "Terminé",
  abandoned: "Abandonné",
  disqualified: "Disqualifié",
};

function formatFullDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.toLocaleDateString("fr-FR")} à ${d.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function RaceResultsHistory({ raceId }: { raceId: string }) {
  const { data, isLoading } = useSWR(`/api/athlete/races/${raceId}/results`, fetcher);

  const attempts: any[] = data?.attempts ?? [];
  // Les essais les plus récents en premier.
  const sorted = [...attempts].sort((a, b) => b.attemptNumber - a.attemptNumber);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/mon-espace" className="text-sm text-muted underline">
        ← Retour à mon espace
      </Link>

      <p className="mt-4 text-sm text-muted">Mes résultats</p>
      <h1 className="mb-6 font-display text-3xl font-semibold">
        {data?.race?.name ?? "…"}
      </h1>

      {isLoading ? (
        <p className="text-muted">Chargement…</p>
      ) : sorted.length === 0 ? (
        <p className="text-muted">Aucun essai pour le moment sur cette course.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((a) => (
            <div
              key={a.runId}
              className={`rounded-xl border p-4 ${
                a.isBest ? "border-accent bg-accent/5" : "border-border bg-surface"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">Essai n°{a.attemptNumber}</p>
                {a.isBest && (
                  <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-semibold text-accent">
                    Record
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted">{formatFullDateTime(a.startTimestamp)}</p>
              <p className="chrono-digits mt-2 text-3xl font-semibold">
                {a.durationMs !== null ? formatDurationMs(a.durationMs) : STATUS_LABEL[a.status] ?? a.status}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
