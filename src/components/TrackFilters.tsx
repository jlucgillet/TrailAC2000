"use client";

import { useMemo, useState } from "react";

type FilterableTrack = {
  distanceKm: number | null;
  elevationGainM: number | null;
};

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

/**
 * Filtres distance / dénivelé pour une liste de parcours.
 * Retourne la liste filtrée et le panneau de filtres à afficher.
 */
export function useTrackFilters<T extends FilterableTrack>(
  tracks: T[],
  options: { discreet?: boolean } = {}
) {
  const discreet = options.discreet ?? false;
  const [open, setOpen] = useState(false);
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

  // Tri : par défaut distance croissante, puis dénivelé croissant.
  const [sortKey, setSortKey] = useState<"dist" | "ele">("dist");
  const [sortDesc, setSortDesc] = useState(false);

  const filteredUnsorted = tracks.filter((t) => {
    const okD =
      distFull || (t.distanceKm != null && t.distanceKm >= dist[0] - 0.5 && t.distanceKm <= dist[1] + 0.5);
    const okE =
      eleFull || (t.elevationGainM != null && t.elevationGainM >= ele[0] && t.elevationGainM <= ele[1]);
    return okD && okE;
  });

  const filtered = useMemo(() => {
    const dir = sortDesc ? -1 : 1;
    const dv = (t: FilterableTrack) => t.distanceKm ?? -1;
    const ev = (t: FilterableTrack) => t.elevationGainM ?? -1;
    const [first, second] = sortKey === "dist" ? [dv, ev] : [ev, dv];
    return [...filteredUnsorted].sort(
      (a, b) => dir * (first(a) - first(b)) || dir * (second(a) - second(b))
    );
  }, [filteredUnsorted, sortKey, sortDesc]);

  const showSort = tracks.length > 1;

  const sortControl = showSort ? (
    <div className="flex items-center gap-1.5 text-xs text-muted" role="group" aria-label="Tri des parcours">
      <span>Tri</span>
      {(["dist", "ele"] as const).map((k) => {
        const active = sortKey === k;
        return (
          <button
            key={k}
            type="button"
            aria-pressed={active}
            onClick={() => {
              if (active) setSortDesc((v) => !v);
              else {
                setSortKey(k);
                setSortDesc(false);
              }
            }}
            className={`rounded-full border px-3 py-1 ${
              active ? "border-accent text-ink" : "border-border hover:text-ink"
            }`}
          >
            {k === "dist" ? "Distance" : "Dénivelé"}
            {active ? (sortDesc ? " ↓" : " ↑") : ""}
          </button>
        );
      })}
    </div>
  ) : null;

  const showFilters = tracks.length > 1 && (bounds.dMax > bounds.dMin || bounds.eMax > bounds.eMin);

  const styles = (
    <style>{`
        .dual-range input[type=range]{position:absolute;left:0;top:0;width:100%;height:100%;margin:0;background:transparent;pointer-events:none;-webkit-appearance:none;appearance:none}
        .dual-range input[type=range]::-webkit-slider-runnable-track{background:transparent;height:100%}
        .dual-range input[type=range]::-moz-range-track{background:transparent}
        .dual-range input[type=range]::-webkit-slider-thumb{pointer-events:auto;-webkit-appearance:none;appearance:none;width:22px;height:22px;border-radius:50%;background:#fff;border:2px solid #16A34A;box-shadow:0 1px 3px rgba(0,0,0,.3);cursor:pointer}
        .dual-range input[type=range]::-moz-range-thumb{pointer-events:auto;width:18px;height:18px;border-radius:50%;background:#fff;border:2px solid #16A34A;box-shadow:0 1px 3px rgba(0,0,0,.3);cursor:pointer}
      `}</style>
  );

  const sliders = (
    <>
      {bounds.dMax > bounds.dMin && (
        <RangeFilter label="Distance" unit="km" min={bounds.dMin} max={bounds.dMax} step={1} value={dist} onChange={setDistSel} />
      )}
      {bounds.eMax > bounds.eMin && (
        <RangeFilter label="Dénivelé positif" unit="m" min={bounds.eMin} max={bounds.eMax} step={10} value={ele} onChange={setEleSel} />
      )}
    </>
  );

  const reset = () => {
    setDistSel(null);
    setEleSel(null);
  };

  const panel = !showFilters && !showSort ? null : discreet ? (
    <div className="mb-4">
      {styles}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {showFilters && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted hover:text-ink"
        >
          <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M4 7h10 M18 7h2 M4 17h2 M10 17h10" />
            <circle cx="16" cy="7" r="2" />
            <circle cx="8" cy="17" r="2" />
          </svg>
          Filtres
          {filtering && <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#16A34A" }} />}
          <span className="text-[10px]">{open ? "▲" : "▼"}</span>
        </button>
        )}
        {sortControl}
        {filtering && (
          <>
            <span className="text-xs text-muted">
              {filtered.length} sur {tracks.length}
            </span>
            <button type="button" onClick={reset} className="text-xs text-muted underline">
              Réinitialiser
            </button>
          </>
        )}
      </div>
      {showFilters && open && <div className="mt-3 flex flex-col gap-3 border-l-2 border-border pl-3">{sliders}</div>}
    </div>
  ) : (
    <div className="mb-6 flex flex-col gap-4 rounded-xl border border-border bg-surface p-4">
      {styles}
      {sliders}
      {sortControl}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted">
          {filtered.length} parcours sur {tracks.length}
        </span>
        {filtering && (
          <button type="button" onClick={reset} className="text-accent underline">
            Réinitialiser
          </button>
        )}
      </div>
    </div>
  );

  return { filtered, panel };
}
