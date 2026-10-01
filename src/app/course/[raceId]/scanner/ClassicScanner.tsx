"use client";

import { useState } from "react";
import { QrScanner } from "@/components/QrScanner";
import { Chrono } from "@/components/Chrono";

type ScanResult =
  | { kind: "started" }
  | { kind: "finished"; durationMs: number }
  | { kind: "already_started" }
  | { kind: "already_finished"; durationMs: number }
  | { kind: "no_start" }
  | { kind: "race_not_active" }
  | { kind: "error"; message: string };

const MESSAGES: Record<string, string> = {
  no_start: "Aucun départ enregistré pour cette course — scanne d'abord le QR code DÉPART.",
  race_not_active: "Cette course n'est pas (ou plus) ouverte au chronométrage.",
};

export function ClassicScanner({ raceId, raceName }: { raceId: string; raceName: string }) {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleDecoded(decodedText: string) {
    if (loading || result) return;
    setLoading(true);
    try {
      const res = await fetch("/api/participant/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decodedText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ kind: "error", message: data.error ?? "Erreur lors du scan." });
      } else {
        setResult(data.outcome);
      }
    } catch {
      setResult({ kind: "error", message: "Connexion impossible. Réessaie." });
    } finally {
      setLoading(false);
    }
  }

  // Dès que le scan a réussi (départ lancé, déjà en course, ou même déjà
  // arrivé), le scanner disparaît et le chrono prend sa place directement
  // sur cet écran — plus besoin d'un clic supplémentaire pour le voir.
  // "no_start" et "race_not_active" ne sont PAS des départs réussis : on
  // reste sur le scanner pour permettre de réessayer.
  const scanSucceeded =
    result?.kind === "started" ||
    result?.kind === "already_started" ||
    result?.kind === "finished" ||
    result?.kind === "already_finished";

  if (scanSucceeded) {
    return <Chrono raceId={raceId} />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-10 text-center">
      <div>
        <p className="text-sm text-muted">{raceName}</p>
        <h1 className="font-display text-2xl font-semibold">Vise un QR code DÉPART ou ARRIVÉE</h1>
        <p className="mt-2 max-w-xs text-sm text-muted">
          Tu es identifié. Ce scan-ci compte, contrairement au précédent.
        </p>
      </div>

      <QrScanner paused={loading || result !== null} onDecoded={handleDecoded} />

      {loading && <p className="text-muted">Traitement…</p>}

      {result && result.kind === "error" && (
        <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-5">
          <p className="text-danger">{result.message}</p>
          <button
            onClick={() => setResult(null)}
            className="mt-4 rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-ink"
          >
            Réessayer
          </button>
        </div>
      )}

      {result && result.kind !== "error" && MESSAGES[result.kind] && (
        <p className="max-w-sm text-sm text-muted">{MESSAGES[result.kind]}</p>
      )}
    </div>
  );
}
