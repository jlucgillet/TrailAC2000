"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CHECKPOINT_LABEL: Record<string, string> = {
  start: "DÉPART",
  finish: "ARRIVÉE",
};

export function ConfirmScan({
  raceId,
  raceName,
  checkpoint,
  token,
  displayName,
  pendingUrl,
}: {
  raceId: string;
  raceName: string;
  checkpoint: "start" | "finish";
  token: string;
  displayName: string;
  pendingUrl: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"confirm" | "switch" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading("confirm");
    setError(null);
    try {
      const res = await fetch("/api/participant/confirm-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, checkpoint }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur lors du scan.");
        setLoading(null);
        return;
      }
      router.push(`/course/${raceId}/run`);
    } catch {
      setError("Connexion impossible. Vérifiez votre réseau et réessayez.");
      setLoading(null);
    }
  }

  async function handleSwitch() {
    setLoading("switch");
    try {
      await fetch("/api/participant/switch", { method: "POST" });
    } finally {
      router.push(pendingUrl);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="mb-1 text-sm text-muted">{raceName}</p>
      <p className="mb-6 text-sm uppercase tracking-wide text-muted">
        Scan {CHECKPOINT_LABEL[checkpoint]}
      </p>

      <p className="mb-2 text-sm text-muted">Vous êtes</p>
      <p className="mb-8 font-display text-3xl font-semibold">{displayName}</p>

      {error && (
        <p role="alert" className="mb-4 max-w-xs rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <button
        onClick={handleConfirm}
        disabled={loading !== null}
        className="w-full max-w-xs rounded-xl bg-accent px-6 py-4 text-lg font-semibold text-bg disabled:opacity-50"
      >
        {loading === "confirm" ? "Enregistrement…" : "C'est moi, continuer"}
      </button>

      <button
        onClick={handleSwitch}
        disabled={loading !== null}
        className="mt-4 text-sm text-muted underline disabled:opacity-50"
      >
        {loading === "switch" ? "…" : "Ce n'est pas moi"}
      </button>
    </div>
  );
}
