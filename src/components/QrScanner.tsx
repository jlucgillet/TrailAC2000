"use client";

import { useEffect, useId, useRef } from "react";

/**
 * Scanner caméra (html5-qrcode). Le cadre de visée affiché à l'écran est
 * calculé et dessiné par la bibliothèque elle-même à partir des dimensions
 * réelles du flux vidéo (callback qrbox dynamique), plutôt qu'un calque
 * positionné "à la main" en CSS par-dessus la vidéo — ce qui évite tout
 * décalage entre le cadre visible et la zone réellement analysée.
 *
 * Le conteneur reste toujours monté et visible (jamais display:none),
 * sinon la bibliothèque calcule une taille de vidéo incorrecte au
 * démarrage. useId() (pas Math.random()) pour un id stable entre le rendu
 * serveur et client.
 */
export function QrScanner({
  onDecoded,
  paused = false,
}: {
  onDecoded: (decodedText: string) => void;
  paused?: boolean;
}) {
  const elementId = `qr-scanner-${useId().replace(/[:]/g, "")}`;
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const onDecodedRef = useRef(onDecoded);
  onDecodedRef.current = onDecoded;

  useEffect(() => {
    let cancelled = false;

    async function start() {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelled) return;

      const scanner = new Html5Qrcode(elementId, { verbose: false });
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            // Cadre carré, calculé par la bibliothèque à partir de la
            // taille réelle du flux vidéo affiché — toujours centré et
            // juste à l'échelle, quelle que soit la taille d'écran.
            qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
              const size = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.7);
              return { width: size, height: size };
            },
            aspectRatio: 1,
          },
          (decodedText) => {
            onDecodedRef.current(decodedText);
          },
          () => {
            // Échecs de décodage image par image : normal et très
            // fréquent tant que le QR code n'est pas visé, on les ignore.
          }
        );
      } catch (err) {
        console.error("Impossible de démarrer la caméra :", err);
      }
    }

    start();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) {
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => {
            // La caméra a parfois déjà été arrêtée (changement rapide de
            // page) : rien à faire de plus dans ce cas.
          });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elementId]);

  useEffect(() => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      if (paused) {
        scanner.pause(true);
      } else {
        scanner.resume();
      }
    } catch {
      // resume()/pause() peuvent échouer si la caméra n'a pas encore fini
      // de démarrer — sans conséquence, l'état se resynchronise au rendu suivant.
    }
  }, [paused]);

  return (
    <div className="mx-auto w-full max-w-sm overflow-hidden rounded-xl border border-border bg-bg">
      <div id={elementId} className="w-full" />
    </div>
  );
}
