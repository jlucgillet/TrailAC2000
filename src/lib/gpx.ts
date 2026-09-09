export type GpxPoint = { lat: number; lon: number; ele: number | null };

/**
 * Extrait les points de trace d'un fichier GPX (balises <trkpt lat lon><ele>).
 * Analyse volontairement simple (regex plutôt qu'un parseur XML complet) :
 * suffisant pour les exports standards (Strava, Garmin Connect, Komoot...),
 * et utilisable aussi bien côté serveur que dans le navigateur sans
 * dépendance supplémentaire.
 */
export function parseGpxPoints(xml: string): GpxPoint[] {
  const points: GpxPoint[] = [];
  const trkptRegex = /<trkpt\b([^>]*)>([\s\S]*?)<\/trkpt>/g;
  let match: RegExpExecArray | null;

  while ((match = trkptRegex.exec(xml))) {
    const attrs = match[1];
    const body = match[2];
    const latMatch = attrs.match(/lat="(-?[\d.]+)"/);
    const lonMatch = attrs.match(/lon="(-?[\d.]+)"/);
    if (!latMatch || !lonMatch) continue;

    const eleMatch = body.match(/<ele>(-?[\d.]+)<\/ele>/);
    points.push({
      lat: parseFloat(latMatch[1]),
      lon: parseFloat(lonMatch[1]),
      ele: eleMatch ? parseFloat(eleMatch[1]) : null,
    });
  }

  return points;
}

function haversineMeters(a: GpxPoint, b: GpxPoint): number {
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

/**
 * Distance totale (somme des segments) et dénivelé positif (somme des
 * montées). Un seuil minimal de variation d'altitude (1m) est appliqué
 * avant de compter une montée, pour limiter l'effet du bruit de mesure GPS
 * typique des traces grand public — le dénivelé obtenu reste une
 * estimation, comme sur la plupart des plateformes grand public.
 */
export function computeGpxStats(points: GpxPoint[]): {
  distanceKm: number;
  elevationGainM: number;
} {
  let distanceM = 0;
  let elevationGainM = 0;
  const ELEVATION_NOISE_THRESHOLD_M = 1;

  for (let i = 1; i < points.length; i++) {
    distanceM += haversineMeters(points[i - 1], points[i]);

    const prevEle = points[i - 1].ele;
    const curEle = points[i].ele;
    if (prevEle !== null && curEle !== null) {
      const delta = curEle - prevEle;
      if (delta > ELEVATION_NOISE_THRESHOLD_M) {
        elevationGainM += delta;
      }
    }
  }

  return {
    distanceKm: Math.round((distanceM / 1000) * 100) / 100,
    elevationGainM: Math.round(elevationGainM),
  };
}
