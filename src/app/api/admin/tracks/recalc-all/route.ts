import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";
import { parseGpxPoints, computeGpxStats } from "@/lib/gpx";

/**
 * Recalcule distance et dénivelé positif de TOUS les parcours à partir de
 * leur GPX, avec la formule de calcul actuelle (la même que partout dans l'app).
 * Les fichiers GPX et les autres réglages ne sont pas modifiés.
 */
export async function POST() {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const tracks = await prisma.track.findMany({
    select: { id: true, gpxData: true, distanceKm: true, elevationGainM: true },
  });

  let updated = 0;
  let unchanged = 0;
  let skipped = 0;

  for (const t of tracks) {
    const points = t.gpxData ? parseGpxPoints(t.gpxData) : [];
    if (points.length < 2) {
      skipped++;
      continue;
    }
    const stats = computeGpxStats(points);
    if (stats.distanceKm === t.distanceKm && stats.elevationGainM === t.elevationGainM) {
      unchanged++;
      continue;
    }
    await prisma.track.update({
      where: { id: t.id },
      data: { distanceKm: stats.distanceKm, elevationGainM: stats.elevationGainM },
    });
    updated++;
  }

  return NextResponse.json({ total: tracks.length, updated, unchanged, skipped });
}
