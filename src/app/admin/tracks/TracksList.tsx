"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function TracksList() {
  const { data, isLoading, mutate } = useSWR("/api/admin/tracks", fetcher);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);

    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/admin/tracks", { method: "POST", body: form });
    const result = await res.json();
    setUploading(false);
    e.target.value = "";

    if (!res.ok) {
      setError(result.error ?? "Erreur lors de l'import.");
      return;
    }
    mutate();
  }

  const tracks = data?.tracks ?? [];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Parcours</h1>
          <p className="mt-1 text-sm text-muted">
            Une bibliothèque de tracés réutilisables sur plusieurs courses.
          </p>
        </div>
        <label className="cursor-pointer rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg">
          {uploading ? "Import en cours…" : "+ Nouveau parcours (GPX)"}
          <input
            type="file"
            accept=".gpx"
            onChange={handleUpload}
            className="hidden"
            disabled={uploading}
          />
        </label>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {isLoading ? (
        <p className="text-muted">Chargement…</p>
      ) : tracks.length === 0 ? (
        <p className="max-w-md text-muted">
          Aucun parcours pour le moment. Importez un fichier <code>.gpx</code> pour créer votre
          premier parcours — la distance, le dénivelé et le nom (
          <code>AC2000-distance-dénivelé</code>) sont générés automatiquement, et modifiables
          ensuite.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {tracks.map((t: any) => (
            <Link
              key={t.id}
              href={`/admin/tracks/${t.id}`}
              className="rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent"
            >
              <h3 className="mb-2 font-display text-lg font-semibold">{t.name}</h3>
              <p className="text-sm text-muted">
                {t.distanceKm?.toFixed(1)} km · {Math.round(t.elevationGainM ?? 0)} m D+
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
