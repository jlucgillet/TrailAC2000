import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";
import { parseGpxPoints, computeGpxStats } from "@/lib/gpx";

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Inverse le sens d'un parcours : l'ancienne arrivée devient le départ.
 * Le fichier GPX est reconstruit avec les points dans l'ordre inverse
 * (latitude, longitude, altitude) ; les horodatages éventuels sont ignorés.
 * Distance et dénivelé positif sont recalculés (D+ et D- s'échangent).
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { trackId: string } }
) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const track = await prisma.track.findUnique({ where: { id: params.trackId } });
  if (!track) return NextResponse.json({ error: "Parcours introuvable." }, { status: 404 });
  if (!track.gpxData) {
    return NextResponse.json({ error: "Ce parcours n'a pas de tracé." }, { status: 400 });
  }

  const points = parseGpxPoints(track.gpxData);
  if (points.length < 2) {
    return NextResponse.json({ error: "Aucune trace exploitable." }, { status: 400 });
  }

  const reversed = [...points].reverse();
  const stats = computeGpxStats(reversed);

  const trkpts = reversed
    .map(
      (p) =>
        `      <trkpt lat="${p.lat}" lon="${p.lon}">${
          p.ele !== null ? `<ele>${p.ele}</ele>` : ""
        }</trkpt>`
    )
    .join("\n");

  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Trail AC2000" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>${escapeXml(track.name)}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>
`;

  const updated = await prisma.track.update({
    where: { id: track.id },
    data: {
      gpxData: gpx,
      distanceKm: stats.distanceKm,
      elevationGainM: stats.elevationGainM,
    },
  });

  return NextResponse.json({
    distanceKm: updated.distanceKm,
    elevationGainM: updated.elevationGainM,
  });
}
