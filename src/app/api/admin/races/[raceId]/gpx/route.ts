import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";
import { parseGpxPoints, computeGpxStats } from "@/lib/gpx";

export async function GET(
  _request: NextRequest,
  { params }: { params: { raceId: string } }
) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const race = await prisma.race.findUnique({ where: { id: params.raceId } });
  if (!race) return NextResponse.json({ error: "Course introuvable." }, { status: 404 });

  return NextResponse.json({
    gpxData: race.gpxData,
    distanceKm: race.distanceKm,
    elevationGainM: race.elevationGainM,
    gpxShareEnabled: race.gpxShareEnabled,
    gpxShareToken: race.gpxShareToken,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { raceId: string } }
) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const race = await prisma.race.findUnique({ where: { id: params.raceId } });
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

const patchSchema = z.object({ gpxShareEnabled: z.boolean() });

export async function PATCH(
  request: NextRequest,
  { params }: { params: { raceId: string } }
) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const race = await prisma.race.findUnique({ where: { id: params.raceId } });
  if (!race) return NextResponse.json({ error: "Course introuvable." }, { status: 404 });

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  }

  const updated = await prisma.race.update({
    where: { id: race.id },
    data: { gpxShareEnabled: parsed.data.gpxShareEnabled },
  });

  return NextResponse.json({
    gpxShareEnabled: updated.gpxShareEnabled,
    gpxShareToken: updated.gpxShareToken,
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { raceId: string } }
) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const race = await prisma.race.findUnique({ where: { id: params.raceId } });
  if (!race) return NextResponse.json({ error: "Course introuvable." }, { status: 404 });

  await prisma.race.update({
    where: { id: race.id },
    data: { gpxData: null, elevationGainM: null, gpxShareEnabled: false },
  });

  return NextResponse.json({ ok: true });
}
