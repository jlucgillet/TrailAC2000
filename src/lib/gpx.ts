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
 * Distance totale (somme des segments) et dénivelé positif.
 *
 * Le D+ est calculé par seuil cumulatif (hystérésis) : on garde une altitude
 * de référence et on ne compte une montée que lorsque l'altitude dépasse la
 * référence d'au moins 1 m ; une descente de 1 m ou plus déplace la référence
 * vers le bas. Contrairement à une somme de variations point à point avec
 * seuil, ce calcul ne dépend pas de la densité des points (une trace Garmin
 * à 1 point / 7 m donne le même résultat qu'une trace simplifiée) et filtre
 * le bruit du capteur. Le résultat reste une estimation.
 */
export const ELEVATION_NOISE_THRESHOLD_M = 1;

export function computeGpxStats(points: GpxPoint[]): {
  distanceKm: number;
  elevationGainM: number;
} {
  let distanceM = 0;
  let elevationGainM = 0;
  let ref: number | null = null;

  for (let i = 1; i < points.length; i++) {
    distanceM += haversineMeters(points[i - 1], points[i]);
  }

  for (const p of points) {
    if (p.ele === null) continue;
    if (ref === null) {
      ref = p.ele;
      continue;
    }
    const delta = p.ele - ref;
    if (delta >= ELEVATION_NOISE_THRESHOLD_M) {
      elevationGainM += delta;
      ref = p.ele;
    } else if (delta <= -ELEVATION_NOISE_THRESHOLD_M) {
      ref = p.ele;
    }
  }

  return {
    distanceKm: Math.round((distanceM / 1000) * 100) / 100,
    elevationGainM: Math.round(elevationGainM),
  };
}
