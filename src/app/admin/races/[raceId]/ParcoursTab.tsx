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

          <ShareSection raceId={raceId} data={data} onUpdated={() => mutate()} />
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

function ShareSection({
  raceId,
  data,
  onUpdated,
}: {
  raceId: string;
  data: any;
  onUpdated: () => void;
}) {
  const [toggling, setToggling] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl =
    data?.gpxShareToken && typeof window !== "undefined"
      ? `${window.location.origin}/trace/${data.gpxShareToken}`
      : "";

  async function handleToggle(enabled: boolean) {
    setToggling(true);
    await fetch(`/api/admin/races/${raceId}/gpx`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gpxShareEnabled: enabled }),
    });
    setToggling(false);
    onUpdated();
  }

  async function handleRegenerate() {
    if (!confirm("Générer un nouveau lien ? L'ancien lien cessera de fonctionner immédiatement.")) return;
    setRegenerating(true);
    await fetch(`/api/admin/races/${raceId}/gpx/regenerate-share`, { method: "POST" });
    setRegenerating(false);
    onUpdated();
  }

  function handleCopy() {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h3 className="mb-3 font-display text-lg font-semibold">Partage</h3>
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={!!data?.gpxShareEnabled}
          onChange={(e) => handleToggle(e.target.checked)}
          disabled={toggling}
          className="mt-1"
        />
        <span>
          <span className="block">Partager ce parcours via un lien public</span>
          <span className="block text-sm text-muted">
            Toute personne disposant du lien peut consulter la carte, la distance et le dénivelé,
            et télécharger le GPX — sans compte, en lecture seule (aucune modification possible).
          </span>
        </span>
      </label>

      {data?.gpxShareEnabled && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            readOnly
            value={shareUrl}
            className="min-w-[260px] flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-muted"
          />
          <button
            onClick={handleCopy}
            className="rounded-lg border border-border px-3 py-2 text-sm text-muted hover:text-ink"
          >
            {copied ? "Copié !" : "Copier"}
          </button>
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="rounded-lg border border-border px-3 py-2 text-sm text-muted hover:text-ink disabled:opacity-50"
          >
            {regenerating ? "…" : "Nouveau lien"}
          </button>
        </div>
      )}
    </div>
  );
}
