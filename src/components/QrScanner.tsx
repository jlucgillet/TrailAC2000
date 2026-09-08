"use client";

import { useEffect, useId, useRef, useState } from "react";

export function QrScanner({
  paused,
  onDecoded,
}: {
  paused: boolean;
  onDecoded: (decodedText: string) => void;
}) {
  // useId() (et non Math.random()) : garantit le même identifiant entre le
  // rendu serveur et l'hydratation client.
  const reactId = useId().replace(/:/g, "");
  const containerId = useRef(`qr-reader-${reactId}`);
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const [phase, setPhase] = useState<"starting" | "running" | "error">("starting");
  const [error, setError] = useState<string | null>(null);

  const onDecodedRef = useRef(onDecoded);
  onDecodedRef.current = onDecoded;

  useEffect(() => {
    let cancelled = false;

    async function waitForElement(id: string, timeoutMs = 4000): Promise<boolean> {
      const started = Date.now();
      while (!document.getElementById(id)) {
        if (cancelled) return false;
        if (Date.now() - started > timeoutMs) return false;
        await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      }
      return true;
    }

    async function start() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");

        const found = await waitForElement(containerId.current);
        if (cancelled) return;
        if (!found) {
          throw new Error("Zone d'affichage caméra introuvable dans la page.");
        }

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
        if (!cancelled) setPhase("running");
      } catch (err: unknown) {
        if (cancelled) return;
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
            "Accès à la caméra refusé. Autorisez l'accès dans les réglages de votre navigateur, puis rechargez la page.";
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

    start();

    return () => {
      cancelled = true;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      // Raffinement d'UX seulement : jamais laisser une exception ici
      // faire planter toute la page.
    }
  }, [paused, phase]);

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-surface">
        {/* Toujours monté avec une vraie taille (jamais display:none) :
            html5-qrcode calcule la taille de la vidéo au moment de start(),
            et une zone cachée à cet instant reste ensuite invisible même
            une fois "affichée". */}
        <div id={containerId.current} className="h-full w-full" />

        {phase === "starting" && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface">
            <p className="text-sm text-muted">Activation de la caméra…</p>
          </div>
        )}
      </div>

      {phase === "error" && error && (
        <div className="mt-4 rounded-2xl border border-border bg-surface p-4 text-center">
          <p className="mb-3 text-sm text-danger">{error}</p>
        </div>
      )}
    </div>
  );
}
