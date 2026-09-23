import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";
import { parseGpxPoints, computeGpxStats } from "@/lib/gpx";

function generateTrackName(distanceKm: number, elevationGainM: number): string {
  const km = Math.round(distanceKm);
  const dplus = Math.round(elevationGainM);
  return `AC2000-${km}-${dplus}`;
}

export async function GET() {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  // Tous les administrateurs ont accès à tous les parcours.
  const tracks = await prisma.track.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    tracks: tracks.map((t) => ({
      id: t.id,
      name: t.name,
      distanceKm: t.distanceKm,
      elevationGainM: t.elevationGainM,
      createdAt: t.createdAt,
    })),
  });
}

export async function POST(request: NextRequest) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const form = await request.formData();
  const file = form.get("file");
  const nameOverride = form.get("name");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier GPX manquant." }, { status: 400 });
  }

  const text = await file.text();
  if (!text.includes("<gpx") && !text.includes("<?xml")) {
    return NextResponse.json({ error: "Ce fichier ne semble pas être un GPX valide." }, { status: 400 });
  }

  const points = parseGpxPoints(text);
  if (points.length < 2) {
    return NextResponse.json(
      { error: "Aucune trace exploitable trouvée dans ce fichier." },
      { status: 400 }
    );
  }

  const stats = computeGpxStats(points);
  const name =
    typeof nameOverride === "string" && nameOverride.trim()
      ? nameOverride.trim()
      : generateTrackName(stats.distanceKm, stats.elevationGainM);

  const track = await prisma.track.create({
    data: {
      name,
      distanceKm: stats.distanceKm,
      elevationGainM: stats.elevationGainM,
      gpxData: text,
      adminId: session.adminId,
    },
  });

  return NextResponse.json(
    {
      id: track.id,
      name: track.name,
      distanceKm: track.distanceKm,
      elevationGainM: track.elevationGainM,
    },
    { status: 201 }
  );
}
