"use client";

import Link from "next/link";
import { GpxMap } from "@/components/GpxMap";
import { parseGpxPoints } from "@/lib/gpx";
import { ResultsTable, type ResultRow } from "@/components/ResultsTable";

export function RaceFiche({
  raceId,
  name,
  location,
  distanceKm,
  elevationGainM,
  gpxData,
  results,
}: {
  raceId: string;
  name: string;
  location: string | null;
  distanceKm: number | null;
  elevationGainM: number | null;
  gpxData: string | null;
  results: ResultRow[];
}) {
  const points = gpxData ? parseGpxPoints(gpxData) : [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/mon-espace" className="text-sm text-muted underline">
        ← Retour à mon espace
      </Link>

      <p className="mt-4 text-sm text-muted">Fiche course</p>
      <h1 className="mb-1 font-display text-3xl font-semibold">{name}</h1>
      {location && <p className="mb-6 text-sm text-muted">{location}</p>}
      {!location && <div className="mb-6" />}

      <div className="mb-6 grid grid-cols-2 gap-4 sm:max-w-sm">
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-sm text-muted">Distance</p>
          <p className="mt-1 font-display text-3xl font-semibold tabular-nums">
            {distanceKm != null ? `${distanceKm.toFixed(1)} km` : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-sm text-muted">Dénivelé positif</p>
          <p className="mt-1 font-display text-3xl font-semibold tabular-nums">
            {elevationGainM != null ? `${Math.round(elevationGainM)} m` : "—"}
          </p>
        </div>
      </div>

      {gpxData && points.length > 1 && (
        <div className="mb-10">
          <GpxMap points={points.map((p) => ({ lat: p.lat, lon: p.lon }))} />
        </div>
      )}

      <h2 className="mb-4 font-display text-2xl font-semibold">Meilleurs résultats</h2>
      {results.length === 0 ? (
        <p className="text-muted">Aucun résultat pour le moment.</p>
      ) : (
        <ResultsTable rows={results} />
      )}

      <Link
        href={`/mon-espace/course/${raceId}`}
        className="mt-8 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg"
      >
        Scanner cette course
      </Link>
    </div>
  );
}
