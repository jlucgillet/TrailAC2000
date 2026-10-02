import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAthleteSession } from "@/lib/session";

export async function GET(
  _request: Request,
  { params }: { params: { trackId: string } }
) {
  const session = await getAthleteSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const track = await prisma.track.findUnique({ where: { id: params.trackId } });
  if (!track) {
    return NextResponse.json({ error: "Parcours introuvable." }, { status: 404 });
  }

  return NextResponse.json({
    id: track.id,
    name: track.name,
    distanceKm: track.distanceKm,
    elevationGainM: track.elevationGainM,
    gpxData: track.gpxData,
  });
}
