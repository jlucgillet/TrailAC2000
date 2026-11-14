export type GpxPoint = { lat: number; lon: number; ele: number | null };

/**
 * Extrait les points de trace d'un fichier GPX (balises <trkpt lat lon><ele>).
 * Analyse volontairement simple (regex plutôt qu'un parseur XML complet) :
 * suffisant pour les exports standards (Strava, Garmin Connect, Komoot...),
 * et utilisable aussi bien côté serveur que dans le navigateur sans
 * dépendance supplémentaire.
 */
export function parseGpxPoints(xml: string): GpxPoint[] {
  // Les traces (<trkpt>) sont prioritaires ; à défaut on lit les itinéraires
  // (<rtept>), que produisent certains planificateurs (Komoot, Garmin
  // Course...).
  const fromTag = (tag: string): GpxPoint[] => {
    const points: GpxPoint[] = [];
    const regex = new RegExp("<" + tag + "\\b([^>]*)>([\\s\\S]*?)</" + tag + ">", "g");
    let match: RegExpExecArray | null;
    while ((match = regex.exec(xml))) {
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
  };

  const track = fromTag("trkpt");
  return track.length > 0 ? track : fromTag("rtept");
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
 * Calcul UNIQUE du dénivelé, utilisé partout (import, fiche parcours, outil de
 * tracé, recalcul) : un même tracé donne donc toujours les mêmes chiffres.
 *
 * Méthode (seuil cumulatif, ou « hystérésis ») : on garde une altitude de
 * référence ; dès que l'altitude s'en écarte d'au moins ELEVATION_NOISE_THRESHOLD_M,
 * l'écart est compté en montée (D+) ou en descente (D−) et la référence est
 * déplacée. Le résultat ne dépend pas de la densité des points et D+ − D−
 * est égal à (altitude d'arrivée − altitude de départ) à moins d'un seuil près.
 *
 * Le dénivelé reste une estimation : deux logiciels honnêtes peuvent différer
 * de quelques pour cent selon le capteur et la méthode.
 */
export const ELEVATION_NOISE_THRESHOLD_M = 1;

export function computeElevationStats(eles: (number | null | undefined)[]): {
  gain: number;
  loss: number;
} {
  let gain = 0;
  let loss = 0;
  let ref: number | null = null;
  for (const e of eles) {
    if (e === null || e === undefined || Number.isNaN(e)) continue;
    if (ref === null) {
      ref = e;
      continue;
    }
    const delta = e - ref;
    if (delta >= ELEVATION_NOISE_THRESHOLD_M) {
      gain += delta;
      ref = e;
    } else if (delta <= -ELEVATION_NOISE_THRESHOLD_M) {
      loss -= delta;
      ref = e;
    }
  }
  return { gain, loss };
}

export function computeGpxStats(points: GpxPoint[]): {
  distanceKm: number;
  elevationGainM: number;
  elevationLossM: number;
} {
  let distanceM = 0;
  for (let i = 1; i < points.length; i++) {
    distanceM += haversineMeters(points[i - 1], points[i]);
  }
  const { gain, loss } = computeElevationStats(points.map((p) => p.ele));
  return {
    distanceKm: Math.round((distanceM / 1000) * 100) / 100,
    elevationGainM: Math.round(gain),
    elevationLossM: Math.round(loss),
  };
}
