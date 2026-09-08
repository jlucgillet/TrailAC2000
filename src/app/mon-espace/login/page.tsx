"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AthleteLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/athlete/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur de connexion.");
        setLoading(false);
        return;
      }
      router.push("/mon-espace");
      router.refresh();
    } catch {
      setError("Connexion impossible. Vérifiez votre réseau et réessayez.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <p className="mb-1 text-sm text-muted">Espace concurrent</p>
        <h1 className="mb-8 font-display text-3xl font-semibold leading-tight">
          Mes courses
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm text-muted">Votre numéro de téléphone</span>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="06 12 34 56 78"
              className="rounded-xl border border-border bg-surface px-4 py-4 text-lg text-ink placeholder:text-muted focus:border-accent"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-2">
              <span className="text-sm text-muted">Prénom</span>
              <input
                type="text"
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Facultatif"
                className="rounded-xl border border-border bg-surface px-3 py-3 text-ink placeholder:text-muted focus:border-accent"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm text-muted">Nom</span>
              <input
                type="text"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Facultatif"
                className="rounded-xl border border-border bg-surface px-3 py-3 text-ink placeholder:text-muted focus:border-accent"
              />
            </label>
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || phone.trim().length < 6}
            className="mt-2 rounded-xl bg-accent px-6 py-4 text-lg font-semibold text-bg disabled:opacity-50"
          >
            {loading ? "Connexion…" : "Accéder à mes courses"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Retrouvez l&rsquo;historique de vos courses, vos temps, et rejoignez une nouvelle course active.
        </p>
      </div>
    </div>
  );
}
