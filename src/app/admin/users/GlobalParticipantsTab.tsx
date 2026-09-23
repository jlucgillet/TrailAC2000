"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function GlobalParticipantsTab() {
  const [query, setQuery] = useState("");
  const { data, isLoading, mutate } = useSWR(
    `/api/admin/users/participants${query ? `?q=${encodeURIComponent(query)}` : ""}`,
    fetcher
  );

  async function handleRemove(raceId: string, participantId: string, name: string) {
    if (!confirm(`Retirer ${name} de cette course ? Son historique de chronométrage sera supprimé.`)) {
      return;
    }
    await fetch(`/api/admin/races/${raceId}/participants/${participantId}`, { method: "DELETE" });
    mutate();
  }

  const participants = data?.participants ?? [];

  return (
    <div className="flex flex-col gap-4">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher (nom, dossard, téléphone)"
        className="max-w-sm rounded-lg border border-border bg-surface px-3 py-2 text-sm"
      />

      <p className="text-xs text-muted">
        Vue regroupant les concurrents de toutes vos courses. Pour modifier le dossard ou la
        catégorie d&rsquo;un concurrent, passez par l&rsquo;onglet Concurrents de sa course.
      </p>

      {isLoading ? (
        <p className="text-muted">Chargement…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-surface text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Nom</th>
                <th className="px-4 py-3 font-medium">Téléphone</th>
                <th className="px-4 py-3 font-medium">Dossard</th>
                <th className="px-4 py-3 font-medium">Course</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {participants.map((p: any) => {
                const name = [p.firstName, p.lastName].filter(Boolean).join(" ") || "—";
                return (
                  <tr key={p.id}>
                    <td className="px-4 py-3">{name}</td>
                    <td className="px-4 py-3 tabular-nums text-muted">{p.phoneNormalized}</td>
                    <td className="px-4 py-3 tabular-nums">{p.bibNumber ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/races/${p.raceId}`} className="text-accent underline">
                        {p.raceName}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleRemove(p.raceId, p.id, name)}
                        className="rounded-lg border border-danger px-3 py-1.5 text-xs text-danger"
                      >
                        Retirer
                      </button>
                    </td>
                  </tr>
                );
              })}
              {participants.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">
                    Aucun concurrent trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
