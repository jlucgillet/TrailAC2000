"use client";

import { useState } from "react";
"use client";

import { useState } from "react";

type Race = {
  id: string;
  name: string;
  status: "draft" | "active" | "closed" | "archived";
  publicResultsEnabled: boolean;
};

const STATUS_OPTIONS: { value: Race["status"]; label: string; hint: string }[] = [
  { value: "draft", label: "Brouillon", hint: "Course non visible, scans refusés." },
  { value: "active", label: "Active", hint: "Chronométrage en cours, scans acceptés." },
  { value: "closed", label: "Clôturée", hint: "Course terminée, scans refusés, résultats consultables." },
];

export function SettingsTab({
  race,
  onUpdate,
}: {
  race: Race;
  onUpdate: (patch: Partial<Race>) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updateField(patch: Partial<Race>) {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/races/${race.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Erreur lors de la sauvegarde.");
      return;

  async function updateField(patch: Partial<Race>) {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/races/${race.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Erreur lors de la sauvegarde.");
      return;
    }
    onUpdate({ ...race, ...patch });
  }

  return (
    <div className="flex max-w-xl flex-col gap-8">
      <section>
        <h3 className="mb-3 font-display text-xl font-semibold">Statut de la course</h3>
        <div className="flex flex-col gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 ${
                race.status === opt.value ? "border-accent bg-accent/5" : "border-border"
              }`}
            >
              <input
                type="radio"
                name="status"
                checked={race.status === opt.value}
                onChange={() => updateField({ status: opt.value })}
                className="mt-1"
              />
              <span>
                <span className="block font-medium">{opt.label}</span>
                <span className="block text-sm text-muted">{opt.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-3 font-display text-xl font-semibold">Résultats publics</h3>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={race.publicResultsEnabled}
            onChange={(e) => updateField({ publicResultsEnabled: e.target.checked })}
          />
          <span>
            Autoriser la consultation publique des résultats (sans numéro de téléphone) à l&rsquo;adresse{" "}
            <code className="text-muted">/results/{race.id}</code>
          </span>
        </label>
      </section>

      {saving && <p className="text-sm text-muted">Enregistrement…</p>}
      {error && <p className="text-sm text-danger">{error}</p>}

      <section className="rounded-xl border border-danger/40 p-4">
        <h3 className="mb-2 font-display text-xl font-semibold text-danger">Zone sensible</h3>
        <p className="mb-3 text-sm text-muted">
          Archiver la course la retire des listes actives. Les données sont conservées (traçabilité),
          rien n&rsquo;est supprimé définitivement depuis cette interface.
        </p>
        <button
          onClick={async () => {
            if (!confirm("Archiver cette course ?")) return;
            await fetch(`/api/admin/races/${race.id}`, { method: "DELETE" });
            window.location.href = "/admin/dashboard";
          }}
          className="rounded-lg border border-danger px-4 py-2 text-sm text-danger"
        >
          Archiver la course
        </button>
      </section>
    </div>
  );
}
