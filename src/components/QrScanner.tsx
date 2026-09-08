"use client";

import { useEffect, useRef, useState } from "react";

export function QrScanner({
  paused,
  onDecoded,
}: {
  paused: boolean;
  onDecoded: (decodedText: string) => void;
}) {
  const containerId = useRef(`qr-reader-${Math.random().toString(36).slice(2)}`);
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const [phase, setPhase] = useState<"idle" | "starting" | "running" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  // onDecoded change à chaque rendu du parent, mais le scanner ne démarre
  // qu'une fois par clic sur "Activer la caméra" : on passe par une ref
  // toujours à jour pour éviter d'appeler une version figée du callback.
  const onDecodedRef = useRef(onDecoded);
  onDecodedRef.current = onDecoded;

  async function handleStart() {
    setPhase("starting");
    setError(null);

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      // IMPORTANT : l'élément #containerId doit déjà exister dans le DOM à cet
      // instant. Il est donc rendu de façon permanente ci-dessous (juste
      // masqué visuellement tant que le scanner n'est pas actif), plutôt que
      // conditionné à `phase === "running"` — sinon Html5Qrcode ne trouve pas
      // son point d'ancrage et l'activation échoue silencieusement.
      const scanner = new Html5Qrcode(containerId.current);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 240 },
        (decodedText) => {
          onDecodedRef.current(decodedText);
        },
        () => {
          // Erreurs de décodage image par image : ignorées volontairement,
          // c'est le comportement normal tant qu'aucun QR n'est dans le cadre.
        }
      );
      setPhase("running");
    } catch (err: unknown) {
      setPhase("error");
      let name = "";
      let message = "";
      if (err instanceof Error) {
        name = err.name;
        message = err.message;
      } else if (typeof err === "string") {
        message = err;
      } else {
        message = JSON.stringify(err);
      }

      let friendly: string;
      if (name === "NotAllowedError") {
        friendly =
          "Accès à la caméra refusé. Autorisez l'accès dans les réglages de votre navigateur, puis réessayez.";
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        friendly = "Aucune caméra arrière détectée sur cet appareil.";
      } else if (typeof window !== "undefined" && window.location.protocol !== "https:") {
        friendly = "Le scan caméra nécessite une connexion sécurisée (https).";
      } else {
        friendly =
          "Impossible d'activer la caméra. Utilisez plutôt le scan classique via l'appareil photo natif de votre téléphone.";
      }

      setError(message ? `${friendly} (détail : ${message})` : friendly);
    }
  }

  useEffect(() => {
    return () => {
      const scanner = scannerRef.current;
      if (scanner) {
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => {
            /* déjà arrêté */
          });
      }
    };
  }, []);

  useEffect(() => {
    const scanner = scannerRef.current;
    if (!scanner || phase !== "running") return;
    try {
      if (paused) {
        scanner.pause(true);
      } else {
        scanner.resume();
      }
    } catch {
      // La bibliothèque peut refuser une mise en pause/reprise si elle n'est
      // pas exactement dans l'état attendu à cet instant précis (ex. juste
      // après un scan). Ce n'est qu'un raffinement d'UX, jamais critique :
      // on l'ignore plutôt que de laisser une exception faire planter toute
      // la page (Next.js affiche sinon un écran d'erreur générique).
    }
  }, [paused, phase]);

  return (
    <div className="mx-auto w-full max-w-sm">
      {(phase === "idle" || phase === "starting") && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-8">
          <button
            onClick={handleStart}
            disabled={phase === "starting"}
            className="rounded-xl bg-accent px-6 py-4 text-lg font-semibold text-bg disabled:opacity-50"
          >
            {phase === "starting" ? "Activation…" : "Activer la caméra"}
          </button>
          <p className="text-center text-sm text-muted">
            Votre navigateur va demander l&rsquo;autorisation d&rsquo;utiliser la caméra.
          </p>
        </div>
      )}

      <div
        id={containerId.current}
        className={
          phase === "running"
            ? "w-full overflow-hidden rounded-2xl border border-border bg-surface"
            : "hidden"
        }
      />

      {phase === "error" && error && (
        <div className="rounded-2xl border border-border bg-surface p-4 text-center">
          <p className="mb-3 text-sm text-danger">{error}</p>
          <button
            onClick={handleStart}
            className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-ink"
          >
            Réessayer
          </button>
        </div>
      )}
    </div>
  );
}
