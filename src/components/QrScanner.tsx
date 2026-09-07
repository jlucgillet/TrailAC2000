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
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // onDecoded change à chaque rendu du parent, mais le scanner ne démarre
  // qu'une seule fois (voir l'effet ci-dessous, à dépendances vides) : on
  // passe donc par une ref toujours à jour pour éviter d'appeler une
  // version figée (et donc un état "loading"/"result" obsolète) du callback.
  const onDecodedRef = useRef(onDecoded);
  onDecodedRef.current = onDecoded;

  useEffect(() => {
    let cancelled = false;

    async function start() {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelled) return;

      const scanner = new Html5Qrcode(containerId.current);
      scannerRef.current = scanner;

      try {
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
        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) {
          setError(
            "Impossible d'accéder à la caméra. Vérifiez que vous avez autorisé l'accès, ou utilisez le scan classique via l'appareil photo natif."
          );
        }
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
    if (!scanner || !ready) return;
    if (paused) {
      scanner.pause(true);
    } else {
      scanner.resume();
    }
  }, [paused, ready]);

  return (
    <div className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-surface">
      <div id={containerId.current} className="w-full" />
      {error && <p className="p-4 text-center text-sm text-danger">{error}</p>}
    </div>
  );
}
