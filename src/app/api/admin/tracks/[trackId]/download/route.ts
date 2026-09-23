import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET(
  _request: NextRequest,
  { params }: { params: { trackId: string } }
) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const track = await prisma.track.findUnique({ where: { id: params.trackId } });
  if (!track) return NextResponse.json({ error: "Parcours introuvable." }, { status: 404 });

  const safeName = track.name.replace(/[^a-zA-Z0-9-_]+/g, "-");

  return new NextResponse(track.gpxData, {
    headers: {
      "Content-Type": "application/gpx+xml",
      "Content-Disposition": `attachment; filename="${safeName}.gpx"`,
    },
  });
}
