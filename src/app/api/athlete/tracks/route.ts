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
    where: { visibleInAthleteSpace: true },
  });

  // Ordre croissant de distance, puis de dénivelé en cas d'égalité — les
  // parcours sans distance renseignée sont relégués en fin de liste.
  const sorted = [...tracks].sort((a, b) => {
    if (a.distanceKm === null && b.distanceKm === null) return 0;
    if (a.distanceKm === null) return 1;
    if (b.distanceKm === null) return -1;
    if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
    return (a.elevationGainM ?? 0) - (b.elevationGainM ?? 0);
  });

  return NextResponse.json({
    tracks: sorted.map((t) => ({
      id: t.id,
      name: t.name,
      distanceKm: t.distanceKm,
      elevationGainM: t.elevationGainM,
      gpxData: t.gpxData,
    })),
  });
}
