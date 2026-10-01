"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { formatDurationMs } from "@/lib/time";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STATUS_LABEL: Record<string, string> = {
  registered: "Inscrit",
  running: "En course",
  finished: "Terminé",
  abandoned: "Abandonné",
  disqualified: "Disqualifié",
};

const STATUS_OPTIONS = [
  { value: "", label: "Tous les statuts" },
  { value: "running", label: "En course" },
  { value: "finished", label: "Terminé" },
  { value: "abandoned", label: "Abandonné" },
  { value: "disqualified", label: "Disqualifié" },
];

type SortKey = "bibNumber" | "name" | "phone" | "attemptNumber" | "durationMs" | "status";

function compare(a: unknown, b: unknown): number {
  if (a === null || a === undefined) return b === null || b === undefined ? 0 : 1;
  if (b === null || b === undefined) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "fr");
}

function formatFullDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.toLocaleDateString("fr-FR")} ${d.toLocaleTimeString("fr-FR")}`;
}

export function AllAttemptsTab({ raceId }: { raceId: string }) {
  const { data, isLoading, mutate } = useSWR(`/api/admin/races/${raceId}/all-results`, fetcher);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("bibNumber");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  async function handleDelete(runId: string, displayName: string, attemptNumber: number) {
    if (
      !confirm(
        `Supprimer l'essai n°${attemptNumber} de ${displayName} ? Cette action est irréversible.`
      )
    ) {
      return;
    }
    setDeletingId(runId);
    const res = await fetch(`/api/admin/races/${raceId}/all-results/${runId}`, {
      method: "DELETE",
    });
    setDeletingId(null);
    if (!res.ok) {
      const result = await res.json().catch(() => ({}));
      alert(result.error ?? "Erreur lors de la suppression.");
      return;
    }
    mutate();
  }

  const runs: any[] = data?.runs ?? [];

  const filtered = runs.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (query) {
      const q = query.toLowerCase();
      const hay = `${r.displayName} ${r.bibNumber ?? ""} ${r.phone ?? ""} ${r.category ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const sorted = useMemo(() => {
    const withName = filtered.map((r) => ({ r, name: r.displayName }));
    withName.sort((a, b) => {
      const va = sortKey === "name" ? a.name : a.r[sortKey];
      const vb = sortKey === "name" ? b.name : b.r[sortKey];
      const result = compare(va, vb);
      return sortDir === "asc" ? result : -result;
    });
    return withName.map((x) => x.r);
  }, [filtered, sortKey, sortDir]);

  const SortHeader = ({ label, sortKeyFor }: { label: string; sortKeyFor: SortKey }) => {
    const active = sortKey === sortKeyFor;
    return (
      <th className="px-4 py-3 font-medium">
        <button
          onClick={() => handleSort(sortKeyFor)}
          className={`flex items-center gap-1 hover:text-ink ${active ? "text-ink" : ""}`}
        >
          {label}
          <span className="text-[10px]">{active ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}</span>
        </button>
      </th>
    );
  };

  if (isLoading) return <p className="text-muted">Chargement…</p>;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted">
        Vue complète : chaque essai de chaque concurrent (contrairement à l&rsquo;onglet Résultats,
        qui ne garde que le meilleur de chacun). Utile pour nettoyer un essai de test ou une
        erreur de scan.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher (nom, dossard, téléphone, catégorie)"
          className="min-w-[240px] rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-surface text-muted">
            <tr>
              <SortHeader label="Dossard" sortKeyFor="bibNumber" />
              <SortHeader label="Concurrent" sortKeyFor="name" />
              <SortHeader label="Téléphone" sortKeyFor="phone" />
              <SortHeader label="Essai" sortKeyFor="attemptNumber" />
              <th className="px-4 py-3 font-medium">Départ</th>
              <th className="px-4 py-3 font-medium">Arrivée</th>
              <SortHeader label="Temps" sortKeyFor="durationMs" />
              <SortHeader label="Statut" sortKeyFor="status" />
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map((r) => (
              <tr key={r.runId}>
                <td className="px-4 py-3 tabular-nums">{r.bibNumber ?? "—"}</td>
                <td className="px-4 py-3">{r.displayName}</td>
                <td className="px-4 py-3 tabular-nums text-muted">{r.phone ?? "—"}</td>
                <td className="px-4 py-3 tabular-nums text-muted">#{r.attemptNumber}</td>
                <td className="px-4 py-3 text-muted">{formatFullDateTime(r.startTimestamp)}</td>
                <td className="px-4 py-3 text-muted">{formatFullDateTime(r.finishTimestamp)}</td>
                <td className="px-4 py-3 tabular-nums font-medium">
                  {r.durationMs !== null ? formatDurationMs(r.durationMs) : "—"}
                </td>
                <td className="px-4 py-3 text-muted">{STATUS_LABEL[r.status] ?? r.status}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleDelete(r.runId, r.displayName, r.attemptNumber)}
                    disabled={deletingId === r.runId}
                    className="rounded-lg border border-danger px-3 py-1.5 text-xs text-danger disabled:opacity-50"
                  >
                    {deletingId === r.runId ? "…" : "Supprimer"}
                  </button>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-muted">
                  Aucun essai pour le moment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
