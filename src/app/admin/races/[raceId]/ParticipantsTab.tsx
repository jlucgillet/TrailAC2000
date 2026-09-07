"use client";

import { useState } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Participant = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  bibNumber: string | null;
  category: string | null;
  phoneNormalized: string;
};

export function ParticipantsTab({ raceId }: { raceId: string }) {
  const [query, setQuery] = useState("");
  const { data, mutate } = useSWR(
    `/api/admin/races/${raceId}/participants${query ? `?q=${encodeURIComponent(query)}` : ""}`,
    fetcher
  );
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMessage(null);

    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/admin/races/${raceId}/participants/import`, {
      method: "POST",
      body: form,
    });
    const result = await res.json();
    setImporting(false);
    e.target.value = "";

    if (!res.ok) {
      setImportMessage(result.error ?? "Échec de l'import.");
      return;
    }
    setImportMessage(`${result.imported} / ${result.total} lignes importées.`);
    mutate();
  }

  const participants: Participant[] = data?.participants ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher (nom, dossard, téléphone)"
          className="min-w-[240px] flex-1 rounded-lg border border-border bg-surface px-3 py-2"
        />
        <label className="cursor-pointer rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-ink">
          {importing ? "Import en cours…" : "Importer un CSV"}
          <input type="file" accept=".csv" onChange={handleImport} className="hidden" disabled={importing} />
        </label>
      </div>

      {importMessage && <p className="text-sm text-muted">{importMessage}</p>}

      <p className="text-xs text-muted">
        Format CSV attendu : <code>telephone,prenom,nom,dossard,categorie</code>
      </p>

      <AddParticipantForm raceId={raceId} onAdded={() => mutate()} />

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-surface text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Dossard</th>
              <th className="px-4 py-3 font-medium">Nom</th>
              <th className="px-4 py-3 font-medium">Catégorie</th>
              <th className="px-4 py-3 font-medium">Téléphone</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {participants.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 tabular-nums">{p.bibNumber ?? "—"}</td>
                <td className="px-4 py-3">{[p.firstName, p.lastName].filter(Boolean).join(" ") || "—"}</td>
                <td className="px-4 py-3 text-muted">{p.category ?? "—"}</td>
                <td className="px-4 py-3 tabular-nums text-muted">{p.phoneNormalized}</td>
              </tr>
            ))}
            {participants.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted">
                  Aucun concurrent pour le moment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AddParticipantForm({ raceId, onAdded }: { raceId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bibNumber, setBibNumber] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch(`/api/admin/races/${raceId}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, firstName, lastName, bibNumber }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Erreur.");
      return;
    }
    setPhone("");
    setFirstName("");
    setLastName("");
    setBibNumber("");
    setOpen(false);
    onAdded();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-fit rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-ink"
      >
        + Ajouter un concurrent
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-4">
      <input
        required
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Téléphone"
        className="rounded-lg border border-border bg-bg px-3 py-2 sm:col-span-1"
      />
      <input
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        placeholder="Prénom"
        className="rounded-lg border border-border bg-bg px-3 py-2"
      />
      <input
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
        placeholder="Nom"
        className="rounded-lg border border-border bg-bg px-3 py-2"
      />
      <input
        value={bibNumber}
        onChange={(e) => setBibNumber(e.target.value)}
        placeholder="Dossard"
        className="rounded-lg border border-border bg-bg px-3 py-2"
      />
      {error && <p className="text-sm text-danger sm:col-span-4">{error}</p>}
      <div className="flex gap-2 sm:col-span-4">
        <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg">
          Ajouter
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm text-muted">
          Annuler
        </button>
      </div>
    </form>
  );
}
