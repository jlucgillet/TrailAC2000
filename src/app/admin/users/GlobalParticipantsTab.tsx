"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type SortKey = "name" | "phoneNormalized" | "bibNumber" | "raceName";

function compare(a: unknown, b: unknown): number {
  if (a === null || a === undefined || a === "") return b ? 1 : 0;
  if (b === null || b === undefined || b === "") return -1;
  return String(a).localeCompare(String(b), "fr");
}

export function GlobalParticipantsTab() {
  const [query, setQuery] = useState("");
  const { data, isLoading, mutate } = useSWR(
    `/api/admin/users/participants${query ? `?q=${encodeURIComponent(query)}` : ""}`,
    fetcher
  );
  const [raceFilter, setRaceFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("raceName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  async function handleRemove(raceId: string, participantId: string, name: string) {
    if (!confirm(`Retirer ${name} de cette course ? Son historique de chronométrage sera supprimé.`)) {
      return;
    }
    await fetch(`/api/admin/races/${raceId}/participants/${participantId}`, { method: "DELETE" });
    mutate();
  }

  const participants = data?.participants ?? [];

  const raceOptions = useMemo(() => {
    const map = new Map<string, string>();
    participants.forEach((p: any) => map.set(p.raceId, p.raceName));
    return Array.from(map.entries());
  }, [participants]);

  const filtered = useMemo(
    () => (raceFilter ? participants.filter((p: any) => p.raceId === raceFilter) : participants),
    [participants, raceFilter]
  );

  const sorted = useMemo(() => {
    const withName = filtered.map((p: any) => ({
      p,
      name: [p.firstName, p.lastName].filter(Boolean).join(" "),
    }));
    withName.sort((a: any, b: any) => {
      const va = sortKey === "name" ? a.name : a.p[sortKey];
      const vb = sortKey === "name" ? b.name : b.p[sortKey];
      const result = compare(va, vb);
      return sortDir === "asc" ? result : -result;
    });
    return withName.map((x: any) => x.p);
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher (nom, dossard, téléphone)"
          className="min-w-[240px] rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
        <select
          value={raceFilter}
          onChange={(e) => setRaceFilter(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
          <option value="">Toutes les courses</option>
          {raceOptions.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs text-muted">
        Vue regroupant les concurrents de toutes les courses. Pour modifier le dossard ou la
        catégorie d&rsquo;un concurrent, passez par l&rsquo;onglet Concurrents de sa course.
      </p>

      {isLoading ? (
        <p className="text-muted">Chargement…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-surface text-muted">
              <tr>
                <SortHeader label="Nom" sortKeyFor="name" />
                <SortHeader label="Téléphone" sortKeyFor="phoneNormalized" />
                <SortHeader label="Dossard" sortKeyFor="bibNumber" />
                <SortHeader label="Course" sortKeyFor="raceName" />
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sorted.map((p: any) => {
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
              {sorted.length === 0 && (
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
