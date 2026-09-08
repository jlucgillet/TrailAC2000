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

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("fr-FR")} à ${d.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function RaceResultsHistory({
  raceId,
  raceName,
  raceStatus,
}: {
  raceId: string;
  raceName: string;
  raceStatus: string;
}) {
  const { data, isLoading } = useSWR(`/api/athlete/races/${raceId}/results`, fetcher, {
    refreshInterval: 10000,
  });

  const attempts: any[] = data?.attempts ?? [];
  const bestDurationMs: number | null = data?.bestDurationMs ?? null;

  return (
    <div className="flex flex-col gap-6 py-4">
      <div>
        <p className="text-sm text-muted">Mes résultats</p>
        <h1 className="font-display text-3xl font-semibold">{raceName}</h1>
      </div>

      {bestDurationMs !== null && (
        <div className="rounded-xl border border-accent/40 bg-accent/5 p-4">
          <p className="text-sm text-muted">Meilleur temps</p>
          <p className="chrono-digits text-3xl font-semibold text-accent">
            {formatDurationMs(bestDurationMs)}
          </p>
        </div>
      )}

      {raceStatus === "active" && (
        <Link
          href={`/mon-espace/course/${raceId}`}
          className="w-fit rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg"
        >
          Nouvel essai — Scanner
        </Link>
      )}

      {isLoading ? (
        <p className="text-muted">Chargement…</p>
      ) : attempts.length === 0 ? (
        <p className="text-muted">Aucun essai enregistré pour cette course.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="bg-surface text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Essai</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Temps</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {attempts.map((a) => {
                const isBest =
                  bestDurationMs !== null && a.durationMs === bestDurationMs && a.status === "finished";
                return (
                  <tr key={a.attemptNumber} className={isBest ? "bg-accent/5" : undefined}>
                    <td className="px-4 py-3 tabular-nums">{a.attemptNumber}</td>
                    <td className="px-4 py-3 text-muted">
                      {a.finishTimestamp
                        ? formatDateTime(a.finishTimestamp)
                        : a.startTimestamp
                        ? formatDateTime(a.startTimestamp)
                        : "—"}
                    </td>
                    <td className="px-4 py-3">{STATUS_LABEL[a.status] ?? a.status}</td>
                    <td className="px-4 py-3 tabular-nums font-medium">
                      {a.durationMs !== null ? formatDurationMs(a.durationMs) : "—"}
                      {isBest && <span className="ml-2 text-xs text-accent">record</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Link href="/mon-espace" className="text-sm text-muted underline">
        Retour à mon espace
      </Link>
    </div>
  );
}
