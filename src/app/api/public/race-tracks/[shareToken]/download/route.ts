import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: { shareToken: string } }
) {
  const race = await prisma.race.findUnique({ where: { gpxShareToken: params.shareToken } });
  if (!race || !race.gpxShareEnabled || !race.gpxData) {
    return NextResponse.json({ error: "Parcours introuvable ou partage désactivé." }, { status: 404 });
  }

  const safeName = race.name.replace(/[^a-zA-Z0-9-_]+/g, "-");

  return new NextResponse(race.gpxData, {
    headers: {
      "Content-Type": "application/gpx+xml",
      "Content-Disposition": `attachment; filename="${safeName}.gpx"`,
    },
  });
}
