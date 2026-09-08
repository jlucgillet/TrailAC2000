"use client";

import { useState } from "react";

function toLocalInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}:${pad(d.getSeconds())}`;
}

export function EditRunModal({
  raceId,
  participantId,
  displayName,
  startTimestamp,
  finishTimestamp,
  status,
  onClose,
  onSaved,
}: {
  raceId: string;
  participantId: string;
  displayName: string;
  startTimestamp: string | null;
  finishTimestamp: string | null;
  status: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [start, setStart] = useState(toLocalInputValue(startTimestamp));
  const [finish, setFinish] = useState(toLocalInputValue(finishTimestamp));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStopNow() {
    setSaving(true);
    setError(null);
    const res = await fetch(
      `/api/admin/races/${raceId}/participants/${participantId}/run`,
      { method: "POST" }
    );
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Erreur.");
      return;
    }
    onSaved();
    onClose();
  }

  async function handleDelete() {
    if (!confirm(`Supprimer le résultat de ${displayName} ? Il redeviendra "Inscrit".`)) return;
    setSaving(true);
    setError(null);
    const res = await fetch(
      `/api/admin/races/${raceId}/participants/${participantId}/run`,
      { method: "DELETE" }
    );
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Erreur.");
      return;
    }
    onSaved();
    onClose();
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch(
      `/api/admin/races/${raceId}/participants/${participantId}/run`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startTimestamp: start ? new Date(start).toISOString() : null,
          finishTimestamp: finish ? new Date(finish).toISOString() : null,
        }),
      }
    );
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Erreur.");
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6">
        <h3 className="mb-1 font-display text-xl font-semibold">Modifier le chronométrage</h3>
        <p className="mb-4 text-sm text-muted">{displayName}</p>

        {status === "running" && (
          <button
            onClick={handleStopNow}
            disabled={saving}
            className="mb-4 w-full rounded-lg border border-amber px-4 py-2 text-sm font-semibold text-amber disabled:opacity-50"
          >
            Arrêter maintenant (enregistrer l&rsquo;arrivée à l&rsquo;instant présent)
          </button>
        )}

        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-muted">Heure de départ</span>
            <input
              type="datetime-local"
              step="1"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="rounded-lg border border-border bg-bg px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-muted">Heure d&rsquo;arrivée</span>
            <input
              type="datetime-local"
              step="1"
              value={finish}
              onChange={(e) => setFinish(e.target.value)}
              className="rounded-lg border border-border bg-bg px-3 py-2 text-sm"
            />
          </label>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg disabled:opacity-50"
            >
              Enregistrer
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted"
            >
              Annuler
            </button>
            {(startTimestamp || finishTimestamp) && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="ml-auto rounded-lg border border-danger px-4 py-2 text-sm text-danger disabled:opacity-50"
              >
                Supprimer le résultat
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
