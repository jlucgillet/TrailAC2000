"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { GpxMap } from "@/components/GpxMap";
import { parseGpxPoints } from "@/lib/gpx";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function TrackDetail({
  trackId,
  initialName,
  distanceKm,
  elevationGainM,
}: {
  trackId: string;
  initialName: string;
  distanceKm: number;
  elevationGainM: number;
}) {
  const router = useRouter();
  const { data, isLoading, mutate } = useSWR(`/api/admin/tracks/${trackId}`, fetcher);
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    await fetch(`/api/admin/tracks/${trackId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setSaving(false);
    setSaved(true);
  }

  async function handleDelete() {
    if (!confirm(`Supprimer le parcours "${name}" ? Cette action est irréversible.`)) return;
    await fetch(`/api/admin/tracks/${trackId}`, { method: "DELETE" });
    router.push("/admin/tracks");
  }

  const points = data?.gpxData ? parseGpxPoints(data.gpxData) : [];

  return (
    <div className="flex flex-col gap-8">
      <a href="/admin/tracks" className="w-fit text-sm text-muted underline">
        ← Tous les parcours
      </a>

      <form onSubmit={handleRename} className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[240px] flex-1 flex-col gap-1">
          <span className="text-sm text-muted">Nom du parcours</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="rounded-lg border border-border bg-surface px-3 py-2 font-display text-xl"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg disabled:opacity-50"
        >
          {saving ? "…" : "Enregistrer"}
        </button>
      </form>
      {saved && <p className="text-sm text-accent">Nom mis à jour.</p>}

      <div className="grid max-w-md grid-cols-2 gap-4">
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

      {isLoading ? (
        <p className="text-muted">Chargement de la carte…</p>
      ) : (
        <GpxMap points={points.map((p) => ({ lat: p.lat, lon: p.lon }))} />
      )}

      {!isLoading && <ShareSection trackId={trackId} data={data} onUpdated={() => mutate()} />}

      <div className="flex flex-wrap gap-3">
        <a
          href={`/api/admin/tracks/${trackId}/download`}
          className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-ink"
        >
          Télécharger le fichier GPX
        </a>
        <button
          onClick={handleDelete}
          className="rounded-lg border border-danger px-4 py-2 text-sm text-danger"
        >
          Supprimer ce parcours
        </button>
      </div>
    </div>
  );
}

function ShareSection({
  trackId,
  data,
  onUpdated,
}: {
  trackId: string;
  data: any;
  onUpdated: () => void;
}) {
  const [toggling, setToggling] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl =
    data?.shareToken && typeof window !== "undefined"
      ? `${window.location.origin}/parcours/${data.shareToken}`
      : "";

  async function handleToggle(enabled: boolean) {
    setToggling(true);
    await fetch(`/api/admin/tracks/${trackId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shareEnabled: enabled }),
    });
    setToggling(false);
    onUpdated();
  }

  async function handleRegenerate() {
    if (!confirm("Générer un nouveau lien ? L'ancien lien cessera de fonctionner immédiatement.")) return;
    setRegenerating(true);
    await fetch(`/api/admin/tracks/${trackId}/regenerate-share`, { method: "POST" });
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
          checked={!!data?.shareEnabled}
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

      {data?.shareEnabled && (
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
