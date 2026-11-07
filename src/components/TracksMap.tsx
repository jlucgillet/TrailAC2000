"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import "leaflet/dist/leaflet.css";
import { parseGpxPoints } from "@/lib/gpx";
import { GpxMap } from "@/components/GpxMap";
import { ElevationProfile } from "@/components/ElevationProfile";

export type MapTrack = {
  id: string;
  name: string;
  distanceKm: number | null;
  elevationGainM: number | null;
  gpxData: string | null;
};

export const TRACK_COLORS = [
  "#2563EB",
  "#DC2626",
  "#16A34A",
  "#D97706",
  "#9333EA",
  "#0891B2",
  "#DB2777",
  "#65A30D",
  "#EA580C",
  "#4F46E5",
];

const BASEMAPS = {
  standard: {
    label: "Standard",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  topo: {
    label: "Topographique",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; OpenStreetMap contributors, SRTM | &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
    maxZoom: 17,
  },
  satellite: {
    label: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
    maxZoom: 19,
  },
} as const;
type BasemapKey = keyof typeof BASEMAPS;

type LatLng = [number, number];

/** Réduit un tracé à ~maxPts points pour garder une carte fluide avec plusieurs parcours. */
function decimate(pts: LatLng[], maxPts = 500): LatLng[] {
  if (pts.length <= maxPts) return pts;
  const step = (pts.length - 1) / (maxPts - 1);
  const out: LatLng[] = [];
  for (let i = 0; i < maxPts; i++) out.push(pts[Math.round(i * step)]);
  return out;
}

/**
 * Carte regroupant plusieurs parcours. Les tracés sont liés à la liste :
 * survol d'une ligne de la liste → tracé mis en avant ; clic sur un tracé → sélection.
 */
export function TracksMap({
  tracks,
  colors,
  selectedId,
  hoveredId,
  onSelect,
  hrefBase = "/mon-espace/parcours",
}: {
  tracks: MapTrack[];
  /** id → couleur (stable, calculée sur la liste complète). */
  colors: Record<string, string>;
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string | null) => void;
  /** Début de l'URL de la fiche d'un parcours (suivi de l'id). */
  hrefBase?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const tileRef = useRef<import("leaflet").TileLayer | null>(null);
  const layersRef = useRef<
    Record<string, { line: import("leaflet").Polyline; casing: import("leaflet").Polyline }>
  >({});
  const groupRef = useRef<import("leaflet").FeatureGroup | null>(null);
  const markersRef = useRef<import("leaflet").LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const [ready, setReady] = useState(false);
  const [basemap, setBasemap] = useState<BasemapKey>("topo");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [popupId, setPopupId] = useState<string | null>(null);
  const popupIdRef = useRef<string | null>(null);
  popupIdRef.current = popupId;

  // Tracés décodés (une seule fois par parcours).
  const parsed = useMemo(() => {
    const out: Record<string, LatLng[]> = {};
    for (const t of tracks) {
      if (!t.gpxData) continue;
      const pts = parseGpxPoints(t.gpxData);
      if (pts.length > 1) out[t.id] = decimate(pts.map((p) => [p.lat, p.lon] as LatLng));
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks.map((t) => t.id + ":" + (t.gpxData?.length ?? 0)).join("|")]);

  const visibleKey = Object.keys(parsed).sort().join("|");

  // Création de la carte (une fois).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!containerRef.current) return;
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;
      leafletRef.current = L;
      const isTouch = window.matchMedia("(pointer: coarse)").matches;
      const map = L.map(containerRef.current, { zoomControl: !isTouch });
      mapRef.current = map;
      const b = BASEMAPS.topo;
      tileRef.current = L.tileLayer(b.url, { attribution: b.attribution, maxZoom: b.maxZoom }).addTo(map);
      map.setView([46.6, 2.5], 5);
      map.on("click", () => onSelectRef.current(null));
      setReady(true);
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        tileRef.current = null;
        layersRef.current = {};
        groupRef.current = null;
        markersRef.current = null;
      }
      setReady(false);
    };
  }, []);

  // Fond de carte.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;
    if (tileRef.current) map.removeLayer(tileRef.current);
    const b = BASEMAPS[basemap];
    tileRef.current = L.tileLayer(b.url, { attribution: b.attribution, maxZoom: b.maxZoom }).addTo(map);
  }, [basemap, ready]);

  // Dessin des tracés quand l'ensemble visible change.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;

    if (groupRef.current) map.removeLayer(groupRef.current);
    if (markersRef.current) map.removeLayer(markersRef.current);
    layersRef.current = {};

    const group = L.featureGroup();
    for (const id of Object.keys(parsed)) {
      const latlngs = parsed[id];
      const casing = L.polyline(latlngs, { color: "#FFFFFF", weight: 6, opacity: 0.9, interactive: false });
      const line = L.polyline(latlngs, { color: colors[id] ?? TRACK_COLORS[0], weight: 3.5, opacity: 0.95 });
      // Zone de clic élargie (utile au doigt).
      const hit = L.polyline(latlngs, { color: "#000", weight: 20, opacity: 0, className: "tracksmap-hit" });
      hit.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectRef.current(id);
      });
      group.addLayer(casing).addLayer(line).addLayer(hit);
      layersRef.current[id] = { line, casing };
    }
    group.addTo(map);
    groupRef.current = group;
    markersRef.current = L.layerGroup().addTo(map);

    if (Object.keys(parsed).length > 0) {
      map.fitBounds(group.getBounds(), { padding: [24, 24] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleKey, ready]);

  // Mise en avant (sélection / survol) + marqueurs départ/arrivée du tracé actif.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;
    const active = selectedId ?? hoveredId;
    for (const [id, layers] of Object.entries(layersRef.current)) {
      const isActive = id === active;
      const dim = active !== null && !isActive;
      layers.line.setStyle({
        weight: isActive ? 5.5 : 3.5,
        opacity: dim ? 0.35 : 0.95,
        color: colors[id] ?? TRACK_COLORS[0],
      });
      layers.casing.setStyle({ weight: isActive ? 8.5 : 6, opacity: dim ? 0.3 : 0.9 });
      if (isActive) {
        layers.casing.bringToFront();
        layers.line.bringToFront();
      }
    }
    const mk = markersRef.current;
    if (mk) {
      mk.clearLayers();
      const pts = active ? parsed[active] : null;
      if (pts) {
        const dot = (c: string) =>
          L.divIcon({
            className: "",
            iconSize: [16, 16],
            iconAnchor: [8, 8],
            html: `<div style="width:16px;height:16px;border-radius:9999px;background:${c};border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.5)"></div>`,
          });
        L.marker(pts[0], { icon: dot("#16A34A"), interactive: false }).addTo(mk);
        L.marker(pts[pts.length - 1], { icon: dot("#111827"), interactive: false }).addTo(mk);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, hoveredId, ready, visibleKey]);

  // Centre la carte sur le tracé sélectionné.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !selectedId) return;
    const layers = layersRef.current[selectedId];
    if (layers) map.fitBounds(layers.line.getBounds(), { padding: [40, 40], maxZoom: 15 });
  }, [selectedId, ready]);

  // Le popup n'existe qu'en plein écran.
  useEffect(() => {
    if (!fullscreen) setPopupId(null);
  }, [fullscreen]);

  // Plein écran : recalcul de la taille + Échap.
  useEffect(() => {
    const t = setTimeout(() => mapRef.current?.invalidateSize(), 60);
    if (!fullscreen) return () => clearTimeout(t);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (popupIdRef.current) setPopupId(null);
      else setFullscreen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [fullscreen]);

  const selected = tracks.find((t) => t.id === selectedId) ?? null;
  const btn = { background: "#FFFFFF", boxShadow: "0 1px 5px rgba(0,0,0,0.4)" } as const;

  return (
    <div
      className={
        fullscreen
          ? "fixed inset-0 z-[90] overflow-hidden bg-bg"
          : "relative h-80 w-full overflow-hidden rounded-xl border border-border sm:h-96"
      }
    >
      <div ref={containerRef} className="h-full w-full" />

      {Object.keys(parsed).length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-[500] flex items-center justify-center bg-bg/70 text-sm text-muted">
          Aucun tracé à afficher.
        </div>
      )}

      <div className="absolute right-3 top-3 z-[1000] flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={() => setFullscreen((v) => !v)}
          aria-pressed={fullscreen}
          aria-label={fullscreen ? "Quitter le plein écran" : "Plein écran"}
          title={fullscreen ? "Quitter le plein écran" : "Plein écran"}
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={btn}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden fill="none" stroke="#374151" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            {fullscreen ? (
              <path d="M9 4v5H4 M15 4v5h5 M9 20v-5H4 M15 20v-5h5" />
            ) : (
              <path d="M4 9V4h5 M20 9V4h-5 M4 15v5h5 M20 15v5h-5" />
            )}
          </svg>
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            aria-expanded={pickerOpen}
            aria-label="Changer le fond de carte"
            title="Changer le fond de carte"
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={btn}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden fill="none" stroke="#374151" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
              <path d="M12 3 L2.5 8.5 L12 14 L21.5 8.5 Z" />
              <path d="M2.5 12.5 L12 18 L21.5 12.5" />
              <path d="M2.5 16 L12 21.5 L21.5 16" />
            </svg>
          </button>
          {pickerOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-40 overflow-hidden rounded-lg"
              style={{ background: "#FFFFFF", boxShadow: "0 2px 8px rgba(0,0,0,0.35)" }}
            >
              {(Object.keys(BASEMAPS) as BasemapKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setBasemap(key);
                    setPickerOpen(false);
                  }}
                  className="block w-full px-3 py-2 text-left text-sm"
                  style={{
                    color: key === basemap ? "#15803D" : "#1F2937",
                    fontWeight: key === basemap ? 700 : 400,
                    background: key === basemap ? "#F0FDF4" : "#FFFFFF",
                  }}
                >
                  {BASEMAPS[key].label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selected && (
        <div
          className="absolute inset-x-3 bottom-3 z-[1000] flex items-center gap-3 rounded-xl p-3 sm:max-w-sm"
          style={{ background: "#FFFFFF", boxShadow: "0 2px 8px rgba(0,0,0,0.35)", color: "#111827" }}
        >
          <span
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ background: colors[selected.id] ?? TRACK_COLORS[0] }}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{selected.name}</p>
            <p className="text-xs" style={{ color: "#4B5563" }}>
              {selected.distanceKm != null ? `${selected.distanceKm.toFixed(1)} km` : "—"}
              {selected.elevationGainM != null ? ` · D+ ${Math.round(selected.elevationGainM)} m` : ""}
            </p>
          </div>
          {fullscreen ? (
            <button
              type="button"
              onClick={() => setPopupId(selected.id)}
              className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold"
              style={{ background: "#16A34A", color: "#FFFFFF" }}
            >
              Voir
            </button>
          ) : (
            <Link
              href={`${hrefBase}/${selected.id}`}
              className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold"
              style={{ background: "#16A34A", color: "#FFFFFF" }}
            >
              Voir
            </Link>
          )}
          <button
            type="button"
            onClick={() => onSelect(null)}
            aria-label="Désélectionner"
            className="shrink-0 text-lg leading-none"
            style={{ color: "#6B7280" }}
          >
            ×
          </button>
        </div>
      )}

      {fullscreen && popupId && (() => {
        const t = tracks.find((x) => x.id === popupId);
        return t ? (
          <TrackPopup track={t} href={`${hrefBase}/${t.id}`} onClose={() => setPopupId(null)} />
        ) : null;
      })()}
    </div>
  );
}

/** Fiche d'un parcours en popup par-dessus la carte plein écran. */
function TrackPopup({
  track,
  href,
  onClose,
}: {
  track: MapTrack;
  href: string;
  onClose: () => void;
}) {
  const points = useMemo(() => (track.gpxData ? parseGpxPoints(track.gpxData) : []), [track.gpxData]);
  const mapPoints = useMemo(
    () => points.map((p) => ({ lat: p.lat, lon: p.lon, ele: p.ele })),
    [points]
  );
  const [cursor, setCursor] = useState<{ lat: number; lon: number } | null>(null);

  return (
    <div
      className="absolute inset-0 z-[1200] flex flex-col bg-bg"
      role="dialog"
      aria-modal="true"
      aria-label={`Fiche du parcours ${track.name}`}
    >
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-ink hover:border-ink"
        >
          ← Retour à la carte
        </button>
        <h2 className="min-w-0 flex-1 truncate font-display text-lg font-semibold">{track.name}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="shrink-0 text-2xl leading-none text-muted hover:text-ink"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="text-sm text-muted">Distance</p>
              <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
                {track.distanceKm != null ? `${track.distanceKm.toFixed(1)} km` : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="text-sm text-muted">Dénivelé positif</p>
              <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
                {track.elevationGainM != null ? `${Math.round(track.elevationGainM)} m` : "—"}
              </p>
            </div>
          </div>

          {mapPoints.length > 1 ? (
            <>
              <GpxMap points={mapPoints} basemapControl cursor={cursor} />
              <ElevationProfile points={points} onHoverPoint={setCursor} />
            </>
          ) : (
            <p className="text-muted">Aucun tracé disponible pour ce parcours.</p>
          )}

          <Link
            href={href}
            className="w-fit rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg"
          >
            Ouvrir la fiche complète
          </Link>
          <p className="text-xs text-muted">
            La fiche complète permet aussi de suivre le parcours avec le GPS et de télécharger le
            fichier GPX.
          </p>
        </div>
      </div>
    </div>
  );
}
