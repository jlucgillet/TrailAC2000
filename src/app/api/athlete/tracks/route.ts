import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAthleteSession } from "@/lib/session";

/**
 * Parcours consultables depuis l'espace concurrent : courses marquées
 * visibles par l'organisateur (réglage "Afficher cette course dans
 * l'espace concurrent"), ni brouillon ni archivée, avec au moins une
 * distance ou un tracé GPX renseigné (sinon rien à montrer).
 */
export async function GET() {
  const session = await getAthleteSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const races = await prisma.race.findMany({
    where: {
      visibleInAthleteSpace: true,
      status: { notIn: ["draft", "archived"] },
      OR: [{ gpxData: { not: null } }, { distanceKm: { not: null } }],
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json({
    tracks: races.map((r) => ({
      raceId: r.id,
      name: r.name,
      location: r.location,
      date: r.date,
      distanceKm: r.distanceKm,
      elevationGainM: r.elevationGainM,
      gpxData: r.gpxData,
    })),
  });
}
