"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

/**
 * Carte du tracé GPX (Leaflet + fond OpenStreetMap).
 *
 * - `large` : carte plus haute (usage admin).
 * - `fullscreenControl` : ajoute un bouton pour passer la carte en plein
 *   écran. Le plein écran est simulé en CSS (carte fixée sur tout
 *   l'écran) plutôt que via l'API Fullscreen du navigateur, non
 *   disponible sur iPhone. Échap permet de quitter.
 */
export function GpxMap({
  points,
  large = false,
  fullscreenControl = false,
}: {
  points: { lat: number; lon: number }[];
  large?: boolean;
  fullscreenControl?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  // Clé stable : évite de recréer la carte à chaque rendu du parent
  // (le tableau `points` est reconstruit à chaque rendu).
  const pointsKey = `${points.length}:${points
    .reduce((sum, p) => sum + p.lat + p.lon, 0)
    .toFixed(6)}`;

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!containerRef.current || points.length < 2) return;
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const latlngs: [number, number][] = points.map((p) => [p.lat, p.lon]);
      const polyline = L.polyline(latlngs, { color: "#3B82F6", weight: 4 }).addTo(map);
      map.fitBounds(polyline.getBounds(), { padding: [24, 24] });

      // Marqueurs vectoriels (pas L.marker) : évite le problème classique
      // des icônes par défaut de Leaflet cassées par les bundlers.
      L.circleMarker(latlngs[0], {
        radius: 8,
        color: "#0B1410",
        weight: 2,
        fillColor: "#3B82F6",
        fillOpacity: 1,
      })
        .addTo(map)
        .bindTooltip("Départ");

      L.circleMarker(latlngs[latlngs.length - 1], {
        radius: 8,
        color: "#0B1410",
        weight: 2,
        fillColor: "#E5484D",
        fillOpacity: 1,
      })
        .addTo(map)
        .bindTooltip("Arrivée");
    }

    init();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointsKey]);

  // Le conteneur change de taille en entrant/sortant du plein écran :
  // Leaflet doit recalculer ses dimensions et recentrer le tracé.
  useEffect(() => {
    const t = setTimeout(() => mapRef.current?.invalidateSize(), 60);
    return () => clearTimeout(t);
  }, [fullscreen]);

  // Plein écran : Échap pour quitter, et pas de défilement de la page derrière.
  useEffect(() => {
    if (!fullscreen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setFullscreen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [fullscreen]);

  if (points.length < 2) {
    return <p className="text-muted">Aucune trace à afficher.</p>;
  }

  const normalHeight = large ? "h-[70vh] min-h-[440px]" : "h-96";

  return (
    <div className={fullscreen ? "fixed inset-0 z-[90] bg-bg" : "relative"}>
      <div
        ref={containerRef}
        className={
          fullscreen
            ? "h-full w-full"
            : `${normalHeight} w-full rounded-xl border border-border`
        }
      />
      {fullscreenControl && (
        <button
          type="button"
          onClick={() => setFullscreen((v) => !v)}
          aria-pressed={fullscreen}
          className="absolute right-3 top-3 z-[1000] flex items-center gap-1.5 rounded-lg border border-border bg-bg/90 px-3 py-2 text-sm font-semibold text-ink shadow-md backdrop-blur-sm hover:border-ink"
        >
          <span aria-hidden>{fullscreen ? "✕" : "⛶"}</span>
          {fullscreen ? "Quitter le plein écran" : "Plein écran"}
        </button>
      )}
    </div>
  );
}
