"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { TrackThumbnail } from "@/components/TrackThumbnail";
import { TracksMap, TRACK_COLORS } from "@/components/TracksMap";
import { useTrackFilters } from "@/components/TrackFilters";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function ParcoursList() {
  const { data, isLoading } = useSWR("/api/athlete/tracks", fetcher);
  const tracks: any[] = useMemo(() => data?.tracks ?? [], [data]);

  const { filtered, panel } = useTrackFilters(tracks);

  // Couleur stable par parcours (selon sa place dans la liste complète).
  const colors = useMemo(() => {
    const m: Record<string, string> = {};
    tracks.forEach((t, i) => (m[t.id] = TRACK_COLORS[i % TRACK_COLORS.length]));
    return m;
  }, [tracks]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Un parcours filtré ne reste pas sélectionné.
  useEffect(() => {
    if (selectedId && !filtered.some((t) => t.id === selectedId)) setSelectedId(null);
  }, [filtered, selectedId]);

  // Sélection depuis la carte → fait défiler la liste jusqu'au parcours.
  useEffect(() => {
    if (!selectedId) return;
    document.getElementById(`parcours-${selectedId}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId]);

  return (
    <div>

      <h1 className="mb-2 font-display text-3xl font-semibold">Parcours</h1>
      <p className="mb-6 text-sm text-muted">
        Les parcours de la bibliothèque, en consultation — carte, distance et dénivelé.
      </p>

      {panel}

      {tracks.length > 0 && (
        <div className="mb-6">
          <TracksMap
            tracks={filtered}
            colors={colors}
            selectedId={selectedId}
            hoveredId={hoveredId}
            onSelect={setSelectedId}
          />
          <p className="mt-2 text-xs text-muted">
            Touche un tracé sur la carte pour le sélectionner ; la carte suit les filtres.
          </p>
        </div>
      )}

      {isLoading ? (
        <p className="text-muted">Chargement…</p>
      ) : tracks.length === 0 ? (
        <p className="text-muted">Aucun parcours à consulter pour le moment.</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted">Aucun parcours ne correspond à ces filtres.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((t) => (
            <Link
              key={t.id}
              id={`parcours-${t.id}`}
              href={`/mon-espace/parcours/${t.id}`}
              onMouseEnter={() => setHoveredId(t.id)}
              onMouseLeave={() => setHoveredId(null)}
              onFocus={() => setHoveredId(t.id)}
              onBlur={() => setHoveredId(null)}
              className="flex items-center gap-4 rounded-xl border-2 border-accent/30 bg-surface p-4 transition-colors hover:border-accent"
              style={selectedId === t.id ? { borderColor: colors[t.id], borderWidth: 3 } : undefined}
            >
              <span
                className="h-10 w-1.5 shrink-0 rounded-full"
                style={{ background: colors[t.id] }}
                aria-hidden
              />
              <TrackThumbnail gpxData={t.gpxData} width={64} height={64} />
              <div className="min-w-0">
                <p className="truncate font-medium">{t.name}</p>
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
