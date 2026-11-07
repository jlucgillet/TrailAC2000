"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Pt = { lat: number; lon: number; ele: number | null };

function haversine(a: Pt, b: Pt): number {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Pas « rond » (1, 2, 5 × 10^n) pour graduer un axe. */
function niceStep(range: number, targetTicks: number): number {
  const raw = range / Math.max(1, targetTicks);
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * pow;
}

type Sample = { km: number; ele: number; grade: number; lat: number; lon: number };

function buildSamples(points: Pt[]): Sample[] {
  const valid = points.filter((p) => p.ele !== null && p.ele !== undefined);
  if (valid.length < 2) return [];

  // Distance cumulée
  const dist: number[] = [0];
  for (let i = 1; i < valid.length; i++) dist.push(dist[i - 1] + haversine(valid[i - 1], valid[i]));
  const total = dist[dist.length - 1];
  if (total <= 0) return [];

  // Lissage de l'altitude (moyenne glissante) contre le bruit GPS
  const half = 3;
  const raw = valid.map((p) => p.ele as number);
  const smooth = raw.map((_, i) => {
    const s = raw.slice(Math.max(0, i - half), Math.min(raw.length, i + half + 1));
    return s.reduce((a, b) => a + b, 0) / s.length;
  });

  // Ré-échantillonnage régulier (≈ 300 points) par interpolation linéaire
  const n = Math.min(300, Math.max(2, valid.length));
  const out: Sample[] = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const d = (total * k) / (n - 1);
    while (j < dist.length - 2 && dist[j + 1] < d) j++;
    const span = dist[j + 1] - dist[j] || 1;
    const t = Math.min(1, Math.max(0, (d - dist[j]) / span));
    out.push({
      km: d / 1000,
      ele: smooth[j] + (smooth[j + 1] - smooth[j]) * t,
      grade: 0,
      lat: valid[j].lat + (valid[j + 1].lat - valid[j].lat) * t,
      lon: valid[j].lon + (valid[j + 1].lon - valid[j].lon) * t,
    });
  }
  // Pente locale (sur ~ 5 échantillons)
  for (let k = 0; k < out.length; k++) {
    const a = out[Math.max(0, k - 2)];
    const b = out[Math.min(out.length - 1, k + 2)];
    const dx = (b.km - a.km) * 1000;
    out[k].grade = dx > 0 ? ((b.ele - a.ele) / dx) * 100 : 0;
  }
  return out;
}

const HEIGHT = 200;
const M = { top: 12, right: 14, bottom: 26, left: 44 };

/**
 * Profil altimétrique : kilomètres en horizontal, altitude (m) en vertical.
 * Survol / toucher : affiche km, altitude et pente à l'endroit pointé.
 */
export function ElevationProfile({
  points,
  onHoverPoint,
}: {
  points: Pt[];
  /** Position géographique du point pointé (null quand on quitte le profil). */
  onHoverPoint?: (p: { lat: number; lon: number } | null) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  const samples = useMemo(() => buildSamples(points), [points]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (samples.length < 2) return null;

  const maxKm = samples[samples.length - 1].km;
  const eles = samples.map((s) => s.ele);
  const rawMin = Math.min(...eles);
  const rawMax = Math.max(...eles);
  const pad = Math.max(5, (rawMax - rawMin) * 0.08);
  const yStep = niceStep(rawMax - rawMin + 2 * pad, 4);
  const yMin = Math.floor((rawMin - pad) / yStep) * yStep;
  const yMax = Math.ceil((rawMax + pad) / yStep) * yStep;
  const xStep = niceStep(maxKm, Math.max(3, Math.floor(width / 70)));

  const innerW = Math.max(10, width - M.left - M.right);
  const innerH = HEIGHT - M.top - M.bottom;
  const x = (km: number) => M.left + (km / maxKm) * innerW;
  const y = (m: number) => M.top + (1 - (m - yMin) / (yMax - yMin)) * innerH;

  const line = samples.map((s, i) => `${i ? "L" : "M"}${x(s.km).toFixed(1)},${y(s.ele).toFixed(1)}`).join("");
  const area = `${line}L${x(maxKm).toFixed(1)},${y(yMin).toFixed(1)}L${x(0).toFixed(1)},${y(yMin).toFixed(1)}Z`;

  const yTicks: number[] = [];
  for (let v = yMin; v <= yMax + 1e-6; v += yStep) yTicks.push(v);
  const xTicks: number[] = [];
  for (let v = 0; v <= maxKm + 1e-6; v += xStep) xTicks.push(v);

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const km = ((e.clientX - rect.left - M.left) / innerW) * maxKm;
    if (km < 0 || km > maxKm) return leave(e);
    let idx = Math.round((km / maxKm) * (samples.length - 1));
    idx = Math.max(0, Math.min(samples.length - 1, idx));
    setHover(idx);
    onHoverPoint?.({ lat: samples[idx].lat, lon: samples[idx].lon });
  }

  // Souris : le repère disparaît en quittant le graphe. Doigt : il reste à
  // la dernière position touchée.
  function leave(e: React.PointerEvent<SVGSVGElement>) {
    if (e.pointerType === "touch") return;
    setHover(null);
    onHoverPoint?.(null);
  }

  const h = hover !== null ? samples[hover] : null;
  const tipLeft = h ? x(h.km) > width / 2 : false;

  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <p className="mb-1 text-sm font-semibold text-ink">Profil d&rsquo;altitude</p>
      <div ref={wrapRef} className="relative w-full text-muted">
        {width > 0 && (
          <svg
            width={width}
            height={HEIGHT}
            onPointerMove={onMove}
            onPointerDown={onMove}
            onPointerLeave={leave}
            style={{ touchAction: "pan-y", display: "block" }}
            role="img"
            aria-label="Profil d'altitude du parcours"
          >
            {yTicks.map((v) => (
              <g key={`y${v}`}>
                <line x1={M.left} x2={width - M.right} y1={y(v)} y2={y(v)} stroke="currentColor" strokeOpacity={0.18} />
                <text x={M.left - 6} y={y(v) + 3.5} textAnchor="end" fontSize={11} fill="currentColor">
                  {Math.round(v)}
                </text>
              </g>
            ))}
            {xTicks.map((v) => (
              <text key={`x${v}`} x={x(v)} y={HEIGHT - 8} textAnchor="middle" fontSize={11} fill="currentColor">
                {Number.isInteger(v) ? v : v.toFixed(1)}
              </text>
            ))}
            <text x={M.left - 6} y={M.top - 2} textAnchor="end" fontSize={10} fill="currentColor">
              m
            </text>
            <text x={width - M.right} y={HEIGHT - 8} textAnchor="end" fontSize={10} fill="currentColor" opacity={0}>
              km
            </text>

            <path d={area} fill="#16A34A" fillOpacity={0.18} />
            <path d={line} fill="none" stroke="#16A34A" strokeWidth={2} strokeLinejoin="round" />

            {h && (
              <g pointerEvents="none">
                <line x1={x(h.km)} x2={x(h.km)} y1={M.top} y2={M.top + innerH} stroke="#DC2626" strokeWidth={1} />
                <circle cx={x(h.km)} cy={y(h.ele)} r={4} fill="#DC2626" stroke="#fff" strokeWidth={1.5} />
              </g>
            )}
          </svg>
        )}
        <span className="pointer-events-none absolute bottom-0 right-1 text-[10px]">km</span>

        {h && (
          <div
            className="pointer-events-none absolute top-1 rounded-md border border-border bg-bg px-2 py-1 text-xs text-ink shadow"
            style={tipLeft ? { left: M.left + 6 } : { right: M.right + 6 }}
          >
            <b>{h.km.toFixed(1)} km</b> · {Math.round(h.ele)} m ·{" "}
            <span style={{ color: h.grade > 0.5 ? "#DC2626" : h.grade < -0.5 ? "#16A34A" : undefined }}>
              {h.grade > 0 ? "+" : ""}
              {h.grade.toFixed(1)} %
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
