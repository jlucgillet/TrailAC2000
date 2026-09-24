"use client";

import { GpxMap } from "@/components/GpxMap";
import { parseGpxPoints } from "@/lib/gpx";
import { ResultsTable, type ResultRow } from "@/components/ResultsTable";

export function PublicTrackView({
  name,
  distanceKm,
  elevationGainM,
  gpxData,
  shareToken,
  downloadPath,
  label = "Parcours partagé — lecture seule",
  results,
}: {
  name: string;
  distanceKm: number;
  elevationGainM: number;
  gpxData: string;
  shareToken: string;
  /** Par défaut, le téléchargement d'un Track (bibliothèque de parcours).
   *  Les courses (qui ont leur propre GPX indépendant) passent leur propre
   *  route de téléchargement ici. */
  downloadPath?: string;
  /** Texte affiché au-dessus du nom (distingue un parcours de bibliothèque
   *  d'un parcours de course, ex. "Parcours chronométré"). */
  label?: string;
  /** Classement des concurrents ayant terminé, trié par temps — uniquement
   *  pertinent pour le GPX d'une course, jamais pour un parcours de
   *  bibliothèque (qui n'a pas de résultats). */
  results?: ResultRow[];
}) {
  const points = parseGpxPoints(gpxData);
  const resolvedDownloadPath = downloadPath ?? `/api/public/tracks/${shareToken}/download`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-sm text-muted">{label}</p>
      <h1 className="mb-6 font-display text-3xl font-semibold">{name}</h1>

      <div className="mb-6 grid max-w-md grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-sm text-muted">Distance</p>
          <p className="mt-1 font-display text-3xl font-semibold tabular-nums">
            {distanceKm.toFixed(1)} km
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-sm text-muted">Dénivelé positif</p>
          <p className="mt-1 font-display text-3xl font-semibold tabular-nums">
            {Math.round(elevationGainM)} m
          </p>
        </div>
      </div>

      <GpxMap points={points.map((p) => ({ lat: p.lat, lon: p.lon }))} />

      <a
        href={resolvedDownloadPath}
        className="mt-6 inline-block rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-ink"
      >
        Télécharger le fichier GPX
      </a>

      {results && results.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 font-display text-2xl font-semibold">Résultats</h2>
          <ResultsTable rows={results} />
        </div>
      )}
    </div>
  );
}
