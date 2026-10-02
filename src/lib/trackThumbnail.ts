import { parseGpxPoints } from "./gpx";

/**
 * Calcule le tracé SVG (attribut "d" d'un <path>) représentant la forme
 * du parcours, à l'échelle d'une petite vignette — pas une vraie carte
 * avec fond de plan (ça demanderait un service de tuiles payant ou une
 * clé API), juste la silhouette du tracé, respectant ses proportions
 * réelles.
 */
export function buildTrackThumbnailPath(
  gpxData: string,
  width: number,
  height: number,
  padding = 4
): string | null {
  const points = parseGpxPoints(gpxData);
  if (points.length < 2) return null;

  // Sous-échantillonnage : inutile de garder tous les points pour une
  // vignette de quelques centimètres.
  const maxPoints = 80;
  const step = Math.max(1, Math.floor(points.length / maxPoints));
  const sampled = points.filter((_, i) => i % step === 0);
  if (sampled.length < 2) return null;

  const lats = sampled.map((p) => p.lat);
  const lons = sampled.map((p) => p.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  const latRange = maxLat - minLat || 0.0001;
  const lonRange = maxLon - minLon || 0.0001;

  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  // Même échelle sur les deux axes (pas d'étirement) : on prend la plus
  // contraignante des deux dimensions, puis on centre.
  const scale = Math.min(innerW / lonRange, innerH / latRange);
  const offsetX = padding + (innerW - lonRange * scale) / 2;
  const offsetY = padding + (innerH - latRange * scale) / 2;

  const coords = sampled.map((p) => {
    const x = offsetX + (p.lon - minLon) * scale;
    // Inversion de l'axe Y : la latitude augmente vers le nord, les
    // coordonnées SVG augmentent vers le bas.
    const y = offsetY + (maxLat - p.lat) * scale;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return `M ${coords.join(" L ")}`;
}
