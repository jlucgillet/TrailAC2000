"use client";

import Link from "next/link";
import useSWR from "swr";
import { TrackThumbnail } from "@/components/TrackThumbnail";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function ParcoursList() {
  const { data, isLoading } = useSWR("/api/athlete/tracks", fetcher);
  const tracks: any[] = data?.tracks ?? [];

  return (
    <div>
      <h1 className="mb-2 font-display text-3xl font-semibold">Parcours</h1>
      <p className="mb-6 text-sm text-muted">
        Les tracés des courses, en consultation — carte, distance et dénivelé.
      </p>

      {isLoading ? (
        <p className="text-muted">Chargement…</p>
      ) : tracks.length === 0 ? (
        <p className="text-muted">Aucun parcours à consulter pour le moment.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {tracks.map((t) => (
            <Link
              key={t.raceId}
              href={`/mon-espace/course/${t.raceId}/fiche`}
              className="flex items-center gap-4 rounded-xl border-2 border-accent/30 bg-surface p-4 transition-colors hover:border-accent"
            >
              <TrackThumbnail gpxData={t.gpxData} width={64} height={64} />
              <div className="min-w-0">
                <p className="truncate font-medium">{t.name}</p>
                <p className="text-sm text-muted">
                  {new Date(t.date).toLocaleDateString("fr-FR")}
                  {t.location ? ` · ${t.location}` : ""}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {t.distanceKm != null ? `${t.distanceKm.toFixed(1)} km` : "—"}
                  {t.elevationGainM != null ? ` · D+ ${Math.round(t.elevationGainM)} m` : ""}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
