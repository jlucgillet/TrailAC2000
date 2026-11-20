"use client";

import { useRef, useState } from "react";
import useSWR from "swr";
import { confirmDialog, notify } from "@/components/ConfirmDialog";

type Member = {
  id: string;
  firstName: string;
  lastName: string;
  phoneNormalized: string;
  photoId: string | null;
  photoShared: boolean;
  raceCount: number;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const fmtPhone = (p: string) => p.replace(/(\d{2})(?=\d)/g, "$1 ");

function Avatar({ m }: { m: Member }) {
  if (m.photoId) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`/api/photos/${m.photoId}`} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded-full object-cover" />;
  }
  const ini = ((m.firstName[0] ?? "") + (m.lastName[0] ?? "")).toUpperCase() || "?";
  return (
    <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bg text-sm font-semibold text-muted">
      {ini}
    </span>
  );
}

type ImportResult = {
  created: number;
  updated: number;
  unchanged: number;
  errors: { line: number; message: string }[];
  errorCount: number;
};

export function MembersTab() {
  const [q, setQ] = useState("");
  const { data, isLoading, mutate } = useSWR<{ members: Member[] }>(
    `/api/admin/members${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`,
    fetcher,
    { keepPreviousData: true }
  );
  const members = data?.members ?? [];

  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "" });
  const [editId, setEditId] = useState<string | null>(null);
  const [edit, setEdit] = useState({ firstName: "", lastName: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function send(url: string, method: string, body?: unknown) {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, json };
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await send("/api/admin/members", "POST", form);
    setBusy(false);
    if (!r.ok) return setError(r.json.error ?? "Erreur lors de l'ajout.");
    setForm({ firstName: "", lastName: "", phone: "" });
    mutate();
  }

  async function handleSave(m: Member) {
    setBusy(true);
    setError(null);
    const r = await send(`/api/admin/members/${m.id}`, "PATCH", edit);
    setBusy(false);
    if (!r.ok) return setError(r.json.error ?? "Erreur lors de la modification.");
    setEditId(null);
    mutate();
  }

  async function handleDelete(m: Member) {
    const ok = await confirmDialog(
      `Retirer ${m.firstName} ${m.lastName} de la liste des membres ?\nIl ne pourra plus se connecter à l'espace membre et sa photo sera supprimée. Ses résultats de course sont conservés.`,
      { confirmLabel: "Retirer" }
    );
    if (!ok) return;
    const r = await send(`/api/admin/members/${m.id}`, "DELETE");
    if (!r.ok) return notify(r.json.error ?? "Erreur lors de la suppression.");
    mutate();
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    setImportResult(null);
    const csv = await file.text();
    const r = await send("/api/admin/members/import", "POST", { csv });
    setBusy(false);
    if (!r.ok) return setError(r.json.error ?? "Erreur lors de l'import.");
    setImportResult(r.json as ImportResult);
    mutate();
  }

  const input = "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-accent";

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {isLoading ? "Chargement…" : `${members.length} membre${members.length > 1 ? "s" : ""}`} · seuls les membres de
          cette liste peuvent se connecter à l&rsquo;espace membre.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg"
          >
            + Ajouter un membre
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="rounded-lg border border-border px-4 py-2 text-sm text-ink hover:border-accent disabled:opacity-50"
          >
            Importer un CSV
          </button>
          <a
            href="/api/admin/members/export"
            className="rounded-lg border border-border px-4 py-2 text-sm text-ink hover:border-accent"
          >
            Exporter
          </a>
          <input ref={fileRef} type="file" accept=".csv,.txt,text/csv" onChange={handleImport} className="hidden" />
        </div>
      </div>

      {adding && (
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">Prénom</span>
            <input className={input} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} autoFocus />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">Nom</span>
            <input className={input} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">Téléphone</span>
            <input
              className={input}
              type="tel"
              inputMode="tel"
              required
              placeholder="06 12 34 56 78"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </label>
          <button type="submit" disabled={busy} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg disabled:opacity-50">
            Ajouter
          </button>
        </form>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      {importResult && (
        <div className="rounded-xl border border-border bg-surface p-4 text-sm">
          <p className="font-semibold text-ink">Import terminé</p>
          <p className="mt-1 text-muted">
            {importResult.created} ajouté{importResult.created > 1 ? "s" : ""}, {importResult.updated} mis à jour,{" "}
            {importResult.unchanged} inchangé{importResult.unchanged > 1 ? "s" : ""}
            {importResult.errorCount > 0 && `, ${importResult.errorCount} ligne(s) ignorée(s)`}.
          </p>
          {importResult.errors.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-danger">
              {importResult.errors.map((e) => (
                <li key={e.line}>
                  Ligne {e.line} : {e.message}
                </li>
              ))}
            </ul>
          )}
          <button type="button" onClick={() => setImportResult(null)} className="mt-2 text-xs text-muted underline">
            Fermer
          </button>
        </div>
      )}

      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="🔍 Rechercher (nom, prénom, téléphone)…"
        aria-label="Rechercher un membre"
        className={`${input} w-full max-w-sm`}
      />

      {!isLoading && members.length === 0 && (
        <p className="text-sm text-muted">{q ? "Aucun membre ne correspond." : "Aucun membre. Ajoutes-en un ou importe un fichier CSV."}</p>
      )}

      <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
        {members.map((m) =>
          editId === m.id ? (
            <li key={m.id} className="flex flex-wrap items-end gap-3 p-3">
              <input className={input} value={edit.firstName} onChange={(e) => setEdit({ ...edit, firstName: e.target.value })} placeholder="Prénom" aria-label="Prénom" />
              <input className={input} value={edit.lastName} onChange={(e) => setEdit({ ...edit, lastName: e.target.value })} placeholder="Nom" aria-label="Nom" />
              <input className={input} type="tel" value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} placeholder="Téléphone" aria-label="Téléphone" />
              <button type="button" disabled={busy} onClick={() => handleSave(m)} className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-bg disabled:opacity-50">
                Enregistrer
              </button>
              <button type="button" onClick={() => setEditId(null)} className="px-2 py-2 text-sm text-muted underline">
                Annuler
              </button>
            </li>
          ) : (
            <li key={m.id} className="flex items-center gap-3 p-3">
              <Avatar m={m} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">
                  {m.firstName} {m.lastName}
                </p>
                <p className="truncate text-xs text-muted">
                  {fmtPhone(m.phoneNormalized)}
                  {m.raceCount > 0 && ` · ${m.raceCount} course${m.raceCount > 1 ? "s" : ""}`}
                  {m.photoId && !m.photoShared && " · photo non partagée"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditId(m.id);
                  setEdit({ firstName: m.firstName, lastName: m.lastName, phone: m.phoneNormalized });
                  setError(null);
                }}
                className="text-sm text-muted hover:text-ink"
                aria-label={`Modifier ${m.firstName} ${m.lastName}`}
              >
                ✏️
              </button>
              <button type="button" onClick={() => handleDelete(m)} className="text-sm text-muted hover:text-danger" aria-label={`Retirer ${m.firstName} ${m.lastName}`}>
                🗑️
              </button>
            </li>
          )
        )}
      </ul>
    </section>
  );
}
