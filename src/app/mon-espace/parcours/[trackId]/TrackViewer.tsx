"use client";

import Link from "next/link";
import { GpxMap } from "@/components/GpxMap";
import { parseGpxPoints } from "@/lib/gpx";

export function TrackViewer({
  trackId,
  name,
  distanceKm,
  elevationGainM,
  gpxData,
}: {
  trackId: string;
  name: string;
  distanceKm: number | null;
  elevationGainM: number | null;
  gpxData: string | null;
}) {
  const points = gpxData ? parseGpxPoints(gpxData) : [];

  return (
    <div>
      <Link href="/mon-espace/parcours" className="text-sm text-muted underline">
        ← Tous les parcours
      </Link>

      <h1 className="mb-6 mt-4 font-display text-3xl font-semibold">{name}</h1>

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

      {gpxData && points.length > 1 ? (
        <GpxMap
          points={points.map((p) => ({ lat: p.lat, lon: p.lon, ele: p.ele }))}
          fullscreenControl
          basemapControl
          gpsControl
        />
      ) : (
        <p className="text-muted">Aucun tracé disponible pour ce parcours.</p>
      )}

      {gpxData && (
        <a
          href={`/api/athlete/tracks/${trackId}/download`}
          className="mt-6 inline-block rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-ink"
        >
          Télécharger le fichier GPX
        </a>
      )}
    </div>
  );
}
