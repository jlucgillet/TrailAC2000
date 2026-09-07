"use client";

import { useEffect, useRef, useState } from "react";
import { formatDurationMs } from "@/lib/time";

type RunState =
  | { status: "loading" }
  | { status: "not_started" }
  | { status: "running"; startTimestamp: string }
  | { status: "finished"; durationMs: number }
  | { status: "error"; message: string };

export function Chrono({ raceId }: { raceId: string }) {
  const [state, setState] = useState<RunState>({ status: "loading" });
  const [displayMs, setDisplayMs] = useState(0);
  // Décalage (offset) entre l'horloge du téléphone et l'horloge serveur,
  // recalculé à chaque poll. Le chrono affiché = Date.now() + offset - start.
  const clockOffsetRef = useRef(0);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/participant/status", { cache: "no-store" });
        if (!res.ok) {
          if (res.status === 401) {
            window.location.href = `/course/${raceId}`;
            return;
          }
          throw new Error("status_error");
        }
        const data = await res.json();
        if (cancelled) return;

        setOffline(false);
        const serverNow = new Date(data.serverNow).getTime();
        clockOffsetRef.current = serverNow - Date.now();

        if (!data.run || data.run.status === "registered") {
          setState({ status: "not_started" });
        } else if (data.run.status === "running") {
          setState({ status: "running", startTimestamp: data.run.startTimestamp });
        } else if (data.run.status === "finished") {
          setState({ status: "finished", durationMs: data.run.durationMs ?? 0 });
        }
      } catch {
        if (!cancelled) setOffline(true);
      }
    }

    poll();
    const interval = setInterval(poll, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [raceId]);

  useEffect(() => {
    if (state.status !== "running") return;
    const start = new Date(state.startTimestamp).getTime();

    const tick = () => {
      const correctedNow = Date.now() + clockOffsetRef.current;
      setDisplayMs(Math.max(0, correctedNow - start));
    };

    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [state]);

  if (state.status === "loading") {
    return <p className="text-center text-muted">Chargement…</p>;
  }

  if (state.status === "not_started") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <p className="mb-4 text-sm uppercase tracking-wide text-muted">Prêt·e ?</p>
        <h1 className="mb-6 font-display text-4xl font-semibold">
          Scannez le QR code<br />DÉPART
        </h1>
        <p className="text-muted">Votre chronomètre démarrera automatiquement au scan.</p>
        {offline && <ConnectionWarning />}
      </div>
    );
  }

  if (state.status === "running") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <p className="mb-3 rounded-full bg-amber/15 px-4 py-1 text-sm font-medium text-amber">
          COURSE EN COURS
        </p>
        <div className="chrono-digits text-7xl font-semibold text-accent sm:text-8xl">
          {formatDurationMs(displayMs)}
        </div>
        <p className="mt-8 max-w-xs text-muted">
          À l&rsquo;arrivée, scannez le QR code <strong className="text-ink">ARRIVÉE</strong>.
        </p>
        {offline && <ConnectionWarning />}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="mb-3 rounded-full bg-accent/15 px-4 py-1 text-sm font-medium text-accent">
        COURSE TERMINÉE
      </p>
      <p className="mb-2 text-muted">Votre temps</p>
      <div className="chrono-digits text-7xl font-semibold text-ink sm:text-8xl">
        {formatDurationMs(state.durationMs)}
      </div>
      <p className="mt-8 text-2xl font-display">Bravo !</p>
    </div>
  );
}

function ConnectionWarning() {
  return (
    <p className="mt-6 rounded-lg bg-danger/10 px-4 py-2 text-sm text-danger">
      Connexion instable — les données affichées peuvent être en retard. Ne fermez pas cette page.
    </p>
  );
}
