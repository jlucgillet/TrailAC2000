"use client";

import { useState } from "react";
import Link from "next/link";
import { QrScanner } from "@/components/QrScanner";
import { formatDurationMs } from "@/lib/time";

type ScanResult =
  | { kind: "started"; raceName: string }
  | { kind: "finished"; durationMs: number; raceName: string }
  | { kind: "already_started"; raceName: string }
  | { kind: "already_finished"; durationMs: number; raceName: string }
  | { kind: "no_start"; raceName: string }
  | { kind: "race_not_active"; raceName: string }
  | { kind: "error"; message: string };

const MESSAGES: Record<string, string> = {
  started: "Départ enregistré, bon courage !",
  already_started: "Vous avez déjà commencé cette course.",
  already_finished: "Votre course est déjà terminée.",
  no_start: "Aucun départ enregistré pour cette course — scannez d'abord le QR code DÉPART.",
  race_not_active: "Cette course n'est pas (ou plus) ouverte au chronométrage.",
};

export function AnyScanner() {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleDecoded(decodedText: string) {
    if (loading || result) return;
    setLoading(true);
    try {
      const res = await fetch("/api/athlete/scan-any", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decodedText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ kind: "error", message: data.error ?? "Erreur lors du scan." });
      } else {
        setResult({ ...data.outcome, raceName: data.raceName });
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
        <p className="text-sm text-muted">Scanner</p>
        <h1 className="font-display text-2xl font-semibold">
          Visez n&rsquo;importe quel QR code DÉPART ou ARRIVÉE
        </h1>
        <p className="mt-2 text-sm text-muted">
          La course est reconnue automatiquement à partir du QR code scanné.
        </p>
      </div>

      <QrScanner paused={loading || result !== null} onDecoded={handleDecoded} />

      {loading && <p className="text-muted">Traitement…</p>}

      {result && (
        <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-5">
          {result.kind !== "error" && (
            <p className="mb-2 text-sm text-muted">{result.raceName}</p>
          )}
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
