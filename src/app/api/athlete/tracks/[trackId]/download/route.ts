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
  if (!track || !track.gpxData) {
    return NextResponse.json({ error: "Parcours introuvable." }, { status: 404 });
  }

  const safeName = track.name.replace(/[^a-zA-Z0-9-_]+/g, "-");

  return new NextResponse(track.gpxData, {
    headers: {
      "Content-Type": "application/gpx+xml",
      "Content-Disposition": `attachment; filename="${safeName}.gpx"`,
    },
  });
}
