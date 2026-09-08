"use client";

import { useState } from "react";
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

function formatRaceDateTime(dateIso: string, startTimeIso: string | null): string {
  const date = new Date(dateIso).toLocaleDateString("fr-FR");
  if (!startTimeIso) return date;
  const time = new Date(startTimeIso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} à ${time}`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("fr-FR");
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${date} à ${time}`;
}

/** Date/heure réelles du résultat (arrivée, sinon départ), pas la date
 * programmée de la course — une course peut être courue à tout moment. */
function formatResultDateTime(r: {
  finishTimestamp: string | null;
  startTimestamp: string | null;
  raceDate: string;
  raceStartTime: string | null;
}): string {
  if (r.finishTimestamp) return formatDateTime(r.finishTimestamp);
  if (r.startTimestamp) return formatDateTime(r.startTimestamp);
  return formatRaceDateTime(r.raceDate, r.raceStartTime);
}

export function AthleteDashboard() {
  const { data, isLoading, mutate } = useSWR("/api/athlete/me", fetcher, {
    refreshInterval: 10000,
  });

  if (isLoading) {
    return <p className="text-muted">Chargement…</p>;
  }

  const myRaces = data?.myRaces ?? [];
  const joinableRaces = data?.joinableRaces ?? [];
  const fullName = [data?.firstName, data?.lastName].filter(Boolean).join(" ");

  return (
    <div className="flex flex-col gap-10">
      <NameHeader fullName={fullName} onUpdated={() => mutate()} />

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
                key={`${r.raceId}-${r.attemptNumber ?? "single"}`}
                className="flex items-center justify-between rounded-xl border border-border bg-surface p-4"
              >
                <div>
                  <p className="font-medium">
                    {r.raceName}
                    {r.attemptNumber !== null && (
                      <span className="ml-2 text-sm font-normal text-muted">
                        — Essai {r.attemptNumber}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-muted">
                    {formatResultDateTime(r)} ·{" "}
                    {STATUS_LABEL[r.runStatus] ?? r.runStatus}
                    {r.durationMs !== null ? ` · ${formatDurationMs(r.durationMs)}` : ""}
                    {r.position !== null ? ` · ${r.position}${r.position === 1 ? "er" : "e"}` : ""}
                    {r.category ? ` · ${r.category}` : ""}
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

function NameHeader({
  fullName,
  onUpdated,
}: {
  fullName: string;
  onUpdated: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/athlete/name", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName: firstName || undefined, lastName: lastName || undefined }),
    });
    setSaving(false);
    setEditing(false);
    onUpdated();
  }

  if (editing) {
    return (
      <form onSubmit={handleSave} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted">Prénom</span>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            autoFocus
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted">Nom</span>
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg disabled:opacity-50"
        >
          Enregistrer
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-sm text-muted underline"
        >
          Annuler
        </button>
      </form>
    );
  }

  if (fullName) {
    return (
      <div className="flex items-center justify-between">
        <p className="font-display text-2xl font-semibold">Bonjour, {fullName}</p>
        <button onClick={() => setEditing(true)} className="text-sm text-muted underline">
          Modifier
        </button>
      </div>
    );
  }

  return (
    <button onClick={() => setEditing(true)} className="w-fit text-sm text-muted underline">
      + Ajouter mon prénom et nom
    </button>
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
