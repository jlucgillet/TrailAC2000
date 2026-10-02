"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { formatDurationMs } from "@/lib/time";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatRaceDateTime(dateIso: string, startTimeIso: string | null): string {
  const date = new Date(dateIso).toLocaleDateString("fr-FR");
  if (!startTimeIso) return date;
  const time = new Date(startTimeIso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} à ${time}`;
}

export function AthleteDashboard() {
  const { data, isLoading, mutate } = useSWR("/api/athlete/me", fetcher, {
    refreshInterval: 10000,
  });

  if (isLoading) {
    return <p className="text-muted">Chargement…</p>;
  }

  const myRaces = data?.myRaces ?? [];
  const fullName = [data?.firstName, data?.lastName].filter(Boolean).join(" ");

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <NameHeader fullName={fullName} onUpdated={() => mutate()} />
        <Link
          href="/mon-espace/scanner"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg"
        >
          Scanner
        </Link>
      </div>

      <section>
        <h1 className="mb-6 font-display text-3xl font-semibold">Mes courses</h1>
        {myRaces.length === 0 ? (
          <p className="text-muted">
            Tu n&rsquo;as encore rejoint aucune course. Scanne un QR code DÉPART ou ARRIVÉE pour
            en rejoindre une.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {myRaces.map((r: any) => (
              <div
                key={r.raceId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-accent/30 bg-surface p-4"
              >
                <div>
                  <p className="font-medium">{r.raceName}</p>
                  <p className="text-sm text-muted">
                    {formatRaceDateTime(r.raceDate, r.raceStartTime)}
                    {r.bestDurationMs !== null
                      ? ` · Meilleur temps ${formatDurationMs(r.bestDurationMs)}`
                      : r.lastRunStatus === "running"
                      ? " · En course"
                      : " · Pas encore de temps enregistré"}
                    {r.attemptsCount > 1 ? ` · ${r.attemptsCount} essais` : ""}
                    {r.category ? ` · ${r.category}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/mon-espace/course/${r.raceId}/fiche`}
                    className="flex items-center gap-1.5 rounded-lg border border-ink/40 bg-surfaceRaised px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-ink hover:bg-surface"
                  >
                    <span aria-hidden>🗺️</span>
                    Fiche
                  </Link>
                  {r.attemptsCount > 0 && (
                    <Link
                      href={`/mon-espace/course/${r.raceId}/resultats`}
                      className="flex items-center gap-1.5 rounded-lg border border-amber/60 bg-amber/10 px-4 py-2 text-sm font-semibold text-amber transition-colors hover:bg-amber/20"
                    >
                      <span aria-hidden>🏆</span>
                      Mes résultats
                    </Link>
                  )}
                </div>
              </div>
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
      <div className="flex items-center gap-3">
        <p className="font-display text-2xl font-semibold">Bonjour {fullName}</p>
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

