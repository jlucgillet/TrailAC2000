"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Facing = "user" | "environment";

/**
 * Fenêtre « Prendre une photo » : aperçu caméra en direct, capture carrée,
 * « Reprendre » / « Utiliser cette photo ». Renvoie un File JPEG que le
 * composant parent traite comme n'importe quelle photo choisie dans la galerie.
 */
export function PhotoCapture({
  onCapture,
  onClose,
}: {
  onCapture: (file: File) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<Facing>("user");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shot, setShot] = useState<{ blob: Blob; url: string } | null>(null);
  const fallbackRef = useRef<HTMLInputElement>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (shot) return; // pas de flux pendant la prévisualisation
    let cancelled = false;
    setReady(false);
    setError(null);
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 1280 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        stop();
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          await v.play().catch(() => {});
        }
        setReady(true);
      } catch (e) {
        if (cancelled) return;
        const name = e instanceof Error ? e.name : "";
        setError(
          name === "NotAllowedError" || name === "SecurityError"
            ? "L’accès à la caméra est refusé. Autorise-le dans les réglages du navigateur, ou utilise l’appareil photo du téléphone ci-dessous."
            : "Caméra indisponible sur cet appareil. Utilise l’appareil photo du téléphone ci-dessous."
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [facing, shot, stop]);

  useEffect(() => () => stop(), [stop]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => () => {
    if (shot) URL.revokeObjectURL(shot.url);
  }, [shot]);

  function snap() {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const side = Math.min(v.videoWidth, v.videoHeight);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = Math.min(side, 1024);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(v, (v.videoWidth - side) / 2, (v.videoHeight - side) / 2, side, side, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return setError("Échec de la capture.");
        stop();
        setShot({ blob, url: URL.createObjectURL(blob) });
      },
      "image/jpeg",
      0.9
    );
  }

  function useShot() {
    if (!shot) return;
    onCapture(new File([shot.blob], "photo.jpg", { type: "image/jpeg" }));
  }

  const mirror = facing === "user";
  const btn = "rounded-lg border border-border px-4 py-2 text-sm text-ink";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Prendre une photo"
    >
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-border bg-surface p-4">
        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-black">
          {shot ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={shot.url}
              alt="Aperçu de la photo"
              className="h-full w-full object-cover"
              style={mirror ? { transform: "scaleX(-1)" } : undefined}
            />
          ) : (
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="h-full w-full object-cover"
              style={mirror ? { transform: "scaleX(-1)" } : undefined}
            />
          )}
          {!shot && !ready && !error && (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-white/80">
              Démarrage de la caméra…
            </p>
          )}
        </div>

        {error && <p role="alert" className="text-sm text-danger">{error}</p>}

        <div className="flex flex-wrap items-center justify-center gap-2">
          {shot ? (
            <>
              <button type="button" className={btn} onClick={() => setShot(null)}>
                Reprendre
              </button>
              <button type="button" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg" onClick={useShot}>
                Utiliser cette photo
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg disabled:opacity-50"
                disabled={!ready}
                onClick={snap}
              >
                📷 Prendre la photo
              </button>
              <button
                type="button"
                className={btn}
                onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
                aria-label="Changer de caméra"
              >
                🔄
              </button>
            </>
          )}
          <button type="button" className={btn} onClick={onClose}>
            Annuler
          </button>
        </div>

        {error && (
          <>
            <button type="button" className={btn} onClick={() => fallbackRef.current?.click()}>
              Ouvrir l&rsquo;appareil photo du téléphone
            </button>
            <input
              ref={fallbackRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) onCapture(f);
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
