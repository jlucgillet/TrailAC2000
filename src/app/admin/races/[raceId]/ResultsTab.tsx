"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { ResultsTable, type ResultRow, type ResultSortKey } from "@/components/ResultsTable";
import { EditRunModal } from "./EditRunModal";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STATUS_OPTIONS = [
  { value: "", label: "Tous les statuts" },
  { value: "registered", label: "Inscrit" },
  { value: "running", label: "En course" },
  { value: "finished", label: "Terminé" },
  { value: "abandoned", label: "Abandonné" },
  { value: "disqualified", label: "Disqualifié" },
];

function formatFullDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("fr-FR")} ${d.toLocaleTimeString("fr-FR")}`;
}

function compare(a: unknown, b: unknown): number {
  if (a === null || a === undefined) return b === null || b === undefined ? 0 : 1;
  if (b === null || b === undefined) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "fr");
}

export function ResultsTab({ raceId }: { raceId: string }) {
  const { data, isLoading, mutate } = useSWR(`/api/admin/races/${raceId}/results`, fetcher, {
    refreshInterval: 5000,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortKey, setSortKey] = useState<ResultSortKey>("position");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function handleSortChange(key: ResultSortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  if (isLoading) return <p className="text-muted">Chargement…</p>;

  const rawResults: any[] = data?.results ?? [];

  const filtered = rawResults.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (query) {
      const q = query.toLowerCase();
      const hay = `${r.displayName} ${r.bibNumber ?? ""} ${r.phone ?? ""} ${r.category ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const sorted = useMemoSort(filtered, sortKey, sortDir);

  const rows: ResultRow[] = sorted.map((r) => ({
    position: r.position,
    displayName: r.displayName,
    bibNumber: r.bibNumber,
    category: r.category,
    status: r.status,
    durationMs: r.durationMs,
    phone: r.phone,
    participantId: r.participantId,
    startTimestamp: r.startTimestamp ? formatFullDateTime(r.startTimestamp) : null,
    finishTimestamp: r.finishTimestamp ? formatFullDateTime(r.finishTimestamp) : null,
  }));

  const editingRaw = rawResults.find((r) => r.participantId === editingId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
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
        <a
          href={`/api/admin/races/${raceId}/export`}
          className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-ink"
        >
          Exporter en CSV
        </a>
      </div>

      <ResultsTable
        rows={rows}
        showTimestamps
        showPhone
        sortKey={sortKey}
        sortDir={sortDir}
        onSortChange={handleSortChange}
        renderActions={(row) => (
          <button
            onClick={() => setEditingId(row.participantId ?? null)}
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:text-ink"
          >
            Modifier
          </button>
        )}
      />

      {editingRaw && (
        <EditRunModal
          raceId={raceId}
          participantId={editingRaw.participantId}
          displayName={editingRaw.displayName}
          startTimestamp={editingRaw.startTimestamp}
          finishTimestamp={editingRaw.finishTimestamp}
          status={editingRaw.status}
          onClose={() => setEditingId(null)}
          onSaved={() => mutate()}
        />
      )}
    </div>
  );
}

function useMemoSort(rows: any[], sortKey: ResultSortKey, sortDir: "asc" | "desc") {
  return useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const result = compare(a[sortKey], b[sortKey]);
      return sortDir === "asc" ? result : -result;
    });
    return copy;
  }, [rows, sortKey, sortDir]);
}
