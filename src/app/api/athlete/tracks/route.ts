import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAthleteSession } from "@/lib/session";

/**
 * Parcours de la bibliothèque (model Track — pas les courses) consultables
 * depuis l'espace concurrent. Toute la bibliothèque est accessible à tout
 * concurrent connecté : ce sont des ressources partagées par
 * l'organisateur, pas des données personnelles.
 */
export async function GET() {
  const session = await getAthleteSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const tracks = await prisma.track.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    tracks: tracks.map((t) => ({
      id: t.id,
      name: t.name,
      distanceKm: t.distanceKm,
      elevationGainM: t.elevationGainM,
      gpxData: t.gpxData,
    })),
  });
}
