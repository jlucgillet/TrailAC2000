"use client";

import { useState } from "react";
import useSWR from "swr";
import { ResultsTable, type ResultRow } from "@/components/ResultsTable";
import { EditRunModal } from "./EditRunModal";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function ResultsTab({ raceId }: { raceId: string }) {
  const { data, isLoading, mutate } = useSWR(`/api/admin/races/${raceId}/results`, fetcher, {
    refreshInterval: 5000,
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  if (isLoading) return <p className="text-muted">Chargement…</p>;

  const rawResults: any[] = data?.results ?? [];

  const rows: ResultRow[] = rawResults.map((r) => ({
    position: r.position,
    displayName: r.displayName,
    bibNumber: r.bibNumber,
    category: r.category,
    status: r.status,
    durationMs: r.durationMs,
    phone: r.phone,
    participantId: r.participantId,
    startTimestamp: r.startTimestamp ? new Date(r.startTimestamp).toLocaleTimeString("fr-FR") : null,
    finishTimestamp: r.finishTimestamp ? new Date(r.finishTimestamp).toLocaleTimeString("fr-FR") : null,
  }));

  const editingRaw = rawResults.find((r) => r.participantId === editingId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
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
