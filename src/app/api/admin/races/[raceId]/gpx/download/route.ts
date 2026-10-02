import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET(
  _request: NextRequest,
  { params }: { params: { raceId: string } }
) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const race = await prisma.race.findUnique({ where: { id: params.raceId } });
  if (!race || !race.gpxData) {
    return NextResponse.json({ error: "Aucun GPX pour cette course." }, { status: 404 });
  }

  const safeName = race.name.replace(/[^a-zA-Z0-9-_]+/g, "-");

  return new NextResponse(race.gpxData, {
    headers: {
      "Content-Type": "application/gpx+xml",
      "Content-Disposition": `attachment; filename="${safeName}.gpx"`,
    },
  });
}
