"use client";

import { useState } from "react";
import useSWR from "swr";
import { GpxMap } from "@/components/GpxMap";
import { parseGpxPoints } from "@/lib/gpx";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function ParcoursTab({ raceId }: { raceId: string }) {
  const { data, isLoading, mutate } = useSWR(`/api/admin/races/${raceId}/gpx`, fetcher);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);

    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/admin/races/${raceId}/gpx`, { method: "POST", body: form });
    const result = await res.json();
    setUploading(false);
    e.target.value = "";

    if (!res.ok) {
      setError(result.error ?? "Erreur lors de l'import.");
      return;
    }
    mutate();
  }

  async function handleRemove() {
    if (!confirm("Supprimer le tracé GPX de cette course ?")) return;
    await fetch(`/api/admin/races/${raceId}/gpx`, { method: "DELETE" });
    mutate();
  }

  if (isLoading) return <p className="text-muted">Chargement…</p>;

  const points = data?.gpxData ? parseGpxPoints(data.gpxData) : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <label className="cursor-pointer rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-ink">
          {uploading ? "Import en cours…" : data?.gpxData ? "Remplacer le fichier GPX" : "Importer un fichier GPX"}
          <input
            type="file"
            accept=".gpx"
            onChange={handleUpload}
            className="hidden"
            disabled={uploading}
          />
        </label>
        {data?.gpxData && (
          <button
            onClick={handleRemove}
            className="rounded-lg border border-danger px-4 py-2 text-sm text-danger"
          >
            Supprimer le tracé
          </button>
        )}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {data?.gpxData ? (
        <>
          <div className="grid max-w-md grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-surface p-5">
              <p className="text-sm text-muted">Distance</p>
              <p className="mt-1 font-display text-3xl font-semibold tabular-nums">
                {data.distanceKm?.toFixed(1)} km
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-5">
              <p className="text-sm text-muted">Dénivelé positif</p>
              <p className="mt-1 font-display text-3xl font-semibold tabular-nums">
                {Math.round(data.elevationGainM ?? 0)} m
              </p>
            </div>
          </div>

          <GpxMap points={points.map((p) => ({ lat: p.lat, lon: p.lon }))} />
        </>
      ) : (
        <p className="max-w-md text-muted">
          Aucun tracé importé. Importez un fichier <code>.gpx</code> (export Strava, Garmin
          Connect, Komoot...) pour afficher le parcours sur une carte, la distance totale et le
          dénivelé positif.
        </p>
      )}
    </div>
  );
}
