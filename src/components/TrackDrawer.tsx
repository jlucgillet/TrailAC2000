"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "leaflet/dist/leaflet.css";
import { ElevationProfile } from "@/components/ElevationProfile";
import Link from "next/link";
import { computeGpxStats, parseGpxPoints } from "@/lib/gpx";

type LL = [number, number];
type Mode = "foot" | "road" | "manual";
type Seg = {
  id: number;
  mode: Mode;
  coords: LL[];
  status: "loading" | "ok" | "fallback";
  /** Tronçon issu du tracé d'origine (mode édition) : sa géométrie exacte est conservée. */
  orig?: boolean;
};

/** Parcours existant à modifier. */
export type InitialTrack = { trackId: string; name: string; gpxData: string };

const BASEMAPS = {
  topo: {
    label: "Topo",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors, SRTM | &copy; OpenTopoMap (CC-BY-SA)",
    maxZoom: 17,
  },
  standard: {
    label: "Standard",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19,
  },
  satellite: {
    label: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
    maxZoom: 19,
  },
} as const;
type BasemapKey = keyof typeof BASEMAPS;

/**
 * Services externes utilisés depuis le navigateur :
 *  - routage OSM (OSRM) : chemins piétons / routes — l'URL contient toujours
 *    « driving », le profil est choisi par le sous-domaine (foot / car).
 *  - altitude : Open-Meteo (MNT), repli OpenTopoData.
 */
const ROUTING_URL: Record<Exclude<Mode, "manual">, string> = {
  foot: "https://routing.openstreetmap.de/routed-foot/route/v1/driving",
  road: "https://routing.openstreetmap.de/routed-car/route/v1/driving",
};

const MODE_INFO: Record<Mode, { label: string; icon: string; hint: string }> = {
  foot: { label: "Chemin", icon: "🥾", hint: "Le tracé suit automatiquement les chemins et sentiers entre deux points." },
  road: { label: "Route", icon: "🛣️", hint: "Le tracé suit automatiquement les routes entre deux points." },
  manual: { label: "Manuel", icon: "✏️", hint: "Le tracé relie les points en ligne droite : à toi de placer chaque point." },
};

const R_EARTH = 6371000;
function hav(a: LL, b: LL): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b[0] - a[0]);
  const dLon = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.sqrt(h));
}

/**
 * Allège / densifie un tracé : un point environ tous les `step` mètres
 * (les virages sont conservés, les longs segments droits sont subdivisés).
 */
function simplifyPath(path: LL[], step: number): LL[] {
  if (path.length < 2) return path.slice();
  const out: LL[] = [path[0]];
  let acc = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    const d = hav(a, b);
    if (d > step) {
      const n = Math.floor(d / step);
      for (let k = 1; k <= n; k++) {
        const t = k / (n + 1);
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      }
      acc = 0;
    } else {
      acc += d;
      if (acc >= step) {
        out.push(a);
        acc = 0;
      }
    }
    if (i === path.length - 1) out.push(b);
  }
  return out;
}

const ELE_KEY = (p: LL) => `${p[0].toFixed(4)},${p[1].toFixed(4)}`;

async function fetchElevBatch(coords: LL[]): Promise<(number | null)[]> {
  try {
    const lat = coords.map((c) => c[0].toFixed(4)).join(",");
    const lon = coords.map((c) => c[1].toFixed(4)).join(",");
    const r = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`);
    if (r.ok) {
      const j = await r.json();
      if (Array.isArray(j.elevation)) return j.elevation.map((v: unknown) => (typeof v === "number" ? v : null));
    }
  } catch {
    /* repli ci-dessous */
  }
  try {
    const loc = coords.map((c) => `${c[0].toFixed(4)},${c[1].toFixed(4)}`).join("|");
    const r = await fetch(`https://api.opentopodata.org/v1/srtm30m?locations=${loc}`);
    if (r.ok) {
      const j = await r.json();
      if (Array.isArray(j.results)) {
        return j.results.map((x: { elevation?: unknown }) => (typeof x.elevation === "number" ? x.elevation : null));
      }
    }
  } catch {
    /* échec */
  }
  return coords.map(() => null);
}

/** Moyenne glissante de l'altitude (réduit le bruit / l'effet « marches » du MNT). */
function smoothEle(eles: (number | null)[], half = 2): (number | null)[] {
  return eles.map((e, i) => {
    if (e === null) return null;
    let sum = 0;
    let n = 0;
    for (let k = Math.max(0, i - half); k <= Math.min(eles.length - 1, i + half); k++) {
      const v = eles[k];
      if (v !== null) {
        sum += v;
        n++;
      }
    }
    return Math.round((sum / n) * 10) / 10;
  });
}

function descent(points: { ele: number | null }[]): number {
  let loss = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1].ele;
    const b = points[i].ele;
    if (a !== null && b !== null && a - b > 1) loss += a - b;
  }
  return Math.round(loss);
}

/** Distance (m) d'un point à un segment [a,b] (projection locale). */
function distToSeg(p: LL, a: LL, b: LL): number {
  const k = Math.cos((p[0] * Math.PI) / 180);
  const px = (p[1] - a[1]) * k * 111320;
  const py = (p[0] - a[0]) * 110540;
  const bx = (b[1] - a[1]) * k * 111320;
  const by = (b[0] - a[0]) * 110540;
  const len2 = bx * bx + by * by;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (px * bx + py * by) / len2));
  return Math.hypot(px - t * bx, py - t * by);
}

/** Douglas-Peucker itératif : indices à conserver pour une tolérance donnée (m). */
function dpIndices(pts: LL[], tol: number): number[] {
  const keep = new Uint8Array(pts.length);
  keep[0] = 1;
  keep[pts.length - 1] = 1;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [lo, hi] = stack.pop()!;
    let maxD = 0;
    let idx = -1;
    for (let i = lo + 1; i < hi; i++) {
      const d = distToSeg(pts[i], pts[lo], pts[hi]);
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (idx >= 0 && maxD > tol) {
      keep[idx] = 1;
      stack.push([lo, idx], [idx, hi]);
    }
  }
  const out: number[] = [];
  keep.forEach((v, i) => v && out.push(i));
  return out;
}

const MAX_EDIT_WAYPOINTS = 80;

/** Transforme un GPX existant en points modifiables (≤ 80) + tronçons qui gardent la géométrie d'origine. */
function buildFromTrack(gpxData: string) {
  const pts = parseGpxPoints(gpxData);
  const coords: LL[] = pts.map((p) => [p.lat, p.lon] as LL);
  if (coords.length < 2) return { wps: [] as LL[], segs: [] as Seg[], nextId: 0, orig: pts };
  let tol = 20;
  let idx = dpIndices(coords, tol);
  while (idx.length > MAX_EDIT_WAYPOINTS) {
    tol *= 1.5;
    idx = dpIndices(coords, tol);
  }
  const wps = idx.map((i) => coords[i]);
  const segs: Seg[] = [];
  for (let k = 0; k < idx.length - 1; k++) {
    segs.push({
      id: k + 1,
      mode: "manual",
      coords: coords.slice(idx[k], idx[k + 1] + 1),
      status: "ok",
      orig: true,
    });
  }
  return { wps, segs, nextId: segs.length, orig: pts };
}

/** Index spatial des points d'origine : altitude d'origine à ≤ 20 m d'un point. */
function makeOrigLookup(orig: { lat: number; lon: number; ele: number | null }[]) {
  const CELL = 0.0003;
  const grid = new Map<string, number[]>();
  orig.forEach((p, i) => {
    if (p.ele === null || p.ele === undefined) return;
    const key = `${Math.round(p.lat / CELL)},${Math.round(p.lon / CELL)}`;
    const arr = grid.get(key);
    if (arr) arr.push(i);
    else grid.set(key, [i]);
  });
  return (p: LL): number | null => {
    if (grid.size === 0) return null;
    const cx = Math.round(p[0] / CELL);
    const cy = Math.round(p[1] / CELL);
    let best = -1;
    let bestD = 20;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const arr = grid.get(`${cx + dx},${cy + dy}`);
        if (!arr) continue;
        for (const i of arr) {
          const d = hav(p, [orig[i].lat, orig[i].lon]);
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        }
      }
    }
    return best >= 0 ? (orig[best].ele as number) : null;
  };
}

function buildGpx(name: string, pts: { lat: number; lon: number; ele: number | null }[]): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const trkpts = pts
    .map(
      (p) =>
        `      <trkpt lat="${p.lat.toFixed(6)}" lon="${p.lon.toFixed(6)}">${
          p.ele !== null ? `<ele>${p.ele}</ele>` : ""
        }</trkpt>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Trail AC2000" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>${esc(name)}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>
`;
}

export function TrackDrawer({ initial }: { initial?: InitialTrack }) {
  const router = useRouter();
  const initRef = useRef<ReturnType<typeof buildFromTrack> | null>(null);
  if (initRef.current === null) {
    initRef.current = initial ? buildFromTrack(initial.gpxData) : { wps: [], segs: [], nextId: 0, orig: [] };
  }
  const origEle = useMemo(() => makeOrigLookup(initRef.current!.orig), []);
  const editing = !!initial;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const tileRef = useRef<import("leaflet").TileLayer | null>(null);
  const layerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const cursorRef = useRef<import("leaflet").CircleMarker | null>(null);

  const idRef = useRef(initRef.current.nextId);
  const dataRef = useRef<{ wps: LL[]; segs: Seg[] }>({ wps: initRef.current.wps, segs: initRef.current.segs });
  const [data, setData] = useState(dataRef.current);
  const routeCache = useRef(new Map<string, LL[]>());
  const eleCache = useRef(new Map<string, number>());
  const tokenRef = useRef(0);

  const [mode, setMode] = useState<Mode>("foot");
  const modeRef = useRef<Mode>("foot");
  modeRef.current = mode;
  const [basemap, setBasemap] = useState<BasemapKey>("topo");
  const [fs, setFs] = useState(false);
  const [ready, setReady] = useState(false);
  const [eleTick, setEleTick] = useState(0);
  const [eleLoading, setEleLoading] = useState(false);
  const [eleFailed, setEleFailed] = useState(false);
  const [name, setName] = useState(initial?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchMsg, setSearchMsg] = useState<string | null>(null);
  const [cursor, setCursor] = useState<{ lat: number; lon: number } | null>(null);

  function commit(next: { wps: LL[]; segs: Seg[] }) {
    dataRef.current = next;
    setData(next);
  }

  // ---------- Routage ----------
  function applySeg(id: number, coords: LL[], status: Seg["status"]) {
    const cur = dataRef.current;
    if (!cur.segs.some((s) => s.id === id)) return; // tronçon supprimé / remplacé entre-temps
    commit({ ...cur, segs: cur.segs.map((s) => (s.id === id ? { ...s, coords, status } : s)) });
  }

  async function requestRoute(id: number, a: LL, b: LL, m: Exclude<Mode, "manual">) {
    const key = `${m}|${a[0].toFixed(5)},${a[1].toFixed(5)}|${b[0].toFixed(5)},${b[1].toFixed(5)}`;
    const cached = routeCache.current.get(key);
    if (cached) return applySeg(id, cached, "ok");
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    try {
      const url = `${ROUTING_URL[m]}/${a[1]},${a[0]};${b[1]},${b[0]}?overview=full&geometries=geojson`;
      const r = await fetch(url, { signal: ctrl.signal });
      if (!r.ok) throw new Error(String(r.status));
      const j = await r.json();
      const coords: LL[] | undefined = j?.routes?.[0]?.geometry?.coordinates?.map(
        (c: [number, number]) => [c[1], c[0]] as LL
      );
      if (!coords || coords.length < 2) throw new Error("no route");
      routeCache.current.set(key, coords);
      applySeg(id, coords, "ok");
    } catch {
      applySeg(id, [a, b], "fallback");
    } finally {
      clearTimeout(timer);
    }
  }

  function makeSeg(a: LL, b: LL, m: Mode): Seg {
    const seg: Seg = { id: ++idRef.current, mode: m, coords: [a, b], status: m === "manual" ? "ok" : "loading" };
    if (m !== "manual") void requestRoute(seg.id, a, b, m);
    return seg;
  }

  // ---------- Actions ----------
  const actions = {
    addPoint(ll: LL) {
      const { wps, segs } = dataRef.current;
      const nextSegs = wps.length ? [...segs, makeSeg(wps[wps.length - 1], ll, modeRef.current)] : segs;
      commit({ wps: [...wps, ll], segs: nextSegs });
    },
    undo() {
      const { wps, segs } = dataRef.current;
      if (!wps.length) return;
      commit({ wps: wps.slice(0, -1), segs: segs.slice(0, Math.max(0, wps.length - 2)) });
    },
    removePoint(i: number) {
      const { wps, segs } = dataRef.current;
      if (i < 0 || i >= wps.length) return;
      if (i === wps.length - 1) return actions.undo();
      if (i === 0) return commit({ wps: wps.slice(1), segs: segs.slice(1) });
      const nextWps = wps.filter((_, k) => k !== i);
      const merged = makeSeg(wps[i - 1], wps[i + 1], segs[i - 1].orig ? modeRef.current : segs[i - 1].mode);
      commit({ wps: nextWps, segs: [...segs.slice(0, i - 1), merged, ...segs.slice(i + 1)] });
    },
    movePoint(i: number, ll: LL) {
      const { wps, segs } = dataRef.current;
      if (i < 0 || i >= wps.length) return;
      const nextWps = wps.map((p, k) => (k === i ? ll : p));
      const nextSegs = segs.slice();
      if (i > 0) nextSegs[i - 1] = makeSeg(nextWps[i - 1], ll, segs[i - 1].orig ? modeRef.current : segs[i - 1].mode);
      if (i < wps.length - 1) nextSegs[i] = makeSeg(ll, nextWps[i + 1], segs[i].orig ? modeRef.current : segs[i].mode);
      commit({ wps: nextWps, segs: nextSegs });
    },
    closeLoop() {
      const { wps } = dataRef.current;
      if (wps.length >= 2) actions.addPoint(wps[0]);
    },
    clear() {
      if (dataRef.current.wps.length && !confirm("Effacer tout le tracé ?")) return;
      commit({ wps: [], segs: [] });
    },
  };
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  // ---------- Carte ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!containerRef.current) return;
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;
      leafletRef.current = L;
      const map = L.map(containerRef.current, { zoomControl: true });
      mapRef.current = map;
      const b = BASEMAPS.topo;
      tileRef.current = L.tileLayer(b.url, { attribution: b.attribution, maxZoom: b.maxZoom }).addTo(map);
      map.setView([46.6, 2.5], 6);
      const startPath = dataRef.current.segs.flatMap((sg) => sg.coords);
      if (startPath.length > 1) map.fitBounds(L.latLngBounds(startPath), { padding: [30, 30] });
      layerRef.current = L.layerGroup().addTo(map);
      map.on("click", (e: import("leaflet").LeafletMouseEvent) => {
        actionsRef.current.addPoint([e.latlng.lat, e.latlng.lng]);
      });
      setReady(true);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
      tileRef.current = null;
      cursorRef.current = null;
      setReady(false);
    };
  }, []);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;
    if (tileRef.current) map.removeLayer(tileRef.current);
    const b = BASEMAPS[basemap];
    tileRef.current = L.tileLayer(b.url, { attribution: b.attribution, maxZoom: b.maxZoom }).addTo(map);
  }, [basemap, ready]);

  // Dessin du tracé et des points.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!ready || !L || !map || !layer) return;
    layer.clearLayers();

    for (const s of data.segs) {
      const color = s.status === "fallback" ? "#D97706" : s.status === "loading" ? "#9CA3AF" : "#DC2626";
      const dash = s.status === "ok" ? undefined : "6 8";
      L.polyline(s.coords, { color: "#FFFFFF", weight: 7, opacity: 0.9, interactive: false }).addTo(layer);
      L.polyline(s.coords, { color, weight: 4, opacity: 1, dashArray: dash, interactive: false }).addTo(layer);
    }

    const n = data.wps.length;
    data.wps.forEach((p, i) => {
      const first = i === 0;
      const last = i === n - 1 && n > 1;
      const bg = first ? "#16A34A" : last ? "#111827" : "#FFFFFF";
      const fg = first || last ? "#FFFFFF" : "#111827";
      const label = first ? "D" : last ? "A" : String(i + 1);
      const marker = L.marker(p, {
        draggable: true,
        icon: L.divIcon({
          className: "",
          iconSize: [24, 24],
          iconAnchor: [12, 12],
          html: `<div style="width:24px;height:24px;border-radius:9999px;background:${bg};color:${fg};border:2px solid #111827;display:flex;align-items:center;justify-content:center;font:700 11px system-ui,sans-serif;box-shadow:0 1px 4px rgba(0,0,0,.5);cursor:grab">${label}</div>`,
        }),
      }).addTo(layer);

      marker.on("dragend", () => {
        const ll = marker.getLatLng();
        actionsRef.current.movePoint(i, [ll.lat, ll.lng]);
      });

      const box = document.createElement("div");
      const btn = document.createElement("button");
      btn.textContent = "Supprimer ce point";
      btn.style.cssText =
        "font:600 12px system-ui,sans-serif;color:#B91C1C;background:none;border:0;cursor:pointer;padding:2px 4px";
      btn.onclick = () => {
        map.closePopup();
        actionsRef.current.removePoint(i);
      };
      box.appendChild(btn);
      marker.bindPopup(box, { closeButton: false, offset: [0, -10] });
    });
  }, [data, ready]);

  // Repère synchronisé avec le profil d'altitude.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;
    if (!cursor) {
      if (cursorRef.current) {
        map.removeLayer(cursorRef.current);
        cursorRef.current = null;
      }
      return;
    }
    if (!cursorRef.current) {
      cursorRef.current = L.circleMarker([cursor.lat, cursor.lon], {
        radius: 8,
        color: "#FFFFFF",
        weight: 3,
        fillColor: "#2563EB",
        fillOpacity: 1,
        interactive: false,
      }).addTo(map);
    } else {
      cursorRef.current.setLatLng([cursor.lat, cursor.lon]);
    }
  }, [cursor, ready]);

  // Ctrl/⌘ + Z : annuler le dernier point.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        const t = e.target as HTMLElement | null;
        if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
        e.preventDefault();
        actionsRef.current.undo();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Plein écran : recalcule la taille de la carte, Échap pour quitter,
  // et empêche la page de défiler derrière.
  useEffect(() => {
    const t1 = setTimeout(() => mapRef.current?.invalidateSize(), 60);
    const t2 = setTimeout(() => mapRef.current?.invalidateSize(), 300);
    if (!fs) return () => { clearTimeout(t1); clearTimeout(t2); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFs(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [fs]);

  // ---------- Distance, altitude, dénivelé ----------
  const path = useMemo(() => {
    const out: LL[] = [];
    for (const s of data.segs) for (const c of s.coords) out.push(c);
    return out;
  }, [data]);

  const sample = useMemo(() => {
    if (path.length < 2) return [] as LL[];
    let total = 0;
    for (let i = 1; i < path.length; i++) total += hav(path[i - 1], path[i]);
    const step = Math.max(30, total / 1500);
    return simplifyPath(path, step);
  }, [path]);

  const sampleKey = useMemo(() => sample.map(ELE_KEY).join("|"), [sample]);

  useEffect(() => {
    if (sample.length < 2) {
      setEleLoading(false);
      setEleFailed(false);
      return;
    }
    const token = ++tokenRef.current;
    setEleLoading(true);
    setEleFailed(false);
    const timer = setTimeout(async () => {
      const missing: LL[] = [];
      const seen = new Set<string>();
      for (const p of sample) {
        const k = ELE_KEY(p);
        if (!eleCache.current.has(k) && !seen.has(k) && origEle(p) === null) {
          seen.add(k);
          missing.push(p);
        }
      }
      let failed = false;
      for (let i = 0; i < missing.length; i += 100) {
        if (token !== tokenRef.current) return;
        const batch = missing.slice(i, i + 100);
        const res = await fetchElevBatch(batch);
        if (token !== tokenRef.current) return;
        res.forEach((v, j) => {
          if (v !== null) eleCache.current.set(ELE_KEY(batch[j]), v);
          else failed = true;
        });
        setEleTick((t) => t + 1);
      }
      if (token === tokenRef.current) {
        setEleLoading(false);
        setEleFailed(failed);
      }
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sampleKey]);

  const points = useMemo(() => {
    const raw = sample.map((p) => {
      const o = origEle(p);
      if (o !== null) return o;
      const v = eleCache.current.get(ELE_KEY(p));
      return v === undefined ? null : v;
    });
    const sm = smoothEle(raw);
    return sample.map((p, i) => ({ lat: p[0], lon: p[1], ele: sm[i] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sample, eleTick]);

  const stats = useMemo(() => {
    if (points.length < 2) return { distanceKm: 0, up: 0, down: 0 };
    const s = computeGpxStats(points);
    return { distanceKm: s.distanceKm, up: s.elevationGainM, down: descent(points) };
  }, [points]);

  const missingEle = points.filter((p) => p.ele === null).length;
  const loadingSegs = data.segs.filter((s) => s.status === "loading").length;
  const fallbackSegs = data.segs.filter((s) => s.status === "fallback").length;
  const canSave = data.wps.length >= 2 && !saving && loadingSegs === 0 && !eleLoading;

  // ---------- Recherche de lieu / position ----------
  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = search.trim();
    if (!q || !mapRef.current) return;
    setSearchMsg("Recherche…");
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`
      );
      const j = await r.json();
      if (Array.isArray(j) && j[0]) {
        mapRef.current.flyTo([parseFloat(j[0].lat), parseFloat(j[0].lon)], 13, { duration: 0.8 });
        setSearchMsg(null);
      } else {
        setSearchMsg("Lieu introuvable.");
      }
    } catch {
      setSearchMsg("Recherche indisponible.");
    }
  }

  function handleLocate() {
    if (!navigator.geolocation || !mapRef.current) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => mapRef.current?.flyTo([pos.coords.latitude, pos.coords.longitude], 14, { duration: 0.8 }),
      () => setSearchMsg("Position indisponible."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // ---------- Enregistrement ----------
  async function handleSave() {
    setError(null);
    if (
      missingEle > 0 &&
      !confirm(
        "L'altitude n'a pas pu être calculée pour tout le tracé : le dénivelé sera incomplet. Enregistrer quand même ?"
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      const finalName = name.trim();
      const gpx = buildGpx(finalName || initial?.name || "Parcours tracé", points);
      const form = new FormData();
      form.append("file", new File([gpx], "trace.gpx", { type: "application/gpx+xml" }));
      if (finalName) form.append("name", finalName);
      if (initial) {
        // Remplace le tracé du parcours existant (+ renomme si le nom a changé).
        const res = await fetch(`/api/admin/tracks/${initial.trackId}`, { method: "POST", body: form });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error ?? "Erreur lors de l'enregistrement.");
        if (finalName && finalName !== initial.name) {
          const r2 = await fetch(`/api/admin/tracks/${initial.trackId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: finalName }),
          });
          if (!r2.ok) throw new Error("Tracé enregistré, mais le nom n'a pas pu être modifié.");
        }
        router.push(`/admin/tracks/${initial.trackId}`);
        return;
      }
      const res = await fetch("/api/admin/tracks", { method: "POST", body: form });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Erreur lors de l'enregistrement.");
      router.push(`/admin/tracks/${json.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'enregistrement.");
      setSaving(false);
    }
  }

  const pill = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
      active ? "border-accent bg-accent/10 text-ink" : "border-border text-muted hover:text-ink"
    }`;

  return (
    <div className="flex flex-col gap-4">
      {/* Modes */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(MODE_INFO) as Mode[]).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)} aria-pressed={mode === m} className={pill(mode === m)}>
              {MODE_INFO[m].icon} {MODE_INFO[m].label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">
          {MODE_INFO[mode].hint} Le mode s&rsquo;applique aux prochains points : tu peux en changer en cours de
          tracé.
          {editing && (
            <>
              {" "}
              Quand tu déplaces un point, les deux tronçons voisins sont recalculés avec le mode choisi ici ; le
              reste du tracé n&rsquo;est pas modifié.
            </>
          )}
        </p>
      </div>

      {/* Compteurs en direct */}
      <div className="grid grid-cols-3 gap-3 sm:max-w-md">
        <div className="rounded-xl border border-border bg-surface p-3">
          <p className="text-xs text-muted">Distance</p>
          <p className="font-display text-2xl font-semibold tabular-nums">{stats.distanceKm.toFixed(2)} km</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3">
          <p className="text-xs text-muted">D+</p>
          <p className="font-display text-2xl font-semibold tabular-nums">
            {stats.up} m{eleLoading && <span className="ml-1 animate-pulse text-sm text-muted">…</span>}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3">
          <p className="text-xs text-muted">D−</p>
          <p className="font-display text-2xl font-semibold tabular-nums">
            {stats.down} m{eleLoading && <span className="ml-1 animate-pulse text-sm text-muted">…</span>}
          </p>
        </div>
      </div>

      {/* Recherche */}
      <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Aller à un lieu (ville, col, adresse…)"
          className="min-w-[200px] flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-lg border border-border px-3 py-2 text-sm text-muted hover:text-ink">
          Rechercher
        </button>
        <button
          type="button"
          onClick={handleLocate}
          className="rounded-lg border border-border px-3 py-2 text-sm text-muted hover:text-ink"
        >
          📍 Ma position
        </button>
        {searchMsg && <span className="text-xs text-muted">{searchMsg}</span>}
      </form>

      {/* Carte */}
      <div className={fs ? "fixed inset-0 z-[3000] bg-bg" : "relative"}>
        <div className={fs ? "h-full w-full" : "h-[60vh] min-h-[360px] w-full"}>
          <div
            ref={containerRef}
            className="h-full w-full overflow-hidden rounded-xl border border-border"
          />
        </div>
        <div
          className="absolute right-3 top-3 z-[1000] flex items-center gap-1 rounded-lg p-1"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 5px rgba(0,0,0,0.4)" }}
        >
          {(Object.keys(BASEMAPS) as BasemapKey[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setBasemap(k)}
              className="rounded px-2 py-1 text-xs"
              style={{
                color: k === basemap ? "#15803D" : "#374151",
                fontWeight: k === basemap ? 700 : 400,
                background: k === basemap ? "#F0FDF4" : "transparent",
              }}
            >
              {BASEMAPS[k].label}
            </button>
          ))}
          <span aria-hidden style={{ width: 1, height: 16, background: "#D1D5DB" }} />
          <button
            type="button"
            onClick={() => setFs((v) => !v)}
            aria-label={fs ? "Quitter le plein écran" : "Carte en plein écran"}
            title={fs ? "Quitter le plein écran (Échap)" : "Plein écran"}
            className="rounded px-2 py-1 text-xs"
            style={{ color: "#374151" }}
          >
            {fs ? "✕ Quitter" : "⛶"}
          </button>
        </div>

        {fs && (
          <>
            {/* Modes + annulation, discrets comme le choix du fond de carte */}
            <div
              className="absolute right-3 top-[52px] z-[1000] flex items-center gap-1 rounded-lg p-1"
              style={{ background: "#FFFFFF", boxShadow: "0 1px 5px rgba(0,0,0,0.4)" }}
            >
              {(Object.keys(MODE_INFO) as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  aria-pressed={mode === m}
                  className="rounded px-2 py-1 text-xs"
                  style={{
                    color: m === mode ? "#15803D" : "#374151",
                    fontWeight: m === mode ? 700 : 400,
                    background: m === mode ? "#F0FDF4" : "transparent",
                  }}
                >
                  {MODE_INFO[m].icon} {MODE_INFO[m].label}
                </button>
              ))}
              <span aria-hidden style={{ width: 1, height: 16, background: "#D1D5DB" }} />
              <button
                type="button"
                onClick={() => actions.undo()}
                disabled={data.wps.length === 0}
                aria-label="Supprimer le dernier point"
                title="Supprimer le dernier point"
                className="rounded px-2 py-1 text-xs disabled:opacity-40"
                style={{ color: "#374151" }}
              >
                ↶ Dernier point
              </button>
            </div>

            {/* Distance et dénivelé cumulés */}
            <div
              className="pointer-events-none absolute bottom-8 left-3 z-[1000] rounded-lg px-3 py-1.5 text-xs tabular-nums"
              style={{ background: "#FFFFFF", color: "#111827", boxShadow: "0 1px 5px rgba(0,0,0,0.4)" }}
            >
              <b>{stats.distanceKm.toFixed(2)} km</b> · D+ <b>{stats.up} m</b> · D− <b>{stats.down} m</b>
              {eleLoading && <span className="ml-1 animate-pulse">…</span>}
            </div>
          </>
        )}

        {data.wps.length === 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-14 z-[1000] flex justify-center px-4">
            <p className="rounded-full px-4 py-2 text-sm" style={{ background: "rgba(17,24,39,.85)", color: "#fff" }}>
              Touche la carte pour placer le point de départ
            </p>
          </div>
        )}
      </div>

      {/* Outils d'édition */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => actions.undo()}
          disabled={data.wps.length === 0}
          className="rounded-lg border border-border px-3 py-2 text-sm text-ink disabled:opacity-40"
        >
          ↶ Supprimer le dernier point
        </button>
        <button
          type="button"
          onClick={() => actions.closeLoop()}
          disabled={data.wps.length < 2}
          className="rounded-lg border border-border px-3 py-2 text-sm text-ink disabled:opacity-40"
        >
          ⟲ Retour au départ
        </button>
        <button
          type="button"
          onClick={() => actions.clear()}
          disabled={data.wps.length === 0}
          className="rounded-lg border border-danger px-3 py-2 text-sm text-danger disabled:opacity-40"
        >
          Tout effacer
        </button>
        <span className="text-xs text-muted">
          {data.wps.length} point{data.wps.length > 1 ? "s" : ""}
        </span>
      </div>
      <p className="text-xs text-muted">
        Touche la carte pour ajouter un point · fais glisser un point pour le déplacer · touche un point pour le
        supprimer · Ctrl+Z annule le dernier point.
      </p>

      {loadingSegs > 0 && <p className="text-sm text-muted">Calcul de l&rsquo;itinéraire…</p>}
      {fallbackSegs > 0 && (
        <p className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink">
          ⚠️ {fallbackSegs} tronçon{fallbackSegs > 1 ? "s" : ""} tracé{fallbackSegs > 1 ? "s" : ""} en ligne droite
          (pointillé orange) : aucun chemin trouvé ou service d&rsquo;itinéraire indisponible. Déplace le point ou
          passe en mode Manuel.
        </p>
      )}
      {eleFailed && !eleLoading && (
        <p className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink">
          ⚠️ Altitude indisponible pour une partie du tracé (service d&rsquo;altitude injoignable). Le dénivelé est
          incomplet.
        </p>
      )}

      {/* Profil en direct */}
      {points.length > 1 && missingEle < points.length && (
        <ElevationProfile points={points} onHoverPoint={setCursor} />
      )}

      {/* Enregistrement */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-muted">{editing ? "Nom du parcours" : "Nom du parcours (facultatif)"}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={editing ? initial!.name : `Par défaut : AC2000-${Math.round(stats.distanceKm)}-${stats.up}`}
            className="rounded-lg border border-border bg-bg px-3 py-2"
          />
        </label>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : editing ? "Enregistrer les modifications" : "Enregistrer le parcours"}
          </button>
          {editing && (
            <Link
              href={`/admin/tracks/${initial!.trackId}`}
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-ink"
            >
              Annuler
            </Link>
          )}
          {!canSave && !saving && data.wps.length >= 2 && (
            <span className="text-xs text-muted">Calcul en cours…</span>
          )}
        </div>
      </div>
    </div>
  );
}
