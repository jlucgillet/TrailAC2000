"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

type MapPoint = { lat: number; lon: number; ele?: number | null };

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

function haversineMeters(a: MapPoint, b: MapPoint): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Lisse l'altitude (moyenne glissante) pour atténuer le bruit de mesure GPS avant de calculer la pente. */
function smoothElevations(points: MapPoint[], windowSize = 5): (number | null)[] {
  const half = Math.floor(windowSize / 2);
  return points.map((_, i) => {
    const slice = points
      .slice(Math.max(0, i - half), Math.min(points.length, i + half + 1))
      .map((p) => p.ele)
      .filter((e): e is number => e !== null && e !== undefined);
    if (slice.length === 0) return null;
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

/** Rouge (montée) / vert (descente), plus foncé et saturé quand la pente est plus forte. */
function gradeToColor(gradePercent: number): string {
  const g = Math.abs(gradePercent);
  if (g < 1.5) return "#9CA3AF"; // quasi plat : gris neutre
  const uphill = gradePercent > 0;
  if (g < 4) return uphill ? "#FCA5A5" : "#86EFAC";
  if (g < 8) return uphill ? "#F87171" : "#4ADE80";
  if (g < 14) return uphill ? "#DC2626" : "#16A34A";
  return uphill ? "#7F1D1D" : "#14532D";
}

/** Place une petite pastille numérotée tous les kilomètres le long du tracé. */
function addKmMarkers(
  L: typeof import("leaflet"),
  map: import("leaflet").Map,
  points: MapPoint[]
) {
  let cumulativeMeters = 0;
  let nextKm = 1;

  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const segmentMeters = haversineMeters(a, b);
    const segmentStart = cumulativeMeters;
    const segmentEnd = cumulativeMeters + segmentMeters;

    while (nextKm * 1000 <= segmentEnd && segmentMeters > 0) {
      const t = (nextKm * 1000 - segmentStart) / segmentMeters;
      const lat = a.lat + (b.lat - a.lat) * t;
      const lon = a.lon + (b.lon - a.lon) * t;

      const icon = L.divIcon({
        className: "",
        html: `<div style="background:#0B1410;color:#F5F7F3;border:2px solid #FFFFFF;border-radius:9999px;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;font-family:system-ui,sans-serif;box-shadow:0 1px 3px rgba(0,0,0,0.5);transform:rotate(var(--unrot,0deg));transition:transform .4s linear;">${nextKm}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      L.marker([lat, lon], { icon }).addTo(map).bindTooltip(`${nextKm} km`);

      nextKm += 1;
    }

    cumulativeMeters = segmentEnd;
  }
}

/** Cap (0-360°, 0 = nord) du point a vers le point b. */
function bearingDeg(a: MapPoint, b: MapPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const y = Math.sin(toRad(b.lon - a.lon)) * Math.cos(toRad(b.lat));
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lon - a.lon));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function angleDiff(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

type TrackIndex = { cumul: number[]; total: number };

function buildTrackIndex(points: MapPoint[]): TrackIndex {
  const cumul = [0];
  for (let i = 1; i < points.length; i++) {
    cumul.push(cumul[i - 1] + haversineMeters(points[i - 1], points[i]));
  }
  return { cumul, total: cumul[cumul.length - 1] };
}

/**
 * Projette une position GPS sur le tracé. Renvoie la distance parcourue le
 * long du tracé et l'écart (en mètres) avec le tracé. `hintMeters` (dernière
 * position connue) départage les passages multiples (aller-retour, boucle).
 */
function projectOnTrack(
  points: MapPoint[],
  index: TrackIndex,
  lat: number,
  lon: number,
  hintMeters: number | null,
  windowMeters = 500
): { along: number; offTrack: number; bearing: number } {
  const mPerDegLat = 111320;
  const mPerDegLon = 111320 * Math.cos((lat * Math.PI) / 180);
  const candidates: { along: number; dist: number; bearing: number }[] = [];
  let best = Infinity;

  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const ax = (a.lon - lon) * mPerDegLon;
    const ay = (a.lat - lat) * mPerDegLat;
    const bx = (b.lon - lon) * mPerDegLon;
    const by = (b.lat - lat) * mPerDegLat;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let t = len2 > 0 ? -(ax * dx + ay * dy) / len2 : 0;
    t = Math.max(0, Math.min(1, t));
    const px = ax + t * dx;
    const py = ay + t * dy;
    const dist = Math.sqrt(px * px + py * py);
    const along = index.cumul[i - 1] + t * (index.cumul[i] - index.cumul[i - 1]);
    candidates.push({ along, dist, bearing: bearingDeg(a, b) });
    if (dist < best) best = dist;
  }

  // Référence de progression : dernière position connue, ou le départ au
  // premier relevé (on suppose qu'on démarre au début du parcours).
  const ref = hintMeters ?? 0;

  // On privilégie les points du tracé « plausibles » (près de la référence),
  // sauf s'ils sont nettement plus loin de nous qu'un autre passage du tracé.
  const inWindow = candidates.filter((c) => Math.abs(c.along - ref) <= windowMeters);
  const bestInWindow = inWindow.reduce((m, c) => Math.min(m, c.dist), Infinity);
  const pool = inWindow.length > 0 && bestInWindow <= best + 40 ? inWindow : candidates;
  const poolBest = pool.reduce((m, c) => Math.min(m, c.dist), Infinity);

  // Parmi les points quasi aussi proches que le meilleur, on garde celui le
  // plus proche de la référence (boucles, allers-retours, passages multiples).
  const tolerance = poolBest + 25;
  let chosen = { along: 0, dist: poolBest, bearing: 0 };
  let chosenGap = Infinity;
  for (const c of pool) {
    if (c.dist > tolerance) continue;
    const gap = Math.abs(c.along - ref);
    if (gap < chosenGap) {
      chosenGap = gap;
      chosen = c;
    }
  }
  return { along: chosen.along, offTrack: chosen.dist, bearing: chosen.bearing };
}

function formatKm(meters: number): string {
  return `${(meters / 1000).toFixed(2).replace(".", ",")} km`;
}

const OFF_TRACK_ALERT_M = 30;
const FAR_FROM_TRACK_M = 150;
const WEAK_ACCURACY_M = 60;

/** Notification système (visible aussi écran verrouillé sur Android). */
async function showOffTrackNotification(message: string) {
  try {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const options = { body: message, tag: "off-track", renotify: true, vibrate: [300, 150, 300] };
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification("Trail AC2000", options as NotificationOptions);
        return;
      }
    }
    new Notification("Trail AC2000", options as NotificationOptions);
  } catch {
    /* pas critique */
  }
}

type GpsStatus = "off" | "starting" | "on" | "error";
type GpsInfo = {
  along: number;
  remaining: number;
  offTrack: number;
  accuracy: number;
  direction: "ok" | "reverse" | null;
  weak: boolean;
};

/** Pastille bleue à l'arrêt, flèche orientée dans le sens du déplacement en mouvement. */
function positionIconHtml(heading: number | null): string {
  if (heading == null) {
    return '<div style="width:20px;height:20px;border-radius:9999px;background:#2563EB;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.5);"></div>';
  }
  return `<div style="width:34px;height:34px;transform:rotate(${Math.round(heading)}deg);filter:drop-shadow(0 1px 3px rgba(0,0,0,0.55));"><svg viewBox="0 0 34 34" width="34" height="34"><path d="M17 3 L28 29 L17 23 L6 29 Z" fill="#2563EB" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/></svg></div>`;
}

/**
 * Carte du tracé GPX (Leaflet). Le tracé est coloré par tronçons selon la
 * pente (rouge = montée, vert = descente, nuances selon l'intensité) quand
 * l'altitude est disponible ; sinon, une seule couleur neutre.
 *
 * - `large` : carte plus haute (usage admin).
 * - `fullscreenControl` : bouton plein écran (simulé en CSS, fonctionne
 *   aussi sur iPhone).
 * - `basemapControl` : bouton pour changer le fond de carte.
 * - `gpsControl` : suivi GPS en direct (position, suivi de la carte,
 *   distance parcourue / restante le long du tracé).
 */
export function GpxMap({
  points,
  large = false,
  fullscreenControl = false,
  basemapControl = false,
  gpsControl = false,
}: {
  points: MapPoint[];
  large?: boolean;
  fullscreenControl?: boolean;
  basemapControl?: boolean;
  gpsControl?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const tileLayerRef = useRef<import("leaflet").TileLayer | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [basemap, setBasemap] = useState<BasemapKey>("topo");
  const [pickerOpen, setPickerOpen] = useState(false);

  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("off");
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsInfo, setGpsInfo] = useState<GpsInfo | null>(null);
  const [gpsActive, setGpsActive] = useState(false);
  const gpsActiveRef = useRef(false);
  const [alertsOn, setAlertsOn] = useState(true);
  const alertsOnRef = useRef(true);
  alertsOnRef.current = alertsOn;
  const audioCtxRef = useRef<AudioContext | null>(null);
  const offCountRef = useRef(0);
  const lastAlertRef = useRef(0);
  const wasOffRef = useRef(false);
  const lastFixTimeRef = useRef<number | null>(null);
  const lastInfoRef = useRef<GpsInfo | null>(null);
  gpsActiveRef.current = gpsActive;
  const trackLayersRef = useRef<import("leaflet").Polyline[]>([]);
  const redLayersRef = useRef<import("leaflet").Polyline[]>([]);
  const [follow, setFollow] = useState(true);
  const followRef = useRef(true);
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  const prevPosRef = useRef<MapPoint | null>(null);
  const headingRef = useRef<number | null>(null);
  const accuracyRef = useRef<import("leaflet").Circle | null>(null);
  const lastAlongRef = useRef<number | null>(null);
  const firstFixRef = useRef(true);
  const [orientation, setOrientation] = useState<"north" | "heading">("north");
  const orientationRef = useRef<"north" | "heading">("north");
  orientationRef.current = orientation;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const rotRef = useRef(0);
  const [compassRot, setCompassRot] = useState(0);

  const trackIndex = useMemo(() => buildTrackIndex(points), [points]);

  const pointsKey = `${points.length}:${points
    .reduce((sum, p) => sum + p.lat + p.lon, 0)
    .toFixed(6)}`;

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!containerRef.current || points.length < 2) return;
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;
      leafletRef.current = L;

      // Sur mobile (écran tactile), le pincement suffit : pas de boutons + / −.
      const isTouch =
        typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
      const map = L.map(containerRef.current, { zoomControl: !isTouch });
      mapRef.current = map;

      const base = BASEMAPS[basemap];
      tileLayerRef.current = L.tileLayer(base.url, {
        attribution: base.attribution,
        maxZoom: base.maxZoom,
      }).addTo(map);

      const latlngs: [number, number][] = points.map((p) => [p.lat, p.lon]);
      const bounds = L.latLngBounds(latlngs);

      const smoothed = smoothElevations(points);
      const hasElevation = smoothed.some((e) => e !== null);

      const slopeLayers: import("leaflet").Polyline[] = [];
      if (hasElevation) {
        for (let i = 1; i < points.length; i++) {
          const a = points[i - 1];
          const b = points[i];
          const eleA = smoothed[i - 1];
          const eleB = smoothed[i];
          const distance = haversineMeters(a, b);
          const grade =
            eleA !== null && eleB !== null && distance > 0.5
              ? ((eleB - eleA) / distance) * 100
              : 0;
          slopeLayers.push(
            L.polyline(
              [
                [a.lat, a.lon],
                [b.lat, b.lon],
              ],
              { color: gradeToColor(grade), weight: 5 }
            ).addTo(map)
          );
        }
      } else {
        slopeLayers.push(L.polyline(latlngs, { color: "#3B82F6", weight: 4 }).addTo(map));
      }
      trackLayersRef.current = slopeLayers;
      // Tracé « théorique » du mode suivi GPS : rouge uni, avec liseré blanc.
      redLayersRef.current = [
        L.polyline(latlngs, { color: "#FFFFFF", weight: 9, opacity: 0.9 }),
        L.polyline(latlngs, { color: "#DC2626", weight: 5 }),
      ];

      addKmMarkers(L, map, points);

      map.fitBounds(bounds, { padding: [24, 24] });
      applyTrackStyle();

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
        tileLayerRef.current = null;
        markerRef.current = null;
        accuracyRef.current = null;
        trackLayersRef.current = [];
        redLayersRef.current = [];
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointsKey]);

  // Changement de fond de carte : on retire l'ancien calque, on ajoute le nouveau.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    const def = BASEMAPS[basemap];
    tileLayerRef.current = L.tileLayer(def.url, {
      attribution: def.attribution,
      maxZoom: def.maxZoom,
    }).addTo(map);
    tileLayerRef.current.bringToBack();
  }, [basemap]);

  /** Bips (WebAudio) : 3 bips aigus pour l'alerte, 1 bip grave pour le retour sur le tracé. */
  function beep(kind: "alert" | "back") {
    try {
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      const count = kind === "alert" ? 3 : 1;
      const freq = kind === "alert" ? 960 : 520;
      for (let i = 0; i < count; i++) {
        const t0 = ctx.currentTime + i * 0.3;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(0.4, t0 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + 0.25);
      }
    } catch {
      /* pas critique */
    }
  }

  function triggerOffTrackAlert(distance: number) {
    beep("alert");
    try {
      navigator.vibrate?.([400, 200, 400, 200, 400]);
    } catch {
      /* iOS : pas de vibration */
    }
    showOffTrackNotification(`Tu t'éloignes du tracé : ${Math.round(distance)} m. Fais demi-tour !`);
  }

  function handleOffTrack(offTrack: number, accuracy: number) {
    // Position trop imprécise : on ne déclenche rien (faux positifs).
    if (accuracy > 50) return;
    if (offTrack > OFF_TRACK_ALERT_M) {
      offCountRef.current += 1;
      // Deux mesures consécutives hors tracé avant d'alerter.
      if (offCountRef.current >= 2) {
        // Une seule alerte par sortie de tracé ; elle se réarme au retour sur le tracé.
        if (alertsOnRef.current && lastAlertRef.current === 0) {
          lastAlertRef.current = Date.now();
          triggerOffTrackAlert(offTrack);
        }
        wasOffRef.current = true;
      }
    } else {
      offCountRef.current = 0;
      if (wasOffRef.current) {
        wasOffRef.current = false;
        lastAlertRef.current = 0;
        if (alertsOnRef.current) {
          beep("back");
          try {
            navigator.vibrate?.(150);
          } catch {
            /* ignore */
          }
        }
        try {
          navigator.serviceWorker
            ?.getRegistration()
            .then((r) =>
              r?.getNotifications({ tag: "off-track" }).then((ns) => ns.forEach((n) => n.close()))
            )
            .catch(() => {});
        } catch {
          /* ignore */
        }
      }
    }
  }

  /**
   * Orientation « direction en haut » : Leaflet ne sait pas tourner la carte,
   * on fait donc pivoter son conteneur (agrandi pour couvrir les coins). Les
   * pastilles de km sont contre-pivotées pour rester lisibles.
   */
  function applyLayout() {
    const el = containerRef.current;
    const wrap = wrapperRef.current;
    const map = mapRef.current;
    if (!el || !wrap) return;
    const rotated = orientationRef.current === "heading";
    if (rotated) {
      const W = wrap.clientWidth;
      const H = wrap.clientHeight;
      const D = Math.ceil(Math.hypot(W, H));
      Object.assign(el.style, {
        position: "absolute",
        width: `${D}px`,
        height: `${D}px`,
        left: `${(W - D) / 2}px`,
        top: `${(H - D) / 2}px`,
        transform: `rotate(${rotRef.current}deg)`,
        transition: "transform 0.4s linear",
      });
      el.style.setProperty("--unrot", `${-rotRef.current}deg`);
      setCompassRot(rotRef.current);
      wrap.style.touchAction = "none";
    } else {
      rotRef.current = 0;
      Object.assign(el.style, {
        position: "relative",
        width: "",
        height: "",
        left: "",
        top: "",
        transform: "",
        transition: "",
      });
      el.style.removeProperty("--unrot");
      setCompassRot(0);
      wrap.style.touchAction = "";
    }
    const controls = el.querySelector<HTMLElement>(".leaflet-control-container");
    if (controls) controls.style.display = rotated ? "none" : "";
    if (map) {
      if (rotated) {
        map.dragging.disable();
        map.options.touchZoom = "center";
        map.options.scrollWheelZoom = "center";
        map.options.doubleClickZoom = "center";
      } else {
        map.dragging.enable();
        map.options.touchZoom = true;
        map.options.scrollWheelZoom = true;
        map.options.doubleClickZoom = true;
      }
      map.invalidateSize();
    }
  }

  /** Fait pivoter la carte pour que `heading` (direction de marche) soit en haut. */
  function setMapRotation(heading: number) {
    const el = containerRef.current;
    if (!el || orientationRef.current !== "heading") return;
    const cur = rotRef.current;
    // Chemin le plus court (évite un tour complet quand on passe de 359° à 1°).
    const diff = ((((-heading - cur) % 360) + 540) % 360) - 180;
    if (Math.abs(diff) < 4) return;
    const next = cur + diff;
    rotRef.current = next;
    el.style.transform = `rotate(${next}deg)`;
    el.style.setProperty("--unrot", `${-next}deg`);
    setCompassRot(next);
  }

  // Mode suivi GPS : tracé rouge uni ; sinon, tracé nuancé selon la pente.
  function applyTrackStyle() {
    const map = mapRef.current;
    if (!map) return;
    try {
    const red = gpsActiveRef.current;
    trackLayersRef.current.forEach((l) => (red ? map.removeLayer(l) : l.addTo(map)));
    redLayersRef.current.forEach((l) => (red ? l.addTo(map) : map.removeLayer(l)));
    } catch {
      /* ne doit jamais empêcher l'affichage de la carte */
    }
  }

  useEffect(() => {
    applyTrackStyle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gpsActive]);

  useEffect(() => {
    followRef.current = follow;
  }, [follow]);

  // Suivi GPS : watchPosition + marqueur + calcul des distances.
  useEffect(() => {
    if (!gpsControl || !gpsActive) return;

    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setGpsError("Ton navigateur ne gère pas la géolocalisation.");
      setGpsStatus("error");
      setGpsActive(false);
      return;
    }

    firstFixRef.current = true;
    offCountRef.current = 0;
    wasOffRef.current = false;
    lastAlertRef.current = 0;
    lastAlongRef.current = null;
    lastFixTimeRef.current = null;
    lastInfoRef.current = null;
    prevPosRef.current = null;
    headingRef.current = null;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const L = leafletRef.current;
        const map = mapRef.current;
        const { latitude, longitude, accuracy, heading: gpsHeading, speed } = pos.coords;

        // Position trop imprécise (réseau mobile / GPS pas encore verrouillé) :
        // on affiche le point mais on ne calcule ni progression ni alerte.
        const weak = accuracy > WEAK_ACCURACY_M;
        const now = Date.now();
        const dt = lastFixTimeRef.current ? (now - lastFixTimeRef.current) / 1000 : 0;
        const proj = weak
          ? null
          : projectOnTrack(
              points,
              trackIndex,
              latitude,
              longitude,
              lastAlongRef.current,
              // Fenêtre de plausibilité : 300 m + 12 m/s depuis le dernier relevé fiable.
              lastAlongRef.current == null ? 500 : 300 + 12 * dt
            );
        if (proj) {
          lastAlongRef.current = proj.along;
          lastFixTimeRef.current = now;
        }

        // Direction de déplacement : cap GPS si on avance vraiment, sinon
        // calculé depuis la position précédente (au moins 8 m parcourus).
        const here = { lat: latitude, lon: longitude };
        const prev = prevPosRef.current;
        if (gpsHeading != null && Number.isFinite(gpsHeading) && (speed ?? 0) > 0.7) {
          headingRef.current = gpsHeading;
          prevPosRef.current = here;
        } else if (prev && haversineMeters(prev, here) >= 8) {
          headingRef.current = bearingDeg(prev, here);
          prevPosRef.current = here;
        } else if (!prev) {
          prevPosRef.current = here;
        }
        // À l'arrêt prolongé on repasse à la pastille.
        if ((speed ?? 1) < 0.3 && gpsHeading == null && prev && haversineMeters(prev, here) < 3) {
          headingRef.current = null;
        }
        const heading = headingRef.current;
        if (heading != null && orientationRef.current === "heading") setMapRotation(heading);

        let direction: "ok" | "reverse" | null = null;
        if (proj && heading != null && proj.offTrack < 100) {
          const diff = angleDiff(heading, proj.bearing);
          direction = diff < 60 ? "ok" : diff > 120 ? "reverse" : null;
        }

        if (proj) {
          const info: GpsInfo = {
            along: proj.along,
            remaining: Math.max(0, trackIndex.total - proj.along),
            offTrack: proj.offTrack,
            accuracy,
            direction,
            weak: false,
          };
          lastInfoRef.current = info;
          setGpsInfo(info);
        } else {
          // Signal faible : on garde la dernière progression fiable, ou rien.
          const info: GpsInfo = lastInfoRef.current
            ? { ...lastInfoRef.current, accuracy, weak: true }
            : { along: 0, remaining: trackIndex.total, offTrack: 0, accuracy, direction: null, weak: true };
          setGpsInfo(info);
        }
        setGpsStatus("on");
        setGpsError(null);
        if (proj) handleOffTrack(proj.offTrack, accuracy);

        if (!L || !map) return;

        if (!markerRef.current) {
          accuracyRef.current = L.circle([latitude, longitude], {
            radius: accuracy,
            color: "#2563EB",
            weight: 1,
            fillColor: "#3B82F6",
            fillOpacity: 0.15,
            interactive: false,
          }).addTo(map);
          markerRef.current = L.marker([latitude, longitude], {
            icon: L.divIcon({
              className: "",
              html: positionIconHtml(heading),
              iconSize: [34, 34],
              iconAnchor: [17, 17],
            }),
            interactive: false,
            zIndexOffset: 1000,
          }).addTo(map);
        } else {
          markerRef.current.setLatLng([latitude, longitude]);
          markerRef.current.setIcon(
            L.divIcon({
              className: "",
              html: positionIconHtml(heading),
              iconSize: [34, 34],
              iconAnchor: [17, 17],
            })
          );
          accuracyRef.current?.setLatLng([latitude, longitude]);
          accuracyRef.current?.setRadius(accuracy);
        }

        if (followRef.current) {
          if (firstFixRef.current) {
            map.setView([latitude, longitude], Math.min(Math.max(map.getZoom(), 17), map.getMaxZoom()), {
              animate: true,
            });
          } else {
            map.panTo([latitude, longitude], { animate: true });
          }
        }
        firstFixRef.current = false;
      },
      (err) => {
        setGpsError(
          err.code === err.PERMISSION_DENIED
            ? "Localisation refusée. Autorise-la dans les réglages de ton navigateur, puis réessaie."
            : err.code === err.POSITION_UNAVAILABLE
            ? "Position introuvable. Vérifie que le GPS de ton téléphone est activé."
            : "Délai dépassé pour obtenir ta position. Réessaie à l'extérieur."
        );
        setGpsStatus("error");
        setGpsActive(false);
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 }
    );

    // Garde l'écran allumé tant que le suivi est actif (si le navigateur le permet).
    let wakeLock: { release: () => Promise<void> } | null = null;
    async function acquireWakeLock() {
      try {
        const nav = navigator as Navigator & {
          wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> };
        };
        if (nav.wakeLock) wakeLock = await nav.wakeLock.request("screen");
      } catch {
        /* pas critique */
      }
    }
    acquireWakeLock();
    function onVisible() {
      if (document.visibilityState === "visible") acquireWakeLock();
    }
    document.addEventListener("visibilitychange", onVisible);

    // Si l'utilisateur déplace la carte à la main, on arrête de la recentrer.
    const map = mapRef.current;
    const onDrag = () => setFollow(false);
    map?.on("dragstart", onDrag);
    // Si la carte est décalée par un autre geste (zoom...), on propose « Recentrer ».
    const onMoveEnd = () => {
      const m = markerRef.current;
      if (!map || !m || !followRef.current) return;
      const p = map.latLngToContainerPoint(m.getLatLng());
      if (p.distanceTo(map.getSize().divideBy(2)) > 80) setFollow(false);
    };
    map?.on("moveend", onMoveEnd);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      document.removeEventListener("visibilitychange", onVisible);
      map?.off("dragstart", onDrag);
      map?.off("moveend", onMoveEnd);
      wakeLock?.release().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gpsControl, gpsActive, pointsKey]);

  function toggleGps() {
    if (!gpsActive) {
      // Doit se faire dans le clic : les navigateurs bloquent le son et les
      // notifications sinon.
      try {
        const AC =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AC) {
          audioCtxRef.current = audioCtxRef.current ?? new AC();
          audioCtxRef.current.resume().catch(() => {});
        }
        if (typeof Notification !== "undefined" && Notification.permission === "default") {
          Notification.requestPermission().catch(() => {});
        }
      } catch {
        /* pas critique */
      }
      setGpsError(null);
      setFollow(true);
      setGpsStatus("starting");
      setGpsActive(true);
    } else {
      setGpsActive(false);
      setGpsStatus("off");
      setGpsInfo(null);
      setOrientation("north");
      setFollow(true);
      markerRef.current?.remove();
      accuracyRef.current?.remove();
      markerRef.current = null;
      accuracyRef.current = null;
    }
  }

  function recenter() {
    setFollow(true);
    const m = markerRef.current;
    if (m && mapRef.current) mapRef.current.panTo(m.getLatLng(), { animate: true });
  }

  function toggleOrientation() {
    setOrientation((o) => (o === "north" ? "heading" : "north"));
  }

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

  // Changement d'orientation (nord / direction en haut).
  useEffect(() => {
    applyLayout();
    if (orientation === "heading" && headingRef.current != null) {
      setMapRotation(headingRef.current);
    }
    const m = markerRef.current;
    if (m && mapRef.current && followRef.current) {
      mapRef.current.setView(m.getLatLng(), mapRef.current.getZoom(), { animate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orientation]);

  const hasMap = points.length >= 2;

  // Le conteneur pivoté dépend de la taille de la zone visible.
  useEffect(() => {
    const wrap = wrapperRef.current;
    if (!hasMap || !wrap || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      if (orientationRef.current === "heading") applyLayout();
    });
    ro.observe(wrap);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMap]);

  // En mode « direction en haut », le déplacement de la carte au doigt est géré
  // ici : les gestes de Leaflet ne tiennent pas compte de la rotation.
  useEffect(() => {
    const wrap = wrapperRef.current;
    if (orientation !== "heading" || !wrap) return;
    const pointers = new Map<number, { x: number; y: number }>();
    let moved = 0;

    function onDown(e: PointerEvent) {
      if ((e.target as HTMLElement).closest("button, a, [data-no-pan]")) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      moved = 0;
    }
    function onMove(e: PointerEvent) {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      if (pointers.size !== 1) return; // pincement : géré par Leaflet
      moved += Math.abs(dx) + Math.abs(dy);
      if (moved > 6) setFollow(false);
      const r = (rotRef.current * Math.PI) / 180;
      const cx = dx * Math.cos(r) + dy * Math.sin(r);
      const cy = -dx * Math.sin(r) + dy * Math.cos(r);
      mapRef.current?.panBy([-cx, -cy], { animate: false });
    }
    function onUp(e: PointerEvent) {
      pointers.delete(e.pointerId);
    }
    wrap.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      wrap.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [orientation]);

  if (points.length < 2) {
    return <p className="text-muted">Aucune trace à afficher.</p>;
  }

  const normalHeight = large ? "h-[70vh] min-h-[440px]" : "h-96";

  return (
    <div
      ref={wrapperRef}
      className={
        fullscreen
          ? "fixed inset-0 z-[90] overflow-hidden bg-bg"
          : `relative ${normalHeight} w-full overflow-hidden rounded-xl border border-border`
      }
    >
      <div ref={containerRef} className="h-full w-full" />

      <div className="absolute right-3 top-3 z-[1000] flex flex-col items-end gap-2">
        {fullscreenControl && (
          <button
            type="button"
            onClick={() => setFullscreen((v) => !v)}
            aria-pressed={fullscreen}
            aria-label={fullscreen ? "Quitter le plein écran" : "Plein écran"}
            title={fullscreen ? "Quitter le plein écran" : "Plein écran"}
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ background: "#FFFFFF", boxShadow: "0 1px 5px rgba(0,0,0,0.4)" }}
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              aria-hidden
              fill="none"
              stroke="#374151"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {fullscreen ? (
                <path d="M9 4v5H4 M15 4v5h5 M9 20v-5H4 M15 20v-5h5" />
              ) : (
                <path d="M4 9V4h5 M20 9V4h-5 M4 15v5h5 M20 15v5h-5" />
              )}
            </svg>
          </button>
        )}

        {gpsControl && (
          <button
            type="button"
            onClick={toggleGps}
            aria-pressed={gpsActive}
            aria-label={!gpsActive ? "Activer le suivi GPS" : "Arrêter le suivi GPS"}
            title={!gpsActive ? "Activer le suivi GPS" : "Arrêter le suivi GPS"}
            className={`flex h-10 items-center justify-center rounded-full px-4 text-sm font-bold ${
              gpsStatus === "starting" ? "animate-pulse" : ""
            }`}
            style={{
              background: "#FFFFFF",
              color: gpsActive ? "#DC2626" : "#15803D",
              boxShadow: "0 1px 5px rgba(0,0,0,0.4)",
            }}
          >
            {gpsActive ? "Arrêter" : "Démarrer"}
          </button>
        )}

        {gpsControl && gpsActive && (
          <button
            type="button"
            onClick={toggleOrientation}
            aria-pressed={orientation === "heading"}
            aria-label={
              orientation === "north"
                ? "Orientation : nord en haut. Passer en direction en haut"
                : "Orientation : direction en haut. Passer en nord en haut"
            }
            title={
              orientation === "north"
                ? "Nord en haut (toucher pour : direction en haut)"
                : "Direction en haut (toucher pour : nord en haut)"
            }
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{
              background: "#FFFFFF",
              boxShadow:
                orientation === "heading"
                  ? "0 0 0 2px #2563EB, 0 1px 5px rgba(0,0,0,0.4)"
                  : "0 1px 5px rgba(0,0,0,0.4)",
            }}
          >
            {/* Aiguille façon Google Maps : pointe rouge = nord */}
            <svg
              viewBox="0 0 40 40"
              width="34"
              height="34"
              aria-hidden
              style={{ transform: `rotate(${compassRot}deg)`, transition: "transform 0.4s linear" }}
            >
              <path d="M20 5 L27 20 L13 20 Z" fill="#E5484D" />
              <path d="M20 35 L27 20 L13 20 Z" fill="#9CA3AF" />
              <circle cx="20" cy="20" r="2.4" fill="#FFFFFF" stroke="#6B7280" strokeWidth="1" />
            </svg>
          </button>
        )}

        {basemapControl && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              aria-expanded={pickerOpen}
              aria-label="Changer le fond de carte"
              title="Changer le fond de carte"
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ background: "#FFFFFF", boxShadow: "0 1px 5px rgba(0,0,0,0.4)" }}
            >
              <svg
                viewBox="0 0 24 24"
                width="22"
                height="22"
                aria-hidden
                fill="none"
                stroke="#374151"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              >
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
        )}
      </div>

      {gpsControl && orientation === "heading" && (
        <div
          className="absolute left-2 top-2 z-[1000] rounded bg-bg/70 px-1 text-[10px] text-muted"
          dangerouslySetInnerHTML={{ __html: BASEMAPS[basemap].attribution }}
        />
      )}

      {gpsControl && gpsStatus !== "off" && (
        <div className="absolute inset-x-3 bottom-3 z-[1000] flex flex-col items-end gap-2 sm:max-w-sm">
        {gpsStatus === "on" && !follow && (
          <button
            type="button"
            onClick={recenter}
            aria-label="Recentrer sur ma position"
            className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-semibold text-bg shadow-lg"
          >
            Recentrer
          </button>
        )}
        <div className="w-full rounded-xl border border-border bg-bg/95 p-3 text-sm shadow-lg backdrop-blur-sm">
          {gpsStatus === "error" && <p className="text-ink">{gpsError}</p>}
          {gpsStatus === "starting" && <p className="text-muted">Recherche de ta position…</p>}
          {gpsStatus === "on" && gpsInfo && (
            <>
              {gpsInfo.weak && !lastInfoRef.current ? (
                <p className="text-ink">
                  Signal GPS encore imprécis (±{Math.round(gpsInfo.accuracy)} m). Patiente quelques
                  secondes, en extérieur…
                </p>
              ) : gpsInfo.offTrack > FAR_FROM_TRACK_M ? (
                <p className="text-ink">
                  Tu es à {formatKm(gpsInfo.offTrack)} du parcours. Rejoins le tracé pour suivre ta
                  progression.
                </p>
              ) : (
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs text-muted">Parcouru</p>
                  <p className="font-display text-xl font-semibold tabular-nums">
                    {formatKm(gpsInfo.along)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted">Restant</p>
                  <p className="font-display text-xl font-semibold tabular-nums">
                    {formatKm(gpsInfo.remaining)}
                  </p>
                </div>
              </div>
              )}
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full bg-accent"
                  style={{
                    width: `${
                      gpsInfo.offTrack > FAR_FROM_TRACK_M
                        ? 0
                        : Math.min(100, (gpsInfo.along / Math.max(1, trackIndex.total)) * 100)
                    }%`,
                  }}
                />
              </div>
              {gpsInfo.direction === "ok" && (
                <p className="mt-2 text-xs text-ink">✅ Tu suis le tracé dans le bon sens.</p>
              )}
              {gpsInfo.direction === "reverse" && (
                <p className="mt-2 text-xs text-ink">↩️ Tu vas à contre-sens du tracé. Demi-tour ?</p>
              )}
              {gpsInfo.offTrack > OFF_TRACK_ALERT_M && (
                <p className="mt-2 rounded-lg bg-danger px-2 py-1.5 text-xs font-semibold text-white">
                  ⚠️ Tu es à {Math.round(gpsInfo.offTrack)} m du tracé !
                </p>
              )}
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="text-xs text-muted">Précision GPS : ±{Math.round(gpsInfo.accuracy)} m</p>
                <button
                  type="button"
                  onClick={() => setAlertsOn((v) => !v)}
                  aria-pressed={alertsOn}
                  className="shrink-0 rounded-md border border-border px-2 py-0.5 text-xs text-muted hover:text-ink"
                >
                  {alertsOn ? "🔔 Alerte activée" : "🔕 Alerte coupée"}
                </button>
              </div>
            </>
          )}
        </div>
        </div>
      )}
    </div>
  );
}
