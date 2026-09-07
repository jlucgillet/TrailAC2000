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

export function AthleteDashboard() {
  const { data, isLoading, mutate } = useSWR("/api/athlete/me", fetcher, {
    refreshInterval: 10000,
  });

  if (isLoading) {
    return <p className="text-muted">Chargement…</p>;
  }

  const myRaces = data?.myRaces ?? [];
  const joinableRaces = data?.joinableRaces ?? [];

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h1 className="mb-6 font-display text-3xl font-semibold">Mes courses</h1>
        {myRaces.length === 0 ? (
          <p className="text-muted">
            Vous n&rsquo;avez encore rejoint aucune course. Retrouvez les courses actives ci-dessous.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {myRaces.map((r: any) => (
              <div
                key={r.raceId}
                className="flex items-center justify-between rounded-xl border border-border bg-surface p-4"
              >
                <div>
                  <p className="font-medium">{r.raceName}</p>
                  <p className="text-sm text-muted">
                    {new Date(r.raceDate).toLocaleDateString("fr-FR")} ·{" "}
                    {STATUS_LABEL[r.runStatus] ?? r.runStatus}
                    {r.durationMs !== null ? ` · ${formatDurationMs(r.durationMs)}` : ""}
                  </p>
                </div>
                {r.raceStatus === "active" && r.runStatus !== "finished" ? (
                  <Link
                    href={`/mon-espace/course/${r.raceId}`}
                    className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg"
                  >
                    Scanner
                  </Link>
                ) : r.runStatus === "finished" ? (
                  <Link
                    href={`/results/${r.raceId}`}
                    className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-ink"
                  >
                    Résultats
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 font-display text-2xl font-semibold">Rejoindre une course active</h2>
        {joinableRaces.length === 0 ? (
          <p className="text-muted">Aucune course active à rejoindre pour le moment.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {joinableRaces.map((r: any) => (
              <JoinableRaceRow key={r.id} race={r} onJoined={() => mutate()} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function JoinableRaceRow({
  race,
  onJoined,
}: {
  race: { id: string; name: string; date: string; location: string | null };
  onJoined: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
      <div>
        <p className="font-medium">{race.name}</p>
        <p className="text-sm text-muted">
          {new Date(race.date).toLocaleDateString("fr-FR")}
          {race.location ? ` · ${race.location}` : ""}
        </p>
      </div>
      <button
        onClick={async () => {
          await fetch("/api/athlete/join", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ raceId: race.id }),
          });
          onJoined();
        }}
        className="rounded-lg border border-accent px-4 py-2 text-sm font-semibold text-accent hover:bg-accent/10"
      >
        Rejoindre
      </button>
    </div>
  );
}
