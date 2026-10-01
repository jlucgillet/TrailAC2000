import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";
import { parseGpxPoints, computeGpxStats } from "@/lib/gpx";

export async function GET(
  _request: NextRequest,
  { params }: { params: { trackId: string } }
) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const track = await prisma.track.findUnique({ where: { id: params.trackId } });
  if (!track) return NextResponse.json({ error: "Parcours introuvable." }, { status: 404 });

  return NextResponse.json({
    id: track.id,
    name: track.name,
    distanceKm: track.distanceKm,
    elevationGainM: track.elevationGainM,
    gpxData: track.gpxData,
    shareEnabled: track.shareEnabled,
    shareToken: track.shareToken,
  });
}

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  shareEnabled: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { trackId: string } }
) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const track = await prisma.track.findUnique({ where: { id: params.trackId } });
  if (!track) return NextResponse.json({ error: "Parcours introuvable." }, { status: 404 });

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  }

  const updated = await prisma.track.update({
    where: { id: track.id },
    data: parsed.data,
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    shareEnabled: updated.shareEnabled,
    shareToken: updated.shareToken,
  });
}

/**
 * Remplace le fichier GPX d'un parcours existant — recalcule distance et
 * dénivelé à partir du nouveau fichier. Le nom et les réglages de partage
 * ne sont pas touchés.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { trackId: string } }
) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const track = await prisma.track.findUnique({ where: { id: params.trackId } });
  if (!track) return NextResponse.json({ error: "Parcours introuvable." }, { status: 404 });

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

  const updated = await prisma.track.update({
    where: { id: track.id },
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
  { params }: { params: { trackId: string } }
) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const track = await prisma.track.findUnique({ where: { id: params.trackId } });
  if (!track) return NextResponse.json({ error: "Parcours introuvable." }, { status: 404 });

  await prisma.track.delete({ where: { id: track.id } });
  return NextResponse.json({ ok: true });
}
