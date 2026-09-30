"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  already_started: "Tu as déjà commencé cette course.",
  already_finished: "Ta course est déjà terminée.",
  no_start: "Aucun départ enregistré pour cette course — scanne d'abord le QR code DÉPART.",
  race_not_active: "Cette course n'est pas (ou plus) ouverte au chronométrage.",
};

export function ClassicScanner({ raceId, raceName }: { raceId: string; raceName: string }) {
  const router = useRouter();
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

  const startedOrRunning = result?.kind === "started" || result?.kind === "already_started";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-10 text-center">
      <div>
        <p className="text-sm text-muted">{raceName}</p>
        <h1 className="font-display text-2xl font-semibold">Vise le QR code DÉPART</h1>
        <p className="mt-2 max-w-xs text-sm text-muted">
          Tu es identifié. Scanne maintenant le QR code DÉPART pour lancer ton chronomètre — ce
          scan-ci compte, contrairement au précédent.
        </p>
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

          <div className="mt-4 flex flex-col gap-2">
            {startedOrRunning && (
              <button
                onClick={() => router.push(`/course/${raceId}/run`)}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg"
              >
                Voir mon chrono
              </button>
            )}
            <button
              onClick={() => setResult(null)}
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-ink"
            >
              Scanner un autre QR code
            </button>
          </div>
        </div>
      )}

      <Link href={`/course/${raceId}/run`} className="text-sm text-muted underline">
        Voir mon chrono
      </Link>
    </div>
  );
}
