import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";
import { parseGpxPoints, computeGpxStats } from "@/lib/gpx";

async function ownedRace(raceId: string, adminId: string) {
  return prisma.race.findFirst({ where: { id: raceId, adminId } });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { raceId: string } }
) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const race = await ownedRace(params.raceId, session.adminId);
  if (!race) return NextResponse.json({ error: "Course introuvable." }, { status: 404 });

  return NextResponse.json({
    gpxData: race.gpxData,
    distanceKm: race.distanceKm,
    elevationGainM: race.elevationGainM,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { raceId: string } }
) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const race = await ownedRace(params.raceId, session.adminId);
  if (!race) return NextResponse.json({ error: "Course introuvable." }, { status: 404 });

  const form = await request.formData();
  const file = form.get("file");
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

  const updated = await prisma.race.update({
    where: { id: race.id },
    data: {
      gpxData: text,
      distanceKm: stats.distanceKm,
      elevationGainM: stats.elevationGainM,
    },
  });

  return NextResponse.json({
    distanceKm: updated.distanceKm,
    elevationGainM: updated.elevationGainM,
    pointsCount: points.length,
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { raceId: string } }
) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const race = await ownedRace(params.raceId, session.adminId);
  if (!race) return NextResponse.json({ error: "Course introuvable." }, { status: 404 });

  await prisma.race.update({
    where: { id: race.id },
    data: { gpxData: null, elevationGainM: null },
  });

  return NextResponse.json({ ok: true });
}
