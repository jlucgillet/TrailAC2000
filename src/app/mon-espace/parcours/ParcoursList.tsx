"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { TrackThumbnail } from "@/components/TrackThumbnail";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/** Curseur à deux poignées (min / max). */
function RangeFilter({
  label,
  unit,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
}) {
  const [lo, hi] = value;
  const pct = (v: number) => (max === min ? 0 : ((v - min) / (max - min)) * 100);
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="font-medium text-ink">{label}</span>
        <span className="tabular-nums text-muted">
          {lo} – {hi} {unit}
        </span>
      </div>
      <div className="dual-range relative h-6">
        <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded bg-border" />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded"
          style={{
            left: `${pct(lo)}%`,
            width: `${Math.max(0, pct(hi) - pct(lo))}%`,
            background: "#16A34A",
          }}
        />
        <input
          type="range"
          aria-label={`${label} minimum`}
          min={min}
          max={max}
          step={step}
          value={lo}
          onChange={(e) => onChange([Math.min(Number(e.target.value), hi), hi])}
        />
        <input
          type="range"
          aria-label={`${label} maximum`}
          min={min}
          max={max}
          step={step}
          value={hi}
          onChange={(e) => onChange([lo, Math.max(Number(e.target.value), lo)])}
        />
      </div>
    </div>
  );
}

export function ParcoursList() {
  const { data, isLoading } = useSWR("/api/athlete/tracks", fetcher);
  const tracks: any[] = useMemo(() => data?.tracks ?? [], [data]);

  // Bornes issues des données (arrondies à l'entier / à la dizaine).
  const bounds = useMemo(() => {
    const d = tracks.map((t) => t.distanceKm).filter((v) => v != null) as number[];
    const e = tracks.map((t) => t.elevationGainM).filter((v) => v != null) as number[];
    return {
      dMin: d.length ? Math.floor(Math.min(...d)) : 0,
      dMax: d.length ? Math.ceil(Math.max(...d)) : 0,
      eMin: e.length ? Math.floor(Math.min(...e) / 10) * 10 : 0,
      eMax: e.length ? Math.ceil(Math.max(...e) / 10) * 10 : 0,
    };
  }, [tracks]);

  // null = « pas touché » : suit les bornes (utile quand les données arrivent).
  const [distSel, setDistSel] = useState<[number, number] | null>(null);
  const [eleSel, setEleSel] = useState<[number, number] | null>(null);

  const dist: [number, number] = distSel
    ? [Math.max(bounds.dMin, distSel[0]), Math.min(bounds.dMax, distSel[1])]
    : [bounds.dMin, bounds.dMax];
  const ele: [number, number] = eleSel
    ? [Math.max(bounds.eMin, eleSel[0]), Math.min(bounds.eMax, eleSel[1])]
    : [bounds.eMin, bounds.eMax];

  const distFull = dist[0] === bounds.dMin && dist[1] === bounds.dMax;
  const eleFull = ele[0] === bounds.eMin && ele[1] === bounds.eMax;
  const filtering = !distFull || !eleFull;

  const filtered = tracks.filter((t) => {
    const okD =
      distFull || (t.distanceKm != null && t.distanceKm >= dist[0] - 0.5 && t.distanceKm <= dist[1] + 0.5);
    const okE =
      eleFull || (t.elevationGainM != null && t.elevationGainM >= ele[0] && t.elevationGainM <= ele[1]);
    return okD && okE;
  });

  const showFilters = tracks.length > 1 && (bounds.dMax > bounds.dMin || bounds.eMax > bounds.eMin);

  return (
    <div>
      <style>{`
        .dual-range input[type=range]{position:absolute;left:0;top:0;width:100%;height:100%;margin:0;background:transparent;pointer-events:none;-webkit-appearance:none;appearance:none}
        .dual-range input[type=range]::-webkit-slider-runnable-track{background:transparent;height:100%}
        .dual-range input[type=range]::-moz-range-track{background:transparent}
        .dual-range input[type=range]::-webkit-slider-thumb{pointer-events:auto;-webkit-appearance:none;appearance:none;width:22px;height:22px;border-radius:50%;background:#fff;border:2px solid #16A34A;box-shadow:0 1px 3px rgba(0,0,0,.3);cursor:pointer}
        .dual-range input[type=range]::-moz-range-thumb{pointer-events:auto;width:18px;height:18px;border-radius:50%;background:#fff;border:2px solid #16A34A;box-shadow:0 1px 3px rgba(0,0,0,.3);cursor:pointer}
      `}</style>

      <h1 className="mb-2 font-display text-3xl font-semibold">Parcours</h1>
      <p className="mb-6 text-sm text-muted">
        Les parcours de la bibliothèque, en consultation — carte, distance et dénivelé.
      </p>

      {showFilters && (
        <div className="mb-6 flex flex-col gap-4 rounded-xl border border-border bg-surface p-4">
          {bounds.dMax > bounds.dMin && (
            <RangeFilter
              label="Distance"
              unit="km"
              min={bounds.dMin}
              max={bounds.dMax}
              step={1}
              value={dist}
              onChange={setDistSel}
            />
          )}
          {bounds.eMax > bounds.eMin && (
            <RangeFilter
              label="Dénivelé positif"
              unit="m"
              min={bounds.eMin}
              max={bounds.eMax}
              step={10}
              value={ele}
              onChange={setEleSel}
            />
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">
              {filtered.length} parcours sur {tracks.length}
            </span>
            {filtering && (
              <button
                type="button"
                onClick={() => {
                  setDistSel(null);
                  setEleSel(null);
                }}
                className="text-accent underline"
              >
                Réinitialiser
              </button>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-muted">Chargement…</p>
      ) : tracks.length === 0 ? (
        <p className="text-muted">Aucun parcours à consulter pour le moment.</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted">Aucun parcours ne correspond à ces filtres.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((t) => (
            <Link
              key={t.id}
              href={`/mon-espace/parcours/${t.id}`}
              className="flex items-center gap-4 rounded-xl border-2 border-accent/30 bg-surface p-4 transition-colors hover:border-accent"
            >
              <TrackThumbnail gpxData={t.gpxData} width={64} height={64} />
              <div className="min-w-0">
                <p className="truncate font-medium">{t.name}</p>
                <p className="mt-1 text-sm text-muted">
                  {t.distanceKm != null ? `${t.distanceKm.toFixed(1)} km` : "—"}
                  {t.elevationGainM != null ? ` · D+ ${Math.round(t.elevationGainM)} m` : ""}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
