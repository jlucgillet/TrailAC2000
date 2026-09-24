import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: { shareToken: string } }
) {
  const track = await prisma.track.findUnique({ where: { shareToken: params.shareToken } });
  if (!track || !track.shareEnabled) {
    return NextResponse.json({ error: "Parcours introuvable ou partage désactivé." }, { status: 404 });
  }

  const safeName = track.name.replace(/[^a-zA-Z0-9-_]+/g, "-");

  return new NextResponse(track.gpxData, {
    headers: {
      "Content-Type": "application/gpx+xml",
      "Content-Disposition": `attachment; filename="${safeName}.gpx"`,
    },
  });
}
