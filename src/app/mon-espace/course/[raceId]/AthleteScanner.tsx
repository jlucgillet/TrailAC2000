"use client";

import { useState } from "react";
import Link from "next/link";
import { QrScanner } from "@/components/QrScanner";
import { formatDurationMs } from "@/lib/time";

type ScanResult =
  | { kind: "started" }
  | { kind: "finished"; durationMs: number }
  | { kind: "already_started" }
  | { kind: "already_finished"; durationMs: number }
  | { kind: "no_start" }
  | { kind: "race_not_active" }
  | { kind: "error"; message: string };

const MESSAGES: Record<string, string> = {
  started: "Départ enregistré, bon courage !",
  already_started: "Vous avez déjà commencé cette course.",
  already_finished: "Votre course est déjà terminée.",
  no_start: "Aucun départ enregistré pour cette course — scannez d'abord le QR code DÉPART.",
  race_not_active: "Cette course n'est pas (ou plus) ouverte au chronométrage.",
};

export function AthleteScanner({
  raceId,
  raceName,
  raceStatus,
}: {
  raceId: string;
  raceName: string;
  raceStatus: string;
}) {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);

  if (raceStatus !== "active") {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <p className="text-muted">
          <strong className="text-ink">{raceName}</strong> n&rsquo;est pas (ou plus) ouverte au
          chronométrage.
        </p>
        <Link href="/mon-espace" className="text-accent underline">
          Retour à mon espace
        </Link>
      </div>
    );
  }

  async function handleDecoded(decodedText: string) {
    if (loading || result) return; // évite les scans multiples pendant le traitement
    setLoading(true);
    try {
      const res = await fetch("/api/athlete/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raceId, decodedText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ kind: "error", message: data.error ?? "Erreur lors du scan." });
      } else {
        setResult(data.outcome);
      }
    } catch {
      setResult({ kind: "error", message: "Connexion impossible. Réessayez." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 py-4 text-center">
      <div>
        <p className="text-sm text-muted">Scanner — {raceName}</p>
        <h1 className="font-display text-2xl font-semibold">Visez un QR code DÉPART ou ARRIVÉE</h1>
      </div>

      <QrScanner paused={loading || result !== null} onDecoded={handleDecoded} />

      {loading && <p className="text-muted">Traitement…</p>}

      {result && (
        <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-5">
          {result.kind === "finished" || result.kind === "already_finished" ? (
            <>
              <p className="mb-1 text-sm text-accent">Course terminée</p>
              <p className="chrono-digits text-4xl font-semibold">
                {formatDurationMs(result.durationMs)}
              </p>
            </>
          ) : (
            <p className={result.kind === "error" ? "text-danger" : "text-ink"}>
              {result.kind === "error" ? result.message : MESSAGES[result.kind]}
            </p>
          )}
          <button
            onClick={() => setResult(null)}
            className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg"
          >
            Scanner un autre QR code
          </button>
        </div>
      )}

      <Link href="/mon-espace" className="text-sm text-muted underline">
        Retour à mon espace
      </Link>
    </div>
  );
}
