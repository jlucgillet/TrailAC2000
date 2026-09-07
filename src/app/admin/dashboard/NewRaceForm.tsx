"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewRaceForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/races", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        date: new Date(date).toISOString(),
        location: location || undefined,
        distanceKm: distanceKm ? Number(distanceKm) : undefined,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Erreur lors de la création.");
      setLoading(false);
      return;
    }

    router.push(`/admin/races/${data.race.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-xl border border-border bg-surface p-5 sm:grid-cols-2">
      <label className="flex flex-col gap-2 sm:col-span-2">
        <span className="text-sm text-muted">Nom de la course</span>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Trail des Vosges"
          className="rounded-lg border border-border bg-bg px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-sm text-muted">Date</span>
        <input
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-border bg-bg px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-sm text-muted">Lieu</span>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="rounded-lg border border-border bg-bg px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-sm text-muted">Distance (km)</span>
        <input
          type="number"
          step="0.1"
          value={distanceKm}
          onChange={(e) => setDistanceKm(e.target.value)}
          className="rounded-lg border border-border bg-bg px-3 py-2"
        />
      </label>

      {error && <p className="sm:col-span-2 text-sm text-danger">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-bg disabled:opacity-50 sm:col-span-2 sm:w-fit"
      >
        {loading ? "Création…" : "Créer la course"}
      </button>
    </form>
  );
}
