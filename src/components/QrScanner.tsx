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
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) => setLog((prev) => [...prev, msg]);

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
      addLog(`Élément cible : #${containerId.current}`);
      addLog(`Protocole : ${typeof window !== "undefined" ? window.location.protocol : "?"}`);

      try {
        addLog("Chargement de html5-qrcode…");
        const mod = await import("html5-qrcode");
        addLog("Bibliothèque chargée.");
        const { Html5Qrcode } = mod;

        addLog("Recherche de l'élément dans le DOM…");
        const found = await waitForElement(containerId.current);
        addLog(found ? "Élément trouvé." : "Élément INTROUVABLE après 4s.");

        if (cancelled) return;
        if (!found) {
          throw new Error("Zone d'affichage caméra introuvable dans la page.");
        }

        addLog("Instanciation de Html5Qrcode…");
        const scanner = new Html5Qrcode(containerId.current);
        scannerRef.current = scanner;
        addLog("Instance créée. Appel de start()…");

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 240 },
          (decodedText) => {
            onDecodedRef.current(decodedText);
          },
          () => {
            // Erreurs de décodage image par image : ignorées volontairement.
          }
        );
        addLog("start() résolu avec succès — caméra active.");
        if (!cancelled) setPhase("running");
      } catch (err: unknown) {
        if (cancelled) return;
        setPhase("error");

        let name = "";
        let message = "";
        if (err instanceof Error) {
          name = err.name;
          message = err.message;
          addLog(`ERREUR — name: ${err.name}`);
          addLog(`ERREUR — message: ${err.message}`);
          if (err.stack) addLog(`stack (début) : ${err.stack.slice(0, 300)}`);
        } else if (typeof err === "string") {
          message = err;
          addLog(`ERREUR (string) : ${err}`);
        } else {
          message = JSON.stringify(err);
          addLog(`ERREUR (autre) : ${message}`);
        }

        let friendly: string;
        if (name === "NotAllowedError") {
          friendly = "Accès à la caméra refusé.";
        } else if (name === "NotFoundError" || name === "OverconstrainedError") {
          friendly = "Aucune caméra arrière détectée.";
        } else if (typeof window !== "undefined" && window.location.protocol !== "https:") {
          friendly = "Connexion non sécurisée (https requis).";
        } else {
          friendly = "Impossible d'activer la caméra.";
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
          .catch(() => {});
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
      // best-effort
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

      {/* Journal de diagnostic visible directement sur l'écran, en attendant
          de confirmer la cause exacte du problème d'activation caméra. */}
      <div className="mt-4 rounded-lg border border-border bg-bg p-3">
        <p className="mb-1 text-xs font-semibold text-muted">Journal de diagnostic :</p>
        <div className="max-h-48 overflow-y-auto font-mono text-[10px] leading-relaxed text-muted">
          {log.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
