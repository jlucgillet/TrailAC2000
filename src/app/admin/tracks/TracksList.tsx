"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { TrackThumbnail } from "@/components/TrackThumbnail";
import { TracksMap, TRACK_COLORS } from "@/components/TracksMap";
import { useTrackFilters } from "@/components/TrackFilters";

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

  const tracks: any[] = useMemo(() => data?.tracks ?? [], [data]);
  const { filtered, panel } = useTrackFilters(tracks, { discreet: true });

  const colors = useMemo(() => {
    const m: Record<string, string> = {};
    tracks.forEach((t, i) => (m[t.id] = TRACK_COLORS[i % TRACK_COLORS.length]));
    return m;
  }, [tracks]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedId && !filtered.some((t) => t.id === selectedId)) setSelectedId(null);
  }, [filtered, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    document.getElementById(`track-${selectedId}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId]);

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

      {tracks.length > 0 && (
        <div>
          {panel}
          <TracksMap
            tracks={filtered}
            colors={colors}
            selectedId={selectedId}
            hoveredId={hoveredId}
            onSelect={setSelectedId}
            hrefBase="/admin/tracks"
          />
        </div>
      )}

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
          {filtered.length === 0 && (
            <p className="text-muted sm:col-span-2">Aucun parcours ne correspond à ces filtres.</p>
          )}
          {filtered.map((t: any) => (
            <Link
              key={t.id}
              id={`track-${t.id}`}
              href={`/admin/tracks/${t.id}`}
              onMouseEnter={() => setHoveredId(t.id)}
              onMouseLeave={() => setHoveredId(null)}
              onFocus={() => setHoveredId(t.id)}
              onBlur={() => setHoveredId(null)}
              className="flex items-center gap-4 rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent"
              style={selectedId === t.id ? { borderColor: colors[t.id], borderWidth: 3 } : undefined}
            >
              <span
                className="h-12 w-1.5 shrink-0 rounded-full"
                style={{ background: colors[t.id] }}
                aria-hidden
              />
              <TrackThumbnail gpxData={t.gpxData} width={64} height={64} />
              <div className="min-w-0">
                <h3 className="mb-2 truncate font-display text-lg font-semibold">{t.name}</h3>
                <p className="text-sm text-muted">
                  {t.distanceKm?.toFixed(1)} km · {Math.round(t.elevationGainM ?? 0)} m D+
                </p>
                {!t.visibleInAthleteSpace && (
                  <p className="mt-1 text-xs text-muted">🔒 Masqué de l&rsquo;espace concurrent</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
