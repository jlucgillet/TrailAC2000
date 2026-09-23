"use client";

import { useState } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function AdminsTab() {
  const { data, isLoading, mutate } = useSWR("/api/admin/users/admins", fetcher);
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    const res = await fetch("/api/admin/users/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      }),
    });
    const result = await res.json();
    setCreating(false);
    if (!res.ok) {
      setError(result.error ?? "Erreur lors de la création.");
      return;
    }
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setOpen(false);
    mutate();
  }

  async function handleDelete(id: string, adminEmail: string) {
    if (!confirm(`Supprimer le compte administrateur ${adminEmail} ?`)) return;
    const res = await fetch(`/api/admin/users/admins/${id}`, { method: "DELETE" });
    const result = await res.json();
    if (!res.ok) {
      alert(result.error ?? "Erreur lors de la suppression.");
      return;
    }
    mutate();
  }

  const admins = data?.admins ?? [];

  return (
    <div className="flex flex-col gap-6">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-fit rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg"
        >
          + Nouvel administrateur
        </button>
      ) : (
        <form
          onSubmit={handleCreate}
          className="grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-2"
        >
          <label className="flex flex-col gap-1">
            <span className="text-sm text-muted">Prénom</span>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="rounded-lg border border-border bg-bg px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-muted">Nom</span>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="rounded-lg border border-border bg-bg px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-muted">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-border bg-bg px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-muted">Mot de passe (8 caractères min.)</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-border bg-bg px-3 py-2 text-sm"
            />
          </label>

          {error && <p className="text-sm text-danger sm:col-span-2">{error}</p>}

          <div className="flex gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg disabled:opacity-50"
            >
              {creating ? "Création…" : "Créer"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setError(null);
              }}
              className="text-sm text-muted underline"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="text-muted">Chargement…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-surface text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Nom</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Courses créées</th>
                <th className="px-4 py-3 font-medium">Depuis le</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {admins.map((a: any) =>
                editingId === a.id ? (
                  <EditAdminRow
                    key={a.id}
                    admin={a}
                    onCancel={() => setEditingId(null)}
                    onSaved={() => {
                      setEditingId(null);
                      mutate();
                    }}
                  />
                ) : (
                  <tr key={a.id}>
                    <td className="px-4 py-3">
                      {[a.firstName, a.lastName].filter(Boolean).join(" ") || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {a.email}
                      {a.isSelf && <span className="ml-2 text-xs text-muted">(vous)</span>}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted">{a.racesCount}</td>
                    <td className="px-4 py-3 text-muted">
                      {new Date(a.createdAt).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingId(a.id)}
                          className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:text-ink"
                        >
                          Modifier
                        </button>
                        {!a.isSelf && (
                          <button
                            onClick={() => handleDelete(a.id, a.email)}
                            className="rounded-lg border border-danger px-3 py-1.5 text-xs text-danger"
                          >
                            Supprimer
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function EditAdminRow({
  admin,
  onCancel,
  onSaved,
}: {
  admin: any;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [firstName, setFirstName] = useState(admin.firstName ?? "");
  const [lastName, setLastName] = useState(admin.lastName ?? "");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (password && password.length < 8) {
      setError("Le mot de passe doit faire au moins 8 caractères.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/users/admins/${admin.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName,
        lastName,
        ...(password ? { password } : {}),
      }),
    });
    const result = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(result.error ?? "Erreur lors de l'enregistrement.");
      return;
    }
    onSaved();
  }

  return (
    <tr>
      <td colSpan={4} className="px-4 py-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">Prénom</span>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="rounded-lg border border-border bg-bg px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">Nom</span>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="rounded-lg border border-border bg-bg px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">Nouveau mot de passe (facultatif)</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Laisser vide pour ne pas changer"
              className="rounded-lg border border-border bg-bg px-3 py-2 text-sm"
            />
          </label>
        </div>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </td>
      <td className="px-4 py-4 align-bottom">
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-bg disabled:opacity-50"
          >
            {saving ? "…" : "Enregistrer"}
          </button>
          <button
            onClick={onCancel}
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted"
          >
            Annuler
          </button>
        </div>
      </td>
    </tr>
  );
}
