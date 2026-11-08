import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";
import { parseGpxPoints, computeGpxStats } from "@/lib/gpx";

/**
 * Recalcule distance et dénivelé positif d'un parcours à partir de son GPX
 * déjà enregistré, avec la formule de calcul actuelle. Le fichier GPX et les
 * autres réglages ne sont pas modifiés.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { trackId: string } }
) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const track = await prisma.track.findUnique({ where: { id: params.trackId } });
  if (!track) return NextResponse.json({ error: "Parcours introuvable." }, { status: 404 });

  const points = parseGpxPoints(track.gpxData);
  if (points.length < 2) {
    return NextResponse.json({ error: "Tracé GPX invalide." }, { status: 400 });
  }

  const stats = computeGpxStats(points);
  const updated = await prisma.track.update({
    where: { id: track.id },
    data: { distanceKm: stats.distanceKm, elevationGainM: stats.elevationGainM },
  });

  return NextResponse.json({
    id: updated.id,
    distanceKm: updated.distanceKm,
    elevationGainM: updated.elevationGainM,
    previousElevationGainM: track.elevationGainM,
  });
}
